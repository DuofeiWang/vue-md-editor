import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

import 'highlight.js/styles/github.css'

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

// 统一的 ID 生成函数，确保 extractTOC 和 heading_open 生成相同的 ID
function generateHeadingId(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w一-龥-]/g, '')
}

// 自定义渲染规则，为标题添加 ID
const defaultRender = md.renderer.rules.heading_open || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}

md.renderer.rules.heading_open = function (tokens, idx, options, env, self) {
  const level = tokens[idx].markup.length
  const nextToken = tokens[idx + 1]
  const text = nextToken ? nextToken.content : ''

  // 生成 ID - 使用统一的函数
  const id = generateHeadingId(text)

  tokens[idx].attrSet('id', id)

  return self.renderToken(tokens, idx, options)
}

// 将 Markdown 表格转换为 HTML 表格（仅处理表格，不影响其他内容）
function convertMarkdownTablesToHTML(markdown) {
  return markdown.replace(/(?:^|\n)((?:\|[^\n]+\|\n)+)/g, function(match, tableContent) {
    const lines = tableContent.trim().split('\n')
    if (lines.length < 2) return match

    const headerLine = lines[0].trim()
    const sepLine = lines[1].trim()

    // 检查是否是有效的表格
    if (!headerLine.startsWith('|') || !headerLine.endsWith('|')) return match
    if (!sepLine.match(/^\|[\s\-\|:]+\|$/)) return match

    // 解析表头
    const headerCells = headerLine.slice(1, -1).split('|').map(c => c.trim())

    // 解析对齐方式
    const sepCells = sepLine.slice(1, -1).split('|').map(c => c.trim())
    const alignments = sepCells.map(sep => {
      if (sep.startsWith(':') && sep.endsWith(':')) return 'center'
      if (sep.startsWith(':')) return 'left'
      if (sep.endsWith(':')) return 'right'
      return ''
    })

    // 构建表格 HTML
    let html = '<table>\n<thead>\n<tr>\n'

    // 表头
    for (let i = 0; i < headerCells.length; i++) {
      const align = alignments[i] ? ` style="text-align:${alignments[i]}"` : ''
      // 处理单元格内容：先处理图片，再让 markdown-it 处理其他行内语法
      let cellContent = renderCellWithImages(headerCells[i] || '')
      html += `<th${align}>${cellContent}</th>\n`
    }
    html += '</tr>\n</thead>\n<tbody>\n'

    // 数据行
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line.startsWith('|') || !line.endsWith('|')) break

      const cells = line.slice(1, -1).split('|').map(c => c.trim())
      html += '<tr>\n'

      for (let j = 0; j < Math.max(cells.length, headerCells.length); j++) {
        const align = alignments[j] ? ` style="text-align:${alignments[j]}"` : ''
        let cellContent = renderCellWithImages(cells[j] || '')
        html += `<td${align}>${cellContent}</td>\n`
      }
      html += '</tr>\n'
    }

    html += '</tbody>\n</table>'
    return html
  })
}

// 辅助函数：渲染单元格内容
// 处理两种情况：
// 1. markdown-it 已处理的 HTML（包含 <img> 等标签）
// 2. 未处理的 Markdown 语法（![alt](url) 等）
function renderCellWithImages(content) {
  if (!content) return ''

  let result = content

  // 检查是否已经被 markdown-it 处理过（包含 HTML 标签）
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(result)

  if (hasHtmlTags) {
    // 已经是 HTML，直接返回（markdown-it 已经处理过了）
    // 只需要确保 img 标签有正确的样式
    // 首先移除已存在的 style 属性，然后添加统一的样式
    result = result.replace(
      /<img([^>]*)>/gi,
      function(match, attrs) {
        // 移除原有的 style 属性
        const cleanAttrs = attrs.replace(/\s+style=["'][^"']*["']/gi, '')
        return `<img${cleanAttrs} style="max-width:100%;height:auto;display:inline-block;vertical-align:middle;">`
      }
    )
    return result
  }

  // 是纯 Markdown 语法，需要手动转换
  // 1. 处理图片：![alt](url) - URL 可能包含括号等特殊字符
  result = result.replace(
    /!\[([^\]]*)\]\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g,
    '<img src="$2" alt="$1" style="max-width:100%;height:auto;display:inline-block;vertical-align:middle;">'
  )

  // 2. 处理链接：[text](url) - URL 可能包含括号等特殊字符
  result = result.replace(
    /\[([^\]]+)\]\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g,
    '<a href="$2" target="_blank">$1</a>'
  )

  // 3. 处理粗体：**text**
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // 4. 处理斜体：*text*
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // 5. 处理行内代码：`code`
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>')

  return result
}

