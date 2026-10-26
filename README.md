# TI4 Nexus

A shared-table time tracker for Twilight Imperium 4th Edition. The game lives
on the server, and every device at the table joins it with a six-character
code: the iPad in the middle of the table, a laptop at the side, and the
phones of the players. It is a chess clock for the action phase, with enough
of the round structure to know whose turn it is. The repository is
`twilight-timer`.

Each push to `main` deploys the app to the Cloudflare Worker `twilight-timer`
in the futex account. The app opens at https://ti4.nexus; see
[Custom domain](#custom-domain). Each pull request gets a preview link; see
[Pull request previews](#pull-request-previews).

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
- An admin device can swap two seats when the ring does not match the table:
  a long press on a seat, or Re-order seats, starts re-order mode, and a drag
  or two taps swap the seats. Undo takes a swap back.
- Optional time limits with overtime and an alarm.
- Undo that also restores time, a pause that can time rule checks, a round
  summary, and game stats.
- Each game lives on the server under a join code, with a QR code and a link
  to open or copy.
  Every device shows every tap at once, and a reload returns to the game.
- A phone takes the seat of its player, and taps for that player when the
  game waits for them: their pick, their turn, their tile in a reaction
  window, and their vote. A control that the device may not use is off, and
  names the player that the game waits for.
- An admin device taps for every player. After Create game, the device
  takes a seat or the table on the claim screen, and is the first admin
  either way. It gives admin to other devices with a switch. A table device
  without admin is a viewer.
- Home lists the recent games of the device, and continues a game that an
  older build saved on the device. The device then joins that game as the
  table device, with admin.
- The screen stays awake, and the same screens show on a phone, an iPad, and
  a computer, arranged for the space.

## Docs

- [Product spec](docs/product.md): requirements, decisions, and the MVP scope.
- [Mockup](docs/mockups/index.html): open it in a browser. It draws each
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

`npm run dev` also runs the Worker and its Durable Objects in the Workers
runtime, through `@cloudflare/vite-plugin`. The games of the dev server stay
in `.wrangler/state/`. After a change to `wrangler.jsonc`, run
`npm run types` to write `worker-configuration.d.ts` again, and commit it.

## Deploy

The GitHub Actions workflow `.github/workflows/ci.yml` runs `npm run check` on
every pull request and on every push to `main`. On a push to `main`, it then
runs `npm run deploy`. The deploy uploads the Worker, its Durable Object
migrations, and the static assets in one step.

`wrangler.jsonc` configures the Worker: the entry `worker/index.ts`, the
Durable Object binding `GAMES` with its migrations, and the assets. The
Worker answers `/api/` first, and every other path is a static asset. The
build writes the Worker to `dist/twilight_timer/` and the client to
`dist/client/`, with the configuration that the deploy reads,
`dist/twilight_timer/wrangler.json`. Each game is one Durable Object with the
SQLite storage backend, which the Workers Free plan allows. A new Durable
Object class, or a renamed one, needs a new entry under `migrations`.

One-time setup:

1. In the futex Cloudflare account, create an API token from the "Edit
   Cloudflare Workers" template. Under "Zone Resources", include the
   `ti4.nexus` zone.
2. Run `gh secret set CLOUDFLARE_API_TOKEN -R calummoore/twilight-timer` and
   paste the token.
3. Run `gh variable set CLOUDFLARE_ACCOUNT_ID -R calummoore/twilight-timer --body <account-id>`.

If the first deploy fails with "You need to register a workers.dev
subdomain", open Workers & Pages in the Cloudflare dashboard once. Then rerun
the workflow.

To deploy by hand, run `npx wrangler login`, then `npm run build` and
`npm run deploy`.

### Custom domain

Cal bought `ti4.nexus` through Cloudflare on 2026-10-25 as the domain of the
app. The `routes` entry in `wrangler.jsonc` makes it a Custom Domain of the
Worker. Each deploy attaches the domain. Cloudflare makes its DNS record and
its certificate.

- The `ti4.nexus` zone must be in the futex account, with the Worker.
- The API token needs the permission Zone > Workers Routes > Edit on the
  `ti4.nexus` zone. Without it, the deploy job fails at the Custom Domain
  step. The new version is then live only at the workers.dev URL.
- While `wrangler.jsonc` names at least one Custom Domain, each deploy
  removes the Custom Domains that it does not name. Add a domain in
  `wrangler.jsonc`, not in the dashboard.
- A deploy never removes the last Custom Domain. When you remove the last
  domain from `wrangler.jsonc`, also remove it in the Cloudflare dashboard.
- Do not add a DNS record for `ti4.nexus` by hand. In CI, Wrangler replaces
  a record that conflicts with the Custom Domain.
- `"workers_dev": true` keeps https://twilight-timer.futex.workers.dev on.
  When a route is set, Wrangler turns that URL off unless the setting is
  true.
- A game is on the server, so its code opens it at either address. The
  browser keeps its recent games for each origin, so the list at the
  workers.dev URL differs from the list at `ti4.nexus`.

### Pull request previews

The same workflow gives each pull request a preview. Its `preview` job builds
the pull request head commit of each run. A rerun builds the same commit
again. Then the job runs `wrangler preview --name pr-<number>`, with the
configuration that the build wrote. This makes or updates a Workers Preview of
the build under the same Worker. Production does not change.

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
- A preview has its own origin, so it keeps its own recent games. It also
  gets its own Durable Objects, from the `previews` block of
  `wrangler.jsonc`, so a preview never sees a production game.
- Previews stay on workers.dev. `preview_urls` controls them, apart from
  `workers_dev` and the Custom Domain.
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
  - `storage.ts` and `parse.ts`: the settings in `localStorage`, and the
    games that builds before the server saved there. The parser reads games
    of every older version.
  - `device-store.ts`: the token of the browser, and its open and recent
    games.
  - `connection.ts`: the offset to the server clock, and the waits between
    the tries after a lost connection.
  - `code.ts`: the join codes and their links.
  - `devices.ts`: the devices of a game, the seat takeover, and the
    last-admin rule.
  - `rights.ts`: who may tap what. The server and the screens call it.
  - `protocol.ts`: the messages between a device and the server, with their
    parsers.
  - `room.ts` and `setup.ts`: one game on the server, its reducer, and its
    stored shape.
- `worker/` holds the Worker.
  - `index.ts`: the routes. `POST /api/games` creates a game,
    `GET /api/games/<code>` looks a code up, and
    `GET /api/games/<code>/socket` opens the socket of a game.
  - `game-room.ts`: the Durable Object of one game. It applies each command
    with the model and its own clock, saves the room, and sends the state to
    every socket. Its sockets use the WebSocket Hibernation API.
- `src/App.tsx` holds the routes: Home, the setup, and the game of one code,
  which a join link `/join/<code>` opens.
- `src/ui/useGameClient.ts` owns the socket of a game: hello, the state, the
  server clock, pings, and the reconnect. `src/ui/api.ts` creates a game and
  looks a code up.
- `src/ui/RoomScreen.tsx` shows one game: the opening line, the lobby, or the
  running game with Players & devices over it.
- `src/ui/GameScreen.tsx` connects the model to the screens. Every control
  asks `src/ui/rights.ts`, which calls the rights of the model.
- `src/ui/screens/` has one component per screen.
- `src/ui/Stage.tsx` is the app root: it fills the window's safe area and is a
  CSS size container.
- `src/styles/mockup/` holds the CSS ported from the mockup.
  `responsive.css` holds the container queries that arrange each screen for
  the space, and `layout.css` holds the layout helpers that the screens use.
  `src/styles/app.css` and `src/styles/screens.css` hold app-only styles.
