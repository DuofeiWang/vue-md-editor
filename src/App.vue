<template>
  <div class="md-editor-app">
    <div class="app-header">
      <h1 class="app-title">MD 编辑器</h1>
      <span class="document-name">{{ documentStore.documentName }}</span>
      <span class="save-status" :class="{ unsaved: documentStore.isDirty }">
        {{ documentStore.isDirty ? '●未保存' : '✓已保存' }}
      </span>
      <div class="header-actions">
        <button class="btn btn-primary" @click="handleNew">新建</button>
        <button class="btn btn-primary" @click="handleOpen">打开</button>
        <button class="btn btn-success" @click="handleSave">保存</button>
      </div>
    </div>

    <Toolbar @action="handleToolbarAction" />

    <div class="main-content">
      <Sidebar
        ref="sidebarRef"
        :content="documentStore.content"
        @navigate="handleNavigate"
      />
      <div class="editor-area">
        <Editor
          ref="editorRef"
          v-model="documentStore.content"
          @ready="onEditorReady"
          @scroll="onEditorScroll"
        />
      </div>
      <div class="preview-area" ref="previewRef" @scroll="onPreviewScroll">
        <div class="preview-content markdown-preview" v-html="previewHtml"></div>
      </div>
    </div>

    <!-- 确认对话框 -->
    <ConfirmDialog
      v-if="documentStore.showConfirmDialog"
      :title="documentStore.confirmDialogConfig.title"
      :message="documentStore.confirmDialogConfig.message"
      @confirm="documentStore.confirmDialogConfig.onConfirm?.()"
      @cancel="documentStore.confirmDialogConfig.onCancel?.()"
    />

    <!-- SaveDialog removed - we now use system file picker directly -->

    <!-- 未保存提醒对话框 -->
    <UnsavedDialog
      v-if="documentStore.showUnsavedDialog"
      :title="documentStore.unsavedDialogConfig.title"
      :message="documentStore.unsavedDialogConfig.message"
      @save="documentStore.unsavedDialogConfig.onSave?.()"
      @discard="documentStore.unsavedDialogConfig.onDiscard?.()"
      @cancel="documentStore.unsavedDialogConfig.onCancel?.()"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useDocumentStore } from '@/stores/document'
import Editor from '@/components/Editor/Editor.vue'
import Toolbar from '@/components/Toolbar/Toolbar.vue'
import Sidebar from '@/components/Sidebar/Sidebar.vue'
import ConfirmDialog from '@/components/Dialogs/ConfirmDialog.vue'
import UnsavedDialog from '@/components/Dialogs/UnsavedDialog.vue'
import { renderMarkdown } from '@/utils/markdown'
import { setupScrollSync } from '@/utils/scrollSync'
import { exportDocument } from '@/utils/export'

const documentStore = useDocumentStore()
const sidebarRef = ref(null)
const editorRef = ref(null)
const previewRef = ref(null)
const previewHtml = ref('')

// Track unsaved changes for beforeunload event
const hasUnsavedChanges = ref(false)

// Flag to disable scroll sync during navigation
const isNavigating = ref(false)

// CRITICAL: Watch content changes to mark document as dirty
// When user edits in the editor, content changes directly but isDirty needs to be updated
watch(() => documentStore.content, (newContent, oldContent) => {
  // Mark as dirty when content changes from user input
  // Only set dirty if oldContent exists (not initial load) and content actually changed
  if (oldContent !== undefined && newContent !== oldContent) {
    documentStore.isDirty = true
  }
  hasUnsavedChanges.value = documentStore.isDirty
})

