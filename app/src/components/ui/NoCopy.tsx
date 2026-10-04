import { useRef, type ReactNode } from 'react'

interface NoCopyProps {
  children: ReactNode
  className?: string
}

/**
 * Membungkus teks soal/opsi agar tidak bisa disalin: seleksi dimatikan
 * (`.no-copy`) dan event copy/cut/klik-kanan/drag dihentikan di dalam area ini.
 *
 * Catatan: ini penghalang UX, bukan keamanan sejati - teks tetap ada di DOM.
 * Jangan dipakai pada halaman ulasan/pembahasan yang memang perlu dipelajari.
 */
export default function NoCopy({ children, className = '' }: NoCopyProps) {
  const ref = useRef<HTMLDivElement>(null)

  /** Block the event at the capture phase so nothing downstream sees it. */
  const block = (e: React.ClipboardEvent | React.MouseEvent) => e.preventDefault()

  return (
    <div
      ref={ref}
      className={`no-copy ${className}`}
      onCopy={block}
      onCut={block}
      onContextMenu={block}
      onDragStart={block}
    >
      {children}
    </div>
  )
}
