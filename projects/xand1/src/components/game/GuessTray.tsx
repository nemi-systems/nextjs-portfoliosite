import { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface GuessTrayProps {
  selectedTerms: string[]
  label: string
  pending: boolean
  visibleTermCount: number
  onLabelChange: (label: string) => void
  onSubmit: () => void
  onShuffle: () => void
}

export function GuessTray({
  selectedTerms,
  label,
  pending,
  visibleTermCount,
  onLabelChange,
  onSubmit,
  onShuffle,
}: GuessTrayProps) {
  const canSubmit = selectedTerms.length === 4 && label.trim().length > 0 && !pending
  const canShuffle = visibleTermCount > 1 && !pending

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (canSubmit) {
      onSubmit()
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="min-h-6 text-sm font-medium text-muted-foreground">
        {selectedTerms.length > 0 ? selectedTerms.join(' · ') : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Input
          value={label}
          maxLength={80}
          placeholder="Category name"
          disabled={pending}
          aria-label="Category name"
          onChange={(event) => onLabelChange(event.target.value)}
        />
        <Button type="submit" disabled={!canSubmit}>
          Submit
        </Button>
        <Button type="button" variant="ghost" disabled={!canShuffle} onClick={onShuffle}>
          Shuffle
        </Button>
      </div>
    </form>
  )
}
