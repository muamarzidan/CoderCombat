import { X } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Ya',
  cancelText = 'Batal',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null

  const confirmBg = variant === 'danger' ? 'bg-danger hover:bg-hp-low' : 'bg-primary hover:bg-primary-hover'
  const confirmTextColor = 'text-on-primary'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-md rounded-xl border border-border bg-bg-surface p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <h3 id="confirm-title" className="font-display text-lg text-text">
            {title}
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-shrink-0 rounded-md p-1 text-text-muted hover:text-text hover:bg-bg-raised transition-colors disabled:opacity-50"
            aria-label="Tutup"
          >
            <X size={20} strokeWidth={1.9} />
          </button>
        </div>

        <p className="mt-4 text-sm text-text-muted">{message}</p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-bg-raised transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-md px-4 py-2 text-sm font-medium ${confirmTextColor} transition-colors disabled:opacity-50 ${confirmBg}`}
          >
            {loading ? 'Memproses...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}