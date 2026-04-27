# Markdown 编辑器实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个功能完整的 Web 版 Markdown 编辑器，支持粘贴识别、分屏预览、图片 Base64 嵌入保存。

**Architecture:** Vue 3 + Vite 纯静态应用，Pinia 状态管理，CodeMirror 6 编辑器核心，markdown-it 渲染引擎。采用组件化设计，每个组件职责单一清晰。

**Tech Stack:** Vue 3, Vite, CodeMirror 6, markdown-it, turndown, KaTeX, highlight.js, Pinia

---

## 项目文件结构

```
md-editor/
├── index.html                  # HTML 入口
├── package.json                # 依赖配置
├── vite.config.js              # Vite 配置
├── public/
│   └── favicon.ico
└── src/
    ├── main.js                 # 应用入口
    ├── App.vue                 # 根组件
    ├── stores/
    │   └── document.js         # Pinia store: 文档状态
    ├── components/
    │   ├── Header/
    │   │   └── Header.vue      # 顶部栏组件
    │   ├── Toolbar/
    │   │   └── Toolbar.vue     # 工具栏组件
    │   ├── Editor/
    │   │   └── Editor.vue      # CodeMirror 编辑器
    │   ├── Preview/
    │   │   └── Preview.vue     # Markdown 预览
    │   ├── Sidebar/
    │   │   └── Sidebar.vue     # 目录侧边栏
    │   └── Dialogs/
    │       ├── ConfirmDialog.vue    # 确认对话框
    │       └── SaveDialog.vue       # 保存对话框
    ├── utils/
    │   ├── markdown.js         # Markdown 工具函数
    │   ├── turndown.js         # HTML → MD 转换
    │   ├── toc.js              # 目录提取
    │   ├── file.js             # 文件操作
    │   └── scrollSync.js       # 滚动同步
    └── assets/
        └── styles/
            └── main.css        # 全局样式
```

---

## Chunk 1: 项目初始化

### Task 1.1: 创建项目结构

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/App.vue`
- Create: `src/assets/styles/main.css`

- [ ] **Step 1: 创建 package.json**

```bash
cat > package.json << 'EOF'
{
  "name": "md-editor",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "pinia": "^2.1.0",
    "@codemirror/state": "^6.4.0",
    "@codemirror/view": "^6.23.0",
    "@codemirror/lang-markdown": "^6.2.0",
    "@codemirror/theme-one-dark": "^6.1.2",
    "@codemirror/commands": "^6.3.0",
    "@codemirror/search": "^6.5.0",
    "@codemirror/autocomplete": "^6.12.0",
    "markdown-it": "^14.0.0",
    "turndown": "^7.1.0",
    "katex": "^0.16.0",
    "highlight.js": "^11.9.0",
    "markdown-it-texmath": "^1.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0"
  }
}
EOF
```

- [ ] **Step 2: 创建 vite.config.js**

```bash
cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
EOF
```

- [ ] **Step 3: 创建 index.html**

```bash
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MD 编辑器</title>
  <link rel="icon" href="/favicon.ico">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
EOF
```

- [ ] **Step 4: 创建 src/main.js**

```bash
mkdir -p src
cat > src/main.js << 'EOF'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
EOF
```

- [ ] **Step 5: 创建 src/App.vue**

```bash
cat > src/App.vue << 'EOF'
<template>
  <div class="md-editor-app">
    <div class="app-header">
      <h1 class="app-title">MD 编辑器</h1>
      <span class="document-name">{{ documentName }}</span>
      <span class="save-status" :class="{ unsaved: isDirty }">
        {{ isDirty ? '●未保存' : '✓已保存' }}
      </span>
    </div>
    <div class="main-content">
      <p>编辑器加载中...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const content = ref('')
const isDirty = ref(false)

