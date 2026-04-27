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

// 处理图片
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

    // 否则直接保留 URL
    return title
      ? `![${alt}](${src} "${title}")`
      : `![${alt}](${src})`
  }
})

// 处理表格
turndownService.addRule('tableRow', {
  filter: ['tr'],
  replacement: function (content, node) {
    const cells = content.trim().split('|').filter(c => c.trim() || c === '')
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
    return content || ''
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
      reject(new Error('本地文件 URL'))
    } else {
      img.src = url
    }
  })
}

export default turndownService
