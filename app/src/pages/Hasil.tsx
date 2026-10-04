import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Trophy, Home, RotateCcw, ArrowRight, LoaderPinwheel, CircleAlert, Info } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { RichText } from '../components/ui/RichText'
import BattleCharacter from '../components/duel/BattleCharacter'
import { hpBarColor } from '../lib/hp'
import { requestJson, messageOf, API_BASE, HttpError } from '../lib/http'
import { DEFAULT_CHARACTER_ID } from '../../../shared/constants'
import type { CharacterId, DuelAnswer, DuelEndReason, MatchDetail } from '../../../shared/types'

interface MatchResponse {
  id: string
  moduleId: string
  winnerId: string | null
  hpA: number
  hpB: number
  reason: DuelEndReason
  createdAt: string
  detail: MatchDetail | null
}

type LoadState = 'loading' | 'ready' | 'error' | 'notfound'

/** Total answering time in seconds; unanswered questions count as the max. */
function totalSeconds(answers: (DuelAnswer | null)[] | undefined, fallback: number): number {
  if (!answers) return fallback
  const ms = answers.reduce((sum, a) => sum + (a?.timeMs ?? 0), 0)
  return ms / 1000
}

export default function Hasil() {
  const { duelId } = useParams<{ duelId: string }>()
  const { user, session } = useAuth()
  const [state, setState] = useState<LoadState>('loading')
  const [match, setMatch] = useState<MatchResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!duelId) return
    const token = session?.access_token
    if (!token) return

    let cancelled = false
    setState('loading')

    // The server inserts the match asynchronously, so the first fetch right
    // after a duel can 404. Retry a few times before giving up.
    const MAX_ATTEMPTS = 4
    const RETRY_MS = 700

    const attempt = (n: number) => {
      requestJson<MatchResponse>(`${API_BASE}/matches/${duelId}`, { token })
        .then(data => {
          if (cancelled) return
          setMatch(data)
          setState('ready')
        })
        .catch(err => {
          if (cancelled) return
          const notFound = err instanceof HttpError && err.status === 404
          if (notFound && n < MAX_ATTEMPTS) {
            setTimeout(() => attempt(n + 1), RETRY_MS)
            return
          }
          if (notFound) {
            setState('notfound')
            return
          }
          setErrorMsg(messageOf(err))
          setState('error')
        })
    }

    attempt(1)

    return () => {
      cancelled = true
    }
  }, [duelId, session?.access_token])

  if (state === 'loading') {
    return (
      <Center>
        <LoaderPinwheel size={44} className="mb-4 animate-spin text-muted" strokeWidth={1.9} />
        <p className="text-text-muted">Menyiapkan hasil…</p>
      </Center>
    )
  }

  if (state === 'notfound') {
    return (
      <Center>
        <CircleAlert size={40} className="mb-4 text-text-muted" strokeWidth={1.9} />
        <p className="mb-4 text-text-muted">Hasil duel tidak ditemukan.</p>
        <Link to="/antrean" className="rounded-md bg-primary px-6 py-3 font-medium text-on-primary hover:bg-primary-hover">
          Kembali ke Arena
        </Link>
      </Center>
    )
  }

  if (state === 'error' || !match) {
    return (
      <Center>
        <CircleAlert size={40} className="mb-4 text-danger" strokeWidth={1.9} />
        <p className="mb-4 text-text-muted">{errorMsg || 'Gagal memuat hasil.'}</p>
        <Link to="/antrean" className="rounded-md bg-primary px-6 py-3 font-medium text-on-primary hover:bg-primary-hover">
          Kembali ke Arena
        </Link>
      </Center>
    )
  }

  const detail = match.detail
  const me = detail?.players.find(p => p.userId === user?.id)
  const opponent = detail?.players.find(p => p.userId !== user?.id)
  // For bot matches winner_id is NULL (practice, not ranked), so the real
  // winner lives in the detail snapshot instead.
  const realWinnerId = detail?.winnerId ?? match.winnerId
  const isWinner = realWinnerId === user?.id
  const isBotMatch = match.reason === 'bot'
  const isRoomMatch = match.reason === 'room'
  const modulId = detail?.modulId ?? match.moduleId

  const myHp = me?.hp ?? match.hpA
  const oppHp = opponent?.hp ?? match.hpB

  const outcome =
    realWinnerId === null ? 'Duel Selesai' : isWinner ? 'Kamu Menang!' : 'Kamu Kalah'

  const reasonText =
    match.reason === 'disconnect'
      ? 'Duel berakhir karena lawan terputus.'
      : isBotMatch
        ? 'Duel latihan melawan bot.'
        : isRoomMatch
          ? 'Duel room privat melawan teman.'
          : ''

  const myTime = totalSeconds(me?.answers, 0)
  const oppTime = totalSeconds(opponent?.answers, 0)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-border bg-bg-surface">
          <Trophy size={40} className={isWinner ? 'text-emerald-600' : 'text-text-muted'} strokeWidth={1.9} />
        </div>
        <h1 className="font-display mt-4 text-3xl tracking-wide">{outcome}</h1>
        <p className="text-text-muted">
          {reasonText || (isWinner ? 'Pertandingan yang mengesankan. Pertahankan!' : 'Jangan menyerah - latihan dan coba lagi.')}
        </p>

        {(isBotMatch || isRoomMatch) && (
          <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-raised px-3 py-1 text-xs text-text-muted">
            <Info size={13} strokeWidth={2} />
            {isBotMatch ? 'Latihan bot' : 'Duel room privat'} tidak dihitung di papan peringkat
          </p>
        )}
      </div>

      {/* HP summary */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:gap-8">
        <HpCard
          name={me?.username ?? 'Kamu'}
          hp={myHp}
          time={myTime}
          character={me?.character ?? DEFAULT_CHARACTER_ID}
        />
        <HpCard
          name={opponent?.username ?? 'Lawan'}
          hp={oppHp}
          time={oppTime}
          character={opponent?.character ?? DEFAULT_CHARACTER_ID}
        />
      </div>

      {/* Round-by-round summary */}
      {detail && me ? (
        <div className="mb-8">
          <h2 className="font-display mb-4 text-xl">Ringkasan Soal</h2>
          <div className="space-y-3">
            {detail.questions.map((q, idx) => {
              const myAnswer = me.answers[idx] ?? null
              const picked = myAnswer?.optionIndex ?? null
              const isCorrect = picked === q.correctAnswer
              const answerLabel = (i: number) => String.fromCharCode(65 + i)

              return (
                <div
                  key={idx}
                  className={`rounded-lg border p-4 ${isCorrect ? 'border-primary/30 bg-primary/5' : 'border-danger/30 bg-danger/5'
                    }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">Soal {idx + 1}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${picked === null
                          ? 'bg-bg-raised text-text-muted'
                          : isCorrect
                            ? 'bg-primary/15 text-primary'
                            : 'bg-danger/15 text-danger'
                        }`}
                    >
                      {picked === null ? 'Tidak dijawab' : isCorrect ? 'Benar' : 'Salah'}
                    </span>
                  </div>

                  <p className="mb-2 text-sm">
                    <RichText text={q.text} />
                  </p>

                  <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-text-muted">Jawabanmu:</span>
                      <p className={`font-medium ${picked === null ? 'text-text-muted' : isCorrect ? 'text-primary' : 'text-danger'}`}>
                        {picked === null ? '-' : `${answerLabel(picked)}. `}
                        {picked !== null && <RichText text={q.options[picked] ?? ''} />}
                      </p>
                    </div>
                    {!isCorrect && (
                      <div>
                        <span className="text-text-muted">Jawaban benar:</span>
                        <p className="font-medium text-primary">
                          {answerLabel(q.correctAnswer)}. <RichText text={q.options[q.correctAnswer] ?? ''} />
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="mb-8 text-center text-sm text-text-muted">
          Detail jawaban tidak tersedia untuk pertandingan ini.
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md border border-border px-6 py-3 font-medium text-text-muted transition-colors hover:text-text"
        >
          <Home size={20} strokeWidth={1.9} /> Beranda
        </Link>
        <Link
          to={`/antrean/${modulId}`}
          className="flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-on-primary transition-colors hover:bg-primary-hover"
        >
          <RotateCcw size={20} strokeWidth={1.9} /> Main Lagi
        </Link>
        <Link
          to="/peringkat"
          className="flex items-center gap-2 rounded-md border border-border px-6 py-3 font-medium text-text-muted transition-colors hover:text-text"
        >
          Peringkat <ArrowRight size={20} strokeWidth={1.9} />
        </Link>
      </div>
    </div>
  )
}

function HpCard({
  name,
  hp,
  time,
  character,
}: {
  name: string
  hp: number
  time: number
  character: CharacterId
}) {
  const pct = Math.max(0, Math.min(100, hp))
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        {/* Avatar karakter (pose idle) sebagai pengganti ikon hati. */}
        <div className="[--char-cell:40px] shrink-0">
          <BattleCharacter character={character} state="idle" />
        </div>
        <h3 className="truncate font-medium">{name}</h3>
      </div>
      <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-bg-raised">
        <div
          className={`hp-bar h-full rounded-full transition-colors ${hpBarColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span className="tabular">{time > 0 ? `${time.toFixed(1)}s` : '-'}</span>
        <span className="tabular">{hp} HP</span>
      </div>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-4 text-center">{children}</div>
  )
}