const documentName = computed(() => {
  if (!content.value) return '未命名文档'
  const firstLine = content.value.split('\n')[0]
  const text = firstLine.replace(/^#+\s*/, '').trim()
  return text.slice(0, 10) + (text.length > 10 ? '...' : '')
})
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

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
```

- [ ] **Step 6: 创建 src/assets/styles/main.css**

```bash
mkdir -p src/assets/styles
cat > src/assets/styles/main.css << 'EOF'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

#app {
  height: 100%;
}
EOF
```

- [ ] **Step 7: 安装依赖并测试运行**

```bash
npm install
npm run dev
```

Expected: 开发服务器启动，访问 http://localhost:3000 显示 "MD 编辑器" 标题

- [ ] **Step 8: 提交**

```bash
git add .
git commit -m "feat: initialize Vue 3 + Vite project structure"
```

---

## Chunk 2: Pinia 状态管理

### Task 2.1: 创建文档状态 Store

**Files:**
- Create: `src/stores/document.js`
- Modify: `src/App.vue`

- [ ] **Step 1: 创建 Pinia Store**

```bash
mkdir -p src/stores
cat > src/stores/document.js << 'EOF'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useDocumentStore = defineStore('document', () => {
  // State
  const content = ref('')
  const currentFilename = ref('')
  const isDirty = ref(false)
  const showSidebar = ref(true)

  // Computed
  const documentName = computed(() => {
    if (!content.value) return '未命名文档'

    const lines = content.value.split('\n')
    const firstLine = lines[0] || ''

    // 提取标题（去掉 # 符号）
    const text = firstLine.replace(/^#+\s*/, '').trim() || '未命名文档'

    // 截取前10个字符
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

  return {
    // State
    content,
    currentFilename,
    isDirty,
    showSidebar,
    // Computed
    documentName,
    isEmpty,
    // Actions
    setContent,
    updateDocumentName,
    markSaved,
    newDocument,
    loadDocument,
    toggleSidebar
  }
})
EOF
```

- [ ] **Step 2: 更新 App.vue 使用 Store**

```bash
cat > src/App.vue << 'EOF'
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
    <div class="main-content">
      <p>编辑器加载中...</p>
    </div>
  </div>
</template>

<script setup>
import { useDocumentStore } from '@/stores/document'

const documentStore = useDocumentStore()

function handleNew() {
  console.log('新建文档')
}

function handleOpen() {
  console.log('打开文档')
}

function handleSave() {
  console.log('保存文档')
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
</style>
```

- [ ] **Step 3: 测试运行**

```bash
npm run dev
```

Expected: 页面显示文档状态，按钮可点击

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: add Pinia store for document state management"
```

---

## Chunk 3: CodeMirror 编辑器组件

### Task 3.1: 创建编辑器组件

**Files:**
- Create: `src/components/Editor/Editor.vue`
- Create: `src/utils/scrollSync.js`
- Modify: `src/App.vue`

- [ ] **Step 1: 创建 Editor 组件**

```bash
mkdir -p src/components/Editor
cat > src/components/Editor/Editor.vue << 'EOF'
<template>
  <div class="editor-container" ref="containerRef">
    <div class="editor-wrapper" ref="editorRef"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { EditorView, basicSetup } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { keymap } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'

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

// 创建编辑器扩展
const extensions = [
  basicSetup,
  markdown(),
  history(),
  keymap.of(defaultKeymap),
  keymap.of(historyKeymap),
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

  // 监听滚动事件
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

// 监听外部内容变化
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

// 暴露方法
defineExpose({
  insertText(text, position = null) {
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

    const pos = view.state.doc.line(line).from
    view.dispatch({
      selection: { anchor: pos },
      scrollIntoView: true
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
EOF
```

- [ ] **Step 2: 创建滚动同步工具**

```bash
cat > src/utils/scrollSync.js << 'EOF'
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
EOF
```

- [ ] **Step 3: 更新 App.vue 集成编辑器**

```bash
cat > src/App.vue << 'EOF'
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

    <div class="main-content">
      <div class="editor-area">
        <Editor
          ref="editorRef"
          v-model="documentStore.content"
          @ready="onEditorReady"
          @scroll="onEditorScroll"
        />
      </div>
      <div class="preview-area" ref="previewRef">
        <div class="preview-content" v-html="previewHtml"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDocumentStore } from '@/stores/document'
import Editor from '@/components/Editor/Editor.vue'
import { setupScrollSync } from '@/utils/scrollSync'

const documentStore = useDocumentStore()
const editorRef = ref(null)
const previewRef = ref(null)
const previewHtml = ref('')

// 滚动同步
const scrollSync = setupScrollSync(
  (ratio) => {
    if (previewRef.value) {
      const el = previewRef.value
      el.scrollTop = ratio * (el.scrollHeight - el.clientHeight)
    }
  },
  (ratio) => {
    if (editorRef.value) {
      editorRef.value.scrollToLine(Math.floor(ratio * 100))
    }
  }
)

function onEditorReady() {
  console.log('编辑器已就绪')
  updatePreview()
}

function onEditorScroll(scrollInfo) {
  scrollSync.onEditorScroll(scrollInfo)
}

// 更新预览
function updatePreview() {
  // 简单的 Markdown 转 HTML (临时实现)
  const md = documentStore.content
  let html = md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n/gim, '<br>')
  previewHtml.value = html
}

// 监听内容变化更新预览
watch(() => documentStore.content, () => {
  updatePreview()
})

function handleNew() {
  if (documentStore.isDirty) {
    if (!confirm('当前文档未保存，是否继续新建？')) {
      return
    }
  }
  documentStore.newDocument()
  updatePreview()
}

function handleOpen() {
  if (documentStore.isDirty) {
    if (!confirm('当前文档未保存，是否继续打开？')) {
      return
    }
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

function handleSave() {
  const content = documentStore.content
  const filename = documentStore.documentName + '.md'

  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  documentStore.markSaved()
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
  line-height: 1.8;
}

.preview-content h1,
.preview-content h2,
.preview-content h3 {
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.preview-content h1 {
  font-size: 2em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

.preview-content h2 {
  font-size: 1.5em;
}

.preview-content h3 {
  font-size: 1.25em;
}
</style>
```

- [ ] **Step 4: 测试编辑器功能**

```bash
npm run dev
```

Expected:
- 可以在左侧编辑器输入 Markdown
- 右侧显示预览
- 新建/打开/保存按钮工作正常

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "feat: add CodeMirror editor component with preview"
```

---

## Chunk 4: Markdown 渲染引擎

### Task 4.1: 创建 Markdown 渲染工具

**Files:**
- Create: `src/utils/markdown.js`
- Modify: `src/App.vue`
- Modify: `src/assets/styles/main.css`

- [ ] **Step 1: 创建 Markdown 渲染工具**

```bash
cat > src/utils/markdown.js << 'EOF'
import MarkdownIt from 'markdown-it'
import markdownItTexmath from 'markdown-it-texmath'
import hljs from 'highlight.js'
import katex from 'katex'

// 导入 KaTeX CSS
import 'katex/dist/katex.min.css'

// 导入 highlight.js 样式
import 'highlight.js/styles/github.css'

// 创建 markdown-it 实例
const md = new MarkdownIt({
  html: true,        // 允许 HTML 标签
  linkify: true,     // 自动转换 URL
  typographer: true, // 启用排版优化
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch (__) {}
    }
    return ''
  }
})

// 添加 KaTeX 支持
md.use(markdownItTexmath, {
  engine: katex,
  delimiters: 'dollars',
  katexOptions: { macros: { "\\R": "\\mathbb{R}" } }
})

/**
 * 将 Markdown 渲染为 HTML
 * @param {string} markdown - Markdown 文本
 * @returns {string} HTML 字符串
 */
export function renderMarkdown(markdown) {
  if (!markdown) return ''
  return md.render(markdown)
}

/**
 * 从 Markdown 中提取目录
 * @param {string} markdown - Markdown 文本
 * @returns {Array} 目录结构 [{level, text, line, id}]
 */
export function extractTOC(markdown) {
  if (!markdown) return []

  const lines = markdown.split('\n')
  const toc = []
  const headingRegex = /^(#{1,6})\s+(.+)$/

  lines.forEach((line, index) => {
    const match = line.match(headingRegex)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      // 生成锚点 ID
      const id = text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w一-龥-]/g, '')

      toc.push({
        level,
        text,
        line: index + 1,
        id
      })
    }
  })

  return toc
}

