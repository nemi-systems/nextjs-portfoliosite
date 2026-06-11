import type { SolvedGuessResponse } from '@/lib/api'

interface SolvedGroupProps {
  category: SolvedGuessResponse['category']
  similarity: string
}

export function SolvedGroup({ category, similarity }: SolvedGroupProps) {
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
      <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] opacity-90">
        Semantic score: {similarity} similarity
      </p>
      {category.explanation ? (
        <p className="mx-auto mt-2 max-w-2xl text-sm opacity-90">{category.explanation}</p>
      ) : null}
    </section>
  )
}
