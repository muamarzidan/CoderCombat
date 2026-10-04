import type { CharacterId, CharAnimState } from '../../../shared/types'

/**
 * Client-side character manifest - single source of truth for everything the UI
 * needs to draw a duel character. The sprite-sheet geometry here MUST match
 * `scripts/build-sprites.mjs` (row order, column count, cell size).
 */

/** Where a character's sprite sheet lives (served from app/public). */
export function spriteUrl(id: CharacterId): string {
  return `/characters/${id}.png`
}

/** Display metadata for the character picker. */
export const CHARACTERS: readonly { id: CharacterId; name: string; blurb: string }[] = [
  { id: 'samurai', name: 'Samurai', blurb: 'Pendekar pedang perempuan' },
  { id: 'shinobi', name: 'Shinobi', blurb: 'Ninja laki-laki' },
]

/** Sprite-sheet geometry (must match scripts/build-sprites.mjs). */
export const SPRITE = {
  /** One square cell in pixels. */
  cell: 112,
  /** Number of columns in the sheet. */
  cols: 7,
  /** Number of rows (one per animation state). */
  rows: 5,
  /** Row index for each state. */
  row: { idle: 0, run: 1, attack: 2, hurt: 3, die: 4 } as const satisfies Record<CharAnimState, number>,
  /** Frame count per state; frames start at column 0. */
  frames: { idle: 1, run: 7, attack: 4, hurt: 1, die: 3 } as const satisfies Record<CharAnimState, number>,
} as const

/** Milliseconds per frame, per state - pacing that reads well at 112px. */
export const FRAME_MS: Record<CharAnimState, number> = {
  idle: 400,
  run: 80,
  attack: 90,
  hurt: 200,
  // Deliberately slow: the 3 die frames (upright → hunched → sprawled) are the
  // knockout beat, and a 360px sprite needs a moment for each to register.
  die: 300,
}

/** Full length of the death animation (3 frames) - used to hold the result screen. */
export const DEATH_MS = SPRITE.frames.die * FRAME_MS.die