export default md
EOF
```

- [ ] **Step 2: 更新全局样式支持预览**

```bash
cat > src/assets/styles/main.css << 'EOF'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

#app {
  height: 100%;
}

/* Markdown 预览样式 */
.markdown-preview {
  line-height: 1.8;
  color: #333;
}

.markdown-preview h1,
.markdown-preview h2,
.markdown-preview h3,
.markdown-preview h4,
.markdown-preview h5,
.markdown-preview h6 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-preview h1 {
  font-size: 2em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

.markdown-preview h2 {
  font-size: 1.5em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

.markdown-preview h3 {
  font-size: 1.25em;
}

.markdown-preview h4 {
  font-size: 1em;
}

.markdown-preview h5 {
  font-size: 0.875em;
}

.markdown-preview h6 {
  font-size: 0.85em;
  color: #6a737d;
}

.markdown-preview p {
  margin-bottom: 1em;
}

.markdown-preview a {
  color: #0366d6;
  text-decoration: none;
}

.markdown-preview a:hover {
  text-decoration: underline;
}

.markdown-preview strong {
  font-weight: 600;
}

.markdown-preview em {
  font-style: italic;
}

.markdown-preview code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.markdown-preview pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 6px;
  margin-bottom: 1em;
}

.markdown-preview pre code {
  padding: 0;
  background-color: transparent;
}

.markdown-preview blockquote {
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
  margin-bottom: 1em;
}

.markdown-preview ul,
.markdown-preview ol {
  padding-left: 2em;
  margin-bottom: 1em;
}

.markdown-preview li {
  margin-bottom: 0.25em;
}

.markdown-preview table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1em;
}

.markdown-preview table th,
.markdown-preview table td {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.markdown-preview table th {
  font-weight: 600;
  background-color: #f6f8fa;
}

.markdown-preview table tr:nth-child(2n) {
  background-color: #f6f8fa;
}

.markdown-preview img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em 0;
}

.markdown-preview hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #e1e4e8;
  border: 0;
}

.markdown-preview .task-list-item {
  list-style-type: none;
}

.markdown-preview .task-list-item input {
  margin: 0 0.5em 0.25em -1.6em;
  vertical-align: middle;
}
EOF
```

- [ ] **Step 3: 更新 App.vue 使用新的渲染引擎**

```bash
cat > src/App.vue << 'EOF'
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

    <div class="main-content">
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
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useDocumentStore } from '@/stores/document'
import Editor from '@/components/Editor/Editor.vue'
import { renderMarkdown, extractTOC } from '@/utils/markdown'
import { setupScrollSync } from '@/utils/scrollSync'

const documentStore = useDocumentStore()
const editorRef = ref(null)
const previewRef = ref(null)
const previewHtml = ref('')

