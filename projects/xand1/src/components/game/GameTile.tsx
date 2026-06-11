import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface GameTileProps {
  term: string
  selected: boolean
  disabled: boolean
  onToggle: () => void
}

export function GameTile({ term, selected, disabled, onToggle }: GameTileProps) {
  return (
    <Button
      variant={selected ? 'default' : 'outline'}
      disabled={disabled}
      aria-pressed={selected}
      onClick={onToggle}
      style={{ borderRadius: '1.25rem' }}
      className={cn(
        'h-20 px-2 text-center text-sm leading-tight tracking-[0.08em] sm:h-24 sm:text-base',
        !selected && 'bg-neutral-100 hover:bg-neutral-200',
      )}
    >
      {term}
    </Button>
  )
}
