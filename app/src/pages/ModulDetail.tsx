import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, LoaderPinwheel, ChevronRight, CircleAlert } from 'lucide-react'
import { contentApi } from '../lib/content'
import { renderMarkdown } from '../lib/markdown'
import { messageOf } from '../lib/http'
import type { ModuleData, Unit } from '../../../shared/types'

function ModulDetailInner() {
  const { modulId } = useParams<{ modulId: string }>()
  const [mod, setMod] = useState<ModuleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeUnitIdx, setActiveUnitIdx] = useState(0)

  useEffect(() => {
    if (!modulId) return
    setLoading(true)
    setError('')
    contentApi
      .getModule(modulId)
      .then(setMod)
      .catch((err) => setError(messageOf(err)))
      .finally(() => setLoading(false))
  }, [modulId])

  function selectUnit(idx: number) {
    setActiveUnitIdx(idx)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoaderPinwheel size={24} className="animate-spin text-text-muted" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="mb-4 flex items-center justify-center gap-2 text-danger">
          <CircleAlert size={18} strokeWidth={1.9} />
          <span className="text-sm">{error}</span>
        </div>
        <Link to="/modul" className="inline-flex items-center gap-1 text-primary hover:underline">
          <ArrowLeft size={16} strokeWidth={1.9} /> Kembali ke daftar modul
        </Link>
      </div>
    )
  }

  if (!mod) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="mb-4 text-text-muted">Modul tidak ditemukan.</p>
        <Link to="/modul" className="inline-flex items-center gap-1 text-primary hover:underline">
          <ArrowLeft size={16} strokeWidth={1.9} /> Kembali ke daftar modul
        </Link>
      </div>
    )
  }

  const activeUnit: Unit = mod.units[activeUnitIdx]
  const nextUnit = activeUnitIdx < mod.units.length - 1 ? () => selectUnit(activeUnitIdx + 1) : null

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
      <Link
        to="/modul"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft size={16} strokeWidth={1.9} /> Kembali ke Modul
      </Link>

      <div className="mb-4">
        <h1 className="font-display mb-1 text-2xl tracking-wide">{mod.title}</h1>
        <p className="text-sm text-text-muted">{mod.summary}</p>
      </div>

      {/* Sidebar + Content Layout */}
      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 lg:w-64">
          <div className="sticky top-4 rounded-lg border border-border bg-bg-surface p-3">
            <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Unit Pembelajaran
            </h2>
            <nav className="space-y-1">
              {mod.units.map((u, idx) => {
                const active = idx === activeUnitIdx
                return (
                  <button
                    key={u.id}
                    onClick={() => selectUnit(idx)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? 'bg-primary/15 font-medium text-primary'
                        : 'text-text-muted hover:bg-bg-raised hover:text-text'
                    }`}
                  >
                    <span className="flex-1">{u.title}</span>
                    {active && <ChevronRight size={16} strokeWidth={1.9} className="shrink-0" />}
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          <article className="rounded-lg border border-border bg-bg-surface p-5 sm:p-7">
            <h2 className="font-display mb-4 text-xl tracking-wide">{activeUnit.title}</h2>
            <div
              className="prose-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(activeUnit.content) }}
            />

            {/* Navigation Footer */}
            <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
              {activeUnitIdx > 0 ? (
                <button
                  onClick={() => selectUnit(activeUnitIdx - 1)}
                  className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
                >
                  <ArrowLeft size={16} strokeWidth={1.9} /> Sebelumnya
                </button>
              ) : (
                <span />
              )}

              {nextUnit ? (
                <button
                  onClick={nextUnit}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
                >
                  Selanjutnya <ChevronRight size={16} strokeWidth={1.9} />
                </button>
              ) : (
                <Link
                  to={`/quiz/${mod.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-on-primary transition-all hover:brightness-110"
                >
                  <BookOpen size={16} strokeWidth={1.9} /> Mulai Kuis Latihan
                </Link>
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}

export default function ModulDetail() {
  return <ModulDetailInner />
}
