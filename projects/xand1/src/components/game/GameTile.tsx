import { Button } from '@/components/ui/button'
import { splitTermForMobile } from '@/lib/game'
import { cn } from '@/lib/utils'

interface GameTileProps {
  term: string
  selected: boolean
  disabled: boolean
  wobbling: boolean
  onToggle: () => void
}

export function GameTile({ term, selected, disabled, wobbling, onToggle }: GameTileProps) {
  const mobileChunks = splitTermForMobile(term)

  return (
    <Button
      variant={selected ? 'default' : 'outline'}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={term}
      onClick={onToggle}
      style={{ borderRadius: '1.25rem' }}
      className={cn(
        'h-20 px-1.5 text-center text-[0.72rem] leading-tight tracking-[0.06em] sm:h-24 sm:px-2 sm:text-base sm:tracking-[0.08em]',
        !selected && 'bg-neutral-100 hover:bg-neutral-200',
        wobbling && 'xand1-wobble',
      )}
    >
      <span className="hidden sm:inline">{term}</span>
      <span className="flex flex-col items-center gap-0.5 sm:hidden" aria-hidden="true">
        {mobileChunks.map((chunk) => (
          <span key={chunk}>{chunk}</span>
        ))}
      </span>
    </Button>
  )
}
