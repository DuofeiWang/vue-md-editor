import TurndownService from 'turndown'

// 清理 HTML：移除 style 标签、HTML 注释和其他不需要的内容
function cleanHTML(html) {
  if (!html) return html


  let clean = html

  // 移除 <style> 标签及其内容（多行）
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // 移除 HTML 注释（包括那些包含 CSS 的注释）
  clean = clean.replace(/<!--[\s\S]*?-->/g, '')

  // 移除 <link> 标签（通常用于样式表）
  clean = clean.replace(/<link\b[^>]*>/gi, '')

  // 移除 <meta> 标签
  clean = clean.replace(/<meta\b[^>]*>/gi, '')

  // 移除 Office 特有的 <o:p> 标签（段落标记）
  clean = clean.replace(/<\/?o:p[^>]*>/gi, '')

  // 处理只包含图片的链接：<a><img src="..."></a> → <img src="...">
  // 这是腾讯文档等平台的常见结构，会导致图片被错误转换为链接
  const beforeALinkImg = clean
  clean = clean.replace(/<a\b[^>]*>\s*<img([^>]*)>\s*<\/a>/gi, function(match, imgAttrs) {
    return '<img' + imgAttrs + '>'
  })
  if (beforeALinkImg !== clean) {
  }

  // 移除特定属性，但保留表格的关键属性和样式
  // 策略：对于表格相关元素，保留关键属性（colspan, rowspan, style）
  // 对于其他元素，移除 class、style、id 属性

  // 首先处理非表格元素，移除 class、style、id 属性
  // 使用更精确的方式，只匹配不在表格标签内的属性
  clean = clean.replace(/(<(?:[^t\s]|t[^a\s]|ta[^b\s]|tab[^l\s]|tabl[^e\s]|table[^>]|td[^>]|th[^>])*?)\sclass\s*=\s*["'][^"']*["']/gi, '$1')
  clean = clean.replace(/(<(?:[^t\s]|t[^a\s]|ta[^b\s]|tab[^l\s]|tabl[^e\s]|table[^>]|td[^>]|th[^>])*?)\sstyle\s*=\s*["'][^"']*["']/gi, '$1')
  clean = clean.replace(/(<(?:[^t\s]|t[^a\s]|ta[^b\s]|tab[^l\s]|tabl[^e\s]|table[^>]|td[^>]|th[^>])*?)\sid\s*=\s*["'][^"']*["']/gi, '$1')

  // 对于表格元素，保留关键属性但清理不必要的属性
  // 保留：colspan, rowspan, style（移除固定宽度）
  // 移除：class, id, data-*, width 属性（让表格自适应）
  let tableTagCount = 0
  clean = clean.replace(/<(table|td|th)(\s[^>]*?)>/gi, function(match, tag, attrs) {
    tableTagCount++
    let keptAttrs = ''
    const originalAttrs = attrs

    // 保留 colspan
    const colspanMatch = attrs.match(/\scolspan\s*=\s*["']?(\d+)["']?/i)
    if (colspanMatch) {
      keptAttrs += ` colspan="${colspanMatch[1]}"`
    }

    // 保留 rowspan
    const rowspanMatch = attrs.match(/\srowspan\s*=\s*["']?(\d+)["']?/i)
    if (rowspanMatch) {
      keptAttrs += ` rowspan="${rowspanMatch[1]}"`
    }

    // 处理 style 属性：移除 width 相关的样式，保留其他样式
    const styleMatch = attrs.match(/\sstyle\s*=\s*["']([^"']*)["']/i)
    if (styleMatch) {
      let style = styleMatch[1]
      // 移除 width、min-width、max-width 样式
      style = style.replace(/width\s*:\s*[^;]+;?/gi, '')
        .replace(/min-width\s*:\s*[^;]+;?/gi, '')
        .replace(/max-width\s*:\s*[^;]+;?/gi, '')
        .replace(/table-layout\s*:\s*[^;]+;?/gi, '')
      // 清理多余的空格和分号
      style = style.replace(/;\s*;/g, ';').replace(/;\s*$/, '').trim()
      if (style) {
        keptAttrs += ` style="${style}"`
      }
    }

    // 不保留 width 属性，让表格自适应

    if (tableTagCount <= 5) {
    }

    return `<${tag}${keptAttrs}>`
  })


  return clean
}

// 创建 Turndown 实例
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '_',
  strongDelimiter: '**',
  linkStyle: 'inlined',
  // 保持默认的换行行为
  blankReplacement: function (content, node) {
    return node.isBlock ? '\n\n' : ''
  }
})

// 处理空段落 - 企微文档使用 <p><br></p> 表示空行
turndownService.addRule('emptyParagraph', {
  filter: function (node) {
    return node.nodeName === 'P' && node.textContent.trim() === '' &&
           (node.innerHTML.includes('<br>') || node.innerHTML === '' || node.innerHTML.trim() === '')
  },
  replacement: function () {
    return '\n\n'
  }
})

// 处理 BR 标签 - 企微文档中的换行
turndownService.addRule('br', {
  filter: 'br',
  replacement: function () {
    return '  \n'
  }
})

// 处理链接中的图片 - 腾讯文档等平台的常见结构 <a><img></a>
// 这个规则必须在默认链接规则之前添加，以确保优先处理
turndownService.addRule('imageInLink', {
  filter: function (node) {
    // 检查是否是只包含单个图片的链接
    return (
      node.nodeName === 'A' &&
      node.childNodes.length === 1 &&
      node.firstChild.nodeName === 'IMG'
    )
  },
  replacement: function (content, node) {
    const img = node.firstChild
    const alt = img.alt || ''

    // 尝试多种可能的图片源属性
    let src = img.getAttribute('data-original-url') ||
              img.getAttribute('data-src') ||
              img.getAttribute('src') || ''

    // 检查其他可能的属性
    if (!src) {
      src = img.getAttribute('data-img-src') ||
            img.getAttribute('data-url') ||
            img.getAttribute('href') || ''
    }

    // 如果图片没有 src，尝试使用链接的 href
    if (!src) {
      src = node.getAttribute('href') || ''
    }

    if (src) {
      return alt ? `![${alt}](${src})` : `![](${src})`
    }
    // 如果都没有，返回 alt 或空
    return alt || ''
  }
})

// 自定义表格处理 - 支持 colspan、rowspan 和表格内的列表
turndownService.addRule('table', {
  filter: 'table',
  replacement: function (content, node) {

    // 检测是否有真正的合并单元格（colspan > 1 或 rowspan > 1）
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

    if (hasMergedCells) {
      // 有合并单元格，保留 HTML 表格格式
      // 重要：HTML 表格中的图片必须保持为 HTML <img> 标签
      // 不能转换为 Markdown 语法，否则 Typora 等编辑器无法识别
      const htmlTable = node.cloneNode(true)
      const cells = htmlTable.querySelectorAll('td, th')

      for (const cell of cells) {
        // 处理单元格内容，但保持 <img> 为 HTML 标签
        let cellContent = ''

        for (const nodeChild of cell.childNodes) {
          if (nodeChild.nodeType === 1) {
            const tagName = nodeChild.nodeName.toLowerCase()

            if (tagName === 'img') {
              // 保持图片为 HTML <img> 标签
              cellContent += nodeChild.outerHTML
            } else if (tagName === 'p') {
              // 检查段落是否包含图片
              const pImages = nodeChild.querySelectorAll('img')
              if (pImages.length > 0) {
                // 段落包含图片 - 完全保留原始 HTML 结构（包括图片和文本）
                cellContent += nodeChild.outerHTML
              } else {
                // 段落没有图片，使用 Turndown 转换
                cellContent += turndownService.turndown(nodeChild.outerHTML).trim() + '<br/>'
              }
            } else if (tagName === 'ul' || tagName === 'ol') {
              // 处理列表，使用 <br/> 分隔列表项
              const listContent = processListInTable(nodeChild)
              cellContent += listContent + '<br/>'
            } else if (tagName === 'a') {
              // 链接可能包含图片，检查并处理
              const aImages = nodeChild.querySelectorAll('img')
              if (aImages.length > 0) {
                // 链接包含图片，保持图片为 HTML <img> 标签
                for (const aChild of nodeChild.childNodes) {
                  if (aChild.nodeType === 1 && aChild.nodeName === 'IMG') {
                    cellContent += aChild.outerHTML
                  } else if (aChild.nodeType === 3) {
                    cellContent += aChild.textContent
                  }
                }
              } else {
                cellContent += turndownService.turndown(nodeChild.outerHTML)
              }
            } else if (tagName === 'br') {
              cellContent += '<br/>'
            } else {
              cellContent += turndownService.turndown(nodeChild.outerHTML)
            }
          } else if (nodeChild.nodeType === 3) {
            cellContent += nodeChild.textContent
          }
        }

        cell.innerHTML = cellContent.replace(/<br\/>$/, '')
      }

      // 合并表格使用 HTML 格式，将 <br/> 转换为 <br> 以兼容 Typora
      let tableHTML = htmlTable.outerHTML
      tableHTML = tableHTML.replace(/<br\/>/g, '<br>')

      const mergedResult = '\n\n' + tableHTML + '\n\n'

      return mergedResult
    }

    // 无合并单元格，转换为 Markdown 表格
    const rows = []
    const trNodes = node.querySelectorAll('tr')

    trNodes.forEach((tr, index) => {
      const cells = []

      for (const child of tr.childNodes) {
        if (child.nodeType === 1 && (child.nodeName === 'TD' || child.nodeName === 'TH')) {
          let cellMarkdown = processCellContent(child)
          cells.push(cellMarkdown)
        }
      }

      if (cells.length > 0) {
        const row = '| ' + cells.join(' | ') + ' |'
        rows.push(row)

        if (index === 0 || tr.querySelector('th')) {
          const separator = '| ' + cells.map(() => '---').join(' | ') + ' |'
          rows.push(separator)
        }
      }
    })


    // 将 Markdown 表格行合并，并将 {TABLE_BR} 替换为 <br/>
    let tableMarkdown = rows.join('\n')
    tableMarkdown = tableMarkdown.replace(/\{TABLE_BR\}/g, '<br/>')

    const finalResult = '\n\n' + tableMarkdown + '\n\n'

    return finalResult
  }
})

// 检测文本中是否包含企微文档的列表标记
function hasTextListMarkers(text) {
  // 企微文档常用的列表标记：
  // ● 实心圆 (U+25CF)
  // ○ 空心圆 (U+25CB)
  // ▪ 方块 (U+25AA)
  // ■ 实心方块 (U+25A0)
  // • 小圆点 (U+2022)
  // ◆ 菱形 (U+25C6)
  // ◇ 空心菱形 (U+25C7)
  // ▲ 三角 (U+25B2)
  // ▼ 倒三角 (U+25BC)
  // ▶ 右三角 (U+25B6)
  // ◀ 左三角 (U+25C0)
  // ★ 实心星 (U+2605)
  // ☆ 空心星 (U+2606)
  // ✔ 对号 (U+2714)
  // ✘ 错号 (U+2718)
  // → 箭头 (U+2192)
  // ➤ 箭头 (U+27A4)
  // - 破折号
  // * 星号
  // + 加号
  // 数字列表：1、 2、 3、 或 ① ② ③ 等
  // 字母列表：a) b) c) 或 a. b. c. 或 A. B. C. 等

  // 检测符号列表标记
  const symbols = ['●', '○', '▪', '■', '•', '◆', '◇', '▲', '▼', '▶', '◀', '★', '☆', '✔', '✘', '→', '➤']
  for (const sym of symbols) {
    if (text.includes(sym)) {
      return true
    }
  }

  // 检测破折号/星号/加号列表标记（带空格）
  if (/^[\-\*\+]\s|[\s\n][\-\*\+]\s/.test(text)) {
    return true
  }

  // 检测圆圈数字：① ② ③ 等 (不能使用范围，需单独列出)
  if (/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/.test(text)) {
    return true
  }

  // 检测数字列表标记：1、 2、 3、 或 1. 2. 3. 或 1) 2) 3)
  if (/\d+[、.)]\s/.test(text)) {
    return true
  }

  // 检测字母列表标记：a) b) c) 或 a. b. c. 或 A. B. C.
  if (/[a-zA-Z][、.)]\s/.test(text)) {
    return true
  }

  return false
}

