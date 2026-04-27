# Markdown 编辑器设计文档

**项目名称：** MD 编辑器
**创建日期：** 2026-04-27
**设计版本：** 1.0

## 1. 项目概述

### 1.1 目标

开发一个功能强大的 Web 版 Markdown 编辑器，支持：

- 从 Word/网页粘贴带图片和表格的内容，1:1 还原识别
- 完整的 Markdown 编辑功能（文本、图片、表格增删改查）
- 保存为单个 .md 文件，图片以 Base64 嵌入，确保跨编辑器兼容
- 打开本地 .md 文件进行编辑
- 分屏预览模式（左编辑、右预览）
- 自动生成目录，支持点击定位

### 1.2 核心差异化

- **单文件导出**：图片 Base64 嵌入，保存后在任何 MD 编辑器中都能正常显示
- **粘贴智能识别**：自动将粘贴的 HTML 内容转换为 Markdown
- **完整工具栏**：支持所有常用 Markdown 语法

## 2. 技术栈

| 层级 | 技术选型 | 版本 | 用途 |
|------|----------|------|------|
| 框架 | Vue 3 | ^3.4.0 | 响应式 UI |
| 构建工具 | Vite | ^5.0.0 | 快速开发构建 |
| 编辑器核心 | CodeMirror 6 | ^6.0.0 | 代码编辑 |
| Markdown 解析 | markdown-it | ^14.0.0 | MD → HTML |
| HTML 转换 | turndown | ^7.1.0 | HTML → MD |
| 数学公式 | KaTeX | ^0.16.0 | LaTeX 渲染 |
| 代码高亮 | highlight.js | ^11.9.0 | 代码块语法 |
| 状态管理 | Pinia | ^2.1.0 | 文档状态管理 |

## 3. 系统架构

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        MD Editor Application                     │
├─────────────────────────────────────────────────────────────────┤
│  Header (文档名、状态)  │  Toolbar (格式化工具)  │  File Actions  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────────────┐  │
│  │  TOC Sidebar    │  │  Editor Area │  Preview Area        │  │
│  │  (自动生成目录)  │  │  (CodeMirror) │  (HTML 渲染)         │  │
│  └─────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 核心模块

| 模块 | 职责 |
|------|------|
| EditorModule | CodeMirror 集成，编辑逻辑 |
| PreviewModule | Markdown 渲染，滚动同步 |
| ToolbarModule | 格式化操作，插入模板 |
| TOCModule | 目录提取，锚点跳转 |
| FileModule | 新建/打开/保存文件 |
| PasteModule | 粘贴事件拦截，格式转换 |

### 3.3 数据流

```
Paste Event (HTML)
       │
       ▼
┌─────────────────┐
│  turndown       │──► Markdown Text
│  (HTML→MD)      │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  CodeMirror     │──► User Edits
│  Editor         │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  markdown-it    │──► HTML Preview
│  + Plugins      │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Save (Base64   │──► .md File Download
│  images embed)  │
└─────────────────┘
```

## 4. UI/UX 设计

### 4.1 布局规范

| 区域 | 尺寸 | 说明 |
|------|------|------|
| Header | 56px 高度 | 固定 |
| Toolbar | 44px 高度 | 固定 |
| TOC Sidebar | 240px 宽度 | 可折叠 |
| Editor Area | flex: 1 | 自适应 |
| Preview Area | flex: 1 | 自适应 |

### 4.2 Header 组件

**位置：** 页面顶部

**左侧显示：**
- 编辑器名称："MD 编辑器"
- 当前文档名称：取第一行前 10 字符，超出用省略号
- 保存状态：●未保存 / ✓已保存

**右侧按钮：**
- 新建文档：清空编辑器，未保存时确认
- 打开：选择本地 .md 文件，未保存时确认
- 保存：弹出保存对话框，输入文件名

### 4.3 Toolbar 组件

**功能按钮：**

