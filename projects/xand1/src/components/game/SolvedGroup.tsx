import type { SolvedGuessResponse } from '@/lib/api'

interface SolvedGroupProps {
  category: SolvedGuessResponse['category']
  passedThreshold: boolean
}

export function SolvedGroup({ category, passedThreshold }: SolvedGroupProps) {
  const filledTextColor = category.difficultyIndex === 3 ? 'text-black' : 'text-white'
  const className = passedThreshold
    ? `rounded-2xl px-4 py-5 text-center ${filledTextColor}`
    : 'rounded-2xl border-2 bg-white px-4 py-5 text-center text-black'
  const style = passedThreshold
    ? { backgroundColor: category.color }
    : { borderColor: category.color }

  return (
    <section className={className} style={style}>
      <h2 className="text-lg font-black uppercase tracking-[0.18em]">{category.title}</h2>
      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.08em]">
        {category.terms.join(' · ')}
      </p>
      {category.explanation ? (
        <p className="mx-auto mt-2 max-w-2xl text-sm opacity-90">{category.explanation}</p>
      ) : null}
    </section>
  )
}
