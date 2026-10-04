import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, Loader, CircleCheck, CircleAlert } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useRedirectFrom } from '../lib/navigation'
import AuthLink from '../components/auth/AuthLink'
import CharacterPicker from '../components/duel/CharacterPicker'
import { DEFAULT_CHARACTER_ID } from '../../../shared/constants'
import type { CharacterId } from '../../../shared/types'
import { SERVER_URL, requestJson } from '../lib/http'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/
const MIN_PASSWORD = 8

interface UsernameCheck {
  available: boolean
  suggestions: string[]
}

export default function Daftar() {
  const navigate = useNavigate()
  const { signUp, user } = useAuth()
  const from = useRedirectFrom()

  // Redirect jika sudah login (di dalam effect, bukan saat render)
  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, navigate, from])

  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [character, setCharacter] = useState<CharacterId>(DEFAULT_CHARACTER_ID)
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Error spesifik per kolom (BR-14)
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Status ketersediaan username (debounced)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
    if (field === 'username') checkUsername(value)
  }

  let usernameTimer: ReturnType<typeof setTimeout>
  async function checkUsername(val: string) {
    clearTimeout(usernameTimer)
    if (!val || !USERNAME_RE.test(val)) return

    setUsernameStatus('checking')
    usernameTimer = setTimeout(async () => {
      try {
        const url = `${SERVER_URL}/api/auth/check-username?username=${encodeURIComponent(val.toLowerCase())}`
        const data = await requestJson<UsernameCheck>(url)
        setUsernameStatus(data.available ? 'available' : 'taken')
      } catch {
        // Gagal cek (offline/timeout) → netral, jangan blokir pendaftaran.
        setUsernameStatus('idle')
      }
    }, 400)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setSubmitting(true)

    // Validasi klien dulu
    const errs: Record<string, string> = {}
    if (!form.email.includes('@')) errs.email = 'Format email tidak valid.'
    if (!USERNAME_RE.test(form.username))
      errs.username = 'Username: 3–20 karakter, huruf a–z, angka, atau garis bawah saja.'
    if (form.password.length < MIN_PASSWORD) errs.password = `Minimal ${MIN_PASSWORD} karakter.`

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setSubmitting(false)
      return
    }

    const result = await signUp(form.email, form.username.toLowerCase(), form.password, character)
    if (result.error) {
      setErrors({ [result.field ?? 'general']: result.error })
      setSubmitting(false)
      return
    }

    // Sukses: store sudah terisi sesi. Redirect ditangani useEffect di atas
    // (menghindari navigasi ganda / race dengan RequireAuth).
  }

  const inputClass = (field: string) =>
    `w-full rounded-md border bg-bg-raised px-3 py-2.5 text-text placeholder:text-text-muted focus:border-primary focus:outline-none ${
      errors[field] ? 'border-danger' : 'border-border'
    }`

  return (
    <div className="mx-auto flex min-h-[70dvh] items-start justify-center px-4 pt-8 sm:pt-14">
      <div className="w-full max-w-md rounded-lg border border-border bg-bg-surface p-6 sm:p-8">
        <h1 className="font-display mb-1 text-2xl tracking-wide">Buat Akun Baru</h1>
        <p className="mb-6 text-sm text-text-muted">Mulai belajar dan bertanding.</p>

        <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-text-muted">
              Email
            </label>
            <div className="relative">
              <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" strokeWidth={1.9} />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="ninja@dojo.id"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className={`${inputClass('email')} pl-9`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 flex items-center gap-1 text-xs text-danger">
                <CircleAlert size={13} /> {errors.email}
              </p>
            )}
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-text-muted">
              Username
            </label>
            <div className="relative">
              <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" strokeWidth={1.9} />
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="ninja_kopi"
                value={form.username}
                onChange={(e) => update('username', e.target.value.toLowerCase())}
                className={`${inputClass('username')} pl-9`}
              />
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs">
              {usernameStatus === 'checking' && (
                <Loader size={13} className="animate-spin text-text-muted" />
              )}
              {usernameStatus === 'available' && (
                <span className="flex items-center gap-0.5 text-primary">
                  <CircleCheck size={13} /> Tersedia
                </span>
              )}
              {usernameStatus === 'taken' && (
                <span className="text-danger">Sudah dipakai.</span>
              )}
              {!['checking', 'available', 'taken'].includes(usernameStatus) && (
                <span className="text-text-muted">3-20 karakter, a-z, 0-9, _</span>
              )}
            </div>
            {errors.username && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-danger">
                <CircleAlert size={13} /> {errors.username}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-text-muted">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" strokeWidth={1.9} />
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                className={`${inputClass('password')} pl-9 pr-9`}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={17} strokeWidth={1.9} /> : <Eye size={17} strokeWidth={1.9} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 flex items-center gap-1 text-xs text-danger">
                <CircleAlert size={13} /> {errors.password}
              </p>
            )}
          </div>

          {/* Pilih karakter duel */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text-muted">Pilih Karakter</label>
            <CharacterPicker value={character} onChange={setCharacter} />
            <p className="mt-1.5 text-xs text-text-muted">Karakter ini yang bertarung di arena duel. Bisa diganti kapan saja di Profil.</p>
          </div>

          {/* General error */}
          {errors.general && (
            <div className="rounded-md bg-bg-raised p-3 text-sm text-danger">{errors.general}</div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? 'Memproses...' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          Sudah punya akun?{' '}
          <AuthLink to="/masuk" className="text-primary hover:underline">
            Login
          </AuthLink>
        </p>
      </div>
    </div>
  )
}
