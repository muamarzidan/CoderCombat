import { useState } from 'react'
import { DoorOpen, LoaderPinwheel, Info } from 'lucide-react'
import CopyButton from '../ui/CopyButton'

interface RoomPanelProps {
  /** Called when the host confirms - the page emits `room:create`. */
  onCreate: () => void
  /** Called when a guest submits code + password - the page emits `room:join`. */
  onJoin: (code: string, password: string) => void
  /** Set while the create/join request is in flight. */
  busy?: boolean
}

/**
 * Private-room entry: create a room (host) or enter a friend's code + password.
 * Presentational only - the page owns the socket.
 */
export default function RoomPanel({ onCreate, onJoin, busy = false }: RoomPanelProps) {
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')

  function submitJoin(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim().length === 0 || password.length === 0) return
    onJoin(code.trim().toUpperCase(), password)
  }

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4 text-left">
      <p className="mb-1 flex items-center gap-2 font-medium">
        <DoorOpen size={18} strokeWidth={1.9} /> Room Privat
      </p>
      <p className="mb-3 text-xs text-text-muted">
        Tantang teman/lawanmu untuk duel melalui kode room. Maksimal 2 pemain.
      </p>

      {/* Tabs */}
      <div className="mb-4 flex rounded-md border border-border p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setTab('create')}
          className={`flex-1 rounded px-3 py-1.5 transition-colors ${tab === 'create' ? 'bg-bg-raised text-primary' : 'text-text-muted hover:text-text'
            }`}
        >
          Buat Room
        </button>
        <button
          type="button"
          onClick={() => setTab('join')}
          className={`flex-1 rounded px-3 py-1.5 transition-colors ${tab === 'join' ? 'bg-bg-raised text-primary' : 'text-text-muted hover:text-text'
            }`}
        >
          Gabung Room
        </button>
      </div>

      {tab === 'create' ? (
        <>
          <button
            type="button"
            onClick={onCreate}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {busy ? <LoaderPinwheel size={16} className="animate-spin" /> : <DoorOpen size={16} strokeWidth={1.9} />}
            {busy ? 'Membuat room…' : 'Buat Room Baru'}
          </button>
        </>
      ) : (
        <form onSubmit={submitJoin} className="space-y-2.5">
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            maxLength={6}
            placeholder="Masukan kode room"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-display w-full rounded-md border border-border bg-bg-raised px-3 py-2.5 text-center tracking-[0.3em] text-text placeholder:font-sans placeholder:tracking-normal placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="Masukan password room"
            value={password}
            onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
            className="font-display w-full rounded-md border border-border bg-bg-raised px-3 py-2.5 text-center tracking-[0.3em] text-text placeholder:font-sans placeholder:tracking-normal placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || code.trim().length === 0 || password.length === 0}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {busy ? 'Bergabung…' : 'Gabung'}
          </button>
        </form>
      )}
      <p className="mt-3 flex items-start gap-1.5 text-xs text-text-muted">
        <Info size={13} strokeWidth={2} className="mt-0.5 shrink-0" />
        Duel di room privat tidak dihitung di papan peringkat.
      </p>
    </div>
  )
}

/** Host waiting view: show the code + password, each with its own copy icon. */
export function RoomWaiting({ code, password, onCancel }: { code: string; password: string; onCancel: () => void }) {
  return (
    <>
      <LoaderPinwheel size={40} className="mx-auto mb-4 animate-spin text-primary" />
      <h2 className="font-display mb-1 text-xl">Menunggu Lawan…</h2>
      <p className="mb-5 text-sm text-text-muted">Bagikan kode dan password ini ke lawanmu.</p>

      <div className="mb-4 space-y-3 rounded-lg border border-border bg-bg-raised p-4">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">Kode Room</p>
          <div className="flex items-center justify-center gap-3">
            <p className="font-display text-3xl tracking-[0.3em] text-accent">{code}</p>
            <CopyButton value={code} label="Salin kode room" />
          </div>
        </div>
        <div className="border-t border-border pt-3">
          <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">Password</p>
          <div className="flex items-center justify-center gap-3">
            <p className="font-display text-3xl tracking-[0.3em] text-primary">{password}</p>
            <CopyButton value={password} label="Salin password room" />
          </div>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-text-muted underline-offset-2 hover:text-text hover:underline"
        >
          Batalkan room
        </button>
      </div>
    </>
  )
}
