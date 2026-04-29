import TurndownService from 'turndown'

// 清理 HTML：移除 style 标签、HTML 注释和其他不需要的内容
function cleanHTML(html) {
  if (!html) return html

  console.log('[DEBUG] cleanHTML - input has <img>:', html.includes('<img'))

  let clean = html

  // 移除 <style> 标签及其内容（多行）
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // 移除 HTML 注释（包括那些包含 CSS 的注释）
  clean = clean.replace(/<!--[\s\S]*?-->/g, '')

  // 移除 <link> 标签（通常用于样式表）
  clean = clean.replace(/<link\b[^>]*>/gi, '')

  // 移除 <meta> 标签
  clean = clean.replace(/<meta\b[^>]*>/gi, '')

  // 处理只包含图片的链接：<a><img src="..."></a> → <img src="...">
  // 这是腾讯文档等平台的常见结构，会导致图片被错误转换为链接
  const beforeALinkImg = clean
  clean = clean.replace(/<a\b[^>]*>\s*<img([^>]*)>\s*<\/a>/gi, function(match, imgAttrs) {
    return '<img' + imgAttrs + '>'
  })
  if (beforeALinkImg !== clean) {
    console.log('[DEBUG] cleanHTML - replaced <a><img> structures')
  }

  // 移除特定属性（更精确的正则，避免破坏标签）
  // 匹配：空格 + 属性名 + "=" + 引号 + 内容 + 引号
  clean = clean.replace(/\sclass\s*=\s*["'][^"']*["']/gi, '')
  clean = clean.replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '')
  clean = clean.replace(/\sid\s*=\s*["'][^"']*["']/gi, '')

  console.log('[DEBUG] cleanHTML - output has <img>:', clean.includes('<img'))

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
    console.log('[DEBUG] Table rule triggered')

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
    console.log('[DEBUG] hasMergedCells:', hasMergedCells)

    if (hasMergedCells) {
      console.log('[DEBUG] Processing merged cell table')
      // 有合并单元格，保留 HTML 表格格式
      // 重要：HTML 表格中的图片必须保持为 HTML <img> 标签
      // 不能转换为 Markdown 语法，否则 Typora 等编辑器无法识别
      const htmlTable = node.cloneNode(true)
      const cells = htmlTable.querySelectorAll('td, th')
      console.log('[DEBUG] Merged table cells count:', cells.length)

      for (const cell of cells) {
        // 处理单元格内容，但保持 <img> 为 HTML 标签
        let cellContent = ''

        for (const nodeChild of cell.childNodes) {
          if (nodeChild.nodeType === 1) {
            const tagName = nodeChild.nodeName.toLowerCase()

            if (tagName === 'img') {
              // 保持图片为 HTML <img> 标签
              console.log('[DEBUG] Merged: found img directly in cell')
              cellContent += nodeChild.outerHTML
            } else if (tagName === 'p') {
              // 检查段落是否包含图片
              const pImages = nodeChild.querySelectorAll('img')
              if (pImages.length > 0) {
                // 段落包含图片 - 完全保留原始 HTML 结构（包括图片和文本）
                console.log('[DEBUG] Merged: p tag has', pImages.length, 'images')
                cellContent += nodeChild.outerHTML
              } else {
                // 段落没有图片，使用 Turndown 转换
                cellContent += turndownService.turndown(nodeChild.outerHTML).trim() + '<br>'
              }
            } else if (tagName === 'ul' || tagName === 'ol') {
              // 处理列表，将换行符转换为 <br> 以在 HTML 表格中正确显示
              const listContent = processListInTable(nodeChild)
              cellContent += listContent.replace(/\n/g, '<br>') + '<br>'
            } else if (tagName === 'a') {
              // 链接可能包含图片，检查并处理
              const aImages = nodeChild.querySelectorAll('img')
              if (aImages.length > 0) {
                console.log('[DEBUG] Merged: <a> tag has', aImages.length, 'images')
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
              cellContent += '<br>'
            } else {
              cellContent += turndownService.turndown(nodeChild.outerHTML)
            }
          } else if (nodeChild.nodeType === 3) {
            cellContent += nodeChild.textContent
          }
        }

        cell.innerHTML = cellContent.replace(/<br>$/, '')
      }

      const mergedResult = '\n\n' + htmlTable.outerHTML + '\n\n'
      console.log('[DEBUG] ===== MERGED TABLE RETURNING =====')
      console.log('[DEBUG] Merged table length:', mergedResult.length)
      console.log('[DEBUG] Merged table has <img> tags:', mergedResult.includes('<img'))
      console.log('[DEBUG] Merged table first 500 chars:', mergedResult.substring(0, 500))
      console.log('[DEBUG] ======================================')

      return mergedResult
    }

    console.log('[DEBUG] Processing regular table (no merged cells)')
    // 无合并单元格，转换为 Markdown 表格
    const rows = []
    const trNodes = node.querySelectorAll('tr')
    console.log('[DEBUG] Regular table row count:', trNodes.length)

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

    console.log('[DEBUG] Regular table rows:', rows.length)
    console.log('[DEBUG] Regular table output:', rows.join('\n'))

    const finalResult = '\n\n' + rows.join('\n') + '\n\n'
    console.log('[DEBUG] ===== TABLE RULE RETURNING =====')
    console.log('[DEBUG] Final result (first 200 chars):', finalResult.substring(0, 200))
    console.log('[DEBUG] Contains pipe |:', finalResult.includes('|'))
    console.log('[DEBUG] Contains <table:', finalResult.includes('<table'))
    console.log('[DEBUG] ===================================')

    return finalResult
  }
})