| 分类 | 功能 | 图标 | 快捷键 |
|------|------|------|--------|
| 标题 | H1-H6 | H₁-H₆ | Ctrl+1~6 |
| 文本 | 粗体 | **B** | Ctrl+B |
| 文本 | 斜体 | *I* | Ctrl+I |
| 文本 | 删除线 | ~~S~~ | - |
| 引用 | 引用块 | > | Ctrl+Shift+. |
| 代码 | 行内代码 | `< >` | Ctrl+` |
| 代码 | 代码块 | `</>` | Ctrl+Shift+` |
| 媒体 | 图片 | 🖼 | Ctrl+Shift+I |
| 媒体 | 链接 | 🔗 | Ctrl+K |
| 表格 | 插入表格 | ▦ | - |
| 列表 | 无序列表 | • | Ctrl+Shift+8 |
| 列表 | 有序列表 | 1. | Ctrl+Shift+7 |
| 列表 | 待办清单 | ☐ | - |
| 其他 | 分割线 | — | - |
| 其他 | 目录 | 📑 | - |
| 其他 | 数学公式 | fx | - |
| 编辑 | 撤销 | ↩ | Ctrl+Z |
| 编辑 | 重做 | ↪ | Ctrl+Y |

### 4.4 交互行为

**新建文档流程：**
1. 检查当前文档是否未保存
2. 如未保存，显示确认对话框
3. 清空编辑器，重置状态

**打开文档流程：**
1. 检查当前文档是否未保存
2. 如未保存，显示确认对话框
3. 触发文件选择，读取 .md 内容
4. 填充编辑器，更新文档名

**保存文档流程：**
1. 弹出保存对话框
2. 用户输入文件名（默认取标题前 10 字符）
3. 确保文件名以 .md 结尾
4. 触发浏览器下载

**目录交互：**
- 点击目录项 → 编辑器光标定位 + 滚动
- 当前位置对应的目录项高亮显示

**滚动同步：**
- 编辑区滚动 → 预览区按比例跟随
- 预览区滚动 → 编辑区按比例跟随

**粘贴处理：**
1. 监听 paste 事件
2. 提取 HTML 内容
3. 图片转换为 Base64
4. HTML → Markdown 转换
5. 插入到光标位置

## 5. 组件设计

### 5.1 目录结构

```
md-editor/
├── index.html
├── package.json
├── vite.config.js
├── public/
└── src/
    ├── main.js
    ├── App.vue
    ├── stores/
    │   └── document.js
    ├── components/
    │   ├── Header/
    │   │   └── Header.vue
    │   ├── Toolbar/
    │   │   └── Toolbar.vue
    │   ├── Editor/
    │   │   └── Editor.vue
    │   ├── Preview/
    │   │   └── Preview.vue
    │   ├── Sidebar/
    │   │   └── Sidebar.vue
    │   └── Dialogs/
    │       ├── ConfirmDialog.vue
    │       └── SaveDialog.vue
    ├── utils/
    │   ├── markdown.js
    │   ├── turndown.js
    │   ├── toc.js
    │   ├── file.js
    │   └── scrollSync.js
    └── assets/
        └── styles/
            └── main.css
```

### 5.2 核心组件

#### 5.2.1 App.vue

根组件，负责整体布局和子组件协调。

**Props:** 无

**State:**
- `showSidebar`: boolean

**Events:** 无

**方法:**
- `handleNew()`: 新建文档
- `handleOpen()`: 打开文档
- `handleSave()`: 保存文档

#### 5.2.2 Editor.vue

CodeMirror 6 封装组件。

**Props:**
- `modelValue`: string (v-model)

**Events:**
- `update:modelValue`: 内容变化
- `paste`: 粘贴事件

**暴露方法:**
- `insertMarkdown(text, position)`: 插入文本
- `getSelection()`: 获取选中文本
- `scrollToLine(line)`: 滚动到指定行
- `focus()`: 聚焦编辑器

