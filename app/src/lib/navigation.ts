import { useLocation } from 'react-router-dom'

/** State yang dibawa saat mengarahkan user ke halaman auth. */
export interface RedirectState {
  from?: string
}

/**
 * Tujuan redirect setelah login/daftar berhasil: halaman asal (state.from),
 * atau `fallback` bila user datang langsung tanpa halaman asal.
 */
export function useRedirectFrom(fallback = '/modul'): string {
  const { state } = useLocation()
  return (state as RedirectState | null)?.from ?? fallback
}