// 滚动同步
const scrollSync = setupScrollSync(
  (ratio) => {
    if (previewRef.value) {
      const el = previewRef.value
      el.scrollTop = ratio * (el.scrollHeight - el.clientHeight)
    }
  },
  (ratio) => {
    // 从预览区滚动比例计算编辑器行号
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

// 更新预览
function updatePreview() {
  previewHtml.value = renderMarkdown(documentStore.content)
}

// 监听内容变化
watch(() => documentStore.content, () => {
  updatePreview()
})

function handleNew() {
  if (documentStore.isDirty) {
    if (!confirm('当前文档未保存，是否继续新建？')) {
      return
    }
  }
  documentStore.newDocument()
  updatePreview()
}

function handleOpen() {
  if (documentStore.isDirty) {
    if (!confirm('当前文档未保存，是否继续打开？')) {
      return
    }
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

function handleSave() {
  const content = documentStore.content
  const filename = documentStore.documentName + '.md'

  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  documentStore.markSaved()
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
```

- [ ] **Step 4: 测试 Markdown 渲染**

```bash
npm run dev
```

Expected: 输入 Markdown 后预览区正确渲染标题、粗体、列表、表格等

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "feat: add markdown-it rendering engine with syntax highlight"
```

---

## Chunk 5: 粘贴识别功能

### Task 5.1: 创建 HTML 到 Markdown 转换工具

**Files:**
- Create: `src/utils/turndown.js`
- Modify: `src/components/Editor/Editor.vue`

- [ ] **Step 1: 创建 turndown 工具**

```bash
cat > src/utils/turndown.js << 'EOF'
import TurndownService from 'turndown'

// 创建 Turndown 实例
const turndownService = new TurndownService({
  headingStyle: 'atx',        // 使用 # 标题格式
  codeBlockStyle: 'fenced',   // 使用 ``` 代码块
  bulletListMarker: '-',      // 使用 - 作为列表标记
  emDelimiter: '_',           // 使用 _ 作为斜体标记
  strongDelimiter: '**',      // 使用 ** 作为粗体标记
  linkStyle: 'inlined'        // 使用内联链接
})

// 处理图片 - 转换为 Base64
turndownService.addRule('images', {
  filter: 'img',
  replacement: function (content, node) {
    const alt = node.alt || content || ''
    const src = node.getAttribute('src') || ''
    const title = node.title || ''

    // 如果是 Base64 或外部 URL，直接使用
    if (src.startsWith('data:') || src.startsWith('http')) {
      return title
        ? `![${alt}](${src} "${title}")`
        : `![${alt}](${src})`
    }

    // 否则尝试转换为 Base64 (需要异步处理，这里先返回占位符)
    return `![${alt}](${src})`
  }
})

// 处理表格
turndownService.addRule('tableRow', {
  filter: ['tr'],
  replacement: function (content, node) {
    const cells = content.trim().split('|')
    const isHeader = node.parentNode.nodeName === 'THEAD'
    let result = '| '

    cells.forEach(cell => {
      result += cell.trim() + ' | '
    })

    result = result.trim() + '\n'

    // 如果是表头行，添加分隔符
    if (isHeader) {
      const separator = cells.map(() => '---').join(' | ')
      result += '| ' + separator + ' |\n'
    }

    return result
  }
})

// 处理表格单元格
turndownService.addRule('tableCell', {
  filter: ['th', 'td'],
  replacement: function (content) {
    return content
  }
})

// 处理代码块
turndownService.addRule('pre', {
  filter: 'pre',
  replacement: function (content, node) {
    const code = node.textContent || ''
    const language = node.querySelector('code')?.className?.match(/language-(\w+)/)?.[1] || ''
    return '\n```' + language + '\n' + code + '\n```\n'
  }
})

// 处理行内代码
turndownService.addRule('code', {
  filter: function (node) {
    var hasSiblings = node.previousSibling || node.nextSibling
    var isCodeBlock = node.parentNode.nodeName === 'PRE' && !hasSiblings

    return node.nodeName === 'CODE' && !isCodeBlock
  },
  replacement: function (content) {
    return '`' + content + '`'
  }
})

/**
 * 将 HTML 转换为 Markdown
 * @param {string} html - HTML 字符串
 * @returns {string} Markdown 字符串
 */
export function htmlToMarkdown(html) {
  if (!html) return ''
  return turndownService.turndown(html)
}

/**
 * 处理剪贴板数据，转换为 Markdown
 * @param {DataTransfer} dataTransfer - ClipboardEvent.clipboardData
 * @returns {Promise<string>} Markdown 字符串
 */
export async function processClipboardData(dataTransfer) {
  const htmlItem = Array.from(dataTransfer.items).find(item =>
    item.type === 'text/html'
  )

  if (!htmlItem) {
    // 如果没有 HTML，获取纯文本
    const textItem = Array.from(dataTransfer.items).find(item =>
      item.type === 'text/plain'
    )
    if (textItem) {
      return new Promise((resolve) => {
        textItem.getAsString(text => resolve(text))
      })
    }
    return ''
  }

  return new Promise((resolve) => {
    htmlItem.getAsString(html => {
      // 处理图片
      processImagesInHtml(html).then(processedHtml => {
        const markdown = htmlToMarkdown(processedHtml)
        resolve(markdown)
      })
    })
  })
}

/**
 * 处理 HTML 中的图片，转换为 Base64
 * @param {string} html - HTML 字符串
 * @returns {Promise<string>} 处理后的 HTML
 */
async function processImagesInHtml(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const images = doc.querySelectorAll('img')

  for (const img of images) {
    const src = img.getAttribute('src')
    if (!src || src.startsWith('data:') || src.startsWith('http')) {
      continue
    }

    try {
      // 尝试获取图片并转换为 Base64
      const base64 = await imageToBase64(src)
      img.setAttribute('src', base64)
    } catch (error) {
      console.warn('无法转换图片:', src, error)
    }
  }

  return doc.body.innerHTML
}

/**
 * 将图片 URL 转换为 Base64
 * @param {string} url - 图片 URL
 * @returns {Promise<string>} Base64 字符串
 */
function imageToBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'

    img.onload = function () {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)

      const base64 = canvas.toDataURL('image/png')
      resolve(base64)
    }

    img.onerror = reject

    // 处理本地文件 URL
    if (url.startsWith('file://')) {
      // 从剪贴板获取文件
      reject(new Error('本地文件 URL'))
    } else {
      img.src = url
    }
  })
}

export default turndownService
EOF
```

- [ ] **Step 2: 更新 Editor 组件添加粘贴处理**

```bash
cat > src/components/Editor/Editor.vue << 'EOF'
<template>
  <div class="editor-container" ref="containerRef">
    <div class="editor-wrapper" ref="editorRef"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { EditorView, basicSetup } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { keymap } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
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
  basicSetup,
  markdown(),
  history(),
  keymap.of(defaultKeymap),
  keymap.of(historyKeymap),
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

  // 监听滚动事件
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

