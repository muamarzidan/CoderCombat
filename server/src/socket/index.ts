import type { Server as IOServer, Socket } from 'socket.io'
import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  BotLevel,
  CharacterId,
  DuelEndReason,
  MatchDetail,
  QueueEntry,
  RoomCreatedPayload,
  RoomJoinError,
} from '../../../shared/types.js'
import { isModuleId, isCharacterId, DEFAULT_CHARACTER_ID, type ModuleId } from '../../../shared/constants.js'
import { QueueManager } from './queue.js'
import { RoomManager, type RoomPlayer } from './room.js'
import { Duel, type Player } from './duel.js'
import { DUEL, BOT_PROFILES, ROOM } from './constants.js'
import { RateLimiter } from '../lib/rateLimit.js'


interface QueueJoinData {
  modulId: string
  username: string
  character: CharacterId
}

interface QueueBotData extends QueueJoinData {
  level: BotLevel
}

interface RoomCreateData {
  modulId: string
  username: string
  character: CharacterId
}

interface RoomJoinData {
  code: string
  password: string
  username: string
  modulId: string
  character: CharacterId
}

type DuelSource = 'queue' | 'bot' | 'room'

const BOT_LABELS: Record<BotLevel, string> = {
  mudah: 'Bot Mudah',
  sedang: 'Bot Sedang',
  susah: 'Bot Susah',
}

const ROOM_JOIN_ERRORS: Record<RoomJoinError, string> = {
  not_found: 'Room tidak ditemukan atau sudah kedaluwarsa.',
  full: 'Room ini sudah penuh.',
  bad_password: 'Kode atau password salah.',
  own_room: 'Kamu sudah ada di room ini.',
  wrong_module: 'Room ini dibuat untuk modul lain. Buka modul yang benar untuk bergabung.',
}

export class SocketManager {
  private io: IOServer
  private supabase: SupabaseClient
  private queue: QueueManager
  private rooms: RoomManager
  private duels: Map<string, Duel> = new Map()
  private userToDuel: Map<string, string> = new Map()
  private duelSource: Map<string, DuelSource> = new Map()
  private roomJoinLimiter = new RateLimiter(ROOM.JOIN_ATTEMPTS, ROOM.JOIN_WINDOW_MS)

  constructor(io: IOServer, supabase: SupabaseClient) {
    this.io = io
    this.supabase = supabase
    this.queue = new QueueManager((modulId, p1, p2) => this.createDuel(modulId, p1, p2))
    this.rooms = new RoomManager()
  }

  handleConnection(socket: Socket): void {
    const userId = socket.data?.userId as string | undefined
    if (!userId) {
      console.log(`[socket] unauthenticated connection: ${socket.id}`)
      return
    }

    console.log(`[socket] user ${userId} connected: ${socket.id}`)

    socket.on('disconnect', () => this.handleDisconnect(socket, userId))
    socket.on('queue:join', (data: QueueJoinData) => this.handleQueueJoin(socket, userId, data))
    socket.on('queue:leave', (data: { modulId: string }) => this.handleQueueLeave(userId, data))
    socket.on('queue:bot', (data: QueueBotData) => this.handleQueueBot(socket, userId, data))
    socket.on('room:create', (data: RoomCreateData) => this.handleRoomCreate(socket, userId, data))
    socket.on('room:join', (data: RoomJoinData) => this.handleRoomJoin(socket, userId, data))
    socket.on('room:leave', (data: { code: string }) => this.rooms.leave(data.code, userId))
    socket.on('duel:join', (data: { duelId: string }) => this.handleDuelJoin(socket, userId, data))
    socket.on('duel:answer', (data: { duelId: string; optionIndex: number }) =>
      this.handleDuelAnswer(userId, data),
    )
    socket.on('duel:forfeit', (data: { duelId: string }) => this.handleDuelForfeit(userId, data))
    socket.on('duel:leave', (data: { duelId: string }) => this.handleDuelLeave(userId, data))
  }

  private handleDisconnect(socket: Socket, userId: string): void {
    console.log(`[socket] user ${userId} disconnected: ${socket.id}`)

    const duelId = this.userToDuel.get(userId)
    if (duelId) {
      const duel = this.duels.get(duelId)
      if (duel && duel.status !== 'finished') duel.handleDisconnect(socket.id)
    }

    this.queue.removeBySocket(socket.id)
    this.rooms.removeBySocket(socket.id)
  }

