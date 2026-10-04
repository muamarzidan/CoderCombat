import { useEffect, useRef, useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyButtonProps {
  /** Text written to the clipboard. */
  value: string
  /** Accessible label, e.g. "Salin kode room". */
  label: string
  className?: string
}

/**
 * Small icon-only copy button with a transient "copied" tick.
 * Clipboard access can be blocked (insecure origin / permission) - the value is
 * on screen anyway, so a failed copy is a silent no-op rather than an error.
 */
export default function CopyButton({ value, label, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear a pending reset timer if the button unmounts mid-feedback.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable - nothing to recover from.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} - tersalin` : label}
      title={copied ? 'Tersalin!' : label}
      className={`inline-flex shrink-0 items-center justify-center rounded-md border border-border p-2 text-text-muted transition-colors hover:border-primary hover:text-primary ${className}`}
    >
      {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
    </button>
  )
}