// 监听外部内容变化
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

// 暴露方法
defineExpose({
  insertText(text, position = null) {
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

    const pos = view.state.doc.line(line).from
    view.dispatch({
      selection: { anchor: pos },
      scrollIntoView: true
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
EOF
```

- [ ] **Step 3: 测试粘贴功能**

```bash
npm run dev
```

Expected: 从网页或 Word 复制内容粘贴后，正确转换为 Markdown 格式

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: add paste recognition with HTML to Markdown conversion"
```

---

## Chunk 6: 工具栏组件

### Task 6.1: 创建工具栏组件

**Files:**
- Create: `src/components/Toolbar/Toolbar.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: 创建 Toolbar 组件**

```bash
mkdir -p src/components/Toolbar
cat > src/components/Toolbar/Toolbar.vue << 'EOF'
<template>
  <div class="toolbar">
    <div class="toolbar-group">
      <button class="toolbar-btn" data-action="heading" title="标题 (Ctrl+1)">
        <span class="icon">H₁</span>
      </button>
      <button class="toolbar-btn" data-action="heading2" title="标题2 (Ctrl+2)">
        <span class="icon">H₂</span>
      </button>
      <button class="toolbar-btn" data-action="heading3" title="标题3 (Ctrl+3)">
        <span class="icon">H₃</span>
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <button class="toolbar-btn" data-action="bold" title="粗体 (Ctrl+B)">
        <span class="icon"><strong>B</strong></span>
      </button>
      <button class="toolbar-btn" data-action="italic" title="斜体 (Ctrl+I)">
        <span class="icon"><em>I</em></span>
      </button>
      <button class="toolbar-btn" data-action="strike" title="删除线">
        <span class="icon"><del>S</del></span>
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <button class="toolbar-btn" data-action="quote" title="引用 (Ctrl+Shift+.)">
        <span class="icon">❝</span>
      </button>
      <button class="toolbar-btn" data-action="code" title="行内代码 (Ctrl+`)">
        <span class="icon">&lt;/&gt;</span>
      </button>
      <button class="toolbar-btn" data-action="codeBlock" title="代码块 (Ctrl+Shift+`)">
        <span class="icon">```</span>
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <button class="toolbar-btn" data-action="link" title="链接 (Ctrl+K)">
        <span class="icon">🔗</span>
      </button>
      <button class="toolbar-btn" data-action="image" title="图片 (Ctrl+Shift+I)">
        <span class="icon">🖼</span>
      </button>
      <button class="toolbar-btn" data-action="table" title="表格">
        <span class="icon">▦</span>
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <button class="toolbar-btn" data-action="ul" title="无序列表 (Ctrl+Shift+8)">
        <span class="icon">•</span>
      </button>
      <button class="toolbar-btn" data-action="ol" title="有序列表 (Ctrl+Shift+7)">
        <span class="icon">1.</span>
      </button>
      <button class="toolbar-btn" data-action="task" title="待办清单">
        <span class="icon">☐</span>
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <button class="toolbar-btn" data-action="hr" title="分割线">
        <span class="icon">—</span>
      </button>
      <button class="toolbar-btn" data-action="toc" title="目录">
        <span class="icon">📑</span>
      </button>
      <button class="toolbar-btn" data-action="formula" title="数学公式">
        <span class="icon">fx</span>
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <button class="toolbar-btn" data-action="undo" title="撤销 (Ctrl+Z)">
        <span class="icon">↩</span>
      </button>
      <button class="toolbar-btn" data-action="redo" title="重做 (Ctrl+Y)">
        <span class="icon">↪</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

const emit = defineEmits(['action'])

const actions = {
  heading: () => insertMarkdown('# ', '标题'),
  heading2: () => insertMarkdown('## ', '标题'),
  heading3: () => insertMarkdown('### ', '标题'),
  bold: () => insertMarkdown('**', '**', '粗体文本'),
  italic: () => insertMarkdown('*', '*', '斜体文本'),
  strike: () => insertMarkdown('~~', '~~', '删除线文本'),
  quote: () => insertMarkdown('> ', ''),
  code: () => insertMarkdown('`', '`', '代码'),
  codeBlock: () => insertMarkdown('\n```\n', '\n```\n', '代码'),
  link: () => insertMarkdown('[', '](https://)', '链接文本'),
  image: () => insertMarkdown('![', '](https://)', '图片描述'),
  table: () => insertTable(),
  ul: () => insertMarkdown('- ', ''),
  ol: () => insertMarkdown('1. ', ''),
  task: () => insertMarkdown('- [ ] ', ''),
  hr: () => insertMarkdown('\n---\n', ''),
  toc: () => insertMarkdown('\n[TOC]\n', ''),
  formula: () => insertMarkdown('$', '$', '公式'),
  undo: () => document.execCommand('undo'),
  redo: () => document.execCommand('redo')
}

function insertMarkdown(before, after = '', placeholder = '') {
  emit('action', { type: 'insert', data: { before, after, placeholder } })
}

function insertTable() {
  const table = `
| 列1 | 列2 | 列3 |
|-----|-----|-----|
|     |     |     |
|     |     |     |
`
  emit('action', { type: 'insert', data: { text: table } })
}

onMounted(() => {
  const toolbar = document.querySelector('.toolbar')
  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.toolbar-btn')
    if (btn) {
      const action = btn.dataset.action
      if (actions[action]) {
        actions[action]()
      }
    }
  }
})
</script>

<style scoped>
.toolbar {
  height: 44px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  overflow-x: auto;
}

.toolbar-group {
  display: flex;
  gap: 2px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e0e0e0;
  margin: 0 4px;
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: #e0e0e0;
}

.toolbar-btn .icon {
  font-size: 14px;
  font-weight: normal;
}
</style>
EOF
```

- [ ] **Step 2: 更新 App.vue 集成工具栏**

```bash
cat > src/App.vue << 'EOF'
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
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useDocumentStore } from '@/stores/document'
import Editor from '@/components/Editor/Editor.vue'
import Toolbar from '@/components/Toolbar/Toolbar.vue'
import { renderMarkdown } from '@/utils/markdown'
import { setupScrollSync } from '@/utils/scrollSync'

const documentStore = useDocumentStore()
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

      // 如果有占位符，选中它
      if (placeholder && !selection.toString()) {
        // TODO: 选中占位符文本
      }
    }
  }
}

function handleNew() {
  if (documentStore.isDirty) {
    if (!confirm('当前文档未保存，是否继续新建？')) {
      return
    }
  }
  documentStore.newDocument()
  updatePreview()
}

function handleOpen() {
  if (documentStore.isDirty) {
    if (!confirm('当前文档未保存，是否继续打开？')) {
      return
    }
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

function handleSave() {
  const content = documentStore.content
  const filename = documentStore.documentName + '.md'

  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  documentStore.markSaved()
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
EOF
```

- [ ] **Step 3: 测试工具栏功能**

```bash
npm run dev
```

Expected: 所有工具栏按钮点击后在编辑器中插入正确的 Markdown 语法

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "feat: add toolbar with formatting actions"
```

---

## Chunk 7: 目录侧边栏组件

### Task 7.1: 创建目录组件

**Files:**
- Create: `src/components/Sidebar/Sidebar.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: 创建 Sidebar 组件**

```bash
mkdir -p src/components/Sidebar
cat > src/components/Sidebar/Sidebar.vue << 'EOF'
<template>
  <div class="sidebar" v-if="toc.length > 0">
    <div class="sidebar-header">
      <span class="sidebar-title">📑 目录</span>
    </div>
    <div class="sidebar-content">
      <div
        v-for="item in toc"
        :key="item.id"
        :class="['toc-item', `toc-level-${item.level}`, { active: activeId === item.id }]"
        @click="handleClick(item)"
      >
        {{ item.text }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { extractTOC } from '@/utils/markdown'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['navigate'])

const toc = ref([])
const activeId = ref('')

// 提取目录
watch(() => props.content, () => {
  toc.value = extractTOC(props.content)
}, { immediate: true })

// 点击目录项
function handleClick(item) {
  activeId.value = item.id
  emit('navigate', item)
}

// 设置当前激活项
function setActive(id) {
  activeId.value = id
}

defineExpose({ setActive })
</script>

<style scoped>
.sidebar {
  width: 240px;
  height: 100%;
  border-right: 1px solid #e0e0e0;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  height: 44px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.toc-item {
  padding: 4px 16px;
  font-size: 14px;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toc-item:hover {
  background: #e3f2fd;
  color: #1976d2;
}

.toc-item.active {
  background: #e3f2fd;
  color: #1976d2;
  font-weight: 500;
}

.toc-level-1 {
  padding-left: 16px;
}

.toc-level-2 {
  padding-left: 32px;
}

.toc-level-3 {
  padding-left: 48px;
}

.toc-level-4 {
  padding-left: 64px;
}

.toc-level-5 {
  padding-left: 80px;
}

.toc-level-6 {
  padding-left: 96px;
}
</style>
EOF
```

- [ ] **Step 2: 更新 App.vue 集成侧边栏**

```bash
cat > src/App.vue << 'EOF'
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
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useDocumentStore } from '@/stores/document'
import Editor from '@/components/Editor/Editor.vue'
import Toolbar from '@/components/Toolbar/Toolbar.vue'
import Sidebar from '@/components/Sidebar/Sidebar.vue'
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
      const insertText = before + (placeholder || '') + after
      editorRef.value.insertText(insertText)
    }
  }
}

function handleNavigate(item) {
  if (editorRef.value) {
    editorRef.value.scrollToLine(item.line)
    editorRef.value.focus()
  }

  // 滚动预览区到对应位置
  setTimeout(() => {
    const targetEl = previewRef.value?.querySelector(`#${item.id}`)
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' })
    }
  }, 100)
}

function handleNew() {
  if (documentStore.isDirty) {
    if (!confirm('当前文档未保存，是否继续新建？')) {
      return
    }
  }
  documentStore.newDocument()
  updatePreview()
}

function handleOpen() {
  if (documentStore.isDirty) {
    if (!confirm('当前文档未保存，是否继续打开？')) {
      return
    }
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

function handleSave() {
  const content = documentStore.content
  const filename = documentStore.documentName + '.md'

  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  documentStore.markSaved()
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
EOF
```

- [ ] **Step 3: 更新 markdown.js 为标题添加 ID**

```bash
cat > src/utils/markdown.js << 'EOF'
import MarkdownIt from 'markdown-it'
import markdownItTexmath from 'markdown-it-texmath'
import hljs from 'highlight.js'
import katex from 'katex'

import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'

// 自定义渲染器，为标题添加 ID
const originalRender = MarkdownIt.prototype.render

MarkdownIt.prototype.render = function(tokens, options, env) {
  // 为标题添加 ID
  tokens.forEach((token, i) => {
    if (token.type === 'heading_open') {
      const content = tokens[i + 1].content || ''
      const id = content
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w一-龥-]/g, '')
      token.attrSet('id', id)
    }
  })

  return MarkdownIt.prototype.render.call(this, tokens, options, env)
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch (__) {}
    }
    return ''
  }
})