// 处理表格单元格内容 - 特别处理列表和图片
function processCellContent(cell) {
  let result = ''
  let hasList = false

  console.log('[DEBUG] processCellContent - cell childNodes:', cell.childNodes.length)

  for (const nodeChild of cell.childNodes) {
    if (nodeChild.nodeType === 1) {
      const tagName = nodeChild.nodeName.toLowerCase()
      console.log('[DEBUG] processCellContent - tagName:', tagName)
      if (tagName === 'ul' || tagName === 'ol') {
        // 处理列表，获取带换行的内容
        const listContent = processListInTable(nodeChild)
        // 将真正的换行符转换为 <br>，因为 Markdown 表格单元格不支持换行
        result += listContent.replace(/\n/g, '<br>') + '<br>'
        hasList = true
      } else if (tagName === 'img') {
        // 直接处理图片标签
        console.log('[DEBUG] Found img tag directly in cell')
        result += processImageInCell(nodeChild)
      } else if (tagName === 'p') {
        result += turndownService.turndown(nodeChild.outerHTML).trim() + '<br>'
      } else if (tagName === 'br') {
        result += '<br>'
      } else if (tagName === 'a') {
        // 处理链接（可能包含图片）
        const aImages = nodeChild.querySelectorAll('img')
        if (aImages.length > 0) {
          console.log('[DEBUG] Found <a> with img, count:', aImages.length)
          // 链接包含图片，提取图片
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

  console.log('[DEBUG] processCellContent - result before processing:', result)

  result = result.trim()
  // 只转义管道符，不转义其他字符
  result = result.replace(/\|/g, '\\|')
  result = result.replace(/<br>$/, '')

  // 如果没有列表，将多余空白替换为单个空格
  if (!hasList) {
    result = result.replace(/<br>/g, ' ')
    result = result.replace(/\s+/g, ' ')
  }

  console.log('[DEBUG] processCellContent - final result:', result)

  return result
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

  console.log('[DEBUG] processImageInCell - alt:', alt, 'src:', src)

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

    const prefix = isOrdered ? `${index + 1}. ` : '- '
    const line = prefix + itemContent
    console.log('表格列表项:', line)
    result += line + '\n'
  })

  const finalResult = result.trim()
  console.log('表格列表结果:', finalResult)
  return finalResult
}

// 处理图片 - 使用 DOM API 自动解码 HTML 实体
turndownService.addRule('images', {
  filter: 'img',
  replacement: function (content, node) {
    console.log('[DEBUG] images rule triggered')
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

    console.log('[DEBUG] images rule - src:', src, 'alt:', alt)

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

  console.log('[DEBUG] ===== htmlToMarkdown START =====')
  console.log('[DEBUG] Input HTML has <img> tags:', html.includes('<img'))

  // 首先清理 HTML，移除 style 标签、注释等
  let cleanedHTML = cleanHTML(html)

  console.log('[DEBUG] After cleanHTML, has <img> tags:', cleanedHTML.includes('<img'))

  // DEBUG: 打印表格相关的 HTML 结构，帮助诊断问题
  if (cleanedHTML.includes('<table') || cleanedHTML.includes('<img')) {
    console.log('[DEBUG] ===== HTML contains table or img =====')
    // 只打印包含表格或图片的部分
    const tableMatch = cleanedHTML.match(/<table[\s\S]*?<\/table>/gi)
    if (tableMatch) {
      console.log('[DEBUG] Table HTML (first 500 chars):', tableMatch[0].substring(0, 500))
    }

    // 检查 img 标签
    const imgMatch = cleanedHTML.match(/<img[^>]*>/gi)
    if (imgMatch) {
      console.log('[DEBUG] Found', imgMatch.length, 'img tags')
      console.log('[DEBUG] First img tag:', imgMatch[0])
    } else {
      console.log('[DEBUG] No img tags found in cleaned HTML!')
    }
    console.log('[DEBUG] =====================================')
  }

  const result = turndownService.turndown(cleanedHTML)

  console.log('[DEBUG] ===== Turndown result =====')
  console.log('[DEBUG] Result has ![]( (markdown images):', result.includes('![]('))
  console.log('[DEBUG] Result has <img (HTML images):', result.includes('<img'))

  // DEBUG: 打印转换结果
  if (cleanedHTML.includes('<img')) {
    console.log('[DEBUG] ===== Markdown Result (with images) =====')
    const lines = result.split('\n')
    const imgLines = lines.filter(l => l.includes('![') || l.includes('http') || l.includes('<img'))
    console.log('[DEBUG] Image lines:', imgLines.slice(0, 20))
    console.log('[DEBUG] =========================================')
  }

  console.log('[DEBUG] ===== htmlToMarkdown END =====')
  console.log('[DEBUG] Final result length:', result.length)
  console.log('[DEBUG] Final result (first 500 chars):', result.substring(0, 500))
  console.log('[DEBUG] Final result contains <table>:', result.includes('<table'))
  console.log('[DEBUG] Final result contains | (pipe):', result.includes('|'))

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
        textItem.getAsString(text => resolve(text))
      })
    }
    return ''
  }

  return new Promise((resolve) => {
    htmlItem.getAsString(html => {
      console.log('[DEBUG] ===== PASTE: Raw HTML from clipboard =====')
      console.log('[DEBUG] Raw HTML has <img> tags:', html.includes('<img'))
      console.log('[DEBUG] Raw HTML length:', html.length)
      // 检查是否有 data-original-url 或 data-src 属性
      console.log('[DEBUG] Raw HTML has data-original-url:', html.includes('data-original-url'))
      console.log('[DEBUG] Raw HTML has data-src:', html.includes('data-src'))
      console.log('[DEBUG] Raw HTML has src=:', html.includes('src='))
      // 打印前1000个字符
      console.log('[DEBUG] Raw HTML preview:', html.substring(0, 1000))
      console.log('[DEBUG] =================================================')

      processImagesInHtml(html).then(processedHtml => {
        console.log('[DEBUG] ===== After processImagesInHtml =====')
        console.log('[DEBUG] Processed HTML has <img> tags:', processedHtml.includes('<img'))
        console.log('[DEBUG] ======================================')

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