// 处理包含文本列表标记的内容，将列表标记转换为换行
// 注意：这里使用特殊的换行标记 {TABLE_BR}，在表格生成时会被替换为 Markdown 换行语法
function processTextListWithMarkers(text) {
  let result = text

  // 处理数字列表标记：1、 2、 3、 或 1. 2. 3. 或 1) 2) 3)
  // 匹配模式：文本内容 + 数字标记 + 空格 + 新内容
  result = result.replace(/(\S)\s+(\d+[、.)]\s+)/g, '$1{TABLE_BR}$2 ')

  // 处理字母列表标记：a) b) c) 或 a. b. c. 或 A. B. C.
  result = result.replace(/(\S)\s+([a-zA-Z][、.)]\s+)/g, '$1{TABLE_BR}$2 ')

  // 处理圆圈数字：① ② ③ 等
  result = result.replace(/(\S)\s+([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])\s*/g, '$1{TABLE_BR}$2 ')

  // 处理破折号/星号/加号列表标记
  // 将 - * + 替换为 • 项目符号，避免 Markdown 转义问题
  result = result.replace(/(\S)\s+([\-\*\+])\s+/g, '$1{TABLE_BR}• ')

  // 处理各种符号列表标记
  const symbols = ['●', '○', '▪', '■', '•', '◆', '◇', '▲', '▼', '▶', '◀', '★', '☆', '✔', '✘', '→', '➤']
  for (const sym of symbols) {
    const regex = new RegExp(`(\\S)\\s+(${sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*`, 'g')
    result = result.replace(regex, '$1{TABLE_BR}$2 ')
  }


  return result
}

