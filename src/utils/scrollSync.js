/**
 * 滚动同步工具
 * 在编辑器和预览区之间同步滚动位置
 */
export function setupScrollSync(editorCallback, previewCallback) {
  let isEditorScrolling = false
  let isPreviewScrolling = false
  let scrollTimeout = null

  return {
    onEditorScroll(scrollInfo) {
      if (isPreviewScrolling) return

      isEditorScrolling = true

      const ratio = scrollInfo.scrollTop / (scrollInfo.scrollHeight - scrollInfo.clientHeight)
      previewCallback(ratio)

      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        isEditorScrolling = false
      }, 100)
    },

    onPreviewScroll(scrollInfo) {
      if (isEditorScrolling) return

      isPreviewScrolling = true

      const ratio = scrollInfo.scrollTop / (scrollInfo.scrollHeight - scrollInfo.clientHeight)
      editorCallback(ratio)

      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        isPreviewScrolling = false
      }, 100)
    }
  }
}
