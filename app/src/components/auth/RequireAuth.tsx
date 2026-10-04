import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LoaderPinwheel } from 'lucide-react'

/**
 * Penjaga rute: halaman yang butuh login.
 * - Saat sesi masih diperiksa → tampilkan indikator (tidak pernah spinner abadi).
 * - Saat belum login → arahkan ke /masuk sambil menyimpan tujuan awal,
 *   agar setelah masuk user kembali ke halaman yang tadi diminta.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-[50dvh] flex-col items-center justify-center gap-3">
        <LoaderPinwheel size={28} className="animate-spin text-text-muted" />
        <p className="text-sm text-text-muted">Memeriksa sesi…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/masuk" replace state={{ from: location.pathname + location.search }} />
  }

  return <>{children}</>
}