// Handle beforeunload event
const handleBeforeUnload = (event) => {
  if (hasUnsavedChanges.value) {
    event.preventDefault()
    event.returnValue = '' // Chrome requires this
    return ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

const scrollSync = setupScrollSync(
  (ratio) => {
    if (previewRef.value) {
      const el = previewRef.value
      el.scrollTop = ratio * (el.scrollHeight - el.clientHeight)
    }
  },
  (ratio) => {
    const totalLines = documentStore.content.split('\n').length
    const targetLine = Math.floor(ratio * totalLines) + 1
    if (editorRef.value) {
      editorRef.value.scrollToLine(targetLine)
    }
  }
)

function onEditorReady() {
  updatePreview()
}

function onEditorScroll(scrollInfo) {
  // Skip scroll sync during navigation
  if (isNavigating.value) return
  scrollSync.onEditorScroll(scrollInfo)
}

function onPreviewScroll(event) {
  // Skip scroll sync during navigation
  if (isNavigating.value) return
  scrollSync.onPreviewScroll({
    scrollTop: event.target.scrollTop,
    scrollHeight: event.target.scrollHeight,
    clientHeight: event.target.clientHeight
  })
}

function updatePreview() {
  previewHtml.value = renderMarkdown(documentStore.content)
}

watch(() => documentStore.content, () => {
  updatePreview()
})

function handleToolbarAction(event) {
  if (!editorRef.value) return

  if (event.type === 'insert') {
    const { before, after, placeholder, text } = event.data

    if (text) {
      editorRef.value.insertText(text)
    } else if (before || after) {
      const selection = window.getSelection()
      const selectedText = selection.toString() || placeholder

      const insertText = before + selectedText + after
      editorRef.value.insertText(insertText)

      if (placeholder && !selection.toString()) {
        editorRef.value.focus()
      }
    }
  }
}

function handleNavigate(item) {
  // Set flag to disable scroll sync during navigation
  isNavigating.value = true

  // Scroll editor to the line
  if (editorRef.value) {
    editorRef.value.scrollToLineAndScrollToTop(item.line)
    editorRef.value.focus()
  }

  // Scroll preview to the heading
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const targetEl = previewRef.value?.querySelector(`#${item.id}`)

      if (targetEl) {
        // Use getBoundingClientRect for accurate position calculation
        const previewContainer = previewRef.value
        const containerRect = previewContainer.getBoundingClientRect()
        const elementRect = targetEl.getBoundingClientRect()

        // Calculate the scroll position needed to put the element at the top
        const targetScrollTop = elementRect.top - containerRect.top + previewContainer.scrollTop
        previewContainer.scrollTop = targetScrollTop
      } else {
        // Fallback: try to find by heading text if ID doesn't work
        const headings = previewRef.value?.querySelectorAll('h1, h2, h3, h4, h5, h6')

        if (headings) {
          for (const heading of headings) {
            if (heading.textContent.trim() === item.text) {
              const previewContainer = previewRef.value
              const containerRect = previewContainer.getBoundingClientRect()
              const elementRect = heading.getBoundingClientRect()
              previewContainer.scrollTop = elementRect.top - containerRect.top + previewContainer.scrollTop
              break
            }
          }
        }
      }

      // Re-enable scroll sync after a short delay
      setTimeout(() => {
        isNavigating.value = false
      }, 300)
    })
  })
}

async function handleNew() {
  if (documentStore.isDirty) {
    // Show unsaved warning dialog - the callbacks handle the actual action
    await documentStore.showUnsavedPrompt({
      onSave: async () => {
        // Save first, then create new document
        await saveDocumentDirectly()
        documentStore.newDocument()
        updatePreview()
      },
      onDiscard: () => {
        // Discard changes and create new document
        documentStore.newDocument()
        updatePreview()
      },
      onCancel: () => {
        // Stay on current document - do nothing
      }
    })
  } else {
    documentStore.newDocument()
    updatePreview()
  }
}

async function handleOpen() {
  if (documentStore.isDirty) {
    // Show unsaved warning dialog - the callbacks handle the actual action
    await documentStore.showUnsavedPrompt({
      onSave: async () => {
        // Save first, then open file
        await saveDocumentDirectly()
        await openFileWithPicker()
      },
      onDiscard: () => {
        // Discard changes and open file
        openFileWithPicker()
      },
      onCancel: () => {
        // Stay on current document - do nothing
      }
    })
  } else {
    await openFileWithPicker()
  }
}