  private handleQueueJoin(socket: Socket, userId: string, data: QueueJoinData): void {
    const modulId = this.resolveModulId(data.modulId)
    if (!modulId) return
    console.log(`[queue:join] ${userId} on ${modulId}`)
    const result = this.queue.join({
      userId,
      username: data.username,
      character: this.resolveCharacter(data.character),
      socketId: socket.id,
      modulId,
      joinedAt: Date.now(),
    })
    if (result === 'matched') console.log(`[match] found pair on ${modulId}`)
  }

  private handleQueueLeave(userId: string, data: { modulId: string }): void {
    const modulId = this.resolveModulId(data.modulId)
    if (modulId) this.queue.leave(modulId, userId)
  }

  private handleQueueBot(socket: Socket, userId: string, data: QueueBotData): void {
    const modulId = this.resolveModulId(data.modulId)
    if (!modulId) return

    const level: BotLevel = data.level in BOT_PROFILES ? data.level : 'sedang'
    console.log(`[queue:bot] ${userId} vs ${level} bot on ${modulId}`)
    this.queue.leave(modulId, userId)

    const botId = `bot_${Date.now()}`
    const player1: Player = {
      userId,
      username: data.username,
      character: this.resolveCharacter(data.character),
      socketId: socket.id,
      hp: DUEL.HP_START,
      answers: [],
    }
    const player2: Player = {
      userId: botId,
      username: BOT_LABELS[level],
      character: this.resolveCharacter(data.character) === 'samurai' ? 'shinobi' : 'samurai',
      socketId: '',
      hp: DUEL.HP_START,
      answers: [],
    }

    void this.createDuelAndNotify(modulId, player1, player2, { source: 'bot', botLevel: level })
  }

  private async createDuel(modulId: string, p1: QueueEntry, p2: QueueEntry): Promise<void> {
    const player1: Player = {
      userId: p1.userId,
      username: p1.username,
      character: p1.character,
      socketId: p1.socketId,
      hp: DUEL.HP_START,
      answers: [],
    }
    const player2: Player = {
      userId: p2.userId,
      username: p2.username,
      character: p2.character,
      socketId: p2.socketId,
      hp: DUEL.HP_START,
      answers: [],
    }
    await this.createDuelAndNotify(modulId, player1, player2, { source: 'queue' })
  }

  private handleRoomCreate(socket: Socket, userId: string, data: RoomCreateData): void {
    const modulId = this.resolveModulId(data.modulId)
    if (!modulId) {
      socket.emit('room:error', { message: 'Modul tidak valid.' })
      return
    }
    const { room, password } = this.rooms.create(
      {
        userId,
        username: data.username,
        character: this.resolveCharacter(data.character),
        socketId: socket.id,
      },
      modulId,
    )
    const payload: RoomCreatedPayload = { code: room.code, password, modulId: room.modulId }
    socket.emit('room:created', payload)
    console.log(`[room:create] ${userId} opened room ${room.code}`)
  }

  private handleRoomJoin(socket: Socket, userId: string, data: RoomJoinData): void {
    if (!this.roomJoinLimiter.allow(userId)) {
      socket.emit('room:error', { message: 'Terlalu banyak percobaan. Coba lagi sebentar lagi.' })
      return
    }

    const modulId = this.resolveModulId(data.modulId)
    if (!modulId) {
      socket.emit('room:error', { message: 'Modul tidak valid.' })
      return
    }

    const guest: RoomPlayer = {
      userId,
      username: data.username,
      character: this.resolveCharacter(data.character),
      socketId: socket.id,
    }
    const result = this.rooms.join(data.code, data.password, modulId, guest)
    if (!result.ok) {
      socket.emit('room:error', {
        message: ROOM_JOIN_ERRORS[result.error],
        code: result.error,
        ...(result.modulId ? { modulId: result.modulId } : {}),
      })
      return
    }

    this.roomJoinLimiter.reset(userId)
    const { host } = result.room
    console.log(`[room:join] ${userId} joined room ${result.room.code}`)

    const player1: Player = {
      userId: host.userId,
      username: host.username,
      character: host.character,
      socketId: host.socketId,
      hp: DUEL.HP_START,
      answers: [],
    }
    const player2: Player = {
      userId: guest.userId,
      username: guest.username,
      character: guest.character,
      socketId: guest.socketId,
      hp: DUEL.HP_START,
      answers: [],
    }
    void this.createDuelAndNotify(result.room.modulId, player1, player2, { source: 'room' })
  }