md.use(markdownItTexmath, {
  engine: katex,
  delimiters: 'dollars',
  katexOptions: { macros: { "\\R": "\\mathbb{R}" } }
})

export function renderMarkdown(markdown) {
  if (!markdown) return ''
  return md.render(markdown)
}

export function extractTOC(markdown) {
  if (!markdown) return []

  const lines = markdown.split('\n')
  const toc = []
  const headingRegex = /^(#{1,6})\s+(.+)$/

  lines.forEach((line, index) => {
    const match = line.match(headingRegex)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w一-龥-]/g, '')

      toc.push({
        level,
        text,
        line: index + 1,
        id
      })
    }
  })

  return toc
}

export default md
EOF
```

- [ ] **Step 4: 测试目录功能**

```bash
npm run dev
```

Expected:
- 输入带标题的 Markdown 后，左侧显示目录
- 点击目录项，编辑器和预览区滚动到对应位置

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "feat: add sidebar with TOC navigation"
```

---

## Chunk 8: 对话框组件

### Task 8.1: 创建确认对话框和保存对话框

**Files:**
- Create: `src/components/Dialogs/ConfirmDialog.vue`
- Create: `src/components/Dialogs/SaveDialog.vue`
- Modify: `src/stores/document.js`
- Modify: `src/App.vue`

