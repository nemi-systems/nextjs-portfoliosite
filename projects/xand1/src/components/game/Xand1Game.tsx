'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getBoard, submitGuess, warmApi, type BoardResponse, type SolvedGuessResponse } from '@/lib/api'
import { calculateScoreSummary, shuffledTerms, termSetKey } from '@/lib/game'
import { cn } from '@/lib/utils'
import { GameTile } from './GameTile'
import { GuessTray } from './GuessTray'
import { SolvedGroup } from './SolvedGroup'

type LoadState = 'loading' | 'ready' | 'error'
type DisplayMode = 'english' | 'emoji'
type CoinFace = 'black' | 'white'
type CoinFlipState =
  | { phase: 'choosing' }
  | { phase: 'flipping'; choice: CoinFace }
  | { phase: 'won'; choice: CoinFace; result: CoinFace }
  | { phase: 'lost'; choice: CoinFace; result: CoinFace }

type SolvedCategory = SolvedGuessResponse['category'] & {
  score: number
  threshold: number
  passedThreshold: boolean
  solveOrder: number
}

const STARTING_LIVES = 3
const WARM_INTERVAL_MS = 4 * 60 * 1000
const ENGLISH_TAGLINE = 'Connections with a semantic sting. You have to call it.'
const EMOJI_TAGLINE = '🧩 vibes, 🧠 sting. Pick four, name the aura.'

function formatPercent(score: number) {
  return `${Math.round(score * 100)}%`
}

function coinFaceLabel(face: CoinFace) {
  return face === 'black' ? 'black face with white dot' : 'white face with black dot'
}

