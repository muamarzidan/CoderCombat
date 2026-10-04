import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, LogOut, ChevronDown, Settings } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface UserMenuProps {
  /** Dipanggil saat user memilih "Keluar" (biasanya buka modal konfirmasi). */
  onLogout: () => void
}

/**
 * Menu pengguna di navbar: klik nama → dropdown berisi tombol Keluar.
 * Menutup otomatis saat klik di luar atau tekan Escape.
 */
export default function UserMenu({ onLogout }: UserMenuProps) {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const username = profile?.username ?? 'ninja'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm text-text-muted transition-colors hover:bg-bg-raised hover:text-text sm:px-2"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg-raised">
          <User size={15} strokeWidth={2} />
        </span>
        <span className="hidden max-w-[7rem] truncate sm:inline">{username}</span>
        <ChevronDown
          size={15}
          strokeWidth={2}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-bg-surface shadow-xl"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs text-text-muted">Login sebagai</p>
            <p className="truncate text-sm font-medium text-text">{username}</p>
          </div>
          <Link
            to="/profil"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-bg-raised hover:text-text"
          >
            <Settings size={16} strokeWidth={1.9} />
            Profil
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <LogOut size={16} strokeWidth={1.9} />
            Keluar
          </button>
        </div>
      )}
    </div>
  )
}
