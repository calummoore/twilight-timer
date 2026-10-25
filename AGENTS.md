# A guide for agents

TI4 Tempo is a static React and TypeScript web app, built with Vite and
deployed as Cloudflare Workers static assets. The game model is under
`src/model/`, the screens are under `src/ui/`, and the product spec and the
mockup are under `docs/`.

This file holds the rules that are specific to this repository. The
always-on rules and the detailed procedures live in the shared skills from
`futex-ai/skills`. Each skill's description says when to read it. Read the
skill at that moment instead of guessing the rule.

## Communication

- Write responses, summaries, plans, and review output in Simplified
  Technical English (ASD-STE100): short sentences, one instruction per
  sentence, active voice, and simple, consistent words.
- Assume the reader has no context. Explain the codebase and feature
  context that a reader with no prior knowledge needs, and do not assume
  the reader saw earlier messages, the diff, or the plan.
- Report outcomes faithfully. Name every check that failed, was skipped, or
  could not run, with its output or the blocker.
- Ask for all decisions in one numbered message. List decisions and review
  findings by severity, highest first. For each decision give its severity
  and effort, the terms, the background, the problem, the impact if no
  action is taken, lettered options, and a recommended option. Do the
  independent work first, then stop and wait.
- End every task with a final report: what changed and the commit, each
  decision and its outcome, the checks that ran, anything skipped, and the
  outstanding decisions or review items that still need the user.

## Commands

- Build: `npm run build`
- Targeted tests: `npx vitest run src/model/<name>.test.ts`
- Typecheck: `npm run typecheck`
- Early check (format and lint): `npm run lint && npm run format:check`
- Complete gate: `npm run check`. It stops at the first failed step.
- Format: `npm run format`

## Repository rules

- Tests are Vitest unit tests of `src/model/` only. Do not add browser,
  screen, or end-to-end tests. Cal decided this on 2026-10-23.
- Code in `src/model/` never reads the clock. Callers pass the time in, so
  tests use fixed times.
- `src/styles/mockup/` is ported from `docs/mockups/index.html`, and
  Prettier skips it. Keep its class names in step with the mockup.
- Saved games use versioned `localStorage` keys. Change the version when
  the stored shape changes. Keep reading the keys and the shapes of older
  versions, so that a saved game from an older build still loads.
- When a merge from main brings the saved-game version that your branch
  also took, move your branch to the next free version. Keep loading the
  games that your branch saved under the old number.
- When a game rule changes, search `src/ui/` and the mockup for text that
  states the old rule.
- A push to `main` deploys to Cloudflare. CI needs the repository variable
  `CLOUDFLARE_ACCOUNT_ID` and the repository secret `CLOUDFLARE_API_TOKEN`.
- Production opens at `https://ti4.nexus`, a Custom Domain in
  `wrangler.jsonc`. While `wrangler.jsonc` names a Custom Domain, each
  deploy removes the Custom Domains that it does not name, so keep every
  domain there.
- Each pull request from this repository gets a preview at
  `https://pr-<number>-twilight-timer.futex.workers.dev`. A bot comment on
  the pull request gives the link. CI deletes the preview when the pull
  request closes.

## Product

- Screens live in `src/ui/screens/`, one component per screen. Shared
  controls live in `src/ui/controls.tsx`. There is no shared UI library.
- The app is responsive. A phone, an iPad, and a computer show the same
  screens. The stage fills the window's safe area and is a CSS size container.
  `src/styles/mockup/responsive.css` holds the container queries, word for
  word from the mockup: two columns on a wide screen, and one column on an
  upright iPad or a phone.

## Review focus

- Time attribution: every moment of game time belongs to exactly one entry
  or rule check. Plain pauses and undone ranges are not game time.
- Undo: every clock returns to its value at the undone action. The game
  clock also keeps the rule checks in between.
- Stored games: a saved game from an older build still loads, or the app
  shows its notice and starts fresh.

## Status

- This project is not in production. Breaking changes are acceptable when
  they improve correctness or product quality.
