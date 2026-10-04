import { randomUUID } from 'crypto'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { Server as IOServer, Socket } from 'socket.io'
import type {
  BotLevel,
  CharacterId,
  DuelAnswer,
  DuelEndReason,
  DuelFinishedPayload,
  DuelMatchedPayload,
  DuelPausedPayload,
  DuelQuestion,
  DuelRoundResult,
  DuelState,
  DuelStatus,
  ModuleContent,
  PlayerState,
  QuestionWithAnswer,

} from '../../../shared/types.js'
import { DUEL, BOT_PROFILES } from './constants.js'


export interface Player {
  userId: string
  username: string
  character: CharacterId
  socketId: string
  hp: number
  answers: (DuelAnswer | null)[]
}

export class Duel {
  readonly id: string
  readonly modulId: string
  questions: QuestionWithAnswer[] = []
  readonly players: [Player, Player]
  status: DuelStatus = 'countdown'
  currentQuestionIndex = 0
  timeLeft = DUEL.ANSWER_TIME_SECONDS
  countdownValue = DUEL.COUNTDOWN_SECONDS
  paused = false
  winnerId: string | null = null

  private tickTimer: ReturnType<typeof setInterval> | null = null
  private countdownTimer: ReturnType<typeof setInterval> | null = null
  private countdownArmTimer: ReturnType<typeof setTimeout> | null = null
  private countdownArmed = false
  private botTimer: ReturnType<typeof setTimeout> | null = null
  private graceTimer: ReturnType<typeof setTimeout> | null = null
  private questionStartTime = 0
  private answeredThisRound = new Set<string>()
  private botCorrectIndices = new Set<number>()
  private readonly botLevel: BotLevel | null
  private readonly io: IOServer
  private readonly onEnd: (duel: Duel, reason: DuelEndReason) => void

  constructor(params: {
    modulId: string
    players: [Player, Player]
    io: IOServer
    onEnd: (duel: Duel, reason: DuelEndReason) => void
    botLevel?: BotLevel | null
  }) {
    this.id = randomUUID()
    this.modulId = params.modulId
    this.players = params.players
    this.io = params.io
    this.onEnd = params.onEnd
    this.botLevel = params.botLevel ?? null
  }

  async loadQuestions(): Promise<void> {
    const contentDir = process.env.CONTENT_DIR || join(process.cwd(), '..', 'content')
    const raw = await readFile(join(contentDir, `${this.modulId}.json`), 'utf-8')
    const data: ModuleContent = JSON.parse(raw)
    this.questions = shuffle(data.questions).slice(0, DUEL.QUESTIONS_PER_DUEL)
    if (this.questions.length === 0) {
      throw new Error(`Modul ${this.modulId} tidak punya soal`)
    }
    if (this.botLevel) {
      const count = Math.min(BOT_PROFILES[this.botLevel].correctCount, this.questions.length)
      const indices = shuffle(this.questions.map((_, i) => i)).slice(0, count)
      this.botCorrectIndices = new Set(indices)
    }
  }

  addSocket(socket: Socket | undefined): void {
    if (!socket) return
    socket.join(this.id)
  }

  isBot(userId: string): boolean {
    return userId.startsWith('bot_')
  }

  start(): void {
    const payload: DuelMatchedPayload = {
      duelId: this.id,
      modulId: this.modulId,
      players: this.players.map(toPlayerState),
    }
    this.broadcast('duel:matched', payload)
    this.beginCountdown()
  }

  private beginCountdown(): void {
    this.status = 'countdown'
    this.countdownValue = DUEL.COUNTDOWN_SECONDS
    this.broadcastState()
    this.countdownArmTimer = setTimeout(
      () => this.armCountdown(),
      DUEL.COUNTDOWN_ARM_FALLBACK_MS,
    )
  }

