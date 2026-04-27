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

  const showSaveDialog = ref(false)
  const saveFilename = ref('')

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

  function openSaveDialog(defaultName = '') {
    saveFilename.value = defaultName
    showSaveDialog.value = true
  }

  function closeSaveDialog() {
    showSaveDialog.value = false
  }

  function closeConfirmDialog() {
    showConfirmDialog.value = false
  }

  return {
    // State
    content,
    currentFilename,
    isDirty,
    showSidebar,
    showConfirmDialog,
    confirmDialogConfig,
    showSaveDialog,
    saveFilename,
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
    openSaveDialog,
    closeSaveDialog,
    closeConfirmDialog
  }
})
