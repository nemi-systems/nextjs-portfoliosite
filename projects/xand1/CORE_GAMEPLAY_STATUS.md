# xand1 core gameplay status

## Completed in this batch

| Request / observation | Status | Notes |
| --- | --- | --- |
| Use category-title semantic targets instead of term centroids | Done | Board generation now requires `alternativeTitles`; stored category centroids are built from `title + alternativeTitles` using document embeddings. Existing deployed boards need a refresh before their centroids change. |
| Add 3 spare lives plus the original chance | Done | The game starts with 3 visible spare lives. Wrong guesses consume spare lives; at 0 lives, later wrong guesses enter survival-flip flow. |
| Turn the top `x&1` typography red / hollow as lives are lost | Done | The wordmark starts black, moves through red and hollow red states, then fully red at 0 lives. |
| Replace `Clear` with `Shuffle` | Done | Shuffle reorders only unsolved visible terms and leaves solved groups in place. |
| Game over at the end of life flow | Done with correction | The corrected rule is implemented: running out of lives does not immediately end the game; the next wrong guess at 0 lives starts a coin flip. Losing that flip ends the game. |
| Use score to calculate S / A / B rank | Done | Final scoring combines weighted semantic accuracy, mistake penalties, capped coin-survival bonuses, and perfect-order bonus. |
| Hide percentages during normal play | Done | Solved category cards no longer show semantic percentages. Percentages appear only in the final score calculation panel. |
| Put score in the fifth win row | Done | The old plain `Solved` fifth row is replaced by a score panel after all four groups are solved. |
| Left score log / right rank | Done | Score modifiers and subtotals are left aligned; the large S/A/B rank is right aligned with rank-specific colors. |
| Replace header copy | Done | English tagline is now `Connections with a semantic sting. You have to call it.` |
| Remove tray instruction copy | Done | `Select four terms, then name the connection.` is removed. |
| Accept low semantic labels once terms match | Done | Backend no longer returns `label_rejected`; any exact term-set match solves. Below-threshold solves render as white cards with colored outlines. |
| Mobile long-term rendering | Done | Long terms are split deterministically into at most two mobile rows, preferring spaces, hyphens, and slashes, then vowel/consonant boundaries. No runtime LLM call is used. |
| Fix main-site x&1 project-card truncation | Done | The x&1 summary uses the new language and featured project summaries are no longer line-clamped. |
| Wrong guess wobble | Done | Selected cards rotationally wobble on wrong term-set guesses. |
| One-away message | Done | Wrong guesses report `One away.` when exactly three selected terms overlap one category. |
| Keep Lambda warm while a user is playing | Done | Added `GET /warm`; the frontend pings every 4 minutes while visible and active, ignoring failures. |
| Coin flip to continue | Done | At 0 lives, a wrong guess opens survival selection. Winning continues at 0 lives and adds score bonus; losing locks game over. |
| Select coin side, not heads/tails | Done | The player chooses the black side with white off-center dot or the white side with black off-center dot. |
| Coin animation | Done | After selection, the two coin faces move together horizontally and spin like a flipping dao. |
| English / emoji mode | Done | Toggle uses `Æ` for English and `🧠` for emoji mode. Emoji mode swaps the wordmark and tagline only; mechanics are unchanged. |

## Deferred or not implemented

| Request / observation | Status | Reason / next step |
| --- | --- | --- |
| Replace `xand1-game-api` with a Rust Lambda | Deferred | This is a separate migration: it changes handler implementation, CDK runtime/bundling, shared contracts, and deployment wiring. The low-cold-start mitigation in this batch is the `/warm` route. |
| English mode split into classic and optional category mode | Not implemented | This was outside the approved core batch and the category-mode product spec is incomplete. Needs a separate design: category list source, board-generation flow, scoring effects, UI entry point, and API contract. |
| Generate a list of interesting categories for category mode | Not implemented | Blocked on the category-mode design above. |

## Verification performed

- `projects/xand1`: `npm run test -- --run src/lib/game.test.ts`
- `infra`: `npm run test:xand1`
- repo root: `npm run build:xand1`
- `infra`: `npm run build`
- repo root: `npm run build`

## Deployment note

The code supports alternative-title centroids immediately, but active production boards retain old term-based centroids until the deployed refresh path generates and activates a new board.
