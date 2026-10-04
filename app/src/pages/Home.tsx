import { Link } from 'react-router-dom'
import { Trophy, BookOpen, ClipboardList, Swords, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import AuthLink from '../components/auth/AuthLink'
import Hero from '../components/home/Hero'
import FlowSteps from '../components/home/FlowSteps'
import DuelDemo from '../components/home/DuelDemo'

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Materi Ringkas & Jelas',
    desc: 'Setiap konsep dijelaskan singkat dengan contoh langsung, jadi cepat dipahami.',
  },
  {
    icon: ClipboardList,
    title: 'Latihan Tanpa Tekanan',
    desc: 'Kerjakan kuis per modul sesuai ritmemu. Ada pembahasan setelah selesai.',
  },
  {
    icon: Swords,
    title: 'Duel 1vs1 Real-time',
    desc: 'Tantang pemain lain secara langsung. Jawaban tepat menekan HP lawan.',
  },
  {
    icon: Trophy,
    title: 'Papan Peringkat',
    desc: 'Kumpulkan kemenangan dan lihat namamu naik di antara para pemain lain.',
  },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <Hero />
      <FlowSteps />
      <DuelDemo />

      {/* Keunggulan */}
      <section className="mt-16">
        <div className="mb-8 text-center">
          <h2 className="font-display mb-2 text-2xl tracking-wide sm:text-3xl">Kenapa CoderCombat?</h2>
          <p className="text-sm text-text-muted">Belajar yang terasa seperti bertanding.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-bg-surface p-5">
              <f.icon size={22} className="mb-3 text-accent" strokeWidth={1.9} />
              <h3 className="font-display mb-1 text-base">{f.title}</h3>
              <p className="text-sm leading-relaxed text-text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA penutup */}
      <section className="mt-16 rounded-2xl border border-border bg-bg-surface px-6 py-10 text-center">
        <h2 className="font-display mb-2 text-2xl tracking-wide">
          Siap masuk arena?
        </h2>
        <p className="mx-auto mb-6 max-w-md text-sm text-text-muted">
          Mulai dari modul pertama, uji kemampuanmu, lalu tantang pemain lain hari ini.
        </p>
        {user ? (
          <Link
            to="/quiz"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-on-primary transition-colors hover:bg-primary-hover"
          >
            Mulai Kuis
            <ArrowRight size={18} strokeWidth={1.9} />
          </Link>
        ) : (
          <AuthLink
            to="/daftar"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-on-primary transition-colors hover:bg-primary-hover"
          >
            Register Gratis
            <ArrowRight size={18} strokeWidth={1.9} />
          </AuthLink>
        )}
      </section>
    </div>
  )
}
