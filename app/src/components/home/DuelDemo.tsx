import { Swords, ArrowRight } from 'lucide-react'

interface Fighter {
  name: string
  hp: number
  tone: 'primary' | 'danger'
}

const FIGHTERS: Fighter[] = [
  { name: 'Kamu', hp: 80, tone: 'primary' },
  { name: 'Lawan', hp: 40, tone: 'danger' },
]

const TONE_BAR: Record<Fighter['tone'], string> = {
  primary: 'bg-primary',
  danger: 'bg-danger',
}

/** Ilustrasi mekanik duel: jawab benar → HP lawan turun. */
export default function DuelDemo() {
  return (
    <section className="mt-16">
      <div className="mb-8 text-center">
        <h2 className="font-display mb-2 text-2xl tracking-wide sm:text-3xl">Cara Menang Duel</h2>
        <p className="text-sm text-text-muted">
          Tiap soal punya <span className="text-text">timer</span>. Jawaban benar &amp; cepat, dapat
          mengurangi HP lawan. HP habis = kalah.
        </p>
      </div>

      <div className="mx-auto max-w-4xl rounded-xl border border-border bg-bg-surface p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          {FIGHTERS.map((f, i) => (
            <div key={f.name} className={`flex-1 ${i === 1 ? 'text-right' : ''}`}>
              <div className={`mb-2 flex items-center gap-1.5 ${i === 1 ? 'justify-end' : ''}`}>
                {i === 0 && <Swords size={15} strokeWidth={2} className="text-text-muted" />}
                <span className="text-sm font-medium text-text">{f.name}</span>
                {i === 1 && <Swords size={15} strokeWidth={2} className="text-text-muted" />}
              </div>
              <div className="h-3 overflow-hidden rounded-full border border-border bg-bg-base">
                <div
                  className={`hp-bar h-full rounded-full ${TONE_BAR[f.tone]}`}
                  style={{ width: `${f.hp}%` }}
                />
              </div>
              <span className="font-display mt-1 block text-xs tabular text-text-muted">{f.hp} HP</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-border bg-bg-raised px-4 py-3">
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-text-muted">
            Jawab benar <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />{' '}
            <span className="text-danger">−20 HP</span> lawan. Jawab salah <ArrowRight size={14} strokeWidth={2} aria-hidden="true" /> kamu yang kena.
          </p>
        </div>
      </div>
    </section>
  )
}
