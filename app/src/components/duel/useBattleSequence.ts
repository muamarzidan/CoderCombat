import { useEffect, useRef, useState } from 'react'
import type { CharAnimState } from '../../../../shared/types'

/** How long each phase of the round animation lasts (ms). */
export const BATTLE_TIMING = {
  /** Both fighters sprint toward the middle. */
  run: 450,
  /** The winning side swings. */
  attack: 380,
  /** The losing side recoils. */
  hurt: 320,
} as const

/** Total round choreography time (run + attack + hurt). */
export const BATTLE_TOTAL_MS = BATTLE_TIMING.run + BATTLE_TIMING.attack + BATTLE_TIMING.hurt

/** One side's animation, resolved for the round being revealed. */
export interface FighterAnimation {
  state: CharAnimState
}

/** Both sides' animations for the current phase. */
export interface BattleAnimations {
  me: FighterAnimation
  opponent: FighterAnimation
  /**
   * True while the fighters are closing in / trading blows. The stage uses it to
   * hide the question card (on sm+ screens) so the clash is unobstructed, and to
   * slide the fighters toward the middle. False once the round settles.
   */
  clash: boolean
  /**
   * True once the round's choreography has fully settled (or when there was no
   * round to play at all). The finale's death animation is keyed on this so a
   * knockout is never shown before the finishing blow has landed.
   */
  settled: boolean
}

/** Internal timeline phase for the revealed round. */
type Phase = 'idle' | 'run' | 'attack' | 'hurt' | 'done'

/**
 * Drives the round choreography from the *reveal* signal alone.
 *
 * When `reveal` flips false→true the sequence runs once: run → attack (winner)
 * / hurt (loser) → idle. Because it is keyed on `reveal` (a boolean the parent
 * derives from the round result), it re-runs exactly once per question and never
 * on unrelated re-renders - no effect churn.
 *
 * Returns the current animation for each side plus a `clash` flag, so the caller
 * decides which side is which (winner attacks, loser is hurt) and when to hide
 * the question.
 */
export function useBattleSequence(
  reveal: boolean,
  winnerSide: 'me' | 'opponent' | null,
): BattleAnimations {
  const [phase, setPhase] = useState<Phase>('idle')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const clear = () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
    if (!reveal) {
      clear()
      setPhase('idle')
      return
    }

    clear()
    setPhase('run')
    timers.current.push(setTimeout(() => setPhase('attack'), BATTLE_TIMING.run))
    timers.current.push(
      setTimeout(() => setPhase('hurt'), BATTLE_TIMING.run + BATTLE_TIMING.attack),
    )
    timers.current.push(
      setTimeout(
        () => setPhase('done'),
        BATTLE_TIMING.run + BATTLE_TIMING.attack + BATTLE_TIMING.hurt,
      ),
    )

    return clear
  }, [reveal])

  const running = phase === 'run'
  const hurting = phase === 'hurt'
  // The winner's timeline: sprint in, swing, then settle.
  const strike: CharAnimState = running ? 'run' : phase === 'attack' ? 'attack' : 'idle'
  // The loser's timeline: sprint in, recoil, then settle.
  const recoil: CharAnimState = running ? 'run' : hurting ? 'hurt' : 'idle'

  let me: CharAnimState
  let opponent: CharAnimState
  if (winnerSide === null) {
    // Nobody landed a hit - both sides simply take the recoil.
    const both: CharAnimState = running ? 'run' : hurting ? 'hurt' : 'idle'
    me = both
    opponent = both
  } else if (winnerSide === 'me') {
    me = strike
    opponent = recoil
  } else {
    me = recoil
    opponent = strike
  }

  return {
    me: { state: me },
    opponent: { state: opponent },
    clash: running || phase === 'attack' || hurting,
    // A round has settled once its choreography reaches `done`; with no round to
    // play there is nothing to wait for, so it counts as settled immediately.
    settled: !reveal || phase === 'done',
  }
}
