'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { getBoard, getBoards, submitGuess, warmApi, type BoardMode, type BoardResponse, type BoardSummary, type SolvedGuessResponse } from '@/lib/api'
import { calculateScoreSummary, MISTAKE_PENALTY, modelAbbreviation, shuffledTerms, termSetKey, wordmarkToneForToken, type WordmarkTone } from '@/lib/game'
import { cn } from '@/lib/utils'
import { GameTile } from './GameTile'
import { GuessTray } from './GuessTray'
import { SolvedGroup } from './SolvedGroup'

type LoadState = 'loading' | 'ready' | 'error'
type DisplayMode = BoardMode
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
  guessedLabel: string
}

const STARTING_LIVES = 3
const WARM_INTERVAL_MS = 4 * 60 * 1000
const ENGLISH_TAGLINE = 'Connections with a semantic sting'
const EMOJI_TAGLINE = '🧩 vibes, 🧠 sting. Pick four, name the aura.'

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
          'absolute top-[35%] h-4 w-4 rounded-full',
          face === 'white' ? 'left-[22%]' : 'left-[58%]',
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
        You have to call it.
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
      : summary.rank === 'C'
        ? 'text-red-600'
        : 'text-neutral-600'

  return (
    <section className="grid gap-6 rounded-3xl border-2 border-black bg-neutral-50 p-5 sm:grid-cols-[1.4fr_0.8fr] sm:p-6">
      <div>
        <h2 className="text-lg font-black uppercase tracking-[0.18em]">Score calculation</h2>
        <div className="mt-4 overflow-hidden rounded-2xl bg-white text-sm">
          <div className="grid grid-cols-[1fr_0.9fr_0.7fr] gap-3 border-b border-neutral-200 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
            <span>Row</span>
            <span className="text-right">Data</span>
            <span className="text-right">Subtotal</span>
          </div>
          {summary.semanticRows.map((row) => (
            <div key={row.title} className="grid grid-cols-[1fr_0.9fr_0.7fr] gap-3 border-b border-neutral-100 px-4 py-2">
              <span className="font-semibold">{row.title}</span>
              <span className="text-right text-muted-foreground">{row.rawPercent}% × {row.weight}</span>
              <span className="text-right font-black">{row.weightedContribution}%</span>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_0.9fr_0.7fr] gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-2 font-black">
            <span>Semantic subtotal</span>
            <span />
            <span className="text-right">{summary.semanticPercent}%</span>
          </div>
          <div className="grid grid-cols-[1fr_0.9fr_0.7fr] gap-3 px-4 py-2">
            <span>Mistake penalty</span>
            <span className="text-right text-muted-foreground">{wrongGuessCount} × {MISTAKE_PENALTY}</span>
            <span className="text-right font-black">-{summary.mistakePenalty}</span>
          </div>
          <div className="grid grid-cols-[1fr_0.9fr_0.7fr] gap-3 px-4 py-2">
            <span>Coin survival bonus</span>
            <span className="text-right text-muted-foreground">{survivalWins} wins</span>
            <span className="text-right font-black">+{summary.coinSurvivalBonus}</span>
          </div>
          <div className="grid grid-cols-[1fr_0.9fr_0.7fr] gap-3 px-4 py-2">
            <span>Perfect-order bonus</span>
            <span />
            <span className="text-right font-black">+{summary.perfectOrderBonus}</span>
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

function BoardSelector({
  boards,
  selectedBoardId,
  open,
  disabled,
  onOpenChange,
  onSelect,
}: {
  boards: BoardSummary[]
  selectedBoardId: string | null
  open: boolean
  disabled: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (boardId: string) => void
}) {
  const numberedBoards = [...boards]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((summary, index) => ({ summary, label: `#${index + 1}` }))
  const menuBoards = [...numberedBoards].sort((left, right) => right.summary.createdAt.localeCompare(left.summary.createdAt))
  const selectedBoard = numberedBoards.find((board) => board.summary.boardId === selectedBoardId)
  const selectedLabel = selectedBoard?.label ?? 'Board'

  return (
    <div className="relative justify-self-start">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled || boards.length === 0}
        onClick={() => onOpenChange(!open)}
        className="inline-flex h-10 min-w-32 items-center justify-between gap-3 rounded-full border-2 border-black bg-white px-4 text-left font-black text-black shadow-[0_6px_0_#111] transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span>{selectedLabel}</span>
        {selectedBoard ? (
          <span className="text-xs font-semibold lowercase tracking-wide text-muted-foreground">
            {modelAbbreviation(selectedBoard.summary.model, selectedBoard.summary.provider)}
          </span>
        ) : null}
      </button>

      {open && !disabled && boards.length > 0 ? (
        <div
          role="listbox"
          aria-label="Board"
          className="absolute left-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border-2 border-black bg-white py-1 shadow-[0_8px_0_#111]"
        >
          {menuBoards.map(({ summary, label }) => (
            <button
              key={summary.boardId}
              type="button"
              role="option"
              aria-selected={summary.boardId === selectedBoardId}
              onClick={() => onSelect(summary.boardId)}
              className={cn(
                'flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition hover:bg-neutral-100',
                summary.boardId === selectedBoardId && 'bg-black text-white hover:bg-black',
              )}
            >
              <span className="font-black">{label}</span>
              <span className={cn('ml-auto text-xs font-semibold lowercase tracking-wide', summary.boardId === selectedBoardId ? 'text-neutral-300' : 'text-muted-foreground')}>
                {modelAbbreviation(summary.model, summary.provider)}
              </span>
              {summary.isActive ? <span className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-emerald-500">active</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
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
  const [boardSummaries, setBoardSummaries] = useState<BoardSummary[]>([])
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [boardMenuOpen, setBoardMenuOpen] = useState(false)
  const loadRequestId = useRef(0)

  const resetGameProgress = useCallback((nextLoadState: LoadState = 'loading') => {
    setLoadState(nextLoadState)
    setBoard(null)
    setTermOrder([])
    setSelected([])
    setSolved([])
    setLabel('')
    setMessage('')
    setPending(false)
    setLivesRemaining(STARTING_LIVES)
    setWrongGuessCount(0)
    setSurvivalWins(0)
    setSurvivalFlips(0)
    setCoinFlip(null)
    setGameOver(false)
    setWobblingTerms([])
  }, [])


  useEffect(() => {
    const requestId = loadRequestId.current + 1
    loadRequestId.current = requestId

    resetGameProgress('loading')
    setBoardSummaries([])
    setSelectedBoardId(null)
    setBoardMenuOpen(false)

    getBoards(displayMode)
      .then(async ({ boards }) => {
        if (loadRequestId.current !== requestId) {
          return
        }

        setBoardSummaries(boards)
        const selectedSummary = boards.find((summary) => summary.isActive) ?? boards[0]
        if (!selectedSummary) {
          throw new Error('No xand1 boards are available for this mode.')
        }

        setSelectedBoardId(selectedSummary.boardId)
        const nextBoard = await getBoard(displayMode, selectedSummary.boardId)
        if (loadRequestId.current !== requestId) {
          return
        }
        setBoard(nextBoard)
        setTermOrder(nextBoard.terms)
        setLoadState('ready')
      })
      .catch((error: unknown) => {
        if (loadRequestId.current === requestId) {
          setMessage(error instanceof Error ? error.message : 'Unable to load board.')
          setLoadState('error')
        }
      })
  }, [displayMode, resetGameProgress])

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
  const controlsDisabled = loadState === 'loading' || pending
  const allSolved = solved.length === 4
  const lostLives = STARTING_LIVES - livesRemaining
  const wordmarkOutlined = gameOver
  const wordmarkStyle = wordmarkOutlined
    ? { WebkitTextStroke: '2px #dc2626' }
    : undefined
  const wordmarkClassByTone: Record<WordmarkTone, string> = {
    black: 'text-black',
    red: 'text-red-600',
    outline: 'text-white',
  }
  const emojiWordmarkClass = wordmarkClassByTone[wordmarkOutlined ? 'outline' : lostLives > 0 ? 'red' : 'black']
  const englishWordmarkClass = (index: number) => wordmarkClassByTone[wordmarkToneForToken(index, lostLives, wordmarkOutlined)]

  async function handleBoardSelect(boardId: string) {
    if (controlsDisabled) {
      return
    }
    setBoardMenuOpen(false)
    if (boardId === selectedBoardId) {
      return
    }

    const requestId = loadRequestId.current + 1
    loadRequestId.current = requestId
    setSelectedBoardId(boardId)
    resetGameProgress('loading')

    try {
      const nextBoard = await getBoard(displayMode, boardId)
      if (loadRequestId.current !== requestId) {
        return
      }
      setBoard(nextBoard)
      setTermOrder(nextBoard.terms)
      setLoadState('ready')
    } catch (error) {
      if (loadRequestId.current === requestId) {
        setMessage(error instanceof Error ? error.message : 'Unable to load board.')
        setLoadState('error')
      }
    }
  }

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

    const submittedLabel = label.trim().replace(/\s+/g, ' ')

    setPending(true)
    setMessage('')

    try {
      const response = await submitGuess({
        boardId: board.boardId,
        terms: selected,
        label: submittedLabel,
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
            guessedLabel: response.guessedLabel || submittedLabel,
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
        <h1 className={cn('mt-3 text-4xl font-black tracking-[-0.06em] transition-colors sm:text-6xl', displayMode === 'emoji' && emojiWordmarkClass)} style={wordmarkStyle}>
          {displayMode === 'english' ? (
            <>
              <span className={cn('transition-colors', englishWordmarkClass(0))}>x</span>
              <span className={cn('transition-colors', englishWordmarkClass(1))}>&amp;</span>
              <span className={cn('transition-colors', englishWordmarkClass(2))}>1</span>
            </>
          ) : '❌➕1️⃣'}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          {displayMode === 'english' ? ENGLISH_TAGLINE : EMOJI_TAGLINE}
        </p>
        <LivesMeter livesRemaining={livesRemaining} />
      </header>

      <div className="mb-5 grid min-h-10 grid-cols-[1fr_auto_1fr] items-center gap-3">
        <BoardSelector
          boards={boardSummaries}
          selectedBoardId={selectedBoardId}
          open={boardMenuOpen}
          disabled={controlsDisabled}
          onOpenChange={setBoardMenuOpen}
          onSelect={handleBoardSelect}
        />
        <div className="inline-flex justify-self-center overflow-hidden rounded-full border-2 border-black bg-white shadow-[0_6px_0_#111]" role="group" aria-label="Board mode">
          <button
            type="button"
            aria-pressed={displayMode === 'english'}
            disabled={controlsDisabled}
            onClick={() => setDisplayMode('english')}
            className={cn(
              'h-10 px-5 text-lg font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              displayMode === 'english' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100',
            )}
          >
            Æ
          </button>
          <span aria-hidden="true" className="w-0.5 bg-black" />
          <button
            type="button"
            aria-pressed={displayMode === 'emoji'}
            disabled={controlsDisabled}
            onClick={() => setDisplayMode('emoji')}
            className={cn(
              'h-10 px-5 text-lg font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              displayMode === 'emoji' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100',
            )}
          >
            🧠
          </button>
        </div>
        <span aria-hidden="true" />
      </div>

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
                    mode={displayMode}
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