  private armCountdown(): void {
    if (this.countdownArmed || this.status !== 'countdown') return
    this.countdownArmed = true
    this.clearCountdownArmTimer()
    this.countdownValue = DUEL.COUNTDOWN_SECONDS
    this.broadcastState()
    this.countdownTimer = setInterval(() => {
      if (this.paused) return
      this.countdownValue--
      this.broadcast('duel:countdown', this.countdownValue)
      if (this.countdownValue <= 0) {
        this.clearCountdown()
        this.beginQuestion()
      }
    }, 1000)
  }

  private beginQuestion(): void {
    this.status = 'playing'
    this.answeredThisRound.clear()
    this.timeLeft = DUEL.ANSWER_TIME_SECONDS
    this.questionStartTime = Date.now()
    this.broadcastState()

    this.tickTimer = setInterval(() => {
      if (this.paused) return
      this.timeLeft--
      this.broadcast('duel:tick', this.timeLeft)
      if (this.timeLeft <= 0) this.resolveQuestion()
    }, 1000)

    this.scheduleBot()
  }

  private scheduleBot(): void {
    this.clearBotTimer()
    const bot = this.players.find(p => this.isBot(p.userId))
    if (!bot || !this.botLevel) return

    const idx = this.currentQuestionIndex
    const { delayMs } = BOT_PROFILES[this.botLevel]
    const delay = randInt(delayMs[0], delayMs[1])
    const knows = this.botCorrectIndices.has(idx)

    this.botTimer = setTimeout(() => {
      if (this.status !== 'playing' || this.paused) return
      const q = this.questions[idx]
      const pick = knows ? q.answerIndex : randomOption(q.options.length, q.answerIndex)
      this.submitAnswer(bot.userId, pick)
    }, delay)
  }

  submitAnswer(userId: string, optionIndex: number): void {
    if (this.status !== 'playing' || this.paused) return
    if (this.answeredThisRound.has(userId)) return

    const player = this.players.find(p => p.userId === userId)
    if (!player) return

    const q = this.questions[this.currentQuestionIndex]
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= q.options.length) return

    this.answeredThisRound.add(userId)
    player.answers[this.currentQuestionIndex] = {
      optionIndex,
      timeMs: Date.now() - this.questionStartTime,
    }

    this.broadcast('duel:opponent_answered', { userId })

