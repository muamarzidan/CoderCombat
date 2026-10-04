import type { CharacterId, CharAnimState } from '../../../../shared/types'
import BattleCharacter from './BattleCharacter'
import { hpBarColor } from '../../lib/hp'

interface BattleFighterProps {
  name: string
  hp: number
  character: CharacterId
  anim: CharAnimState
  /** Which way the art should face - the left fighter faces right. */
  side: 'left' | 'right'
  /** Highlight the HP bar in red when this fighter just took damage. */
  damaged?: boolean
  /** Extra classes (e.g. flex `order-*`) applied to the column wrapper. */
  className?: string
}

/**
 * One fighter column: HP strip on top, sprite below.
 *
 * The sprite faces right in the source art, so the left fighter is drawn
 * normally and the right fighter is mirrored - both end up facing the middle.
 *
 * The sprite scales with `--char-cell`, which the parent stage sets responsively
 * so the fighters stay compact on a 360px screen and the question keeps room.
 */
export default function BattleFighter({
  name,
  hp,
  character,
  anim,
  side,
  damaged = false,
  className = '',
}: BattleFighterProps) {
  const pct = Math.max(0, Math.min(100, hp))
  const isLeft = side === 'left'

  return (
    <div className={`flex shrink-0 flex-col items-center gap-1.5 ${className}`}>
      {/* HP strip */}
      <div className="w-full min-w-[64px]">
        <p className="mb-1 truncate text-center text-[11px] font-medium text-text-muted sm:text-xs">{name}</p>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full border border-border bg-bg-raised">
          <div
            className={`hp-bar h-full rounded-full transition-colors ${damaged ? 'bg-danger' : hpBarColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-center font-display text-[11px] tabular text-text-muted sm:text-xs">{pct} HP</p>
      </div>

      {/* Sprite - the shake lives on a wrapper so it never clobbers the sprite's
          own `scaleX(-1)` mirror transform. */}
      <div className={anim === 'hurt' ? 'animate-[shake_0.3s_ease-in-out]' : undefined}>
        <BattleCharacter character={character} state={anim} flip={!isLeft} />
      </div>
    </div>
  )
}
