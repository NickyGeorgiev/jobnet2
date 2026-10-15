// Помощни функции за описанията на обявите.
// В базата описанието е HTML (от редактора) или, при старите обяви, чист текст с нови редове.

const HTML_TAG_RE = /<\/?(p|br|ul|ol|li|strong|b|em|i|u|h[1-6])\b[^>]*>/i

export function looksLikeHtml(value) {
  return HTML_TAG_RE.test(value || '')
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Стар чист текст -> HTML за редактора (празен ред = нов абзац, единичен нов ред = <br>)
export function legacyTextToHtml(value) {
  const text = (value || '').replace(/\r\n/g, '\n').trim()
  if (!text) return ''
  if (looksLikeHtml(text)) return text
  return text
    .split(/\n{2,}/)
    .map(block => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

// HTML или стар текст -> чист текст (за карти, преглед, проверка за празно)
export function htmlToPlainText(value) {
  if (!value) return ''
  if (!looksLikeHtml(value)) return value.replace(/\s+/g, ' ').trim()
  const spaced = value.replace(/<\/(p|li|h[1-6])>|<br\s*\/?>/gi, ' ')
  const doc = new DOMParser().parseFromString(spaced, 'text/html')
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
}

export function isRichTextEmpty(value) {
  return htmlToPlainText(value) === ''
}