- [ ] **Step 1: 创建确认对话框**

```bash
mkdir -p src/components/Dialogs
cat > src/components/Dialogs/ConfirmDialog.vue << 'EOF'
<template>
  <Teleport to="body">
    <div class="dialog-overlay" @click="$emit('cancel')">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3 class="dialog-title">{{ title }}</h3>
        </div>
        <div class="dialog-body">
          <p>{{ message }}</p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="$emit('cancel')">
            {{ cancelText }}
          </button>
          <button class="btn btn-primary" @click="$emit('confirm')">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: '确认'
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: '确认'
  },
  cancelText: {
    type: String,
    default: '取消'
  }
})

defineEmits(['confirm', 'cancel'])
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.dialog-body {
  padding: 20px;
}

.dialog-body p {
  margin: 0;
  color: #555;
  line-height: 1.5;
}

.dialog-footer {
  padding: 12px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 8px 16px;
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

.btn-secondary {
  color: #666;
}
</style>
EOF
```

- [ ] **Step 2: 创建保存对话框**

```bash
cat > src/components/Dialogs/SaveDialog.vue << 'EOF'
<template>
  <Teleport to="body">
    <div class="dialog-overlay" @click="$emit('cancel')">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3 class="dialog-title">保存文档</h3>
        </div>
        <div class="dialog-body">
          <label class="form-label">文件名</label>
          <input
            ref="inputRef"
            type="text"
            class="form-input"
            :value="filename"
            @input="$emit('update:filename', $event.target.value)"
            @keyup.enter="$emit('confirm')"
          />
          <p class="form-hint">文件将保存为 .md 格式</p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="$emit('cancel')">
            取消
          </button>
          <button class="btn btn-primary" @click="$emit('confirm')">
            保存
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  filename: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:filename', 'confirm', 'cancel'])

const inputRef = ref(null)

watch(() => props.filename, () => {
  // 当 filename 变化时（对话框打开），聚焦输入框
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
      inputRef.value.select()
    }
  })
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.dialog-body {
  padding: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

.form-hint {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #888;
}

.dialog-footer {
  padding: 12px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 8px 16px;
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

.btn-secondary {
  color: #666;
}
</style>
EOF
```

- [ ] **Step 3: 更新 document store 添加对话框状态**

```bash
cat > src/stores/document.js << 'EOF'
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
    return new Promise((resolve) => {
      // 组件会通过 emit 调用 resolve
      confirmDialogConfig.value.onConfirm = (filename) => {
        showSaveDialog.value = false
        resolve(filename)
      }
      confirmDialogConfig.value.onCancel = () => {
        showSaveDialog.value = false
        resolve(null)
      }
    })
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
EOF
```

- [ ] **Step 4: 更新 App.vue 使用对话框**

```bash
cat > src/App.vue << 'EOF'
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
      const insertText = before + (placeholder || '') + after
      editorRef.value.insertText(insertText)
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
EOF
```

- [ ] **Step 5: 测试对话框功能**

```bash
npm run dev
```

Expected: 新建/打开时弹出确认对话框，保存时弹出保存对话框

- [ ] **Step 6: 提交**

```bash
git add .
git commit -m "feat: add confirm and save dialogs"
```

---

## Chunk 9: 最终优化和构建

### Task 9.1: 优化和构建配置

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Create: `public/favicon.ico`
- Modify: `src/assets/styles/main.css`

- [ ] **Step 1: 更新 vite.config.js**

```bash
cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'markdown-vendor': ['markdown-it', 'markdown-it-texmath'],
          'editor-vendor': ['@codemirror/state', '@codemirror/view', '@codemirror/lang-markdown'],
          'highlight-vendor': ['highlight.js', 'katex']
        }
      }
    }
  }
})
EOF
```

- [ ] **Step 2: 添加 favicon**

```bash
# 创建简单的 SVG favicon
cat > public/favicon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#1976d2"/>
  <text x="16" y="22" text-anchor="middle" fill="white" font-family="monospace" font-size="18" font-weight="bold">M</text>
</svg>
EOF

# 更新 index.html
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="功能强大的 Markdown 编辑器，支持粘贴识别、分屏预览">
  <title>MD 编辑器</title>
  <link rel="icon" href="/favicon.svg">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
EOF
```

