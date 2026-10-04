import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Swords } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import AuthLink from '../auth/AuthLink'

/** Hero beranda: penjelasan singkat CoderCombat + CTA utama. */
export default function Hero() {
  const { user } = useAuth()

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-bg-surface px-5 py-12 sm:px-10 sm:py-16">
      {/* Latar grid pixel (subtema arena) */}
      <div className="pixel-grid pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden="true" />

      <div className="relative mx-auto max-w-2xl text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-bg-raised px-3 py-1 text-xs text-text-muted">
          <Swords size={13} strokeWidth={2} className="text-accent" />
          Web Development INSYFEST 2026
        </span>

        <h1 className="font-display mb-4 text-4xl font-bold tracking-wide sm:text-6xl">
          <span className="text-accent">CODER</span>
          <span className="text-primary">COMBAT</span>
        </h1>

        <p className="mx-auto mb-3 max-w-xl text-lg leading-relaxed text-text sm:text-xl">
          Belajar dasar coding &amp; AI dari nol, lalu buktikan kemampuanmu lewat{' '}
          <strong className="text-primary">duel kuis 1vs1</strong> bersama pemain lain.
        </p>
        <p className="mx-auto mb-8 flex max-w-xl flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm leading-relaxed text-text-muted sm:text-base">
          Baca materi <ArrowRight size={15} strokeWidth={2} aria-hidden="true" /> uji pemahaman lewat kuis{' '}
          <ArrowRight size={15} strokeWidth={2} aria-hidden="true" /> tantang pemain lain. Jawab lebih cepat dari lawan,
          kikis HP-nya sampai habis.
        </p>

        {user ? (
          <Link
            to="/modul"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-on-primary transition-colors hover:bg-primary-hover"
          >
            <BookOpen size={20} strokeWidth={1.9} />
            Lanjut Belajar
            <ArrowRight size={18} strokeWidth={1.9} />
          </Link>
        ) : (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <AuthLink
              to="/daftar"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-on-primary transition-colors hover:bg-primary-hover sm:w-auto"
            >
              Mulai Gratis
              <ArrowRight size={18} strokeWidth={1.9} />
            </AuthLink>
            <Link
              to="/modul"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 text-base font-medium text-text-muted transition-colors hover:border-primary hover:text-text sm:w-auto"
            >
              Lihat Materi
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
