import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Users, Bot, X, Info, CircleAlert, ArrowRight, CircleCheck, Swords, LoaderPinwheel } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../hooks/useAuth'
import RoomPanel, { RoomWaiting } from '../components/duel/RoomPanel'
import { DEFAULT_CHARACTER_ID } from '../../../shared/constants'
import type {
  BotLevel,
  DuelMatchedPayload,
  RoomCreatedPayload,
  RoomErrorPayload,
} from '../../../shared/types'

type QueueStatus = 'idle' | 'waiting' | 'matched' | 'room-waiting'

/** Seconds of waiting before the "play a bot" shortcut is offered (BRD FR-08). */
const BOT_OFFER_SECONDS = 30

/** Bot difficulty options shown to the player. */
const BOT_LEVELS: { level: BotLevel; label: string; hint: string }[] = [
  { level: 'mudah', label: 'Mudah', hint: 'Santai' },
  { level: 'sedang', label: 'Sedang', hint: 'Seimbang' },
  { level: 'susah', label: 'Susah', hint: 'Menantang' },
]

/**
 * Waiting message that evolves as the queue drags on, so the player never
 * stares at a frozen "waiting…" line.
 */
function waitingText(seconds: number): string {
  if (seconds <= 6) return 'Menunggu pemain lain bergabung...'
  if (seconds <= 14) return 'Sebentar, sebentar lagi ketemu lawan...'
  if (seconds <= 20) return 'Dikit lagi nih...'
  return 'Sepertinya belum ketemu, mohon tunggu...'
}