// 处理表格单元格内容 - 特别处理列表和图片
function processCellContent(cell) {
  let result = ''
  let hasList = false


  for (const nodeChild of cell.childNodes) {
    if (nodeChild.nodeType === 1) {
      const tagName = nodeChild.nodeName.toLowerCase()
      if (tagName === 'ul' || tagName === 'ol') {
        // 列表转换为带项目符号的文本，用特殊标记分隔
        const listContent = processListInTable(nodeChild)
        result += listContent + '{TABLE_BR}'
        hasList = true
      } else if (tagName === 'img') {
        // 直接处理图片标签
        result += processImageInCell(nodeChild)
      } else if (tagName === 'p') {
        // 段落需要检查是否包含列表
        const pLists = nodeChild.querySelectorAll('ul, ol')
        if (pLists.length > 0) {
          // 段落包含列表，需要特殊处理
          result += processParagraphWithLists(nodeChild) + '{TABLE_BR}'
          hasList = true
        } else {
          // 普通段落，转换为 Markdown
          const pContent = turndownService.turndown(nodeChild.outerHTML).trim()
          result += pContent + '{TABLE_BR}'

          // 检测企微文档的文本列表标记
          if (hasTextListMarkers(pContent)) {
            hasList = true
          }
        }
      } else if (tagName === 'br') {
        result += '{TABLE_BR}'
      } else if (tagName === 'a') {
        // 处理链接（可能包含图片）
        const aImages = nodeChild.querySelectorAll('img')
        if (aImages.length > 0) {
          for (const aChild of nodeChild.childNodes) {
            if (aChild.nodeType === 1 && aChild.nodeName === 'IMG') {
              result += processImageInCell(aChild)
            } else if (aChild.nodeType === 3) {
              result += aChild.textContent
            }
          }
        } else {
          result += turndownService.turndown(nodeChild.outerHTML)
        }
      } else {
        result += turndownService.turndown(nodeChild.outerHTML)
      }
    } else if (nodeChild.nodeType === 3) {
      result += nodeChild.textContent
    }
  }


  result = result.trim()

  // 检测并处理文本列表标记
  if (!hasList && hasTextListMarkers(result)) {
    result = processTextListWithMarkers(result)
    hasList = true
  }

  // 移除末尾的换行标记
  result = result.replace(/\{TABLE_BR\}$/, '')

  // 如果没有列表，将换行标记替换为空格
  if (!hasList) {
    result = result.replace(/\{TABLE_BR\}/g, ' ')
    result = result.replace(/\s+/g, ' ')
  } else {
  }

  // 转义管道符（放在最后，避免影响其他处理）
  result = result.replace(/\|/g, '\\|')


  return result
}

