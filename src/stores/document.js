import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useDocumentStore = defineStore('document', () => {
  // State
  const content = ref('')
  const currentFilename = ref('')
  const isDirty = ref(false)
  const showSidebar = ref(true)

  // 对话框状态
  const showConfirmDialog = ref(false)
  const confirmDialogConfig = ref({
    title: '确认',
    message: '',
    onConfirm: null,
    onCancel: null
  })

  // 未保存提醒对话框
  const showUnsavedDialog = ref(false)
  const unsavedDialogConfig = ref({
    title: '未保存的更改',
    message: '当前文档有未保存的更改，要保存吗？',
    onSave: null,
    onDiscard: null,
    onCancel: null
  })

  // Computed
  const documentName = computed(() => {
    if (!content.value) return '未命名文档'

    const lines = content.value.split('\n')
    const firstLine = lines[0] || ''

    const text = firstLine.replace(/^#+\s*/, '').trim() || '未命名文档'

    return text.slice(0, 10) + (text.length > 10 ? '...' : '')
  })

  const isEmpty = computed(() => !content.value.trim())

  // Actions
  function setContent(newContent) {
    content.value = newContent
    isDirty.value = true
  }

  function updateDocumentName(name) {
    currentFilename.value = name
  }

  function markSaved() {
    isDirty.value = false
  }

  function newDocument() {
    content.value = ''
    currentFilename.value = ''
    isDirty.value = false
  }

  function loadDocument(fileContent, filename = '') {
    content.value = fileContent
    currentFilename.value = filename
    isDirty.value = false
  }

  function toggleSidebar() {
    showSidebar.value = !showSidebar.value
  }

  // 对话框方法
  function confirm(message, options = {}) {
    return new Promise((resolve) => {
      confirmDialogConfig.value = {
        title: options.title || '确认',
        message,
        onConfirm: () => {
          showConfirmDialog.value = false
          resolve(true)
        },
        onCancel: () => {
          showConfirmDialog.value = false
          resolve(false)
        }
      }
      showConfirmDialog.value = true
    })
  }

  function closeConfirmDialog() {
    showConfirmDialog.value = false
  }

  // 未保存提醒对话框方法
  function showUnsavedPrompt(callbacks) {
    return new Promise((resolve) => {
      // The handler that will be called when user clicks a button
      const handleSave = async () => {
        showUnsavedDialog.value = false
        // First execute the callback (which may be async)
        if (callbacks.onSave) {
          await callbacks.onSave()
        }
        resolve('save')
      }

      const handleDiscard = () => {
        showUnsavedDialog.value = false
        if (callbacks.onDiscard) {
          callbacks.onDiscard()
        }
        resolve('discard')
      }

      const handleCancel = () => {
        showUnsavedDialog.value = false
        if (callbacks.onCancel) {
          callbacks.onCancel()
        }
        resolve('cancel')
      }

      unsavedDialogConfig.value = {
        title: '未保存的更改',
        message: '当前文档有未保存的更改，要保存吗？',
        onSave: handleSave,
        onDiscard: handleDiscard,
        onCancel: handleCancel
      }
      showUnsavedDialog.value = true
    })
  }

  return {
    // State
    content,
    currentFilename,
    isDirty,
    showSidebar,
    showConfirmDialog,
    confirmDialogConfig,
    showUnsavedDialog,
    unsavedDialogConfig,
    // Computed
    documentName,
    isEmpty,
    // Actions
    setContent,
    updateDocumentName,
    markSaved,
    newDocument,
    loadDocument,
    toggleSidebar,
    confirm,
    closeConfirmDialog,
    showUnsavedPrompt
  }
})
