import { Link } from 'react-router-dom'
import { Swords, LoaderPinwheel, Lock, CircleAlert } from 'lucide-react'
import { useModules } from '../hooks/useModules'
import { useAuth } from '../hooks/useAuth'

/**
 * Halaman pemilih modul untuk DUEL — PUBLIK (boleh dilihat tanpa login),
 * sejajar dengan `/quiz`. Proteksi ada di `/antrean/:modulId`: saat mulai
 * mencari lawan, RequireAuth mengarahkan ke login lalu kembali ke antrean.
 */
export default function DuelLanding() {
  const { modules, loading, error } = useModules()
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display mb-1 text-2xl tracking-wide">
          Arena Duel
        </h1>
        <p className="text-sm text-text-muted">
          Pilih modul, lalu tantang pemain lain secara real-time. Jawaban benar & lebih cepat menentukan kemenangan.
        </p>
        {!user && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
            <Lock size={13} strokeWidth={2} />
            Login dulu untuk bisa bertanding.
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoaderPinwheel size={24} className="animate-spin text-text-muted" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <CircleAlert size={18} strokeWidth={1.9} className="shrink-0" />
          {error}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <Link
              key={m.id}
              to={`/antrean/${m.id}`}
              className="group flex flex-col rounded-lg border border-border bg-bg-surface p-5 transition-colors hover:border-primary"
            >
              <h2 className="font-display mb-1 text-lg">{m.title}</h2>
              <p className="mb-4 flex-1 text-sm text-text-muted">{m.summary}</p>
              <span className="inline-flex items-center gap-1 text-xs text-primary group-hover:underline">
                {user ? (
                  <>
                    <Swords size={14} strokeWidth={1.9} /> Cari Lawan
                  </>
                ) : (
                  <>
                    <Lock size={13} strokeWidth={2} /> Login untuk bertanding
                  </>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
