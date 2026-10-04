import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import DOMPurify, { type Config } from 'dompurify'

/**
 * marked + highlight.js config.
 * Language aliases resolve html/css/js; unknown languages fall back to plaintext.
 */
const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code: string, lang: string): string {
      // Label eksplisit → pakai itu; fence tanpa label → deteksi otomatis.
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value
      }
      return hljs.highlightAuto(code).value
    },
  }),
)

marked.setOptions({ breaks: true, gfm: true })

/** DOMPurify config: strip images, media, and frames - text/code only. */
const PURIFY_CONFIG: Config = {
  FORBID_TAGS: ['img', 'svg', 'picture', 'video', 'audio', 'iframe', 'embed', 'object', 'source', 'canvas'],
  FORBID_ATTR: ['src', 'srcset'],
  ALLOW_DATA_ATTR: false,
}

/**
 * Render markdown → sanitized HTML (no images/media/scripts).
 * Dipakai untuk materi modul. Teks soal quiz pakai <RichText> (tanpa HTML mentah).
 */
export function renderMarkdown(md: string): string {
  const raw = marked.parse(md) as string
  return DOMPurify.sanitize(raw, PURIFY_CONFIG) as unknown as string
}
