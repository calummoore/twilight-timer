# TI4 Tempo

A shared-table time tracker for Twilight Imperium 4th Edition. It runs on one
iPad in the middle of the table. It is a chess clock for the action phase, with
enough of the round structure to know whose turn it is. The repository is
`twilight-timer`.

Each push to `main` deploys the app to the Cloudflare Worker `twilight-timer`
in the futex account, at https://twilight-timer.futex.workers.dev. Each pull
request gets a preview link; see [Pull request previews](#pull-request-previews).

## Key features

- Setup for 5 to 8 players: name, colour, faction, seat, and the speaker.
- Strategy picks in speaker order, with trade goods on unpicked cards.
- The action-phase chess clock: End Turn, the strategic action, and Pass.
- A reaction window for secondary abilities that is charged to nobody.
- The status checklist, and clocks for agenda discussion and each vote.
- Optional time limits with overtime and an alarm.
- Undo that also restores time, a pause, a round summary, and game stats.
- The game saves in the browser after every tap, and the screen stays awake.

## Docs

- [Product spec](docs/product.md): requirements, decisions, and the MVP scope.
- [Mockup](docs/mockups/index.html): open it in a browser.
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
the newest commit of the pull request. Then it runs `wrangler versions upload`
with the alias `pr-<number>`. This adds a version of the Worker but does not
deploy it, so production does not change.

The preview opens at `https://pr-<number>-twilight-timer.futex.workers.dev`.
A bot comment on the pull request gives this link and a link to the exact
commit. The comment changes after each push.

- Pull requests from forks get no preview, because their runs get no secrets.
  A run without the Cloudflare secrets skips the preview with a warning.
- A preview has its own origin, so it keeps its own saved games.
- The workflow does not delete previews. A preview stays online after its pull
  request closes.
- Previews need Preview URLs on the Worker. `"preview_urls": true` in
  `wrangler.jsonc` keeps them on at each deploy.

## Key code

- `src/model/` holds the game as a pure fold over an append-only action log.
  - `types.ts`: the actions, the stored game, and the timed entries.
  - `fold.ts` and `fold-state.ts`: the phase state machine and the clocks.
  - `derive.ts` and `view.ts`: what each screen shows at a given time.
  - `commands.ts`: start, act, undo, pause, resume, and limit changes.
  - `stats.ts`: round and game stats.
  - `storage.ts` and `parse.ts`: `localStorage`, with a parser for saved data.
- `src/ui/GameScreen.tsx` connects the model to the screens.
- `src/ui/screens/` has one component per screen.
- `src/styles/mockup/` holds the CSS ported from the mockup.
  `src/styles/app.css` and `src/styles/screens.css` hold app-only styles.
