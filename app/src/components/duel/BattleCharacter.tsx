import { useEffect, useRef, useState } from 'react'
import type { CharacterId, CharAnimState } from '../../../../shared/types'
import { spriteUrl, SPRITE, FRAME_MS } from '../../lib/characters'

interface BattleCharacterProps {
  character: CharacterId
  /** Which animation to play. */
  state: CharAnimState
  /** Mirror horizontally - the source art faces right. */
  flip?: boolean
  className?: string
}

/**
 * One duel character drawn from its sprite sheet.
 *
 * The sheet is addressed with `background-position` (no per-frame <img>, so no
 * layout thrash and no request storm). Non-looping states (`attack`, `hurt`,
 * `die`) hold their final frame; `idle` and `run` loop.
 *
 * Size is driven by the `--char-cell` CSS variable (default 112px) so callers
 * can make it responsive with a Tailwind class such as
 * `[--char-cell:56px] sm:[--char-cell:96px]` - the sheet scale follows.
 *
 * Frames advance on a timer keyed to `state`, so switching state restarts the
 * animation from frame 0 - which is exactly the intent (a fresh attack swing).
 */
export default function BattleCharacter({
  character,
  state,
  flip = false,
  className = '',
}: BattleCharacterProps) {
  const [frame, setFrame] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setFrame(0)
    const total = SPRITE.frames[state]
    // A single-frame state needs no timer at all.
    if (total <= 1) return

    const loops = state === 'idle' || state === 'run'
    timer.current = setInterval(() => {
      setFrame((f) => {
        const next = f + 1
        if (next >= total) return loops ? 0 : total - 1
        return next
      })
    }, FRAME_MS[state])

    return () => {
      if (timer.current) clearInterval(timer.current)
      timer.current = null
    }
  }, [state])

  const col = frame % SPRITE.frames[state]
  const row = SPRITE.row[state]
  // `--char-cell` with a safe fallback, so the sheet scales with the element.
  const cell = 'var(--char-cell, 112px)'

  return (
    <div
      role="img"
      aria-label={`${character} ${state}`}
      className={className}
      style={{
        width: cell,
        height: cell,
        backgroundImage: `url(${spriteUrl(character)})`,
        backgroundSize: `calc(${cell} * ${SPRITE.cols}) calc(${cell} * ${SPRITE.rows})`,
        backgroundPosition: `calc(${cell} * -${col}) calc(${cell} * -${row})`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        transform: flip ? 'scaleX(-1)' : undefined,
      }}
    />
  )
}
