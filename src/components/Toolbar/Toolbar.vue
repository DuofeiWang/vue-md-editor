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
  })
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
