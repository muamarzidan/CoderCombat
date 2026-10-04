import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LoaderPinwheel, Clock, Flag, CircleCheck, CircleX, WifiOff, Trophy, Frown } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../hooks/useAuth'
import { RichText } from '../components/ui/RichText'
import NoCopy from '../components/ui/NoCopy'
import BattleStage from '../components/duel/BattleStage'
import { useBattleSequence, BATTLE_TOTAL_MS } from '../components/duel/useBattleSequence'
import { DEATH_MS } from '../lib/characters'
import { DEFAULT_CHARACTER_ID } from '../../../shared/constants'
import type { CharAnimState, PlayerState } from '../../../shared/types'
import type {
  DuelFinishedPayload,
  DuelGonePayload,
  DuelPausedPayload,
  DuelRoundResult,
  DuelState,
} from '../../../shared/types'

/**
 * How long the opponent must stay away before the overlay appears. Sits above
 * a typical reconnect (refresh) round-trip, so brief blips never show the
 * "Lawan Terputus" screen to the player who stayed.
 */
const PAUSE_OVERLAY_DELAY_MS = 2500

/** How long the win/lose screen shows before redirecting to the result page. */
const RESULT_SCREEN_MS = 1500

export default function Duel() {
  const { duelId } = useParams<{ duelId: string }>()
  const navigate = useNavigate()
  const { socket, connected } = useSocket()
  const { user, profile } = useAuth()

  const [duelState, setDuelState] = useState<DuelState | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [round, setRound] = useState<DuelRoundResult | null>(null)
  const [opponentAnswered, setOpponentAnswered] = useState(false)
  const [finished, setFinished] = useState<DuelFinishedPayload | null>(null)
  // Held back briefly so the final blow (run → attack → die) can play before the
  // win/lose screen replaces the arena.
  const [finishedReady, setFinishedReady] = useState(false)
  const [pause, setPause] = useState<DuelPausedPayload | null>(null)
  const [showPause, setShowPause] = useState(false)
  const [graceLeft, setGraceLeft] = useState(0)
  const [confirmForfeit, setConfirmForfeit] = useState(false)

  // Keep the socket in a ref so the unmount cleanup never re-runs on re-render.
  const socketRef = useRef(socket)
  socketRef.current = socket

  // Track the active question so a change resets the per-round reveal.
  const qIndexRef = useRef(-1)
  // When the current round was revealed, so a finishing blow is never cut short.
  const revealAtRef = useRef(0)

  // Round reveal + winner are derived from state, but the battle hook MUST run
  // unconditionally - above every early return - or React sees a different hook
  // count the moment the duel arrives ("Rendered more hooks than during the
  // previous render"). Deriving defensively keeps the call site branch-free.
  const reveal = round !== null
  const roundWinner: 'me' | 'opponent' | null = (() => {
    if (!round || !duelState || !user) return null
    const my = round.players.find(p => p.userId === user.id)
    const opp = round.players.find(p => p.userId !== user.id)
    if (!my || !opp) return null
    const myRight = my.answer !== null && my.answer === round.correctAnswer
    const oppRight = opp.answer !== null && opp.answer === round.correctAnswer
    if (myRight && !oppRight) return 'me'
    if (oppRight && !myRight) return 'opponent'
    if (myRight && oppRight) return my.hp >= opp.hp ? 'me' : 'opponent'
    return null
  })()

  const anim = useBattleSequence(reveal, roundWinner)

  const handleAnswer = useCallback(
    (optionIndex: number) => {
      const s = socketRef.current
      if (!s || !duelId || selected !== null) return
      setSelected(optionIndex)
      s.emit('duel:answer', { duelId, optionIndex })
    },
    [duelId, selected],
  )

  useEffect(() => {
    if (!socket || !connected || !user || !duelId) return

    socket.emit('duel:join', { duelId })

    const onState = (state: DuelState) => {
      // New question → clear the per-round reveal.
      if (state.currentQuestionIndex !== qIndexRef.current) {
        qIndexRef.current = state.currentQuestionIndex
        setSelected(null)
        setRound(null)
        setOpponentAnswered(false)
      }
      setDuelState(state)
    }
    const onCountdown = (value: number) =>
      // The countdown number lives inside duelState so the "Bersiap" screen can
      // be decided from a single source (status) - no separate state to desync.
      setDuelState(prev => (prev ? { ...prev, countdownValue: value } : prev))
    const onTick = (timeLeft: number) =>
      setDuelState(prev => (prev ? { ...prev, timeLeft } : prev))
    const onOpponentAnswered = (data: { userId: string }) => {
      if (data.userId !== user.id) setOpponentAnswered(true)
    }
    const onResult = (data: DuelRoundResult) => {
      revealAtRef.current = Date.now()
      setRound(data)
      // `duel:result` is the only event carrying the post-round HP (the next
      // `duel:state` only arrives at the *start* of the next question), so fold
      // it in now - otherwise the bars lag a question behind and a knockout
      // never reaches 0, which would suppress the death animation entirely.
      setDuelState(prev => {
        if (!prev) return prev
        return {
          ...prev,
          players: prev.players.map(p => {
            const updated = data.players.find(r => r.userId === p.userId)
            return updated ? { ...p, hp: updated.hp } : p
          }),
        }
      })
    }
    const onPaused = (data: DuelPausedPayload) => {
      setPause(data)
      setGraceLeft(Math.ceil(data.graceMs / 1000))
    }
    const onFinished = (data: DuelFinishedPayload) => {
      setFinished(data)
      // Let the finale play before the result screen replaces the arena. A round
      // finish holds for the choreography (run → attack → hurt) plus the loser's
      // 3-frame death animation; a forfeit reveals no round, so only the death
      // beat is held. A disconnect is already visually resolved, so it flips
      // through immediately.
      const revealed = revealAtRef.current > 0
      const elapsed = revealed ? Date.now() - revealAtRef.current : 0
      const choreography = revealed ? BATTLE_TOTAL_MS : 0
      const hold =
        data.reason === 'disconnect' ? 0 : Math.max(0, choreography + DEATH_MS - elapsed)
      setTimeout(() => setFinishedReady(true), hold)
      setTimeout(() => navigate(`/hasil/${data.duelId}`), hold + RESULT_SCREEN_MS)
    }
    // The duel is unknown or already over - go straight to the result page,
    // which loads the persisted match. Without this the page would spin forever.
    const onGone = (data: DuelGonePayload) => navigate(`/hasil/${data.duelId}`, { replace: true })

    socket.on('duel:state', onState)
    socket.on('duel:countdown', onCountdown)
    socket.on('duel:tick', onTick)
    socket.on('duel:opponent_answered', onOpponentAnswered)
    socket.on('duel:result', onResult)
    socket.on('duel:paused', onPaused)
    socket.on('duel:finished', onFinished)
    socket.on('duel:gone', onGone)

    return () => {
      socket.off('duel:state', onState)
      socket.off('duel:countdown', onCountdown)
      socket.off('duel:tick', onTick)
      socket.off('duel:opponent_answered', onOpponentAnswered)
      socket.off('duel:result', onResult)
      socket.off('duel:paused', onPaused)
      socket.off('duel:finished', onFinished)
      socket.off('duel:gone', onGone)
      // Do NOT emit duel:leave here - leaving the room is harmless, but we
      // avoid signalling a disconnect on plain navigation (socket persists).
    }
  }, [socket, connected, user, duelId, navigate])

  // Safety net: if the server never answers (e.g. a dropped duel:join), don't
  // leave the player on an infinite spinner - fall back to the result page,
  // which shows "not found" gracefully when there is nothing to show.
  useEffect(() => {
    if (!connected || duelState || finished || !duelId) return
    const id = setTimeout(() => navigate(`/hasil/${duelId}`, { replace: true }), 6000)
    return () => clearTimeout(id)
  }, [connected, duelState, finished, duelId, navigate])

  // Grace-period countdown while the opponent is away.
  useEffect(() => {
    if (!pause?.paused) return
    const id = setInterval(() => setGraceLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [pause])

  // Delay the "opponent disconnected" overlay. A page refresh drops the socket
  // for ~1s and then reconnects; without this debounce the *other* player would
  // see a false "Lawan Terputus" flash. A resume cancels the pending reveal.
  useEffect(() => {
    if (!pause?.paused) {
      setShowPause(false)
      return
    }
    const id = setTimeout(() => setShowPause(true), PAUSE_OVERLAY_DELAY_MS)
    return () => clearTimeout(id)
  }, [pause])

  const forfeit = () => {
    socketRef.current?.emit('duel:forfeit', { duelId })
  }

  if (!user) {
    return <Center>Login dulu untuk bermain duel.</Center>
  }

  if (!connected && !duelState) {
    // Only the very first connect gets a full-screen state; a mid-duel blip is
    // handled by the slim banner below so the question is never hidden.
    return (
      <Center>
        <div className="flex items-center gap-2 text-text-muted">
          <LoaderPinwheel size={20} className="animate-spin" />
          <span>Menyambungkan ke arena…</span>
        </div>
      </Center>
    )
  }

  if (finished && finishedReady) {
    const isWin = finished.winnerId === user.id
    return (
      <Center>
        <div className="w-full max-w-md rounded-lg border border-border bg-bg-surface p-8 text-center">
          {isWin ? (
            <Trophy size={64} strokeWidth={1.6} className="mx-auto mb-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <Frown size={64} strokeWidth={1.6} className="mx-auto mb-4 text-danger" aria-hidden="true" />
          )}
          <h1 className="font-display mb-2 text-3xl">{isWin ? 'Kamu Menang!' : 'Kamu Kalah'}</h1>
          <p className="text-text-muted">Mengarahkan ke halaman hasil…</p>
        </div>
      </Center>
    )
  }

  // Countdown before the first question. Derived from duelState.status (not a
  // separate event) so the quiz never flashes for a beat while the state says
  // we are still counting down - duel:state carries countdownValue from the start.
  if (duelState && duelState.status === 'countdown' && duelState.countdownValue > 0) {
    return (
      <Center>
        <div className="text-center">
          <div className="font-display mb-4 animate-pulse text-8xl font-bold text-primary">
            {duelState.countdownValue}
          </div>
          <p className="text-text-muted">Bersiap…</p>
        </div>
      </Center>
    )
  }

  if (!duelState) {
    return (
      <Center>
        <LoaderPinwheel size={32} className="animate-spin text-primary" />
      </Center>
    )
  }

  const currentQ = duelState.questions[duelState.currentQuestionIndex]
  const me = duelState.players.find(p => p.userId === user.id)
  const opponent = duelState.players.find(p => p.userId !== user.id)

  // Who falls: during a round it is the knockout victim (HP 0); once the duel is
  // over it is the match loser - so the 3-frame die animation is the finale even
  // when the last question decided it on HP/speed. Held until the round's
  // choreography settles, so the finishing blow is always seen first.
  const loserId =
    finished && finished.winnerId !== null
      ? finished.players.find(p => p.userId !== finished.winnerId)?.userId ?? null
      : null

  const animFor = (player: PlayerState | undefined, fallback: CharAnimState): CharAnimState => {
    if (!player) return fallback
    const isDying = loserId !== null ? player.userId === loserId : player.hp <= 0
    return isDying && anim.settled ? 'die' : fallback
  }

  return (
    <div className="mx-auto max-w-4xl px-2 py-6 sm:px-4">
      {/* Connection banner - a brief blip must not hide the question. */}
      {!connected && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          <WifiOff size={16} strokeWidth={1.9} className="shrink-0" />
          <span>Koneksi terputus. Menyambungkan ulang…</span>
          <LoaderPinwheel size={14} className="animate-spin" />
        </div>
      )}

      {/* Timer + progress */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-bg-raised px-3 py-1">
          <Clock size={16} strokeWidth={1.9} className="text-text-muted text-xs sm:text-base" />
          <span className="font-display text-base sm:text-lg tabular">{duelState.timeLeft}s</span>
        </div>
        <div className="flex-1">
          <div className="mb-1 flex justify-between text-xs text-text-muted">
            <span>Soal {duelState.currentQuestionIndex + 1}</span>
            <span>{duelState.questions.length} soal</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-raised">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((duelState.currentQuestionIndex + 1) / duelState.questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Battle stage: fighters flanking the question */}
      <BattleStage
        clash={anim.clash || finished !== null}
        me={{
          name: me?.username ?? 'Kamu',
          hp: me?.hp ?? 0,
          character: me?.character ?? profile?.character ?? DEFAULT_CHARACTER_ID,
          anim: animFor(me, anim.me.state),
        }}
        opponent={{
          name: opponent?.username ?? 'Lawan',
          hp: opponent?.hp ?? 0,
          character: opponent?.character ?? DEFAULT_CHARACTER_ID,
          anim: animFor(opponent, anim.opponent.state),
        }}
      >
        <NoCopy className="rounded-lg border border-border bg-bg-surface p-4 sm:p-6">
          <h2 className="mb-5 flex items-start gap-2 text-base font-medium sm:text-xl">
            <RichText text={currentQ?.text ?? 'Memuat soal…'} />
          </h2>

          <div className="space-y-2.5">
            {currentQ?.options.map((opt, idx) => {
              const isSelected = selected === idx
              const isCorrect = reveal && round.correctAnswer === idx
              const isWrongPick = reveal && isSelected && round.correctAnswer !== idx

              let cls = 'border-border bg-bg-raised hover:border-primary/50'
              if (isCorrect) cls = 'border-primary bg-primary/15 font-medium'
              else if (isWrongPick) cls = 'border-danger bg-danger/15'
              else if (isSelected) cls = 'border-primary bg-primary/10 font-medium'
              else if (reveal) cls = 'border-border bg-bg-raised opacity-70'

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={selected !== null || reveal}
                  className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition-colors sm:px-4 sm:py-3 sm:text-base ${cls} ${selected !== null || reveal ? 'cursor-not-allowed' : ''
                    }`}
                >
                  <span>
                    <span className="mr-2 font-bold text-text-muted">{String.fromCharCode(65 + idx)}.</span>
                    <RichText text={opt} />
                  </span>
                  {isCorrect && <CircleCheck size={18} className="shrink-0 text-primary" strokeWidth={2} />}
                  {isWrongPick && <CircleX size={18} className="shrink-0 text-danger" strokeWidth={2} />}
                </button>
              )
            })}
          </div>

          <div className="mt-3 min-h-5 text-center text-xs text-text-muted sm:text-sm">
            {reveal && round.players.find(p => p.userId !== user.id)?.answer === null && (
              <span>Lawan tidak menjawab soal ini.</span>
            )}
            {!reveal && selected !== null && (opponentAnswered ? <span>Lawan sudah menjawab…</span> : <span>Menunggu lawan menjawab…</span>)}
            {!reveal && selected === null && opponentAnswered && <span>Lawan sudah menjawab - giliranmu!</span>}
          </div>
        </NoCopy>
      </BattleStage>

      {/* Forfeit */}
      <div className="mt-6 flex justify-center">
        {confirmForfeit ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-text-muted">Yakin menyerah?</span>
            <button onClick={forfeit} className="rounded-md bg-danger px-4 py-2 font-medium text-white">
              Ya, menyerah
            </button>
            <button onClick={() => setConfirmForfeit(false)} className="rounded-md border border-border px-4 py-2 text-text-muted">
              Batal
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmForfeit(true)}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-danger hover:text-danger"
          >
            <Flag size={16} strokeWidth={2} /> Menyerah
          </button>
        )}
      </div>

      {/* Opponent disconnected overlay (delayed to ignore brief blips) */}
      {showPause && pause?.paused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-bg-surface p-6 text-center">
            <WifiOff size={36} className="mx-auto mb-3 text-danger" strokeWidth={1.9} />
            <h3 className="font-display mb-2 text-lg">Lawan Terputus</h3>
            <p className="text-sm text-text-muted">
              Menunggu lawan kembali{graceLeft > 0 ? ` (${graceLeft}s)` : ''}… Duel dijeda.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[70dvh] items-center justify-center px-4 text-text-muted">{children}</div>
}
