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

    <!-- 保存对话框 -->
    <SaveDialog
      v-if="documentStore.showSaveDialog"
      :filename="documentStore.saveFilename"
      @update:filename="documentStore.saveFilename = $event"
      @confirm="doSave"
      @cancel="documentStore.closeSaveDialog()"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useDocumentStore } from '@/stores/document'
import Editor from '@/components/Editor/Editor.vue'
import Toolbar from '@/components/Toolbar/Toolbar.vue'
import Sidebar from '@/components/Sidebar/Sidebar.vue'
import ConfirmDialog from '@/components/Dialogs/ConfirmDialog.vue'
import SaveDialog from '@/components/Dialogs/SaveDialog.vue'
import { renderMarkdown } from '@/utils/markdown'
import { setupScrollSync } from '@/utils/scrollSync'

const documentStore = useDocumentStore()
const sidebarRef = ref(null)
const editorRef = ref(null)
const previewRef = ref(null)
const previewHtml = ref('')

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
  scrollSync.onEditorScroll(scrollInfo)
}

function onPreviewScroll(event) {
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
  if (editorRef.value) {
    editorRef.value.scrollToLine(item.line)
    editorRef.value.focus()
  }

  setTimeout(() => {
    const targetEl = previewRef.value?.querySelector(`#${item.id}`)
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' })
    }
  }, 100)
}

async function handleNew() {
  if (documentStore.isDirty) {
    const confirmed = await documentStore.confirm('当前文档未保存，是否继续新建？')
    if (!confirmed) return
  }
  documentStore.newDocument()
  updatePreview()
}

async function handleOpen() {
  if (documentStore.isDirty) {
    const confirmed = await documentStore.confirm('当前文档未保存，是否继续打开？')
    if (!confirmed) return
  }

  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.md'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        documentStore.loadDocument(event.target.result, file.name)
        updatePreview()
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

async function handleSave() {
  documentStore.openSaveDialog(documentStore.documentName)
}

function doSave() {
  const content = documentStore.content
  let filename = documentStore.saveFilename

  if (!filename.endsWith('.md')) {
    filename += '.md'
  }

  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  documentStore.markSaved()
  documentStore.closeSaveDialog()
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