#### 5.2.3 Preview.vue

Markdown 预览组件。

**Props:**
- `content`: string (Markdown 文本)

**State:**
- `html`: string (渲染后的 HTML)
- `scrollRatio`: number (滚动比例)

**暴露方法:**
- `render()`: 重新渲染
- `scrollTo(ratio)`: 滚动到指定比例

#### 5.2.4 Sidebar.vue

目录侧边栏组件。

**Props:**
- `content`: string (Markdown 文本)

**State:**
- `toc`: Array<{level, text, line}> (目录结构)

**Events:**
- `navigate`: 点击目录项

#### 5.2.5 Toolbar.vue

工具栏组件。

**Props:** 无

**Events:**
- `action`: 工具栏操作事件

**方法:**
- `insertHeading(level)`: 插入标题
- `insertBold()`: 插入粗体
- `insertTable()`: 插入表格
- ...其他格式化方法

### 5.3 工具模块

#### 5.3.1 turndown.js

HTML → Markdown 转换。

```javascript
export function htmlToMarkdown(html) {
  // 使用 turndown 库
  // 处理图片 Base64 转换
  // 处理表格转换
  return markdown
}
```

#### 5.3.2 toc.js

目录提取。

```javascript
export function extractTOC(markdown) {
  // 解析 # 标题
  // 返回 {level, text, line} 数组
  return toc
}
```

#### 5.3.3 scrollSync.js

滚动同步。

```javascript
export function setupScrollSync(editorEl, previewEl) {
  // 双向滚动同步
  // 防抖处理
}
```

#### 5.3.4 file.js

文件操作。

```javascript
export function saveFile(content, filename) {
  // 触发浏览器下载
}

export async function openFile() {
  // 打开文件选择对话框
  // 返回文件内容
}
```

## 6. 技术实现细节

### 6.1 图片处理

**粘贴时：**
1. 从 clipboardData 获取图片
2. FileReader 读取为 Base64
3. 插入到 Markdown：`![alt](data:image/png;base64,...)`

**保存时：**
1. 扫描 Markdown 中的图片引用
2. 确保所有图片都是 Base64 格式
3. 直接保存为 .md 文件

### 6.2 表格处理

**粘贴时：**
1. 解析 HTML 表格结构
2. 转换为 Markdown 表格语法
3. 确保对齐正确

**编辑时：**
- 工具栏提供插入表格对话框
- 用户指定行列数
- 插入模板表格

### 6.3 滚动同步算法

```javascript
function syncScroll(source, target) {
  const sourceRatio = source.scrollTop / (source.scrollHeight - source.clientHeight)
  target.scrollTop = sourceRatio * (target.scrollHeight - target.clientHeight)
}
```

### 6.4 目录生成算法

```javascript
function extractTOC(markdown) {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  const headings = []
  let match
  let lineNumber = 0

  while ((match = headingRegex.exec(markdown)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2],
      line: lineNumber
    })
  }

  return headings
}
```

## 7. 部署方案

### 7.1 构建输出

- 纯静态文件
- 可部署到任何静态托管服务
  - Vercel
  - Netlify
  - GitHub Pages
  - 阿里云 OSS + CDN

### 7.2 构建命令

```bash
npm run build
```

输出目录：`dist/`

## 8. 测试计划

| 测试类型 | 测试内容 |
|----------|----------|
| 功能测试 | 所有工具栏按钮功能 |
| 功能测试 | 新建/打开/保存流程 |
| 功能测试 | 粘贴识别（含图片、表格） |
| 兼容性测试 | 导出的 .md 在其他编辑器中显示 |
| 性能测试 | 大文件编辑性能 |
| 性能测试 | 图片加载性能 |
| 浏览器兼容 | Chrome/Firefox/Safari/Edge |

## 9. 未来扩展

- 多标签页支持
- 云端保存
- 协作编辑
- 主题切换
- 导出 PDF/Word
- 图片上传到图床
