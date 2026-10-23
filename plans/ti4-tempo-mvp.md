# TI4 Tempo MVP and Cloudflare deploy

Status: Active. [PR #1](https://github.com/calummoore/twilight-timer/pull/1) is open.
The plan closes when its PR merges.

TI4 Tempo is a shared-table time tracker for Twilight Imperium 4th Edition.
It runs on one iPad in the middle of the table. It is a chess clock for the
action phase, with enough of the round structure to know whose turn it is.
The product spec is Cal's README, and the design is one self-contained HTML
mockup with 13 iPad screens and 7 phone screens. This plan builds an MVP of
the iPad app and deploys it to the futex Cloudflare account on each push to
`main`.

On 2026-10-23, the spec and the mockup were copied byte-exact from
`/Users/calummoore/projects/futex/twilight` on Cal's Mac to
`.context/twilight-source/`. Milestone 1 moves them into `docs/`.

The plan does not cover the phone companion or live sync, which the spec
puts in phase 2. It also does not cover accounts, online play, victory
points, rules validation, preview deploys for pull requests, a custom
domain, or the Naalu "0" initiative token.

Decisions:

- 2026-10-23: Stack. Vite, React, and TypeScript. Alternative: plain HTML
  and JavaScript, as in the mockup. Reason: React keeps many screens in
  step with one state, and other futex-ai frontends use it.
- 2026-10-23: Hosting. Cloudflare Workers with static assets, deployed with
  `wrangler deploy`. The Worker name is `twilight-timer`, after the repo.
  Alternative: Cloudflare Pages, which `futex-ai/ui` and
  `futex-ai/backlinks` use. Reason: Cloudflare points new projects to
  Workers, and `wrangler deploy` creates the Worker on the first run.
- 2026-10-23: Secret names. Repository variable `CLOUDFLARE_ACCOUNT_ID` and
  repository secret `CLOUDFLARE_API_TOKEN`, as in `futex-ai/ui`.
- 2026-10-23: State model, from the spec. The game is an append-only log of
  timestamped actions. The app derives all state by a fold over the log.
  Closed durations are elapsed milliseconds. The running clock is `now`
  minus the time of the last action, so a reload or a sleeping iPad loses
  no time. Undo pops the last action.
- 2026-10-23: The spec sketch named four action kinds. The log records
  every game tap, as the spec's Corrections section lists, so that undo
  covers every tap. Setup, pauses, and limit changes are kept beside the
  log.
- 2026-10-23: Design. Port the mockup CSS and keep its class names. Reason:
  it is the fastest way to match the mockup.
- 2026-10-23: Spec open questions. A pause charges nobody and is logged on
  its own, as the spec leans. Component actions in another player's turn
  are not tracked, as the spec suggests. With seven or eight players, each
  player takes one card from the normal set of eight, as the spec table
  says.
- 2026-10-23, Cal: MVP scope is option B. That is the core game loop plus
  time limits with the Settings screen, overtime, and the alarm.
  Alternatives: A, the core loop only, and C, every spec must-have. The
  History screen, time edits, seat re-order, and the vote tally come
  later.
- 2026-10-23, Cal: "assume 6 players for now". Every player takes one
  strategy card. Setup offers 5 to 8 players with 6 as the default,
  because those counts use the same one-card rule. Games with 3 or 4
  players wait for a decision on their turn-order rule.
- 2026-10-23, Cal: the speaker token moves only by hand, from the speaker
  chip. Alternative: pass it each round, as the mockup note said. Reason:
  the TI4 rules move it only through Politics and a few other cards. A
  speaker prompt when Politics is played can come later.
- 2026-10-23, Cal: unit tests only, for the game model. No browser tests,
  no screen tests, and no manual browser smoke test. Alternative: screen
  tests and one Playwright test. Reason: speed for a fun MVP.
- 2026-10-23: Undo voids the time between the undone action and the undo.
  Every clock returns to its value at the undone action, as the spec's
  history example shows.
- 2026-10-23: The reaction window closes itself when its limit passes, as
  the spec says. All other limits are soft and only count overtime.

Contract owners:

- The product spec at `docs/product.md`, after Milestone 1.
- The mockup at `docs/mockups/index.html`, after Milestone 1.
- The [workspace README](../README.md).

## Milestone 1: Documentation and spec

Bring the spec and the mockup into the repository, so that every workspace
can read them. Record the MVP scope and the rule decisions in the spec.

- [x] Add `.context/` to `.gitignore`.
- [x] Copy the spec to `docs/product.md` and the mockup to
      `docs/mockups/index.html`. The relative mockup link still works.
- [x] Mark the MVP scope in the spec requirements.
- [x] Update the spec and the mockup note with the player-count and
      speaker decisions, the undo time rule, and the answered questions.
- [x] Rewrite `README.md`: what the app does, the local get-started steps,
      the deploy setup, and links to `docs/` and `plans/`.
- [x] Create `AGENTS.md` from the `agents-md` template, and `CLAUDE.md` as
      a symlink to it.
- [x] Replace the left-edge accent stripe on the mockup's hero card and
      navigation with a full border, as the product UI rules require.

## Milestone 2: App skeleton and checks

Create a Vite, React, and TypeScript app that builds and passes all checks.
The app shows the TI4 Tempo title.

- [x] Scaffold the app in the repository root from the Vite `react-ts`
      template.
- [x] Merge the template `.gitignore` into the existing one. Add
      `.wrangler/`.
- [x] Set `strict: true`. Replace the template's oxlint with ESLint and
      `typescript-eslint`, as the TypeScript skill requires. Add Prettier
      and Vitest.
- [x] Add the npm scripts `dev`, `build`, `typecheck`, `lint`, `format`,
      `test`, and `check`. `check` runs the lint, the format check, the
      tests, and the build, which typechecks.
- [x] Add `.nvmrc` with Node 24.
- [x] Add `wrangler` as a dev dependency. Add `wrangler.jsonc` with the
      Worker name, the `dist` assets directory, and
      `single-page-application` not-found handling.
- [x] Run `npm run check` and `npx wrangler deploy --dry-run`.

## Milestone 3: CI and deploy

Add one GitHub Actions workflow. It checks every pull request and every
push. After a push to `main` passes the checks, it deploys to Cloudflare.

- [x] Add `.github/workflows/ci.yml` with one job: check out, set up Node
      from `.nvmrc`, `npm ci`, and `npm run check`. The job skips the
      shared npm cache, because the deploy step holds a token.
- [x] Add a deploy step that runs `npx wrangler deploy` only on a push to
      `main`.
  - [x] Read the account ID from the repository variable and the API token
        from the repository secret.
  - [x] Stop with a clear error when either value is missing.
  - [x] Add a concurrency group, so that two deploys never overlap.
- [x] Document the one-time Cloudflare setup in `README.md`. Include the
      fix for a missing `workers.dev` subdomain.

## Milestone 4: Game model

Write the game as a pure TypeScript module with unit tests. The module has
no UI. Scope, from MVP option B:

- Setup: five to eight players with name, colour, faction, and seat, and
  the speaker.
- Orders: strategy picks start with the speaker and go clockwise. Agenda
  votes start left of the speaker, and the speaker votes last. Initiative
  is the strategy card number. Every player takes one card.
- Strategy phase: card picks with a clock for each picker, and a trade good
  on each card that nobody picks, kept until somebody picks it.
- Action phase: End Turn, Play strategy card, and Pass. Passed players are
  skipped. Pass before the strategy card is played gives a warning, not a
  block. The phase ends when the last player passes.
- Reaction window: it stops the active clock and is charged to nobody.
  Every other player, also a passed one, marks done. It closes when all
  are done, when the table closes it, or when its limit passes.
- Status phase with seven checklist steps and a table clock. The agenda
  phase starts after the table marks the Custodians token removed.
- Agenda phase: two agendas, each with a discussion clock and a clock for
  each voter.
- Time limits for turn, reaction window, agenda discussion, vote, status
  phase, and strategy pick, under one master switch. A passed limit only
  counts overtime, except the reaction window.
- Pause and resume. Repeated undo that also restores elapsed time.
- Stats for a round and for the game: time per player, turns, average turn,
  longest turns, overtime, reaction window time, and time per phase.

- [x] Model the actions and the derived state as discriminated unions.
- [x] Write the fold `derive(game, now)`. The caller gives `now`, so tests
      use fixed times and no real clock.
- [x] Save the game to `localStorage` after each action. Parse saved data as
      `unknown` before use. When it is not valid, show a notice and start
      a new game.
- [x] Unit-test each action, the three orders, the pass rules, the
      reaction window, the clocks and limits, pause, undo, the stats, and
      the parser.

## Milestone 5: Screens

Tags: ui

Build the iPad screens from the mockup in a 1194 by 834 stage, scaled to
fit the window, as the mockup does.

- [x] Port the mockup CSS to `src/styles/`, split by area, with the same
      class names.
- [x] Build the top bar: round, phase, speaker chip, game clock, Undo,
      Pause, and Settings.
- [x] Build each screen as its own component: Setup, Settings, Speaker and
      Seating, Strategy Phase, Action Phase with its overtime state,
      Reaction Window, Status Phase, Agenda Phase, Round Summary, and
      Post-game Stats.
  - [x] Setup: seat order with up and down buttons, and a faction field
        with suggestions.
  - [x] Speaker and Seating: no Re-order Seats button.
  - [x] Status Phase: a Custodians token switch.
  - [x] Round Summary: an End Game button next to Start Round, and no
        History button.
- [x] Sound the alarm with the Web Audio API when a limit passes.
- [x] Keep the screen awake with the Screen Wake Lock API during a game.
- [x] Add a web app manifest, so that the iPad can open the app full
      screen from the home screen.
- [x] No tap discards a running game. End Game asks for confirmation, the
      stats screen can reopen the game, and New Game keeps the ended game
      as the last game.
- [x] Scratch checks, not committed: every screen rendered to HTML in Node,
      and the preview server served the page. Evidence:
      `.context/ti4-tempo-mvp/render.log` and `server-smoke.log`.

## Milestone 6: Verification, commit, and review

Run the checks, push, and review the branch.

- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.
  - Review 1 found 10 findings. Fixed: 2, 4, 7, 8, and 9. Report:
    `.context/ti4-tempo-mvp/review-1.md`.
  - 1. Undo does not restore clocks after some taps. Severity Medium, effort Small. Recommended: A, keep the code and state the exception in the docs.
  - 3. Pause is hidden while a reaction window is open. Severity Medium, effort Small. Recommended: B, keep the top bar above the scrim and update the mockup.
  - 5. Model tests skip key undo and attribution paths. Severity Low, effort Medium. Recommended: B, add a seeded property test.
  - 6. A version bump would hide saved games silently. Severity Low, effort Small. Recommended: B, one unversioned key and the version field.
  - 10. Stats screen prints "1 rounds" and "1 times". Severity Low, effort Small. Recommended: B, a shared plural helper.
  - 11. Plan misrecords the recommendation for finding 1. Severity Low, effort Small. Recommended: B, keep A and record the reason.
  - Follow-up: add an unused-export check such as knip to `npm run check`. Effort Large. Covers finding 9. Previous examples: none.
  - Review 2 checked the fix commit: findings 2, 4, 7, 8, and 9 are resolved. Finding 12, the repeated action kind list, is fixed. Report: `.context/ti4-tempo-mvp/review-2.md`.
  - `docs/product.md`: the data model sketch shows Game, Round, PhaseLog, and Entry shapes that the code does not have. Separate branch.
  - `src/ui/screens/StatsScreen.tsx`: the post-game bars have no legend, but the mockup shows one. Separate branch.

## Post-merge follow-up (non-blocking)

- [ ] Check that the deploy step passed on `main`.
- [ ] Open https://twilight-timer.futex.workers.dev on the iPad, add it
      to the home screen, and play one round.
- [ ] Write the next plan for the spec items that the MVP leaves out.
