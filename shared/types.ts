// Content
export interface ModuleMeta {
  id: string
  title: string
  summary: string
  questionCount: number
}

export interface Unit {
  id: string
  title: string
  content: string
}

export interface Question {
  id?: string
  text: string
  options: string[]
  explanation?: string
}

export interface QuestionWithAnswer extends Question {
  answerIndex: number
}

export interface ModuleData {
  id: string
  title: string
  summary: string
  units: Unit[]
  questions: Question[]
}

export interface ModuleContent {
  id: string
  title: string
  summary: string
  units: Unit[]
  questions: QuestionWithAnswer[]
}


// Grading
export interface GradeResultItem {
  questionIndex: number
  questionText: string
  options: string[]
  userAnswer: number | null
  correctAnswer: number
  isCorrect: boolean
  explanation?: string
}

export interface GradeResponse {
  moduleId: string
  score: { correct: number; total: number; percentage: number }
  results: GradeResultItem[]
}


// Duel

export type DuelStatus = 'countdown' | 'playing' | 'finished'

export type DuelEndReason = 'normal' | 'disconnect' | 'bot' | 'room'

export type BotLevel = 'mudah' | 'sedang' | 'susah'

export type CharacterId = 'samurai' | 'shinobi'

export type CharAnimState = 'idle' | 'run' | 'attack' | 'hurt' | 'die'

export interface PlayerState {
  userId: string
  username: string
  hp: number
  character: CharacterId
}

export interface DuelQuestion {
  id: string
  text: string
  options: string[]
}

export interface DuelAnswer {
  optionIndex: number
  timeMs: number
}

export interface DuelState {
  id: string
  modulId: string
  status: DuelStatus
  currentQuestionIndex: number
  questions: DuelQuestion[]
  players: PlayerState[]
  timeLeft: number
  countdownValue: number
  paused: boolean
}


// Socket event payloads
export interface QueueEntry {
  userId: string
  username: string
  character: CharacterId
  socketId: string
  modulId: string
  joinedAt: number
}

export interface DuelMatchedPayload {
  duelId: string
  modulId: string
  players: PlayerState[]
}

export interface DuelRoundResult {
  questionIndex: number
  correctAnswer: number
  players: { userId: string; hp: number; answer: number | null }[]
}

export interface DuelFinishedPayload {
  duelId: string
  winnerId: string | null
  reason: DuelEndReason
  players: PlayerState[]
}

export interface DuelPausedPayload {
  paused: boolean
  graceMs: number
}

export interface DuelGonePayload {
  duelId: string
}


// Private rooms
export interface RoomCreatedPayload {
  code: string
  password: string
  modulId: string
}

export type RoomJoinError = 'not_found' | 'full' | 'bad_password' | 'own_room' | 'wrong_module'

export interface RoomErrorPayload {
  message: string
  code?: RoomJoinError
  modulId?: string
}


// Match history
export interface MatchQuestionSnapshot {
  text: string
  options: string[]
  correctAnswer: number
}

export interface MatchPlayerSnapshot {
  userId: string
  username: string
  hp: number
  character?: CharacterId
  answers: (DuelAnswer | null)[]
}

export interface MatchDetail {
  modulId: string
  reason: DuelEndReason
  winnerId: string | null
  questions: MatchQuestionSnapshot[]
  players: MatchPlayerSnapshot[]
}

export interface MatchResult {
  id: string
  module_id: string
  player_a_id: string
  player_b_id: string | null
  winner_id: string | null
  hp_a: number
  hp_b: number
  reason: DuelEndReason
  created_at: string
  detail?: MatchDetail | null
}

export interface LeaderboardRow {
  username: string
  wins: number
  losses: number
  duels: number
}