// 处理包含列表的段落
function processParagraphWithLists(pNode) {
  let result = ''
  for (const child of pNode.childNodes) {
    if (child.nodeType === 1) {
      const tagName = child.nodeName.toLowerCase()
      if (tagName === 'ul' || tagName === 'ol') {
        result += processListInTable(child)
      } else if (tagName === 'img') {
        result += processImageInCell(child)
      } else if (tagName === 'br') {
        result += ' '
      } else {
        result += turndownService.turndown(child.outerHTML)
      }
    } else if (child.nodeType === 3) {
      result += child.textContent
    }
  }
  return result.trim()
}

// 处理单元格中的图片 - 提取 src 并转为 Markdown 格式
function processImageInCell(imgNode) {
  const alt = imgNode.alt || ''

  // 尝试多种可能的图片源属性
  let src = imgNode.getAttribute('data-original-url') ||
            imgNode.getAttribute('data-src') ||
            imgNode.getAttribute('src') || ''

  if (!src) {
    src = imgNode.getAttribute('data-img-src') ||
          imgNode.getAttribute('data-url') ||
          imgNode.getAttribute('href') || ''
  }


  if (src) {
    return alt ? `![${alt}](${src})` : `![](${src})`
  }
  return alt || ''
}

// 处理表格内的列表 - 返回带换行分隔的内容
function processListInTable(listNode) {
  const isOrdered = listNode.nodeName === 'OL'
  const items = listNode.querySelectorAll(':scope > li')

  let result = ''
  items.forEach((item, index) => {
    let itemContent = ''
    for (const child of item.childNodes) {
      if (child.nodeType === 1) {
        const tagName = child.nodeName.toLowerCase()
        if (tagName === 'img') {
          itemContent += processImageInCell(child)
        } else if (tagName === 'a') {
          // 检查链接是否包含图片
          const aImages = child.querySelectorAll('img')
          if (aImages.length > 0) {
            for (const aChild of child.childNodes) {
              if (aChild.nodeType === 1 && aChild.nodeName === 'IMG') {
                itemContent += processImageInCell(aChild)
              } else if (aChild.nodeType === 3) {
                itemContent += aChild.textContent
              }
            }
          } else {
            itemContent += turndownService.turndown(child.outerHTML)
          }
        } else if (tagName === 'br') {
          itemContent += ' '
        } else {
          itemContent += turndownService.turndown(child.outerHTML)
        }
      } else if (child.nodeType === 3) {
        itemContent += child.textContent
      }
    }
    itemContent = itemContent.trim().replace(/\|/g, '\\|')

    // 使用 Unicode 项目符号代替 -，避免 Typora 转义为 \-
    const prefix = isOrdered ? `${index + 1}. ` : '• '
    const line = prefix + itemContent
    result += line + '{TABLE_BR}'
  })

  const finalResult = result.replace(/\{TABLE_BR\}$/, '')
  return finalResult
}