    if (this.answeredThisRound.size >= this.players.length) {
      this.resolveQuestion()
    }
  }

  private resolveQuestion(): void {
    this.clearTick()
    this.clearBotTimer()

    const q = this.questions[this.currentQuestionIndex]
    const correct = q.answerIndex

    for (const p of this.players) {
      const ans = p.answers[this.currentQuestionIndex]
      const isCorrect = ans !== null && ans !== undefined && ans.optionIndex === correct
      if (!isCorrect) p.hp = Math.max(0, p.hp - DUEL.HP_LOSS_PER_QUESTION)
    }

    const result: DuelRoundResult = {
      questionIndex: this.currentQuestionIndex,
      correctAnswer: correct,
      players: this.players.map(p => ({
        userId: p.userId,
        hp: p.hp,
        answer: p.answers[this.currentQuestionIndex]?.optionIndex ?? null,
      })),
    }
    this.broadcast('duel:result', result)

    const someoneOut = this.players.some(p => p.hp <= 0)
    const lastQuestion = this.currentQuestionIndex + 1 >= this.questions.length
    if (someoneOut || lastQuestion) {
      this.finish('normal')
      return
    }

    this.currentQuestionIndex++
    setTimeout(() => {
      if (this.status === 'playing') this.beginQuestion()
    }, 2000)
  }

  handleDisconnect(socketId: string): void {
    if (this.status === 'finished') return
    const player = this.players.find(p => p.socketId === socketId)
    if (!player) return

    player.socketId = ''
    this.pause()

    this.clearGrace()
    this.graceTimer = setTimeout(() => {
      const opponent = this.players.find(p => p.userId !== player.userId)
      if (!opponent) return
      opponent.hp = DUEL.HP_START
      player.hp = 0
      this.finish('disconnect')
    }, DUEL.DISCONNECT_GRACE_MS)
  }

  handleReconnect(socket: Socket, userId: string): void {
    if (this.status === 'finished') return
    const player = this.players.find(p => p.userId === userId)
    if (!player) return

    player.socketId = socket.id
    this.addSocket(socket)
    if (this.graceTimer) {
      this.clearGrace()
      this.resume()
    }
    this.armCountdown()
    this.sendStateTo(socket)
  }

  forfeit(userId: string): void {
    if (this.status === 'finished') return
    const player = this.players.find(p => p.userId === userId)
    if (!player) return
    const opponent = this.players.find(p => p.userId !== userId)
    if (opponent) opponent.hp = DUEL.HP_START
    player.hp = 0
    this.finish('normal')
  }

  private pause(): void {
    if (this.paused) return
    this.paused = true
    this.clearBotTimer()
    const payload: DuelPausedPayload = { paused: true, graceMs: DUEL.DISCONNECT_GRACE_MS }
    this.broadcast('duel:paused', payload)
  }

  private resume(): void {
    if (!this.paused) return
    this.paused = false
    const payload: DuelPausedPayload = { paused: false, graceMs: 0 }
    this.broadcast('duel:paused', payload)
    if (this.status === 'playing') this.scheduleBot()
  }

  private finish(reason: DuelEndReason): void {
    this.clearTick()
    this.clearCountdown()
    this.clearCountdownArmTimer()
    this.clearBotTimer()
    this.clearGrace()
    this.status = 'finished'
    this.paused = false

    this.winnerId = this.decideWinner()
    const payload: DuelFinishedPayload = {
      duelId: this.id,
      winnerId: this.winnerId,
      reason,
      players: this.players.map(toPlayerState),
    }
    this.broadcast('duel:finished', payload)
    this.onEnd(this, reason)
  }

  private decideWinner(): string {
    const [a, b] = this.players
    if (a.hp !== b.hp) return a.hp > b.hp ? a.userId : b.userId
    return totalTime(a) <= totalTime(b) ? a.userId : b.userId
  }

  private broadcastState(): void {
    this.broadcast('duel:state', this.buildState())
  }

  private sendStateTo(socket: Socket): void {
    socket.emit('duel:state', this.buildState())
  }

  private buildState(): DuelState {
    return {
      id: this.id,
      modulId: this.modulId,
      status: this.status,
      currentQuestionIndex: this.currentQuestionIndex,
      questions: this.questions.map(toDuelQuestion),
      players: this.players.map(toPlayerState),
      timeLeft: this.timeLeft,
      countdownValue: this.countdownValue,
      paused: this.paused,
    }
  }

  private clearTick(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
  }

  private clearCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
  }

  private clearCountdownArmTimer(): void {
    if (this.countdownArmTimer) {
      clearTimeout(this.countdownArmTimer)
      this.countdownArmTimer = null
    }
  }

  private clearBotTimer(): void {
    if (this.botTimer) {
      clearTimeout(this.botTimer)
      this.botTimer = null
    }
  }

  private clearGrace(): void {
    if (this.graceTimer) {
      clearTimeout(this.graceTimer)
      this.graceTimer = null
    }
  }

  private broadcast(event: string, payload: unknown): void {
    this.io.to(this.id).emit(event, payload)
  }
}



// Helper

function toPlayerState(p: Player): PlayerState {
  return { userId: p.userId, username: p.username, hp: p.hp, character: p.character }
}

function toDuelQuestion(q: QuestionWithAnswer, index: number): DuelQuestion {
  return { id: q.id ?? `q${index}`, text: q.text, options: q.options }
}

function totalTime(p: Player): number {
  return p.answers.reduce((sum, ans) => sum + (ans?.timeMs ?? DUEL.ANSWER_TIME_SECONDS * 1000), 0)
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function randomOption(total: number, exclude: number): number {
  const opts = Array.from({ length: total }, (_, i) => i).filter(i => i !== exclude)
  return opts[Math.floor(Math.random() * opts.length)] ?? 0
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}
