import type { SolvedGuessResponse } from '@/lib/api'

interface SolvedGroupProps {
  category: SolvedGuessResponse['category']
}

export function SolvedGroup({ category }: SolvedGroupProps) {
  const textColor = category.difficultyIndex === 3 ? 'text-black' : 'text-white'

  return (
    <section
      className={`rounded-2xl px-4 py-5 text-center ${textColor}`}
      style={{ backgroundColor: category.color }}
    >
      <h2 className="text-lg font-black uppercase tracking-[0.18em]">{category.title}</h2>
      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.08em]">
        {category.terms.join(' · ')}
      </p>
      {category.explanation ? (
        <p className="mx-auto mt-3 max-w-2xl text-sm opacity-90">{category.explanation}</p>
      ) : null}
    </section>
  )
}