- [ ] **Step 3: 优化全局样式**

```bash
cat > src/assets/styles/main.css << 'EOF'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

#app {
  height: 100%;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Markdown 预览样式 */
.markdown-preview {
  line-height: 1.8;
  color: #333;
}

.markdown-preview h1,
.markdown-preview h2,
.markdown-preview h3,
.markdown-preview h4,
.markdown-preview h5,
.markdown-preview h6 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-preview h1 {
  font-size: 2em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

.markdown-preview h2 {
  font-size: 1.5em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

.markdown-preview h3 {
  font-size: 1.25em;
}

.markdown-preview h4 {
  font-size: 1em;
}

.markdown-preview h5 {
  font-size: 0.875em;
}

.markdown-preview h6 {
  font-size: 0.85em;
  color: #6a737d;
}

.markdown-preview p {
  margin-bottom: 1em;
}

.markdown-preview a {
  color: #0366d6;
  text-decoration: none;
}

.markdown-preview a:hover {
  text-decoration: underline;
}

.markdown-preview strong {
  font-weight: 600;
}

.markdown-preview em {
  font-style: italic;
}

.markdown-preview code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.markdown-preview pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 6px;
  margin-bottom: 1em;
}

.markdown-preview pre code {
  padding: 0;
  background-color: transparent;
}

.markdown-preview blockquote {
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
  margin-bottom: 1em;
}

.markdown-preview ul,
.markdown-preview ol {
  padding-left: 2em;
  margin-bottom: 1em;
}

.markdown-preview li {
  margin-bottom: 0.25em;
}

.markdown-preview table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1em;
}

.markdown-preview table th,
.markdown-preview table td {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.markdown-preview table th {
  font-weight: 600;
  background-color: #f6f8fa;
}

.markdown-preview table tr:nth-child(2n) {
  background-color: #f6f8fa;
}

.markdown-preview img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em 0;
}

.markdown-preview hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #e1e4e8;
  border: 0;
}

.markdown-preview .task-list-item {
  list-style-type: none;
}

.markdown-preview .task-list-item input {
  margin: 0 0.5em 0.25em -1.6em;
  vertical-align: middle;
}
EOF
```

- [ ] **Step 4: 构建项目**

```bash
npm run build
```

Expected: 生成 dist 目录，包含静态文件

- [ ] **Step 5: 预览构建结果**

```bash
npm run preview
```

Expected: 预览服务器启动，可以验证构建后的应用

- [ ] **Step 6: 提交**

```bash
git add .
git commit -m "feat: optimize build configuration and styles"
```

- [ ] **Step 7: 添加 README.md**

```bash
cat > README.md << 'EOF'
# MD 编辑器

功能强大的 Markdown 编辑器，支持粘贴识别、分屏预览。

## 功能特性

- ✅ 粘贴识别：从 Word/网页粘贴内容，自动转换为 Markdown
- ✅ 图片处理：图片 Base64 嵌入，单文件导出
- ✅ 分屏预览：左侧编辑，右侧实时预览
- ✅ 目录导航：自动生成目录，点击定位
- ✅ 完整工具栏：支持所有常用 Markdown 语法
- ✅ 本地文件：新建/打开/保存本地 .md 文件
- ✅ 数学公式：支持 KaTeX 公式渲染
- ✅ 代码高亮：支持多种编程语言

## 快速开始

### 安装依赖

\`\`\`bash
npm install
\`\`\`

### 开发模式

\`\`\`bash
npm run dev
\`\`\`

### 构建

\`\`\`bash
npm run build
\`\`\`

### 预览

\`\`\`bash
npm run preview
\`\`\`

## 技术栈

- Vue 3
- Vite
- CodeMirror 6
- markdown-it
- turndown
- KaTeX
- highlight.js
- Pinia

## 许可证

MIT
EOF
```

- [ ] **Step 8: 最终提交**

```bash
git add README.md
git commit -m "docs: add README documentation"
```

---

## 验收检查清单

### 基础功能
- [ ] 编辑器可以正常输入 Markdown 文本
- [ ] 预览区正确渲染 Markdown
- [ ] 滚动同步工作正常

### 文件操作
- [ ] 新建文档功能正常
- [ ] 打开本地 .md 文件功能正常
- [ ] 保存文档功能正常
- [ ] 未保存状态显示正确

### 粘贴识别
- [ ] 从网页粘贴内容正确转换为 Markdown
- [ ] 粘贴的图片正确显示
- [ ] 粘贴的表格正确转换

### 工具栏
- [ ] 所有工具栏按钮功能正常
- [ ] 插入的语法格式正确

### 目录
- [ ] 目录正确生成
- [ ] 点击目录正确跳转
- [ ] 当前位置高亮显示

### 对话框
- [ ] 确认对话框正常显示和工作
- [ ] 保存对话框正常显示和工作

### 构建部署
- [ ] 生产构建成功
- [ ] 构建后的应用功能正常

---

## 实施完成

完成以上所有任务后，MD 编辑器应具备以下能力：

1. 完整的 Markdown 编辑和预览功能
2. 粘贴 HTML 内容自动识别转换
3. 图片 Base64 嵌入保存
4. 分屏预览，滚动同步
5. 目录导航
6. 完整的工具栏
7. 新建/打开/保存本地文件
8. 可部署为纯静态应用
