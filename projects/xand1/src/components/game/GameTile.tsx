import { Button } from '@/components/ui/button'
import { splitTermForMobile } from '@/lib/game'
import { cn } from '@/lib/utils'

interface GameTileProps {
  term: string
  selected: boolean
  disabled: boolean
  wobbling: boolean
  mode: 'english' | 'emoji'
  onToggle: () => void
}

export function GameTile({ term, selected, disabled, wobbling, mode, onToggle }: GameTileProps) {
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
        'h-20 max-w-full overflow-hidden text-center leading-tight sm:h-24',
        mode === 'emoji'
          ? 'px-1 text-3xl tracking-normal sm:px-2 sm:text-4xl'
          : '!px-[1px] text-[0.72rem] tracking-[0.06em] sm:!px-1 sm:text-base sm:tracking-[0.08em]',
        !selected && 'bg-neutral-100 hover:bg-neutral-200',
        wobbling && 'xand1-wobble',
      )}
    >
      <span className="hidden sm:inline">{term}</span>
      <span className="flex max-w-full flex-col items-center gap-0.5 overflow-hidden sm:hidden" aria-hidden="true">
        {mobileChunks.map((chunk) => (
          <span key={chunk} className="max-w-full overflow-hidden break-words">{chunk}</span>
        ))}
      </span>
    </Button>
  )
}
