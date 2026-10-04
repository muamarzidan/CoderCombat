import { Fragment, type ReactNode } from 'react'

interface RichTextProps {
  text: string
  className?: string
}

/**
 * Render teks dengan `inline code` sebagai <code> bergaya monospace.
 * Tag HTML literal (mis. <p>, <div>) tampil sebagai teks - React meng-escape
 * otomatis, jadi tidak perlu dangerouslySetInnerHTML (bebas XSS).
 */
export function RichText({ text, className }: RichTextProps): ReactNode {
  const parts = text.split(/(`[^`]+`)/g)

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.length > 2 && part.startsWith('`') && part.endsWith('`') ? (
          <code key={i} className="inline-code">
            {part.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </span>
  )
}
