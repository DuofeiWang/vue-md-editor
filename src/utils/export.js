/**
 * Export utilities for different document formats
 */

/**
 * Check if File System Access API is supported
 * @returns {boolean}
 */
function supportsFileSystemAccessAPI() {
  return 'showSaveFilePicker' in window
}

/**
 * Save content using File System Access API
 * @param {string} content - The content to save
 * @param {string} filename - The suggested filename
 * @param {string} mimeType - The MIME type
 * @returns {Promise<void>}
 */
async function saveWithFileSystemAPI(content, filename, mimeType) {
  if (!supportsFileSystemAccessAPI()) {
    throw new Error('File System Access API not supported')
  }

  // Map MIME types to file extensions for the picker
  const mimeToExtensions = {
    'text/markdown': ['.md'],
    'text/plain': ['.txt'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/pdf': ['.pdf']
  }

  const extensions = mimeToExtensions[mimeType] || ['.md']

  const handle = await window.showSaveFilePicker({
    suggestedName: filename,
    types: [
      {
        description: 'Document Files',
        accept: { [mimeType]: extensions }
      }
    ]
  })

  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

/**
 * Strip markdown syntax to get plain text
 * @param {string} markdown - The markdown content
 * @returns {string} Plain text content
 */
function stripMarkdown(markdown) {
  return markdown
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/___(.+?)___/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove strikethrough
    .replace(/~~(.+?)~~/g, '$1')
    // Remove inline code
    .replace(/`(.+?)`/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, (match) => {
      const lines = match.split('\n')
      lines.shift() // Remove opening ```
      lines.pop() // Remove closing ```
      return lines.join('\n')
    })
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Save content as a file
 * @param {string} content - The content to save
 * @param {string} filename - The filename
 * @param {string} mimeType - The MIME type
 */
async function saveFile(content, filename, mimeType) {
  // Try File System Access API first
  if (supportsFileSystemAccessAPI()) {
    try {
      await saveWithFileSystemAPI(content, filename, mimeType)
      return
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled the save dialog
        return
      }
      console.warn('File System Access API failed, falling back to download:', err)
    }
  }

  // Fallback to traditional download method
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export content as Markdown
 * @param {string} content - The markdown content
 * @param {string} filename - The filename
 */
export async function exportAsMarkdown(content, filename) {
  if (!filename.endsWith('.md')) {
    filename += '.md'
  }
  await saveFile(content, filename, 'text/markdown')
}

/**
 * Export content as plain text
 * @param {string} content - The markdown content
 * @param {string} filename - The filename
 */
export async function exportAsText(content, filename) {
  if (!filename.endsWith('.txt')) {
    filename += '.txt'
  }
  const plainText = stripMarkdown(content)
  await saveFile(plainText, filename, 'text/plain')
}

/**
 * Export content as DOCX (Word document)
 * @param {string} content - The markdown content
 * @param {string} filename - The filename
 * @returns {Promise<void>}
 */
export async function exportAsDocx(content, filename) {
  if (!filename.endsWith('.docx')) {
    filename += '.docx'
  }

  try {
    // Dynamic import of docx library
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx')

    const lines = content.split('\n')
    const paragraphs = []

    for (const line of lines) {
      if (line.trim() === '') {
        paragraphs.push(new Paragraph({ text: '' }))
        continue
      }

      // Parse markdown headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headerMatch) {
        const level = headerMatch[1].length
        const text = headerMatch[2]
        const headingLevel = {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
          4: HeadingLevel.HEADING_4,
          5: HeadingLevel.HEADING_5,
          6: HeadingLevel.HEADING_6
        }[level] || HeadingLevel.HEADING_1

        paragraphs.push(new Paragraph({
          text: text,
          heading: headingLevel,
          spacing: { before: 200, after: 100 }
        }))
        continue
      }

      // Parse bold/italic
      const textRuns = []
      let remainingText = line

      while (remainingText.length > 0) {
        // Bold: **text** or __text__
        const boldMatch = remainingText.match(/^(\*\*(.+?)\*\*|__(.+?)__)(.*)$/s)
        if (boldMatch) {
          const boldText = boldMatch[2] || boldMatch[3]
          textRuns.push(new TextRun({ text: boldText, bold: true }))
          remainingText = boldMatch[4]
          continue
        }

        // Italic: *text* or _text_
        const italicMatch = remainingText.match(/^(\*(.+?)\*|_(.+?)_)(.*)$/s)
        if (italicMatch) {
          const italicText = italicMatch[2] || italicMatch[3]
          textRuns.push(new TextRun({ text: italicText, italics: true }))
          remainingText = italicMatch[4]
          continue
        }

        // Inline code: `text`
        const codeMatch = remainingText.match(/^`(.+?)`(.*)$/s)
        if (codeMatch) {
          textRuns.push(new TextRun({
            text: codeMatch[1],
            font: 'Courier New',
            shading: { fill: 'F0F0F0' }
          }))
          remainingText = codeMatch[2]
          continue
        }

        // Regular text - take up to next special character
        const nextSpecial = remainingText.match(/^[* `_]+/)
        if (nextSpecial) {
          const index = remainingText.indexOf(nextSpecial[0][0])
          textRuns.push(new TextRun({ text: remainingText.slice(0, index) }))
          remainingText = remainingText.slice(index)
        } else {
          textRuns.push(new TextRun({ text: remainingText }))
          break
        }
      }

      paragraphs.push(new Paragraph({
        children: textRuns.length > 0 ? textRuns : [new TextRun(line)],
        spacing: { after: 100 }
      }))
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    })

    const blob = await Packer.toBlob(doc)
    await saveFile(blob, filename, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  } catch (error) {
    console.error('Failed to export as DOCX:', error)
    // Fallback to plain text export
    await exportAsText(content, filename.replace('.docx', '.txt'))
  }
}

/**
 * Export content as PDF
 * @param {string} content - The markdown content
 * @param {string} filename - The filename
 * @returns {Promise<void>}
 */
export async function exportAsPdf(content, filename) {
  if (!filename.endsWith('.pdf')) {
    filename += '.pdf'
  }

  try {
    // Dynamic import of jspdf library
    const { default: jsPDF } = await import('jspdf')

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const maxWidth = pageWidth - 2 * margin
    const lineHeight = 7
    let y = margin

    const lines = content.split('\n')

    for (const line of lines) {
      // Check if we need a new page
      if (y > pageHeight - margin) {
        doc.addPage()
        y = margin
      }

      // Parse headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headerMatch) {
        const level = headerMatch[1].length
        const text = stripMarkdown(headerMatch[2])
        const fontSize = Math.max(12, 20 - level * 2)

        doc.setFontSize(fontSize)
        doc.setFont('helvetica', 'bold')
        y += lineHeight / 2

        const textLines = doc.splitTextToSize(text, maxWidth)
        for (const textLine of textLines) {
          if (y > pageHeight - margin) {
            doc.addPage()
            y = margin
          }
          doc.text(textLine, margin, y)
          y += lineHeight
        }

        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        continue
      }

      // Skip empty lines
      if (line.trim() === '') {
        y += lineHeight / 2
        continue
      }

      // Regular paragraph
      const text = stripMarkdown(line)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')

      const textLines = doc.splitTextToSize(text, maxWidth)
      for (const textLine of textLines) {
        if (y > pageHeight - margin) {
          doc.addPage()
          y = margin
        }
        doc.text(textLine, margin, y)
        y += lineHeight
      }

      y += lineHeight / 2
    }

    // Convert jsPDF to blob and use our saveFile function
    const pdfBlob = doc.output('blob')
    await saveFile(pdfBlob, filename, 'application/pdf')
  } catch (error) {
    console.error('Failed to export as PDF:', error)
    // Fallback to plain text export
    await exportAsText(content, filename.replace('.pdf', '.txt'))
  }
}

/**
 * Main export function that routes to the appropriate format handler
 * @param {string} content - The markdown content
 * @param {string} filename - The filename
 * @param {string} format - The export format (md, txt, docx, pdf)
 * @returns {Promise<void>}
 */
export async function exportDocument(content, filename, format = 'md') {
  switch (format.toLowerCase()) {
    case 'md':
    case 'markdown':
      await exportAsMarkdown(content, filename)
      break
    case 'txt':
    case 'text':
      await exportAsText(content, filename)
      break
    case 'docx':
    case 'doc':
      await exportAsDocx(content, filename)
      break
    case 'pdf':
      await exportAsPdf(content, filename)
      break
    default:
      console.warn(`Unknown format: ${format}, falling back to markdown`)
      await exportAsMarkdown(content, filename)
  }
}

export default {
  exportDocument,
  exportAsMarkdown,
  exportAsText,
  exportAsDocx,
  exportAsPdf
}
