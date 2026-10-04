import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, CircleAlert } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useRedirectFrom } from '../lib/navigation'
import AuthLink from '../components/auth/AuthLink'

export default function Masuk() {
  const navigate = useNavigate()
  const { signIn, user } = useAuth()

  // Kembali ke halaman yang diminta RequireAuth (mis. /quiz), fallback /modul.
  const from = useRedirectFrom()

  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, navigate, from])

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const result = await signIn(identifier, password)
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }
    // Sukses: store sudah terisi sesi. Redirect ditangani useEffect di atas
    // (menghindari navigasi ganda / race dengan RequireAuth).
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] items-start justify-center px-4 pt-8 sm:pt-14">
      <div className="w-full max-w-md rounded-lg border border-border bg-bg-surface p-6 sm:p-8">
        <h1 className="font-display mb-1 text-2xl tracking-wide">Login ke Dojo</h1>
        <p className="mb-6 text-sm text-text-muted">Gunakan email atau username beserta kata sandi.</p>

        <form onSubmit={handleSubmit} noValidate autoComplete="on" className="space-y-4">
          {/* Identifier tunggal (BR-15) */}
          <div>
            <label htmlFor="ident" className="mb-1 block text-sm font-medium text-text-muted">
              Email atau Username
            </label>
            <input
              id="ident"
              type="text"
              autoComplete="username"
              placeholder="ninja@dojo.id atau ninja_kopi"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError('') }}
              className={`w-full rounded-md border bg-bg-raised px-3 py-2.5 text-text placeholder:text-text-muted focus:border-primary focus:outline-none ${
                error ? 'border-danger' : 'border-border'
              }`}
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="pwd" className="mb-1 block text-sm font-medium text-text-muted">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" strokeWidth={1.9} />
              <input
                id="pwd"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder='••••••••'
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                className={`w-full rounded-md border bg-bg-raised pl-9 pr-9 py-2.5 text-text placeholder:text-text-muted focus:border-primary focus:outline-none ${
                  error ? 'border-danger' : 'border-border'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                aria-label={showPwd ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={17} strokeWidth={1.9} /> : <Eye size={17} strokeWidth={1.9} />}
              </button>
            </div>
          </div>

          {/* Pesan gagal umum (BR-15) */}
          {error && (
            <div role="alert" className="flex items-center gap-1.5 rounded-md bg-bg-raised p-3 text-sm text-danger">
              <CircleAlert size={16} strokeWidth={1.9} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? 'Memproses...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          Belum punya akun?{' '}
          <AuthLink to="/daftar" className="text-primary hover:underline">
            Register
          </AuthLink>
        </p>
      </div>
    </div>
  )
}
