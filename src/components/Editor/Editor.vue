<template>
  <div class="editor-container" ref="containerRef">
    <div class="editor-wrapper" ref="editorRef"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { keymap } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching } from '@codemirror/language'
import { closeBrackets } from '@codemirror/autocomplete'
import { oneDark } from '@codemirror/theme-one-dark'
import { processClipboardData } from '@/utils/turndown'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'ready', 'scroll'])

const containerRef = ref(null)
const editorRef = ref(null)
let view = null

// 基础扩展配置
const basicExtensions = [
  bracketMatching(),
  closeBrackets(),
  history(),
  keymap.of(defaultKeymap),
  keymap.of(historyKeymap)
]

// 粘贴处理扩展
const pasteHandler = EditorView.domEventHandlers({
  paste(event) {
    event.preventDefault()

    processClipboardData(event.clipboardData).then(markdown => {
      if (!markdown) return

      const transaction = view.state.replaceSelection(markdown)
      view.dispatch(transaction)
    })
  }
})

// 创建编辑器扩展
const extensions = [
  markdown(),
  ...basicExtensions,
  pasteHandler,
  EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      const content = update.state.doc.toString()
      emit('update:modelValue', content)
    }
  }),
  EditorView.theme({
    '&': {
      height: '100%',
      fontSize: '14px'
    },
    '.cm-scroller': {
      overflow: 'auto',
      height: '100%'
    },
    '.cm-content': {
      padding: '16px',
      fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
      lineHeight: '1.6'
    },
    '.cm-focused': {
      outline: 'none'
    }
  })
]

onMounted(() => {
  const state = EditorState.create({
    doc: props.modelValue,
    extensions
  })

  view = new EditorView({
    state,
    parent: editorRef.value
  })

  view.dom.querySelector('.cm-scroller').addEventListener('scroll', handleScroll)

  emit('ready')
})

onBeforeUnmount(() => {
  if (view) {
    view.destroy()
  }
})

function handleScroll(event) {
  emit('scroll', {
    scrollTop: event.target.scrollTop,
    scrollHeight: event.target.scrollHeight,
    clientHeight: event.target.clientHeight
  })
}

watch(() => props.modelValue, (newValue) => {
  if (view && view.state.doc.toString() !== newValue) {
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: newValue
      }
    })
  }
})

defineExpose({
  insertText(text) {
    if (!view) return
    const transaction = view.state.replaceSelection(text)
    view.dispatch(transaction)
    view.focus()
  },

  focus() {
    if (view) view.focus()
  },

  getContent() {
    return view ? view.state.doc.toString() : ''
  },

  scrollToLine(line) {
    if (!view) return
    requestAnimationFrame(() => {
      try {
        const lineObj = view.state.doc.line(line)
        const pos = lineObj.from
        view.dispatch({
          selection: { anchor: pos },
          scrollIntoView: true
        })
      } catch (e) {
        console.warn('[Editor] Failed to scroll to line:', line, e)
      }
    })
  },

  scrollToLineAndScrollToTop(line) {
    if (!view) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          const lineObj = view.state.doc.line(line)

          // Move cursor to the line
          view.dispatch({
            selection: { anchor: lineObj.from },
            scrollIntoView: true
          })

          // Get the scroller element
          const scroller = view.dom.querySelector('.cm-scroller')
          if (scroller) {
            const linePos = view.coordsAtPos(lineObj.from)
            const viewportRect = view.dom.getBoundingClientRect()

            if (linePos) {
              const lineTopInContent = scroller.scrollTop + (linePos.top - viewportRect.top)
              const contentPaddingTop = 16

              scroller.scrollTop = lineTopInContent - contentPaddingTop
            }
          }
        } catch (e) {
          console.warn('[Editor] Failed to scroll to line:', line, e)
        }
      })
    })
  }
})
</script>

<style scoped>
.editor-container {
  height: 100%;
  overflow: hidden;
}

.editor-wrapper {
  height: 100%;
}
</style>
