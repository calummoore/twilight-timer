# Architecture

TI4 Tempo is a static web app with one small server part for shared games.
[Multiplayer](multiplayer.md) gives the requirements that this structure
serves.

## Components

- **The app.** A React app, served as static files. It shows the table view
  on a table device and the player view on a phone. It keeps its game in
  the browser, so a table device works alone and offline.
- **The game model.** Pure TypeScript that the app and the server both
  run. It folds the log of taps into the clocks, applies each change,
  checks the role of the sender, and builds the view of each device. It
  never reads the clock or a random source. Its callers pass them in.
- **The Worker.** A Cloudflare Worker in the same deploy as the static
  files. It routes the requests of a shared game to the server object of
  that game, and it limits how fast one address can try codes.
- **The game server object.** One Cloudflare Durable Object for each shared
  game, named by its join code. It keeps the shared game in memory and in
  its own storage, and it handles one change at a time. It is a thin
  adapter around the game model.

## A change, from tap to screen

1. A tap becomes a change. The change names its target, for example the
   turn that it ends, and it carries a tap id.
2. The device shows the change at once and keeps it as pending.
3. The server object takes one change at a time. It checks the role of the
   sender and runs the game model on the newest game.
4. The server object stamps the change with its own clock, stores the
   game, and sends the change to every connected device. Storage confirms
   the write before any message leaves.
5. Each device applies the change and drops its pending copy. When the
   server object rejects a change, the sender shows a notice.

Two taps from the same state cannot both apply. The second names a target
that no longer runs, so the model rejects it. A tap id that the server has
answered gets the same answer again.

## Roles and views

- The server object knows the role and the seat of each connection.
- It sends each device a view: the public game, plus the private part of
  its seat in player mode. Device secrets and the table secret never leave
  the server object.

## Clocks

- The server clock is the one clock of a shared game. Each device keeps an
  estimate of its offset from that clock.
- A stored game records whether its times come from the device clock or
  the server clock. Sharing moves a game to the server clock.

## Decisions

- Sync service: Cloudflare Durable Objects. Rejected: Firebase Realtime
  Database and Firestore, because they cannot run the game rules, so every
  device would act as referee. Rejected: Convex, because it adds a vendor.
  Rejected: the table iPad as host, because phones would stop while it
  sleeps.
- The logic of the server object lives in the game model, with Node tests.
  Rejected: tests in the Workers runtime, because its test pool supports
  only Vitest 4, and the app uses Vitest 5.
