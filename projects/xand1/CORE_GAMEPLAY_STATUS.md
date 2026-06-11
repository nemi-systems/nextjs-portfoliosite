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
| Left score log / right rank | Done | Score modifiers and subtotals are left aligned; the large S/A/B/C rank is right aligned with rank-specific colors. |
| Break down semantic subtotal | Done | Final scoring now itemizes each solved connection group with raw semantic percent, difficulty weight, and weighted contribution. The weighted semantic subtotal renders on its own subtotal row. |
| Format score rows as data + subtotal columns | Done | The final score panel uses `Row / Data / Subtotal` columns; category rows show raw percent × weight in Data and weighted contribution in Subtotal, while subtotal/modifier rows keep data separate from subtotal values. |
| Add C rank below B | Done | `B` now starts at 50; scores below that render as rank `C`. |
| Replace header copy | Done | English tagline is now `Connections with a semantic sting`. Survival-flip copy uses `You ahve to call it.` exactly. |
| Remove tray instruction copy | Done | `Select four terms, then name the connection.` is removed. |
| Accept low semantic labels once terms match | Done | Backend no longer returns `label_rejected`; any exact term-set match solves. Below-threshold solves render as white cards with colored outlines. |
| Mobile long-term rendering | Done | Long terms are split deterministically into at most two mobile rows, preferring spaces, hyphens, and slashes for long delimiter terms, then vowel/consonant boundaries. `Oregano` now splits as `Ore` / `gano`. No runtime LLM call is used. |

| Fix main-site x&1 project-card truncation | Done | The x&1 summary uses the new language and featured project summaries are no longer line-clamped. |
| Wrong guess wobble | Done | Selected cards rotationally wobble on wrong term-set guesses. |
| One-away message | Done | Wrong guesses report `One away.` when exactly three selected terms overlap one category. |
| Keep Lambda warm while a user is playing | Done | Added `GET /warm`; the frontend pings every 4 minutes while visible and active, ignoring failures. |
| Coin flip to continue | Done | At 0 lives, a wrong guess opens survival selection. Winning continues at 0 lives and adds score bonus; losing locks game over. |
| Select coin side, not heads/tails | Done | The player chooses the black side with white off-center dot or the white side with black off-center dot. |
| Coin animation | Done | After selection, the two coin faces move together by the exact center-to-center distance and only then spin like a flipping dao. The white coin is mirrored so its black dot sits on the left. |
| English / emoji mode | Done | Mode now drives board loading and resets game state. English and emoji boards are generated through separate parallel prompts, one mode per refresh Lambda invocation, with active board pointers stored per mode. Emoji boards validate emoji-only displayed terms while titles/alternative titles remain English for scoring. |
| Fused mode selector placement | Done | The `Æ | 🧠` selector is a single fused pill with a vertical divider, rendered below the three lives and above the board card, outside the board. |
| Emoji-mode wordmark | Done | Emoji mode uses `❌➕1️⃣` instead of text ampersand typography. |
| Show submitted guess on solved groups | Done | Solved connection cards render `You guessed "<user guess>"` below the terms/explanation using the API-echoed normalized label. |
| API base URL from existing project secret | Done | The existing xand1/project Secrets Manager JSON secret now contains `NEXT_PUBLIC_XAND1_API_BASE_URL`; hosted xand1 builds read it via `XAND1_OPENAI_API_KEY_SECRET_ARN` unless the env var is explicitly exported. |

## Deferred or not implemented

| Request / observation | Status | Reason / next step |
| --- | --- | --- |
| Replace `xand1-game-api` with a Rust Lambda | Deferred | This is a separate migration: it changes handler implementation, CDK runtime/bundling, shared contracts, and deployment wiring. The low-cold-start mitigation in this batch is the `/warm` route. |
| English mode split into classic and optional category mode | Not implemented | This was outside the approved core batch and the category-mode product spec is incomplete. Needs a separate design: category list source, board-generation flow, scoring effects, UI entry point, and API contract. |
| Generate a list of interesting categories for category mode | Not implemented | Blocked on the category-mode design above. |

## Verification performed

- `projects/xand1`: `npm run test`
- `infra`: `npm run test:xand1`
- `infra`: `npm run build`
- repo root: `npm run build:xand1` with explicit `NEXT_PUBLIC_XAND1_API_BASE_URL`
- repo root: `npm run build:xand1` loading `NEXT_PUBLIC_XAND1_API_BASE_URL` from the existing xand1 Secrets Manager secret
- repo root: `npm run build`
- Fresh English board generation: `3842faf4-cf40-43f7-90a3-3d9d1ca88107`
- Fresh emoji board generation: `74ddbbde-b1ca-4cf6-8cc9-0e53170ddf8f`
- `GET /board?mode=english` and `GET /board?mode=emoji` return distinct active boards with expected term shapes.
- `npm --prefix infra run cdk -- deploy Xand1ApiStack --require-approval never -c xand1OpenAiApiKeySecretArn=...`
- `npm --prefix infra run cdk -- deploy NemiPortfolioSiteStack --require-approval never -c certificateArn=...`

## Deployment note

API and static hosting have been redeployed. The active production English and emoji boards were regenerated after the mode-aware refresh Lambda deployment.
