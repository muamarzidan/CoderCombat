import { BookOpen, ClipboardList, Swords, type LucideIcon } from 'lucide-react'

interface Step {
  no: string
  title: string
  desc: string
  icon: LucideIcon
  accent: string
}

const STEPS: Step[] = [
  {
    no: '01',
    title: 'Belajar',
    desc: 'Buka modul dan pelajari materinya - dari tag HTML, CSS, sampai JavaScript.',
    icon: BookOpen,
    accent: 'text-info',
  },
  {
    no: '02',
    title: 'Latihan',
    desc: 'Uji pemahaman lewat kuis per modul. Lihat nilaimu beserta pembahasannya.',
    icon: ClipboardList,
    accent: 'text-accent',
  },
  {
    no: '03',
    title: 'Duel',
    desc: 'Masuk arena dan bertanding dengan pemain lain. Jawaban benar menekan HP lawan.',
    icon: Swords,
    accent: 'text-primary',
  },
]

/** Alur utama CoderCombat: Belajar → Latihan → Duel. */
export default function FlowSteps() {
  return (
    <section className="mt-16">
      <div className="mb-8 text-center">
        <h2 className="font-display mb-2 text-2xl tracking-wide sm:text-3xl">Alur Mainnya</h2>
        <p className="text-sm text-text-muted">Tiga langkah dari nol sampai naik papan peringkat.</p>
      </div>

      <ol className="relative grid gap-4 sm:grid-cols-3 sm:gap-6">
        {STEPS.map((s) => (
          <li
            key={s.no}
            className="relative rounded-xl border border-border bg-bg-surface p-5 transition-colors hover:border-primary/60"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg-raised">
                <s.icon size={20} className={s.accent} strokeWidth={1.9} />
              </span>
              <span className="font-display text-2xl text-border">{s.no}</span>
            </div>
            <h3 className="font-display mb-1.5 text-lg">{s.title}</h3>
            <p className="text-sm leading-relaxed text-text-muted">{s.desc}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
