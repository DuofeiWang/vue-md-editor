# MD 编辑器

功能强大的 Markdown 编辑器，支持粘贴识别、分屏预览。

## 功能特性

- ✅ 粘贴识别：从 Word/网页粘贴内容，自动转换为 Markdown
- ✅ 图片处理：图片 Base64 嵌入，单文件导出
- ✅ 分屏预览：左侧编辑，右侧实时预览
- ✅ 目录导航：自动生成目录，点击定位
- ✅ 完整工具栏：支持所有常用 Markdown 语法
- ✅ 本地文件：新建/打开/保存本地 .md 文件
- ✅ 代码高亮：支持多种编程语言

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

### 构建

```bash
npm run build
```

### 预览

```bash
npm run preview
```

## 技术栈

- Vue 3
- Vite
- CodeMirror 6
- markdown-it
- turndown
- highlight.js
- Pinia

## 使用说明

1. **编辑**：在左侧编辑区输入 Markdown 语法
2. **粘贴**：从 Word/网页复制内容，直接粘贴到编辑器
3. **保存**：点击保存按钮，输入文件名，下载 .md 文件
4. **打开**：点击打开按钮，选择本地 .md 文件

## 许可证

MIT
