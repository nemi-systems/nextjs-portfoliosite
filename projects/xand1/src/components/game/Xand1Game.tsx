'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { getBoard, submitGuess, type BoardResponse, type SolvedGuessResponse } from '@/lib/api'
import { termSetKey } from '@/lib/game'
import { GameTile } from './GameTile'
import { GuessTray } from './GuessTray'
import { SolvedGroup } from './SolvedGroup'

type LoadState = 'loading' | 'ready' | 'error'

type SolvedCategory = SolvedGuessResponse['category'] & {
  score: number
}

function formatSimilarity(score: number) {
  return `${Math.round(score * 100)}%`
}

export function Xand1Game() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [board, setBoard] = useState<BoardResponse | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [solved, setSolved] = useState<SolvedCategory[]>([])
  const [label, setLabel] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false

    getBoard()
      .then((nextBoard) => {
        if (!cancelled) {
          setBoard(nextBoard)
          setLoadState('ready')
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Unable to load board.')
          setLoadState('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const solvedTermKeys = useMemo(() => new Set(solved.map((category) => termSetKey(category.terms))), [solved])
  const solvedTerms = useMemo(() => new Set(solved.flatMap((category) => category.terms)), [solved])
  const visibleTerms = board?.terms.filter((term) => !solvedTerms.has(term)) ?? []

  function toggleTerm(term: string) {
    setMessage('')
    setSelected((current) => {
      if (current.includes(term)) {
        return current.filter((candidate) => candidate !== term)
      }
      if (current.length === 4) {
        return current
      }
      return [...current, term]
    })
  }

  async function handleSubmit() {
    if (!board || selected.length !== 4 || label.trim().length === 0) {
      return
    }

    setPending(true)
    setMessage('')

    try {
      const response = await submitGuess({
        boardId: board.boardId,
        terms: selected,
        label,
      })

      if (response.status === 'solved') {
        const key = termSetKey(response.category.terms)
        if (!solvedTermKeys.has(key)) {
          setSolved((current) => [...current, { ...response.category, score: response.score }].sort((a, b) => a.difficultyIndex - b.difficultyIndex))
        }
        setSelected([])
        setLabel('')
        setMessage('')
      } else if (response.status === 'label_rejected') {
        setMessage(`Terms match, but the name is not close enough. Semantic score: ${formatSimilarity(response.score)} similarity (needs ${formatSimilarity(response.threshold)}).`)
      } else {
        setMessage(response.message)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Guess failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-6xl">x&amp;1</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          Find four related terms and submit the category name in the same move. The terms must match; the name must mean it.
        </p>
      </header>

      <Card className="space-y-4 p-4 sm:p-6" style={{ borderRadius: '1.5rem' }}>
        {loadState === 'loading' ? (
          <div className="py-24 text-center font-semibold uppercase tracking-[0.16em]">Loading board</div>
        ) : null}

        {loadState === 'error' ? (
          <div className="py-16 text-center">
            <p className="font-semibold">Board unavailable.</p>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </div>
        ) : null}

        {loadState === 'ready' && board ? (
          <>
            {solved.map((category) => (
              <SolvedGroup key={category.title} category={category} similarity={formatSimilarity(category.score)} />
            ))}

            {visibleTerms.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {visibleTerms.map((term) => (
                  <GameTile
                    key={term}
                    term={term}
                    selected={selected.includes(term)}
                    disabled={pending}
                    onToggle={() => toggleTerm(term)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-neutral-100 py-12 text-center font-black uppercase tracking-[0.18em]">Solved</div>
            )}

            <GuessTray
              selectedTerms={selected}
              label={label}
              pending={pending}
              onLabelChange={setLabel}
              onSubmit={handleSubmit}
              onClear={() => {
                setSelected([])
                setMessage('')
              }}
            />

            {message ? (
              <p role="status" className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-muted-foreground">
                {message}
              </p>
            ) : null}
          </>
        ) : null}
      </Card>
    </main>
  )
}
