import type { BotLevel } from '../../../shared/types.js'

/** Game tuning - single source of truth for duel rules. */
export const DUEL = {
  HP_START: 100,
  HP_LOSS_PER_QUESTION: 20,
  QUESTIONS_PER_DUEL: 5,
  COUNTDOWN_SECONDS: 5,
  COUNTDOWN_ARM_FALLBACK_MS: 1_500,
  ANSWER_TIME_SECONDS: 15,
  DISCONNECT_GRACE_MS: 8_000,
} as const

export interface BotProfile {
  correctCount: number
  delayMs: readonly [number, number]
}

export const BOT_PROFILES: Record<BotLevel, BotProfile> = {
  mudah: { correctCount: 2, delayMs: [6_000, 8_000] },
  sedang: { correctCount: 3, delayMs: [5_000, 8_000] },
  susah: { correctCount: 5, delayMs: [3_000, 6_000] },
}

/** Private-room tuning. */
export const ROOM = {
  CODE_LENGTH: 6,
  PASSWORD_LENGTH: 4,
  TTL_MS: 10 * 60_000,
  JOIN_ATTEMPTS: 8,
  JOIN_WINDOW_MS: 60_000,
} as const
