# TI4 Tempo

A shared-table time tracker for Twilight Imperium 4th Edition. It runs on one
iPad or phone in the middle of the table. It is a chess clock for the action
phase, with enough of the round structure to know whose turn it is. The
repository is `twilight-timer`.

Each push to `main` deploys the app to the Cloudflare Worker `twilight-timer`
in the futex account, at https://twilight-timer.futex.workers.dev. Each pull
request gets a preview link; see [Pull request previews](#pull-request-previews).

## Key features

- Setup for 3 to 8 players: name, colour, faction from the official list, seat,
  and the speaker. The table chooses its expansions, and one tap deals random
  factions to the empty seats.
- Strategy picks in speaker order, with trade goods on unpicked cards. With 3
  or 4 players, each player picks two cards, and the lower card sets their
  place in the turn order.
- The action-phase chess clock: End Turn, the strategic action, and Pass.
- The Naalu "0" token puts the Naalu player first. Gift of Prescience can move
  it for one round.
- A reaction window for secondary abilities that is charged to nobody.
  Closing it ends the turn. For Politics, it also asks for the new speaker.
- The status checklist, and clocks for agenda discussion and each vote.
- The table can remove a player who leaves mid-game. Their recorded time
  stays in the stats.
- Optional time limits with overtime and an alarm.
- Undo that also restores time, a pause that can time rule checks, a round
  summary, and game stats.
- The game saves in the browser after every tap, and the screen stays awake.
- The same screens on a phone, an iPad, and a computer, arranged for the space.

## Docs

- [Product spec](docs/product.md): requirements, decisions, and the MVP scope.
- [Mockup](docs/mockups/index.html): open it in a browser. It draws each table
  screen once, in an iPad, an upright iPad, and a phone frame. A link such as
  `#action/phone` opens one frame. **Later** marks a control that is not built.
- [Plans](plans/)

## Get started

The app needs Node 24, as `.nvmrc` says.

```sh
npm install
npm run dev     # opens on http://localhost:5173
npm run check   # lint, format check, unit tests, and build
```

## Deploy

The GitHub Actions workflow `.github/workflows/ci.yml` runs `npm run check` on
every pull request and on every push to `main`. On a push to `main`, it then
runs `wrangler deploy`, which uploads `dist/` as static assets.
`wrangler.jsonc` configures the Worker.

One-time setup:

1. In the futex Cloudflare account, create an API token from the "Edit
   Cloudflare Workers" template.
2. Run `gh secret set CLOUDFLARE_API_TOKEN -R calummoore/twilight-timer` and
   paste the token.
3. Run `gh variable set CLOUDFLARE_ACCOUNT_ID -R calummoore/twilight-timer --body <account-id>`.

If the first deploy fails with "You need to register a workers.dev
subdomain", open Workers & Pages in the Cloudflare dashboard once. Then rerun
the workflow.

To deploy by hand, run `npx wrangler login`, then `npm run build` and
`npm run deploy`.

### Pull request previews

The same workflow gives each pull request a preview. Its `preview` job builds
the pull request head commit of each run. A rerun builds the same commit
again. Then the job runs `wrangler preview --name pr-<number>`. This makes or
updates a Workers Preview of the build under the same Worker. Production does
not change.

The preview opens at `https://pr-<number>-twilight-timer.futex.workers.dev`.
A bot comment on the pull request gives this link and a link to the exact
commit. Each successful preview run updates the comment.

When the pull request closes, also by a merge, the `cleanup` job runs
`wrangler preview delete`. Then it edits the comment to say that the preview
is deleted. If the pull request opens again, the next run makes a new preview.

- Workers Previews is an open beta of Cloudflare. A failed preview fails only
  the `Preview` check. It does not stop the deploy of `main`.
- Pull requests from forks get no preview, because their runs get no secrets.
  A run without the Cloudflare secrets skips the preview or the cleanup with a
  warning.
- Package code from a pull request runs before review in the same job as the
  upload step, which holds `CLOUDFLARE_API_TOKEN`. Cal accepted this risk on
  2026-10-23. The `cleanup` job installs from the default branch, so it runs
  no pull request code.
- A preview has its own origin, so it keeps its own saved games.
- Workers Previews need Preview URLs on the Worker. `"preview_urls": true` in
  `wrangler.jsonc` keeps them on at each deploy. `wrangler preview` also needs
  the `previews` block in `wrangler.jsonc`.
- Cal chose Workers Previews on 2026-10-25, so that CI can delete each
  preview. Rejected: aliases from `wrangler versions upload`, because
  Cloudflare cannot delete them. The alias previews of pull requests #4 and #6
  to #15 stay online for this reason.

## Key code

- `src/model/` holds the game as a pure fold over an append-only action log.
  - `types.ts`: the actions, the stored game, and the timed entries.
  - `factions.ts`: the official factions and the ids that saved games store,
    and the expansion of each faction.
  - `deal.ts`: the factions in play for the chosen expansions, the choices
    of one seat, and the random deal for the empty seats.
  - `fold.ts` and `fold-state.ts`: the phase state machine and the clocks.
    `fold-orders.ts` finds who acts next, and `fold-removal.ts` takes out a
    player who leaves.
  - `derive.ts` and `view.ts`: what each screen shows at a given time.
  - `commands.ts`: start, act, undo, pause, the pause reason, resume, and
    limit changes.
  - `stats.ts`: round and game stats.
  - `pauses.ts`: the open pause, and the time and the count of rule checks,
    which count as game time.
  - `storage.ts` and `parse.ts`: `localStorage`, with a parser for saved data.
    The parser also reads games saved by older builds.
- `src/ui/GameScreen.tsx` connects the model to the screens.
- `src/ui/screens/` has one component per screen.
- `src/ui/Stage.tsx` is the app root: it fills the window's safe area and is a
  CSS size container.
- `src/styles/mockup/` holds the CSS ported from the mockup.
  `responsive.css` holds the container queries that arrange each screen for
  the space, and `layout.css` holds the layout helpers that the screens use.
  `src/styles/app.css` and `src/styles/screens.css` hold app-only styles.