export function renderMarkdown(markdown) {
  if (!markdown) return ''

  // 新策略：先在 Markdown 层面处理表格
  // 转换为 HTML 表格，同时将单元格内容用 md.renderInline() 处理
  let processed = markdown.replace(/(?:^|\n)((?:\|[^\n]*\|\n?)+)/g, function(match, tableContent) {
    const lines = tableContent.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return match

    // 找到分隔行（包含 --- 的行）
    let sepLineIndex = -1
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line.slice(1, -1).split('|').map(c => c.trim())
        if (cells.some(c => /^[\-:]+$/.test(c))) {
          sepLineIndex = i
          break
        }
      }
    }

    if (sepLineIndex === -1 || sepLineIndex === 0) return match

    const headerLine = lines[0].trim()
    const sepLine = lines[sepLineIndex].trim()
    const dataLines = lines.slice(sepLineIndex + 1)

    // 解析表头
    const headerCells = headerLine.slice(1, -1).split('|').map(c => c.trim())

    // 解析对齐
    const sepCells = sepLine.slice(1, -1).split('|').map(c => c.trim())
    const alignments = sepCells.map(sep => {
      if (sep.startsWith(':') && sep.endsWith(':')) return 'center'
      if (sep.startsWith(':')) return 'left'
      if (sep.endsWith(':')) return 'right'
      return ''
    })

    // 渲染单元格内容的辅助函数
    function renderCellContent(content) {
      if (!content) return ''

      // 检查是否包含 <br>（可能是列表或分段内容）
      const hasBr = content.includes('<br>')

      if (hasBr) {
        // 先用 renderInline 处理每个段落的行内 markdown
        const parts = content.split('<br>')
        const renderedParts = parts.map(part => {
          part = part.trim()
          if (part) {
            // 检查是否是列表项格式
            const listMatch = part.match(/^([-*+])\s+(.*)/)
            const orderedMatch = !listMatch && part.match(/^(\d+\.)\s+(.*)/)

            if (listMatch) {
              // 无序列表项：单独渲染内容，保留前缀
              const marker = listMatch[1]
              const itemContent = listMatch[2]
              const rendered = md.renderInline(itemContent)
              return `${marker} ${rendered}`
            } else if (orderedMatch) {
              // 有序列表项
              const marker = orderedMatch[1]
              const itemContent = orderedMatch[2]
              const rendered = md.renderInline(itemContent)
              return `${marker} ${rendered}`
            }
            return md.renderInline(part)
          }
          return ''
        })
        // 用 <br> 连接各部分
        return renderedParts.filter(p => p).join('<br>')
      }

      // 使用 md.renderInline 处理行内 Markdown（图片、链接等）
      const rendered = md.renderInline(content)
      return rendered
    }

    // 构建 HTML 表格
    let html = '<table>\n<thead>\n<tr>\n'
    for (let i = 0; i < headerCells.length; i++) {
      const align = alignments[i] ? ` style="text-align:${alignments[i]}"` : ''
      const cellContent = renderCellContent(headerCells[i])
      html += `<th${align}>${cellContent}</th>\n`
    }
    html += '</tr>\n</thead>\n<tbody>\n'

    for (const line of dataLines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue
      const cells = trimmed.slice(1, -1).split('|').map(c => c.trim())
      html += '<tr>\n'
      for (let j = 0; j < Math.max(cells.length, headerCells.length); j++) {
        const align = alignments[j] ? ` style="text-align:${alignments[j]}"` : ''
        const cellContent = renderCellContent(cells[j])
        html += `<td${align}>${cellContent}</td>\n`
      }
      html += '</tr>\n'
    }
    html += '</tbody>\n</table>\n'
    return html
  })

  // 用 markdown-it 渲染剩余内容（表格已经是 HTML）
  let result = md.render(processed)

  // 后处理：处理 HTML 表格内的 Markdown 内容（用于合并单元格表格）
  result = result.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, function(tableHtml) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(tableHtml, 'text/html')
    const table = doc.querySelector('table')

    if (!table) return tableHtml

    const cells = table.querySelectorAll('td, th')
    cells.forEach(cell => {
      let content = cell.innerHTML || ''
      const hasInlineMarkdown = content.includes('![') || content.includes('](') || content.includes('<br>')

      if (hasInlineMarkdown) {
        // 检查是否包含列表格式（- item 或 1. item）
        if (content.includes('- ') || content.match(/\d+\.\s/)) {
          // 处理带 <br> 的列表项
          const lines = content.split('<br>')
          const processedLines = lines.map(line => {
            line = line.trim()
            if (!line) return ''

            // 检查是否是列表项
            const listMatch = line.match(/^([-*+])\s+(.*)/)
            const orderedMatch = !listMatch && line.match(/^(\d+\.)\s+(.*)/)

            if (listMatch) {
              const itemContent = listMatch[1]
              const rendered = md.renderInline(itemContent)
              return `- ${rendered}`
            } else if (orderedMatch) {
              const marker = orderedMatch[0].split(/\s/)[0] // 获取 "1." 或 "2." 等
              const itemContent = orderedMatch[1]
              const rendered = md.renderInline(itemContent)
              return `${marker} ${rendered}`
            }
            return md.renderInline(line)
          })
          content = processedLines.filter(l => l).join('<br>')
          cell.innerHTML = content
        } else {
          content = md.renderInline(content)
          cell.innerHTML = content
        }
      }
    })

    return table.outerHTML
  })

  return result
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
      // 生成 ID 的逻辑必须与 heading_open 渲染规则完全一致
      // markdown-it 的 heading_open 规则使用 nextToken.content
      // 所以这里也需要处理相同的内容
      const id = generateHeadingId(text)

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
