import { Link } from 'react-router-dom'
import { BookOpenText, LoaderPinwheel, CircleAlert } from 'lucide-react'
import { useModules } from '../hooks/useModules'

function ModulInner() {
  const { modules, loading, error } = useModules()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display mb-1 text-2xl tracking-wide">Pilih Modul</h1>
      <p className="mb-6 text-sm text-text-muted">
        Pelajari materi, kerjakan kuis latihan, lalu masuk arena duel.
      </p>

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
              to={`/modul/${m.id}`}
              className="group flex flex-col rounded-lg border border-border bg-bg-surface p-5 transition-colors hover:border-primary"
            >
              <h2 className="font-display mb-1 text-lg">{m.title}</h2>
              <p className="mb-4 flex-1 text-sm text-text-muted">{m.summary}</p>
              <span className="inline-flex items-center gap-1 text-xs text-primary group-hover:underline">
                <BookOpenText size={14} strokeWidth={1.9} /> {m.questionCount} soal siap dipelajari
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Modul() {
  return <ModulInner />
}