// 处理图片 - 使用 DOM API 自动解码 HTML 实体
turndownService.addRule('images', {
  filter: 'img',
  replacement: function (content, node) {
    const alt = node.alt || content || ''

    // 尝试多种可能的图片源属性
    let src = node.getAttribute('data-original-url') ||
              node.getAttribute('data-src') ||
              node.getAttribute('src') || ''

    // 如果仍然没有 src，检查其他可能的属性
    if (!src) {
      src = node.getAttribute('data-img-src') ||
            node.getAttribute('data-url') ||
            node.getAttribute('href') || ''
    }

    const title = node.title || ''


    // 确保我们有一个有效的 src
    if (!src) {
      console.warn('Image element has no src attribute:', node)
      return alt || ''
    }

    return title
      ? `![${alt}](${src} "${title}")`
      : `![${alt}](${src})`
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

export function htmlToMarkdown(html) {
  if (!html) return ''


  // 首先清理 HTML，移除 style 标签、注释等
  let cleanedHTML = cleanHTML(html)


  // DEBUG: 打印表格相关的 HTML 结构，帮助诊断问题
  if (cleanedHTML.includes('<table') || cleanedHTML.includes('<img')) {
    // 只打印包含表格或图片的部分
    const tableMatch = cleanedHTML.match(/<table[\s\S]*?<\/table>/gi)
    if (tableMatch) {
    }

    // 检查 img 标签
    const imgMatch = cleanedHTML.match(/<img[^>]*>/gi)
    if (imgMatch) {
    } else {
    }
  }

  const result = turndownService.turndown(cleanedHTML)


  // DEBUG: 打印转换结果
  if (cleanedHTML.includes('<img')) {
    const lines = result.split('\n')
    const imgLines = lines.filter(l => l.includes('![') || l.includes('http') || l.includes('<img'))
  }


  return result
}

export async function processClipboardData(dataTransfer) {

  const htmlItem = Array.from(dataTransfer.items).find(item =>
    item.type === 'text/html'
  )


  if (!htmlItem) {
    const textItem = Array.from(dataTransfer.items).find(item =>
      item.type === 'text/plain'
    )
    if (textItem) {
      return new Promise((resolve) => {
        textItem.getAsString(text => {
          resolve(text)
        })
      })
    }
    return ''
  }

  return new Promise((resolve) => {
    htmlItem.getAsString(html => {
      // 检查是否有 data-original-url 或 data-src 属性
      // 打印前1000个字符

      processImagesInHtml(html).then(processedHtml => {

        const markdown = htmlToMarkdown(processedHtml)
        resolve(markdown)
      })
    })
  })
}

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
      const base64 = await imageToBase64(src)
      img.setAttribute('src', base64)
    } catch (error) {
      console.warn('无法转换图片:', src, error)
    }
  }

  return doc.body.innerHTML
}

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

    if (url.startsWith('file://')) {
      reject(new Error('本地文件 URL'))
    } else {
      img.src = url
    }
  })
}

export default turndownService
