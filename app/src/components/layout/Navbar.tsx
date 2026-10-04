import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Trophy, BookOpen, LogIn, ClipboardList, Swords } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import UserMenu from './UserMenu'
import AuthLink from '../auth/AuthLink'
import ConfirmModal from '../ui/ConfirmModal'

interface NavItem {
  to: string
  label: string
  Icon: typeof BookOpen
}

const NAV_ITEMS: NavItem[] = [
  { to: '/modul', label: 'Modul', Icon: BookOpen },
  { to: '/quiz', label: 'Kuis', Icon: ClipboardList },
  { to: '/antrean', label: 'Duel', Icon: Swords },
  { to: '/peringkat', label: 'Peringkat', Icon: Trophy },
]

export default function Navbar() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const [showLogout, setShowLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await signOut()
    setShowLogout(false)
    setLoggingOut(false)
  }

  function navLink({ to, label, Icon }: NavItem) {
    const active = pathname === to || pathname.startsWith(to + '/')
    return (
      <Link
        key={to}
        to={to}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-1.5 rounded-md px-2 py-2 text-sm transition-colors sm:px-3 ${
          active ? 'bg-bg-raised text-primary' : 'text-text-muted hover:text-text'
        }`}
      >
        <Icon size={18} strokeWidth={1.9} />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-bg-surface/95 backdrop-blur">
        {/* 3 zona: brand (kiri) · menu (tengah) · akun (kanan) */}
        <nav className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-4">
          <Link to="/" className="font-display shrink-0 justify-self-start text-lg tracking-wide text-accent">
            <span className="sm:hidden">
              C<span className="text-primary">C</span>
            </span>
            <span className="hidden sm:inline">
              CODER<span className="text-primary">COMBAT</span>
            </span>
          </Link>

          <div className="flex items-center justify-center gap-0.5 sm:gap-1">{NAV_ITEMS.map(navLink)}</div>

          <div className="flex items-center justify-self-end">
            {user ? (
              <UserMenu onLogout={() => setShowLogout(true)} />
            ) : (
              <AuthLink
                to="/masuk"
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
              >
                <LogIn size={18} strokeWidth={1.9} />
                <span className="hidden sm:inline">Login</span>
              </AuthLink>
            )}
          </div>
        </nav>
      </header>

      <ConfirmModal
        isOpen={showLogout}
        onClose={() => !loggingOut && setShowLogout(false)}
        onConfirm={handleLogout}
        title="Keluar?"
        message="Yakin ingin keluar dari akun?"
        confirmText="Ya, Keluar"
        cancelText="Batal"
        variant="danger"
        loading={loggingOut}
      />
    </>
  )
}