  private resolveModulId(raw: unknown): ModuleId | null {
    if (isModuleId(raw)) return raw
    console.warn(`[security] rejected unknown modulId: ${JSON.stringify(raw)}`)
    return null
  }

  private resolveCharacter(raw: unknown): CharacterId {
    return isCharacterId(raw) ? raw : DEFAULT_CHARACTER_ID
  }

  private async createDuelAndNotify(
    modulId: string,
    p1: Player,
    p2: Player,
    opts: { source: DuelSource; botLevel?: BotLevel },
  ): Promise<void> {
    const duel = new Duel({
      modulId,
      players: [p1, p2],
      io: this.io,
      onEnd: (d, r) => this.handleDuelEnd(d, r),
      botLevel: opts.botLevel ?? null,
    })

    try {
      await duel.loadQuestions()
    } catch (err) {
      console.error('[duel] failed to load questions:', err)
      return
    }

    this.duels.set(duel.id, duel)
    this.duelSource.set(duel.id, opts.source)
    this.userToDuel.set(p1.userId, duel.id)
    this.userToDuel.set(p2.userId, duel.id)

    duel.addSocket(this.io.sockets.sockets.get(p1.socketId))
    duel.addSocket(this.io.sockets.sockets.get(p2.socketId))

    duel.start()
  }

  private handleDuelJoin(socket: Socket, userId: string, data: { duelId: string }): void {
    const duel = this.duels.get(data.duelId)
    if (!duel || !duel.players.some(p => p.userId === userId)) {
      socket.emit('duel:gone', { duelId: data.duelId })
      return
    }

    this.userToDuel.set(userId, data.duelId)
    duel.handleReconnect(socket, userId)
  }

  private handleDuelAnswer(userId: string, data: { duelId: string; optionIndex: number }): void {
    this.duels.get(data.duelId)?.submitAnswer(userId, data.optionIndex)
  }

  private handleDuelForfeit(userId: string, data: { duelId: string }): void {
    this.duels.get(data.duelId)?.forfeit(userId)
  }

  private handleDuelLeave(userId: string, data: { duelId: string }): void {
    const duel = this.duels.get(data.duelId)
    if (!duel || duel.status === 'finished') this.userToDuel.delete(userId)
  }

  private async handleDuelEnd(duel: Duel, reason: DuelEndReason): Promise<void> {
    const source = this.duelSource.get(duel.id) ?? 'queue'
    this.duels.delete(duel.id)
    this.duelSource.delete(duel.id)
    for (const p of duel.players) this.userToDuel.delete(p.userId)

    const [p1, p2] = duel.players
    const ranked = source === 'queue'
    const storedReason: DuelEndReason = source === 'bot' ? 'bot' : source === 'room' ? 'room' : reason
    console.log(`[duel:end] ${duel.id} finished (${storedReason})`)

    const playerBId = duel.isBot(p2.userId) ? null : p2.userId
    const winnerId = ranked && duel.winnerId ? duel.winnerId : null

    const detail = buildMatchDetail(duel, storedReason)

    try {
      const { error } = await this.supabase.from('matches').insert({
        id: duel.id,
        module_id: duel.modulId,
        player_a_id: p1.userId,
        player_b_id: playerBId,
        winner_id: winnerId,
        hp_a: p1.hp,
        hp_b: p2.hp,
        reason: storedReason,
        detail,
      })
      if (error) throw error
      console.log(`[db] inserted match ${duel.id}`)
    } catch (err) {
      console.error('[db] failed to insert match:', err)
    }
  }
}

function buildMatchDetail(duel: Duel, reason: DuelEndReason): MatchDetail {
  return {
    modulId: duel.modulId,
    reason,
    winnerId: duel.winnerId,
    questions: duel.questions.map(q => ({
      text: q.text,
      options: q.options,
      correctAnswer: q.answerIndex,
    })),
    players: duel.players.map(p => ({
      userId: p.userId,
      username: p.username,
      hp: p.hp,
      character: p.character,
      answers: p.answers.map(a => a ?? null),
    })),
  }
}
