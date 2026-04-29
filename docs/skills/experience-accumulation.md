# Vue 3 Markdown 编辑器 - 经验沉淀

> 本文档记录项目开发过程中遇到的问题、根本原因及解决方案，方便后续复用。

---

## 问题 1：未保存警告不显示

### 现象
- 编辑文档后刷新页面，没有提示保存
- 新建/打开文档时，如果有未保存的更改，没有提示

### 根本原因
Vue 3 的 `v-model` 直接修改 `content.value`，但不触发 Pinia store 的 `setContent()` 方法，导致 `isDirty` 状态从未被设置为 `true`。

### 解决方案
在 `App.vue` 中添加 `watch` 监听内容变化：

```javascript
watch(() => documentStore.content, (newContent, oldContent) => {
  if (oldContent !== undefined && newContent !== oldContent) {
    documentStore.isDirty = true
  }
  hasUnsavedChanges.value = documentStore.isDirty
})
```

同时监听 `beforeunload` 事件：

```javascript
const handleBeforeUnload = (event) => {
  if (hasUnsavedChanges.value) {
    event.preventDefault()
    event.returnValue = ''
    return ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})
```

---

## 问题 2：保存使用浏览器下载而非系统文件选择器

### 现象
- 点击保存按钮时，文件直接下载到默认位置
- 无法选择保存位置和文件名

### 解决方案
使用 **File System Access API** (`showSaveFilePicker`)：

```javascript
async function saveDocumentDirectly() {
  const content = documentStore.content
  const filename = documentStore.documentName

  const handle = await window.showSaveFilePicker({
    suggestedName: filename,
    types: [
      {
        description: 'Markdown Files',
        accept: { 'text/markdown': ['.md'] }
      }
    ]
  })

  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}
```

---

## 问题 3：粘贴时出现 CSS 垃圾文本

### 现象
- 从 Word/网页/企微文档粘贴时，出现大量 CSS 代码和 HTML 注释
- 内容中包含 `<style>` 标签和 HTML 注释

### 解决方案
创建 `cleanHTML()` 函数，在 HTML 转 Markdown 之前清理：

```javascript
function cleanHTML(html) {
  if (!html) return html

  let clean = html

  // 移除 <style> 标签（多行支持）
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // 移除 HTML 注释
  clean = clean.replace(/<!--[\s\S]*?-->/g, '')

  // 移除 <link> 和 <meta> 标签
  clean = clean.replace(/<link\b[^>]*>/gi, '')
  clean = clean.replace(/<meta\b[^>]*>/gi, '')

  // 处理只包含图片的链接：<a><img></a> → <img>
  clean = clean.replace(/<a\b[^>]*>\s*<img([^>]*)>\s*<\/a>/gi, (match, attrs) => {
    return '<img' + attrs + '>'
  })

  // 移除 class、style、id 属性
  clean = clean.replace(/\sclass\s*=\s*["'][^"']*["']/gi, '')
  clean = clean.replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '')
  clean = clean.replace(/\sid\s*=\s*["'][^"']*["']/gi, '')

  return clean
}
```

---

## 问题 4：合并单元格表格图片不显示（最复杂）

### 现象
- 从企微文档粘贴包含图片的表格
- 独立单元格（无 colspan/rowspan）图片正常显示
- 合并单元格（colspan > 1 或 rowspan > 1）图片不显示

### 根本原因分析

#### 原因 1：错误检测合并单元格
原代码：
```javascript
const hasMergedCells = node.querySelector('[colspan], [rowspan]')
```
**问题**：会匹配 `colspan="1"` 和 `rowspan="1"`（表示不合并的单元格）

**修复**：
```javascript
const cells = node.querySelectorAll('td, th')
let hasMergedCells = false
for (const cell of cells) {
  const colspan = parseInt(cell.getAttribute('colspan') || '1')
  const rowspan = parseInt(cell.getAttribute('rowspan') || '1')
  if (colspan > 1 || rowspan > 1) {
    hasMergedCells = true
    break
  }
}
```

#### 原因 2：图片在合并单元格处理中丢失
对于合并单元格表格，策略是**保留 HTML 格式**（Typora 无法正确解析混合了 Markdown 语法的 HTML 表格）。

但在处理段落中的图片时，原代码只提取了 `textContent`，导致图片和 HTML 结构丢失。

**修复**：完全保留原始 HTML 结构
```javascript
else if (tagName === 'p') {
  const pImages = nodeChild.querySelectorAll('img')
  if (pImages.length > 0) {
    // 段落包含图片 - 完全保留原始 HTML 结构
    cellContent += nodeChild.outerHTML
  } else {
    // 段落没有图片，使用 Turndown 转换
    cellContent += turndownService.turndown(nodeChild.outerHTML).trim() + '<br>'
  }
}
```

### 最终方案

**独立单元格表格** → 转换为 Markdown 格式
```markdown
| 模块 | 描述 | demo |
| --- | --- | --- |
| 内容1 | 内容2 | 内容3 |
```

**合并单元格表格** → 保持 HTML 格式
```html
<table>
  <tr>
    <td colspan="2">内容</td>
    <td>内容</td>
  </tr>
</table>
```

**关键点**：HTML 表格中的 `<img>` 必须保持为 HTML 标签，不能转换为 Markdown `![]()` 语法。

---

## 问题 5：BOM 字符导致文档显示异常

### 现象
- 打开某些 .md 文件时，第一行显示异常
- 文件开头有不可见字符

### 解决方案
在读取文件时移除 BOM（Byte Order Mark）：

