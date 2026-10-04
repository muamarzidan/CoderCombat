import type { CharacterId } from '../../../../shared/types'
import { CHARACTERS, spriteUrl, SPRITE } from '../../lib/characters'

interface CharacterPickerProps {
  value: CharacterId
  onChange: (id: CharacterId) => void
  /** Hide the heading/labels for compact embed. */
  compact?: boolean
}

/**
 * Pick a duel character. Each option previews the sprite sheet's idle frame
 * (row 0, col 0) so the player sees who they're choosing.
 */
export default function CharacterPicker({ value, onChange, compact = false }: CharacterPickerProps) {
  return (
    <div role="radiogroup" aria-label="Pilih karakter" className="grid grid-cols-2 gap-3">
      {CHARACTERS.map((c) => {
        const selected = c.id === value
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(c.id)}
            className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${
              selected ? 'border-primary bg-primary/10' : 'border-border bg-bg-raised hover:border-primary/50'
            }`}
          >
            {/* Idle frame preview (row 0, col 0), cell scaled to the box size. */}
            <div
              aria-hidden
              className="h-16 w-16"
              style={{
                backgroundImage: `url(${spriteUrl(c.id)})`,
                backgroundSize: `${SPRITE.cols * 64}px ${SPRITE.rows * 64}px`,
                backgroundPosition: '0 0',
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated',
              }}
            />
            <span className="text-sm font-medium">{c.name}</span>
            {!compact && <span className="text-center text-[11px] text-text-muted">{c.blurb}</span>}
          </button>
        )
      })}
    </div>
  )
}