export default function Antrean() {
  const { modulId: modulParam } = useParams<{ modulId: string }>()
  const modulId = modulParam ?? 'html-dasar'
  const navigate = useNavigate()
  const { socket, connected } = useSocket()
  const { user, profile } = useAuth()
  // The duel character picked at signup (editable in Profil); falls back safely
  // if the profile hasn't loaded yet.
  const character = profile?.character ?? DEFAULT_CHARACTER_ID

  const [status, setStatus] = useState<QueueStatus>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [room, setRoom] = useState<RoomCreatedPayload | null>(null)
  const [roomError, setRoomError] = useState<RoomErrorPayload | null>(null)
  const [roomBusy, setRoomBusy] = useState(false)
  /** Module id confirmed after following the "wrong module" link, if any. */
  const [notice, setNotice] = useState<string | null>(null)
  const username = user?.user_metadata?.username ?? 'Player'
  /** The room's real module, set only when the join failed on a module mismatch. */
  const wrongModuleId = roomError?.code === 'wrong_module' ? roomError.modulId : undefined

  // Listen for a match; navigate into the duel room.
  useEffect(() => {
    if (!socket) return

    const handleMatched = (data: DuelMatchedPayload) => {
      setStatus('matched')
      setTimeout(() => navigate(`/duel/${data.duelId}`), 900)
    }
    const handleRoomCreated = (data: RoomCreatedPayload) => {
      setRoom(data)
      setRoomBusy(false)
      setStatus('room-waiting')
    }
    const handleRoomError = (data: RoomErrorPayload) => {
      setRoomError(data)
      setRoomBusy(false)
    }

    socket.on('duel:matched', handleMatched)
    socket.on('room:created', handleRoomCreated)
    socket.on('room:error', handleRoomError)
    return () => {
      socket.off('duel:matched', handleMatched)
      socket.off('room:created', handleRoomCreated)
      socket.off('room:error', handleRoomError)
    }
  }, [socket, navigate])

  // A stale "wrong module" error must not linger after the user switches
  // modules (e.g. by following the link to the correct one).
  useEffect(() => {
    setRoomError(null)
  }, [modulId])

  // Waiting clock (drives the evolving message and the bot offer).
  useEffect(() => {
    if (status !== 'waiting') return
    setElapsed(0)
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  // Leaving the page while queued must not strand us in the queue.
  const socketRef = useRef(socket)
  socketRef.current = socket
  useEffect(() => {
    return () => {
      socketRef.current?.emit('queue:leave', { modulId })
    }
  }, [modulId])

  const joinQueue = () => {
    if (!socket || !connected) return
    socket.emit('queue:join', { modulId, username, character })
    setStatus('waiting')
  }

  const playBot = (level: BotLevel) => {
    if (!socket || !connected) return
    socket.emit('queue:bot', { modulId, username, character, level })
    setStatus('matched')
  }

  const cancel = () => {
    socket?.emit('queue:leave', { modulId })
    setStatus('idle')
  }

  const createRoom = () => {
    if (!socket || !connected) return
    setNotice(null)
    setRoomError(null)
    setRoomBusy(true)
    socket.emit('room:create', { modulId, username, character })
  }

  const joinRoom = (code: string, password: string) => {
    if (!socket || !connected) return
    setNotice(null)
    setRoomError(null)
    setRoomBusy(true)
    socket.emit('room:join', { code, password, modulId, username, character })
  }

  const cancelRoom = () => {
    if (room) socket?.emit('room:leave', { code: room.code })
    setRoom(null)
    setRoomBusy(false)
    setStatus('idle')
  }

  if (!connected) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 text-text-muted">
          <LoaderPinwheel size={20} className="animate-spin" />
          <span>Menyambungkan ke arena…</span>
        </div>
      </Shell>
    )
  }

  if (status === 'matched') {
    return (
      <Shell>
        <Swords size={60} strokeWidth={1.8} className="mx-auto mb-4 animate-bounce text-primary" aria-hidden="true" />
        <h2 className="font-display mb-2 text-xl text-primary">Lawan Ditemukan!</h2>
        <p className="text-sm text-text-muted">Mengarahkan ke arena duel…</p>
      </Shell>
    )
  }

  if (status === 'room-waiting' && room) {
    return (
      <Shell>
        <RoomWaiting code={room.code} password={room.password} onCancel={cancelRoom} />
      </Shell>
    )
  }

  if (status === 'waiting') {
    const canOfferBot = elapsed >= BOT_OFFER_SECONDS
    return (
      <Shell>
        <LoaderPinwheel size={40} className="mx-auto mb-4 animate-spin text-primary" />
        <h2 className="font-display mb-2 text-xl">Mencari Lawan…</h2>
        <p className="mb-6 text-sm text-text-muted tabular">
          {elapsed}s - {waitingText(elapsed)}
        </p>

        {canOfferBot && (
          <div className="mb-4 rounded-lg border border-border bg-bg-raised p-4">
            <p className="mb-3 text-sm text-text-muted">
              Belum ada lawan online. Mau bertanding lawan bot dulu?
            </p>
            <BotButtons onPick={playBot} />
            <NotRankedNote className="mt-3" />
          </div>
        )}

        <button
          onClick={cancel}
          className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-2 text-sm text-text-muted transition-colors hover:text-text"
        >
          <X size={16} strokeWidth={2} /> Batal
        </button>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="font-display mb-2 text-2xl tracking-wide">Arena Duel</h1>
      <p className="mb-6 text-sm text-text-muted">Anda bisa memilih lawan dengan online matchmaking, room, atau bot.</p>

      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-left text-sm text-primary">
          <CircleCheck size={16} strokeWidth={1.9} className="mt-0.5 shrink-0" />
          <span>
            Kamu sekarang berada di modul <b>{notice}</b>. Silakan gabung room lagi dengan kode yang sama.
          </span>
        </div>
      )}

      {roomError && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-left text-sm text-danger">
          <div className="flex items-center gap-2">
            <CircleAlert size={16} strokeWidth={1.9} className="shrink-0" />
            {roomError.message}
          </div>
          {wrongModuleId && (
            <Link
              to={`/antrean/${wrongModuleId}`}
              onClick={() => setNotice(wrongModuleId)}
              className="mt-2 inline-flex items-center gap-1 font-medium underline underline-offset-2"
            >
              Buka modul {wrongModuleId} <ArrowRight size={14} strokeWidth={2} />
            </Link>
          )}
        </div>
      )}

      <button
        onClick={joinQueue}
        className="mb-8 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-on-primary transition-colors hover:bg-primary-hover"
      >
        <Users size={20} strokeWidth={1.9} /> Cari Lawan Online
      </button>

      <div className="space-y-3">
        <RoomPanel onCreate={createRoom} onJoin={joinRoom} busy={roomBusy} />

        <div className="rounded-lg border border-border bg-bg-raised p-4 text-left">
          <p className="mb-1 flex items-center gap-2 font-medium">
            <Bot size={18} strokeWidth={1.9} /> Lawan Bot
          </p>
          <p className="mb-3 text-xs text-text-muted">Pilih tingkat kesulitan bot.</p>
          <BotButtons onPick={playBot} />
          <NotRankedNote className="mt-3" />
        </div>
      </div>
    </Shell>
  )
}

/** Three difficulty buttons - shared between the idle and the "offer bot" states. */
function BotButtons({ onPick }: { onPick: (level: BotLevel) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {BOT_LEVELS.map(({ level, label, hint }) => (
        <button
          key={level}
          onClick={() => onPick(level)}
          className="flex flex-col items-center rounded-md border border-border bg-bg-surface px-2 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
        >
          <span>{label}</span>
          <span className="text-[10px] font-normal text-text-muted">{hint}</span>
        </button>
      ))}
    </div>
  )
}

/** Tells the player that bot matches are practice only. */
function NotRankedNote({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-start gap-1.5 text-xs text-text-muted ${className}`}>
      <Info size={13} strokeWidth={2} className="mt-0.5 shrink-0" />
      Duel melawan bot tidak dihitung di papan peringkat.
    </p>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-border bg-bg-surface p-6 text-center">{children}</div>
    </div>
  )
}
