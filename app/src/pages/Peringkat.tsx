import { useEffect, useState } from 'react'
import { Trophy, Medal, LoaderPinwheel, CircleAlert, ListFilter } from 'lucide-react'

import { useAuth } from '../hooks/useAuth'
import { useModules } from '../hooks/useModules'
import { supabase } from '../lib/supabase'
import Select from '../components/ui/Select'
import type { LeaderboardRow } from '../../../shared/types'


const ALL_CATEGORIES = 'all'

function isLeader(row: unknown): row is LeaderboardRow {
  if (typeof row !== 'object' || row === null) return false
  const r = row as Record<string, unknown>
  return (
    typeof r.username === 'string' &&
    typeof r.wins === 'number' &&
    typeof r.losses === 'number' &&
    typeof r.duels === 'number'
  )
}

function winRate(r: LeaderboardRow): number {
  return r.duels > 0 ? Math.round((r.wins / r.duels) * 100) : 0
}

function PeringkatInner() {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [category, setCategory] = useState<string>(ALL_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const { modules } = useModules()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    async function load() {
      const { data, error: rpcError } = await supabase.rpc('get_leaderboard', {
        p_module_id: category === ALL_CATEGORIES ? null : category,
      })
      if (cancelled) return
      if (rpcError) {
        setError('Gagal memuat papan peringkat. Coba lagi nanti.')
      } else {
        const list = Array.isArray(data) ? data.filter(isLeader) : []
        setRows(list.filter((r) => r.duels > 0))
      }
      setLoading(false)
    }
    load()

    return () => {
      cancelled = true
    }
  }, [user, category])

  const activeLabel =
    category === ALL_CATEGORIES
      ? 'Keseluruhan'
      : (modules.find((m) => m.id === category)?.title ?? category)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display mb-2 text-2xl tracking-wide">Papan Peringkat</h1>
      <p className="mb-6 text-sm text-text-muted">
        Peringkat berdasarkan jumlah kemenangan, lalu rasio menang. Duel lawan bot dan room privat
        tidak dihitung.
      </p>

      <div className="rounded-lg border border-border bg-bg-surface">
        {/* Header tabel: pemilih kategori (Keseluruhan / per modul). */}
        <div className="flex flex-col gap-2 rounded-t-lg border-b border-border bg-bg-raised px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <label
            htmlFor="kategori-peringkat"
            className="flex items-center gap-2 text-sm font-medium text-text-muted"
          >
            <ListFilter size={16} strokeWidth={1.9} className="shrink-0" aria-hidden="true" />
            Kategori
          </label>
          <Select
            id="kategori-peringkat"
            value={category}
            onChange={setCategory}
            active={category !== ALL_CATEGORIES}
            className="sm:w-64"
            options={[
              { value: ALL_CATEGORIES, label: 'Keseluruhan (semua modul)' },
              ...modules.map((m) => ({ value: m.id, label: m.title })),
            ]}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoaderPinwheel size={24} className="animate-spin text-text-muted" />
          </div>
        ) : error ? (
          <div className="m-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            <CircleAlert size={18} strokeWidth={1.9} className="shrink-0" />
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <Trophy size={32} className="mx-auto mb-2 text-accent" strokeWidth={1.9} />
            <p>Belum ada duel pada kategori ini. Jadilah yang pertama!</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Papan peringkat kategori {activeLabel}
            </caption>
            <thead className="bg-bg-raised text-text-muted">
              <tr>
                <th scope="col" className="px-3 py-3 font-medium sm:px-4">#</th>
                <th scope="col" className="px-3 py-3 font-medium sm:px-4">Ninja</th>
                <th scope="col" className="px-2 py-3 text-right font-medium" title="Menang">Menang</th>
                <th scope="col" className="px-2 py-3 text-right font-medium" title="Kalah">Kalah</th>
                <th scope="col" className="px-3 py-3 text-right font-medium sm:px-4" title="Rasio menang">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.username} className="border-t border-border">
                  <td className="px-3 py-3 sm:px-4">
                    {i === 0 ? (
                      <Medal size={18} className="text-accent" strokeWidth={1.9} aria-label="Peringkat 1" />
                    ) : (
                      <span className="font-display tabular">{i + 1}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-medium sm:px-4">
                    <span className="truncate line-clamp-1">{r.username}</span>
                  </td>
                  <td className="font-display px-2 py-3 text-right tabular text-primary">{r.wins}</td>
                  <td className="font-display px-2 py-3 text-right tabular text-text-muted">{r.losses}</td>
                  <td className="font-display px-3 py-3 text-right tabular text-text-muted sm:px-4">{winRate(r)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default function Peringkat() {
  return <PeringkatInner />
}