async function openFileWithPicker() {
  // Try to use File System Access API first
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Markdown Files',
            accept: { 'text/markdown': ['.md', '.txt'] }
          }
        ],
        multiple: false
      })
      const file = await handle.getFile()
      const content = await file.text()
      // Clean content (remove BOM and other invisible characters)
      const cleaned = cleanContent(content)
      documentStore.loadDocument(cleaned, file.name)
      updatePreview()
      return
    } catch (err) {
      // User cancelled or error occurred
      if (err.name === 'AbortError') return
      console.warn('File System Access API failed, falling back to input element:', err)
    }
  }

  // Fallback to traditional file input
  triggerFileOpen()
}

function triggerFileOpen() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.md,.txt'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        // Clean content (remove BOM and other invisible characters)
        const content = cleanContent(event.target.result)
        documentStore.loadDocument(content, file.name)
        updatePreview()
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

// Clean content by removing BOM and other invisible characters
function cleanContent(content) {
  if (!content) return content

  let clean = content

  // BOM (Byte Order Mark) is U+FEFF (decimal 65279, hex 0xFEFF)
  // JavaScript's charCodeAt returns the Unicode code point
  const firstCharCode = clean.charCodeAt(0)

  // Check for BOM character (U+FEFF = 65279 = 0xFEFF)
  if (firstCharCode === 65279 || firstCharCode === 0xFEFF) {
    clean = clean.substring(1)
  }

  // As a backup, check and remove BOM using String.fromCharCode
  const bomChar = String.fromCharCode(65279) // U+FEFF ZERO WIDTH NO-BREAK SPACE
  if (clean.startsWith(bomChar)) {
    clean = clean.substring(1)
  }

  // Remove zero-width characters at start using their code points:
  // U+200B (8203) - Zero Width Space
  // U+200C (8204) - Zero Width Non-Joiner
  // U+200D (8205) - Zero Width Joiner
  // U+200E (8206) - Left-to-Right Mark
  // U+200F (8207) - Right-to-Left Mark
  // U+FEFF (65279) - Zero Width No-Break Space (BOM)
  while (clean.length > 0) {
    const code = clean.charCodeAt(0)
    if (code === 8203 || code === 8204 || code === 8205 ||
        code === 8206 || code === 8207 || code === 65279) {
      clean = clean.substring(1)
    } else {
      break
    }
  }

  return clean
}

// Save document directly to system file picker (no intermediate dialog)
async function saveDocumentDirectly() {
  const content = documentStore.content
  const filename = documentStore.documentName

  try {
    // Use the export function which already handles showSaveFilePicker
    await exportDocument(content, filename, 'md')
    documentStore.markSaved()
    return true
  } catch (error) {
    if (error.name === 'AbortError') {
      // User cancelled
      return false
    }
    console.error('Failed to save document:', error)
    return false
  }
}

async function handleSave() {
  // Directly save using system file picker, no intermediate dialog
  await saveDocumentDirectly()
}
</script>

<style scoped>
.md-editor-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  height: 56px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #f5f5f5;
}

.app-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.document-name {
  font-size: 14px;
  color: #666;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.save-status {
  font-size: 12px;
  color: #4caf50;
}

.save-status.unsaved {
  color: #ff9800;
}

.header-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover {
  background: #f0f0f0;
}

.btn-primary {
  color: #1976d2;
  border-color: #1976d2;
}

.btn-primary:hover {
  background: #e3f2fd;
}

.btn-success {
  color: #4caf50;
  border-color: #4caf50;
}

.btn-success:hover {
  background: #e8f5e9;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-area,
.preview-area {
  flex: 1;
  height: 100%;
  overflow: auto;
}

.editor-area {
  border-right: 1px solid #e0e0e0;
}

.preview-area {
  padding: 16px;
  background: white;
}

.preview-content {
  max-width: 800px;
  margin: 0 auto;
}
</style>
