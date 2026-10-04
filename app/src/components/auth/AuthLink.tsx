import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { RedirectState } from '../../lib/navigation'

interface AuthLinkProps {
  to: '/masuk' | '/daftar'
  className?: string
  children: ReactNode
}

const AUTH_PATHS = new Set(['/masuk', '/daftar'])

/**
 * Tautan menuju halaman auth yang otomatis membawa halaman asal (state.from),
 * sehingga setelah login/daftar user kembali ke tempat ia berasal.
 * Bila sudah berada di halaman auth, `from` diwarisi (tidak ditimpa) -
 * mencegah lingkaran /masuk ↔ /daftar.
 */
export default function AuthLink({ to, className, children }: AuthLinkProps) {
  const { pathname, search, state } = useLocation()
  const inherited = (state as RedirectState | null)?.from
  const from = AUTH_PATHS.has(pathname) ? inherited : pathname + search

  return (
    <Link to={to} state={from ? { from } : undefined} className={className}>
      {children}
    </Link>
  )
}
