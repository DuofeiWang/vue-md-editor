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

// 自定义渲染规则，为标题添加 ID
const defaultRender = md.renderer.rules.heading_open || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}

md.renderer.rules.heading_open = function (tokens, idx, options, env, self) {
  const level = tokens[idx].markup.length
  const nextToken = tokens[idx + 1]
  const text = nextToken ? nextToken.content : ''

  // 生成 ID
  const id = text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w一-龥-]/g, '')

  tokens[idx].attrSet('id', id)

  return self.renderToken(tokens, idx, options)
}

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
