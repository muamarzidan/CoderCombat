import type { ReactNode } from 'react'
import type { CharacterId, CharAnimState } from '../../../../shared/types'
import BattleFighter from './BattleFighter'

interface Fighter {
  name: string
  hp: number
  character: CharacterId
  anim: CharAnimState
}

interface BattleStageProps {
  me: Fighter
  opponent: Fighter
  /**
   * True while the round is being played out (run → attack → hurt). The two
   * fighters close the distance to trade blows, then fall back apart.
   */
  clash: boolean
  /** The question card, rendered between the fighters. */
  children: ReactNode
}

/**
 * Duel stage.
 *
 * Layout adapts in two steps, and the fighters approach the middle in *both*:
 *  - **Mobile (< sm):** the fighters sit on their own row *above* the question.
 *    The row is centred with a wide horizontal gap that collapses during
 *    `clash`, so they slide together without anything being hidden - a 360px
 *    screen is too narrow to drop the question.
 *  - **sm+:** a single row of `fighter | question | fighter`. During `clash` the
 *    question column collapses (`max-width: 0`) so the fighters meet in the
 *    middle, then it expands again as the round settles.
 *
 * The `--char-cell` variable scales the sprites responsively so the question
 * keeps room on a phone.
 */
export default function BattleStage({ me, opponent, clash, children }: BattleStageProps) {
  const questionCls = [
    'basis-full min-w-0 overflow-hidden sm:order-2 sm:basis-0 sm:flex-1',
    'transition-[max-width,opacity] duration-500 ease-out',
    clash
      ? 'sm:pointer-events-none sm:max-w-0 sm:opacity-0'
      : 'sm:max-w-[60rem] sm:opacity-100',
  ].join(' ')

  // On a phone the fighters are drawn together by shrinking the horizontal gap
  // (sm+ closes the gap by collapsing the question column instead). `gap` is
  // animatable, so the approach glides rather than jumping.
  const gapX = clash ? 'gap-x-3' : 'gap-x-[40vw]'

  return (
    <div
      className={`flex flex-wrap items-start justify-center gap-y-3 ${gapX} [--char-cell:56px] transition-[gap] duration-500 ease-out sm:flex-nowrap sm:gap-x-4 sm:gap-y-0 sm:[--char-cell:88px] lg:[--char-cell:112px]`}
    >
      <BattleFighter
        className="sm:order-1"
        name={me.name}
        hp={me.hp}
        character={me.character}
        anim={me.anim}
        side="left"
        damaged={me.anim === 'hurt'}
      />

      <BattleFighter
        className="sm:order-3"
        name={opponent.name}
        hp={opponent.hp}
        character={opponent.character}
        anim={opponent.anim}
        side="right"
        damaged={opponent.anim === 'hurt'}
      />

      <div className={questionCls}>{children}</div>
    </div>
  )
}