```javascript
function cleanContent(content) {
  if (!content) return content

  let clean = content

  // BOM (Byte Order Mark) 是 U+FEFF
  const firstCharCode = clean.charCodeAt(0)
  if (firstCharCode === 65279 || firstCharCode === 0xFEFF) {
    clean = clean.substring(1)
  }

  // 移除其他零宽度字符
  while (clean.length > 0) {
    const code = clean.charCodeAt(0)
    if ([8203, 8204, 8205, 8206, 8207, 65279].includes(code)) {
      clean = clean.substring(1)
    } else {
      break
    }
  }

  return clean
}
```

---

## 调试技巧总结

### 1. 使用 DEBUG 日志定位问题
在关键处理环节添加日志，追踪数据流：

```javascript
console.log('[DEBUG] ===== FUNCTION_NAME START =====')
console.log('[DEBUG] Input has <img>:', html.includes('<img'))
console.log('[DEBUG] Output:', result)
console.log('[DEBUG] ==================================')
```

### 2. 分段验证
- 验证原始数据（剪贴板 HTML）
- 验证清理后数据（cleanHTML）
- 验证转换后数据（turndown）

### 3. 对比测试
- 对比独立单元格 vs 合并单元格
- 对比有图片 vs 无图片
- 对比预览 vs 保存文件

---

## 依赖库说明

| 库 | 用途 | 注意事项 |
|---|---|---|
| turndown | HTML → Markdown 转换 | 自定义规则优先级很重要 |
| markdown-it | Markdown → HTML 渲染 | 支持 HTML 混合 |
| codemirror | 编辑器核心 | 粘贴事件需自定义处理 |
| pinia | 状态管理 | v-model 不会自动触发 store 方法 |

---

## 文件结构

```
src/
├── utils/
│   └── turndown.js          # HTML → Markdown 转换逻辑
├── stores/
│   └── document.js          # 文档状态管理
├── components/
│   ├── Editor/
│   │   └── Editor.vue       # 编辑器组件（粘贴处理）
│   └── Dialogs/
│       └── UnsavedDialog.vue # 未保存警告对话框
└── App.vue                   # 主应用组件（beforeunload 处理）
```

---

## 问题 6：点击目录后编辑区和预览区不能准确定位

### 现象
- 点击左侧目录时，编辑区和预览区虽然会滚动，但位置不准确
- 目标标题没有显示在视口顶部，而是显示在偏下的位置
- 有时完全滚动到错误的位置

### 根本原因分析

#### 原因 1：滚动同步机制干扰
原代码在目录跳转时，编辑器的滚动会触发 `onEditorScroll` 事件，进而调用滚动同步机制，将预览区滚动到**基于比例的位置**，而非目标标题的实际位置。这覆盖了对预览区的精确滚动。

```javascript
// 问题代码：编辑器滚动 → 触发同步 → 覆盖预览区滚动
function onEditorScroll(scrollInfo) {
  scrollSync.onEditorScroll(scrollInfo)  // ← 干扰目录跳转
}
```

#### 原因 2：offsetTop 计算不准确
使用 `offsetTop` 计算元素位置时，由于复杂的 DOM 结构（`.preview-area` 有 padding，`.preview-content` 有 margin），导致计算链不准确：

```javascript
// 问题代码：offsetTop 计算不准确
const targetScrollTop = previewContent.offsetTop + targetEl.offsetTop
// previewContent.offsetTop = 164（而非预期的 16）
```

#### 原因 3：CodeMirror 的 scrollIntoView 行为
CodeMirror 的 `scrollIntoView: true` 只确保元素可见，不会将其滚动到视口顶部。

### 解决方案

#### 方案 1：添加导航标志，禁用滚动同步
```javascript
// App.vue
const isNavigating = ref(false)

function onEditorScroll(scrollInfo) {
  if (isNavigating.value) return  // ← 导航期间跳过同步
  scrollSync.onEditorScroll(scrollInfo)
}

function onPreviewScroll(event) {
  if (isNavigating.value) return  // ← 导航期间跳过同步
  // ...
}
```

#### 方案 2：使用 getBoundingClientRect 精确计算位置
```javascript
// 使用 getBoundingClientRect 获取准确的相对位置
const containerRect = previewContainer.getBoundingClientRect()
const elementRect = targetEl.getBoundingClientRect()

// 计算滚动位置：元素相对视口位置 - 容器相对视口位置 + 当前滚动位置
const targetScrollTop = elementRect.top - containerRect.top + previewContainer.scrollTop

previewContainer.scrollTop = targetScrollTop
```

#### 方案 3：编辑器精确滚动到行顶部
```javascript
// Editor.vue
scrollToLineAndScrollToTop(line) {
  // 获取行的位置
  const linePos = view.coordsAtPos(lineObj.from)
  const viewportRect = view.dom.getBoundingClientRect()

  // 计算内容中的位置
  const lineTopInContent = scroller.scrollTop + (linePos.top - viewportRect.top)

  // 减去 padding，将行滚动到顶部
  scroller.scrollTop = lineTopInContent - contentPaddingTop
}
```

### 最终方案

**目录跳转流程**：
1. 设置 `isNavigating = true` 禁用滚动同步
2. 编辑器使用 `coordsAtPos` 精确计算行位置并滚动
3. 预览区使用 `getBoundingClientRect` 计算元素位置并滚动
4. 300ms 后恢复滚动同步

**关键点**：
- `getBoundingClientRect().top` 是相对于视口的，与 `scrollTop` 结合可得到绝对位置
- 导航期间必须禁用滚动同步，否则会干扰精确定位

---

## 最后更新
- 日期：2026-04-29
- 版本：1.0.1
- 状态：所有问题已解决 ✅