function CoinFaceButton({ face, disabled, onChoose }: { face: CoinFace; disabled: boolean; onChoose: (face: CoinFace) => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Choose ${coinFaceLabel(face)}`}
      onClick={() => onChoose(face)}
      className={cn(
        'relative h-20 w-20 rounded-full border-2 border-black transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70',
        face === 'black' ? 'bg-black' : 'bg-white',
      )}
    >
      <span
        className={cn(
          'absolute left-[58%] top-[35%] h-4 w-4 rounded-full',
          face === 'black' ? 'bg-white' : 'bg-black',
        )}
      />
    </button>
  )
}

function CoinFlipSurvival({ state, onChoose }: { state: CoinFlipState; onChoose: (face: CoinFace) => void }) {
  const flipping = state.phase === 'flipping'
  const resolved = state.phase === 'won' || state.phase === 'lost'

  return (
    <section className="rounded-3xl border-2 border-black bg-white p-5 text-center shadow-[0_12px_0_#111]">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-red-600">0 lives: survival flip</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick a face. Win and keep playing at 0 lives. Lose and the board ends.
      </p>
      <div className={cn('mx-auto mt-5 flex max-w-xs items-center justify-center gap-10', flipping && 'xand1-coin-flip') }>
        <div className={cn(flipping && 'xand1-coin-left')}>
          <CoinFaceButton face="black" disabled={state.phase !== 'choosing'} onChoose={onChoose} />
        </div>
        <div className={cn(flipping && 'xand1-coin-right')}>
          <CoinFaceButton face="white" disabled={state.phase !== 'choosing'} onChoose={onChoose} />
        </div>
      </div>
      {resolved ? (
        <p className="mt-4 text-sm font-black uppercase tracking-[0.14em]">
          Result: {state.result === 'black' ? 'black' : 'white'} — {state.phase === 'won' ? 'survived' : 'game over'}.
        </p>
      ) : null}
    </section>
  )
}

function LivesMeter({ livesRemaining }: { livesRemaining: number }) {
  return (
    <div aria-label={`${livesRemaining} spare lives remaining`} className="mt-4 flex justify-center gap-2">
      {Array.from({ length: STARTING_LIVES }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-3 w-3 rounded-full border border-red-600',
            index < livesRemaining ? 'bg-black' : 'bg-white',
          )}
        />
      ))}
    </div>
  )
}

function FinalScorePanel({
  solved,
  wrongGuessCount,
  survivalWins,
  survivalFlips,
}: {
  solved: SolvedCategory[]
  wrongGuessCount: number
  survivalWins: number
  survivalFlips: number
}) {
  const summary = calculateScoreSummary(solved, wrongGuessCount, survivalWins, survivalFlips)
  const rankClass = summary.rank === 'S'
    ? 'text-amber-500'
    : summary.rank === 'A'
      ? 'text-emerald-600'
      : summary.finalScore < 50
        ? 'text-red-600'
        : 'text-neutral-600'

  return (
    <section className="grid gap-6 rounded-3xl border-2 border-black bg-neutral-50 p-5 sm:grid-cols-[1.4fr_0.8fr] sm:p-6">
      <div>
        <h2 className="text-lg font-black uppercase tracking-[0.18em]">Score calculation</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="font-black uppercase tracking-[0.12em]">Category semantics</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {solved.map((category) => (
                <li key={category.title} className="flex justify-between gap-4">
                  <span>{category.title} × weight {category.difficultyIndex + 1}</span>
                  <span className="font-semibold text-black">{formatPercent(category.score)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-2 rounded-2xl bg-white p-4 font-semibold">
            <div className="flex justify-between"><span>Weighted semantic subtotal</span><span>{summary.semanticPercent}%</span></div>
            <div className="flex justify-between"><span>Mistake penalty ({wrongGuessCount})</span><span>-{summary.mistakePenalty}</span></div>
            <div className="flex justify-between"><span>Coin survival bonus ({survivalWins})</span><span>+{summary.coinSurvivalBonus}</span></div>
            <div className="flex justify-between"><span>Perfect-order bonus</span><span>+{summary.perfectOrderBonus}</span></div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-6 text-center">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Rank</p>
        <p className={cn('mt-2 text-8xl font-black leading-none tracking-[-0.08em]', rankClass)}>{summary.rank}</p>
        <p className="mt-3 text-2xl font-black">{summary.finalScore}/100</p>
      </div>
    </section>
  )
}

export function Xand1Game() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [board, setBoard] = useState<BoardResponse | null>(null)
  const [termOrder, setTermOrder] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [solved, setSolved] = useState<SolvedCategory[]>([])
  const [label, setLabel] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [livesRemaining, setLivesRemaining] = useState(STARTING_LIVES)
  const [wrongGuessCount, setWrongGuessCount] = useState(0)
  const [survivalWins, setSurvivalWins] = useState(0)
  const [survivalFlips, setSurvivalFlips] = useState(0)
  const [coinFlip, setCoinFlip] = useState<CoinFlipState | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [wobblingTerms, setWobblingTerms] = useState<string[]>([])
  const [displayMode, setDisplayMode] = useState<DisplayMode>('english')

  useEffect(() => {
    let cancelled = false

    getBoard()
      .then((nextBoard) => {
        if (!cancelled) {
          setBoard(nextBoard)
          setTermOrder(nextBoard.terms)
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

  useEffect(() => {
    if (loadState !== 'ready' || gameOver || solved.length === 4) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        warmApi().catch(() => undefined)
      }
    }, WARM_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [gameOver, loadState, solved.length])

  const solvedTermKeys = useMemo(() => new Set(solved.map((category) => termSetKey(category.terms))), [solved])
  const solvedTerms = useMemo(() => new Set(solved.flatMap((category) => category.terms)), [solved])
  const visibleTerms = termOrder.filter((term) => !solvedTerms.has(term))
  const interactionLocked = pending || coinFlip !== null || gameOver
  const allSolved = solved.length === 4
  const lostLives = STARTING_LIVES - livesRemaining
  const wordmarkStyle = lostLives === 2
    ? { WebkitTextStroke: '2px #dc2626' }
    : undefined
  const wordmarkClass = lostLives === 0
    ? 'text-black'
    : lostLives === 1
      ? 'text-red-700'
      : lostLives === 2
        ? 'text-white'
        : 'text-red-600'

  function toggleTerm(term: string) {
    if (interactionLocked) {
      return
    }
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

  function triggerWrongGuess(messageText: string) {
    setWrongGuessCount((current) => current + 1)
    setWobblingTerms(selected)
    window.setTimeout(() => setWobblingTerms([]), 450)

    if (livesRemaining > 0) {
      setLivesRemaining((current) => Math.max(0, current - 1))
      setMessage(messageText)
      return
    }

    setSurvivalFlips((current) => current + 1)
    setMessage(messageText)
    setCoinFlip({ phase: 'choosing' })
  }

  async function handleSubmit() {
    if (!board || selected.length !== 4 || label.trim().length === 0 || interactionLocked) {
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
          setSolved((current) => [...current, {
            ...response.category,
            score: response.score,
            threshold: response.threshold,
            passedThreshold: response.passedThreshold,
            solveOrder: current.length,
          }].sort((a, b) => a.difficultyIndex - b.difficultyIndex))
        }
        setSelected([])
        setLabel('')
        setMessage('')
      } else {
        triggerWrongGuess(response.oneAway ? 'One away.' : response.message)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Guess failed.')
    } finally {
      setPending(false)
    }
  }

  function handleShuffle() {
    setTermOrder((current) => {
      const visibleSet = new Set(visibleTerms)
      const shuffledVisibleTerms = shuffledTerms(visibleTerms)
      let replacementIndex = 0
      return current.map((term) => {
        if (!visibleSet.has(term)) {
          return term
        }
        const replacement = shuffledVisibleTerms[replacementIndex]
        replacementIndex += 1
        return replacement
      })
    })
    setMessage('')
  }

  function handleCoinChoice(choice: CoinFace) {
    if (coinFlip?.phase !== 'choosing') {
      return
    }

    setCoinFlip({ phase: 'flipping', choice })
    window.setTimeout(() => {
      const result: CoinFace = Math.random() < 0.5 ? 'black' : 'white'
      if (result === choice) {
        setSurvivalWins((current) => current + 1)
        setSelected([])
        setLabel('')
        setMessage('Flip won. Still alive at 0 lives.')
        setCoinFlip({ phase: 'won', choice, result })
        window.setTimeout(() => setCoinFlip(null), 900)
      } else {
        setMessage('Flip lost. Game over.')
        setGameOver(true)
        setCoinFlip({ phase: 'lost', choice, result })
      }
    }, 1200)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant={displayMode === 'english' ? 'default' : 'outline'}
            aria-pressed={displayMode === 'english'}
            onClick={() => setDisplayMode('english')}
            className="h-9 px-4"
          >
            Æ
          </Button>
          <Button
            type="button"
            variant={displayMode === 'emoji' ? 'default' : 'outline'}
            aria-pressed={displayMode === 'emoji'}
            onClick={() => setDisplayMode('emoji')}
            className="h-9 px-4"
          >
            🧠
          </Button>
        </div>
        <h1 className={cn('mt-3 text-4xl font-black tracking-[-0.06em] transition-colors sm:text-6xl', wordmarkClass)} style={wordmarkStyle}>
          {displayMode === 'english' ? 'x&1' : '❌&1️⃣'}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          {displayMode === 'english' ? ENGLISH_TAGLINE : EMOJI_TAGLINE}
        </p>
        <LivesMeter livesRemaining={livesRemaining} />
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
              <SolvedGroup key={category.title} category={category} passedThreshold={category.passedThreshold} />
            ))}

            {allSolved ? (
              <FinalScorePanel
                solved={solved}
                wrongGuessCount={wrongGuessCount}
                survivalWins={survivalWins}
                survivalFlips={survivalFlips}
              />
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {visibleTerms.map((term) => (
                  <GameTile
                    key={term}
                    term={term}
                    selected={selected.includes(term)}
                    disabled={interactionLocked}
                    wobbling={wobblingTerms.includes(term)}
                    onToggle={() => toggleTerm(term)}
                  />
                ))}
              </div>
            )}

            {coinFlip ? <CoinFlipSurvival state={coinFlip} onChoose={handleCoinChoice} /> : null}

            {!allSolved ? (
              <GuessTray
                selectedTerms={selected}
                label={label}
                pending={interactionLocked}
                visibleTermCount={visibleTerms.length}
                onLabelChange={setLabel}
                onSubmit={handleSubmit}
                onShuffle={handleShuffle}
              />
            ) : null}

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
