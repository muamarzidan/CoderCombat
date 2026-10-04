import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Lock,
  Eye,
  EyeOff,
  LoaderPinwheel,
  CircleCheck,
  CircleAlert,
  ShieldCheck,
  Swords,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { SERVER_URL, requestJson } from '../lib/http'
import CharacterPicker from '../components/duel/CharacterPicker'
import type { CharacterId } from '../../../shared/types'
import { DEFAULT_CHARACTER_ID } from '../../../shared/constants'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/
const MIN_PASSWORD = 8

interface UsernameCheck {
  available: boolean
  suggestions: string[]
}

export default function Profil() {
  const { profile } = useAuth()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft size={16} strokeWidth={1.9} /> Beranda
      </Link>

      <h1 className="font-display mb-1 text-2xl tracking-wide">Profil</h1>
      <p className="mb-6 text-sm text-text-muted">
        Kelola nama tampilan dan keamanan akunmu.
      </p>

      <div className="mb-4 rounded-lg border border-border bg-bg-surface p-5">
        <p className="text-xs uppercase tracking-wider text-text-muted">Username saat ini</p>
        <p className="font-display text-lg text-accent">{profile?.username ?? '-'}</p>
      </div>

      <div className="space-y-4">
        <CharacterForm />
        <UsernameForm currentUsername={profile?.username ?? ''} />
        <PasswordForm />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ganti karakter duel
// ---------------------------------------------------------------------------

function CharacterForm() {
  const { profile, changeCharacter } = useAuth()
  const current = profile?.character ?? DEFAULT_CHARACTER_ID
  const [value, setValue] = useState<CharacterId>(current)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Keep in sync if the profile loads/changes after mount.
  useEffect(() => {
    setValue(current)
  }, [current])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setDone(false)
    setSaving(true)
    const result = await changeCharacter(value)
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setDone(true)
  }

  const unchanged = value === current

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-bg-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 font-medium">
        <Swords size={18} strokeWidth={1.9} className="text-text-muted" /> Karakter Duel
      </h2>
      <p className="mb-4 text-xs text-text-muted">Karakter yang bertarung di arena duel.</p>

      <CharacterPicker value={value} onChange={setValue} />

      <div className="mt-1.5 min-h-5 text-xs">
        {error && (
          <span className="flex items-center gap-1 text-danger">
            <CircleAlert size={13} /> {error}
          </span>
        )}
        {done && !error && (
          <span className="flex items-center gap-0.5 text-primary">
            <CircleCheck size={13} /> Karakter diperbarui.
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={saving || unchanged}
        className="mt-4 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50 sm:w-auto sm:px-6"
      >
        {saving ? 'Menyimpan…' : 'Simpan Karakter'}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Ganti username
// ---------------------------------------------------------------------------

function UsernameForm({ currentUsername }: { currentUsername: string }) {
  const { changeUsername } = useAuth()
  const [value, setValue] = useState(currentUsername)
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounce = (fn: () => void, ms: number) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(fn, ms)
  }

  // Keep the field in sync if the profile loads/changes after mount.
  useEffect(() => {
    setValue(currentUsername)
  }, [currentUsername])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  function onChange(next: string) {
    const clean = next.toLowerCase()
    setValue(clean)
    setError('')
    setDone(false)
    if (clean === currentUsername || !USERNAME_RE.test(clean)) {
      setStatus('idle')
      return
    }
    setStatus('checking')
    debounce(async () => {
      try {
        const url = `${SERVER_URL}/api/auth/check-username?username=${encodeURIComponent(clean)}`
        const data = await requestJson<UsernameCheck>(url)
        setStatus(data.available ? 'available' : 'taken')
      } catch {
        setStatus('idle')
      }
    }, 400)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setDone(false)

    if (!USERNAME_RE.test(value)) {
      setError('Username: 3–20 karakter, huruf a–z, angka, atau garis bawah saja.')
      return
    }
    if (value === currentUsername) {
      setError('Username baru sama dengan yang sekarang.')
      return
    }
    if (status === 'taken') {
      setError('Username sudah dipakai.')
      return
    }

    setSaving(true)
    const result = await changeUsername(value)
    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }
    setStatus('idle')
    setDone(true)
  }

  const unchanged = value === currentUsername

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-bg-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 font-medium">
        <User size={18} strokeWidth={1.9} className="text-text-muted" /> Ganti Username
      </h2>
      <p className="mb-4 text-xs text-text-muted">3–20 karakter, huruf kecil, angka, dan underscore.</p>

      <div className="relative">
        <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" strokeWidth={1.9} />
        <input
          type="text"
          autoComplete="username"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-md border bg-bg-raised px-3 py-2.5 pl-9 text-text placeholder:text-text-muted focus:border-primary focus:outline-none ${error ? 'border-danger' : 'border-border'
            }`}
        />
      </div>

      <div className="mt-1.5 flex min-h-5 items-center gap-1 text-xs">
        {status === 'checking' && <LoaderPinwheel size={13} className="animate-spin text-text-muted" />}
        {status === 'available' && (
          <span className="flex items-center gap-0.5 text-primary">
            <CircleCheck size={13} /> Tersedia
          </span>
        )}
        {status === 'taken' && <span className="text-danger">Sudah dipakai.</span>}
        {error && (
          <span className="flex items-center gap-1 text-danger">
            <CircleAlert size={13} /> {error}
          </span>
        )}
        {done && !error && (
          <span className="flex items-center gap-0.5 text-primary">
            <CircleCheck size={13} /> Username diperbarui.
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={saving || unchanged || status === 'taken'}
        className="mt-4 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50 sm:w-auto sm:px-6"
      >
        {saving ? 'Menyimpan…' : 'Simpan Username'}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Ganti password
// ---------------------------------------------------------------------------

function PasswordForm() {
  const { changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  function reset() {
    setCurrent('')
    setNext('')
    setConfirm('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setDone(false)

    const errs: Record<string, string> = {}
    if (!current) errs.currentPassword = 'Masukkan password lama.'
    if (next.length < MIN_PASSWORD) errs.newPassword = `Minimal ${MIN_PASSWORD} karakter.`
    if (confirm !== next) errs.confirm = 'Konfirmasi tidak cocok.'
    if (next && current && next === current) errs.newPassword = 'Password baru harus berbeda dari yang lama.'

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    const result = await changePassword(current, next)
    setSaving(false)

    if (result.error) {
      setErrors({ [result.field ?? 'general']: result.error })
      return
    }
    reset()
    setDone(true)
  }

  const inputClass = (field: string) =>
    `w-full rounded-md border bg-bg-raised px-3 py-2.5 pl-9 pr-9 text-text placeholder:text-text-muted focus:border-primary focus:outline-none ${errors[field] ? 'border-danger' : 'border-border'
    }`

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-bg-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 font-medium">
        <ShieldCheck size={18} strokeWidth={1.9} className="text-text-muted" /> Ganti Password
      </h2>
      <p className="mb-4 text-xs text-text-muted">
        Minimal {MIN_PASSWORD} karakter. Masukkan password lama untuk konfirmasi.
      </p>

      <div className="space-y-3">
        <Field
          id="currentPassword"
          label="Password Lama"
          value={current}
          show={show}
          onChange={(v) => {
            setCurrent(v)
            if (errors.currentPassword) setErrors((p) => ({ ...p, currentPassword: '' }))
          }}
          onToggle={() => setShow((s) => !s)}
          className={inputClass('currentPassword')}
          error={errors.currentPassword}
          autoComplete="current-password"
        />
        <Field
          id="newPassword"
          label="Password Baru"
          value={next}
          show={show}
          onChange={(v) => {
            setNext(v)
            if (errors.newPassword) setErrors((p) => ({ ...p, newPassword: '' }))
          }}
          onToggle={() => setShow((s) => !s)}
          className={inputClass('newPassword')}
          error={errors.newPassword}
          autoComplete="new-password"
        />
        <Field
          id="confirm"
          label="Konfirmasi Password Baru"
          value={confirm}
          show={show}
          onChange={(v) => {
            setConfirm(v)
            if (errors.confirm) setErrors((p) => ({ ...p, confirm: '' }))
          }}
          onToggle={() => setShow((s) => !s)}
          className={inputClass('confirm')}
          error={errors.confirm}
          autoComplete="new-password"
        />
      </div>

      {errors.general && (
        <div className="mt-3 rounded-md bg-bg-raised p-3 text-sm text-danger">{errors.general}</div>
      )}
      {done && (
        <div className="mt-3 flex items-center gap-1.5 rounded-md bg-primary/10 p-3 text-sm text-primary">
          <CircleCheck size={15} /> Password berhasil diganti.
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="mt-4 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50 sm:w-auto sm:px-6"
      >
        {saving ? 'Menyimpan…' : 'Simpan Password'}
      </button>
    </form>
  )
}

function Field({
  id,
  label,
  value,
  show,
  onChange,
  onToggle,
  className,
  error,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  show: boolean
  onChange: (v: string) => void
  onToggle: () => void
  className: string
  error?: string
  autoComplete: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-text-muted">
        {label}
      </label>
      <div className="relative">
        <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" strokeWidth={1.9} />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
        >
          {show ? <EyeOff size={17} strokeWidth={1.9} /> : <Eye size={17} strokeWidth={1.9} />}
        </button>
      </div>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-danger">
          <CircleAlert size={13} /> {error}
        </p>
      )}
    </div>
  )
}
