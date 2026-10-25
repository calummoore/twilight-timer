# Multiplayer: live sync, device roles, and screens

Status: Active. In progress on the branch
`calummoore/firebase-multiplayer-plan`. On 2026-10-25 Cal asked to build
every milestone.

TI4 Tempo runs on one iPad, and each game lives only in the browser storage
of that iPad. Cal wants multiplayer: the table shares a game, and each
player joins it with a short code or a link. The spec designs this as the
phone companion add-on, and the mockup has its iPad Join screen and seven
phone screens.

This plan makes every action safe to send twice. It adds a sync service,
shared games, two device roles, and the screens for both roles. It
prepares for private player data, but it builds no private feature. The
design follows the decisions below. The plan does not cover push
notifications, game history, a visible sign-in, play without a table
device, or the removal of old shared games.

Decisions:

- 2026-10-23, Cal: asked for multiplayer "with login" and a game code or
  link for everyone. Cal proposed the Firebase Realtime Database.
- 2026-10-23: The QR code holds the join link for the phone camera app.
  The app has no QR scanner, because every phone camera reads QR codes.
- 2026-10-23: One model helper names the running clock by round, phase,
  player, and turn or agenda number. Each action that ends or changes a
  clock carries that name. Undo names the action that it removes.
  Alternative: add only the acting player, or a name without the player.
  Reason: plan reviews 1 and 2 found repeats that each partial name misses.
- 2026-10-25, Cal: decision 21 is B. Prepare for player mode and table
  mode now, but build no private feature yet. Alternatives: A, add roles
  later, and C, build full player mode now. Reason: roles and private data
  change the protocol, the stored data, and the security model. That is
  cheaper before the first release.
- 2026-10-25, Cal: keep all multiplayer work in one plan. This replaces a
  split into three plans from the same day.
- 2026-10-25, Cal: decision 35 is A. Keep every shared game for now, and
  never reuse a code. Alternatives: B, delete a game 30 days after its
  last change, and C, after 7 days. Reason: storage is small, and deletion
  can come later. This replaces the plan rule that a code expires 7 days
  after its game last changed.
- 2026-10-25, Cal: decision 36 is C. A join code has six letters and
  digits. Alternatives: A, four letters and digits, as the mockup shows,
  and B, six digits, which was recommended for faster typing. Reason: with
  about 890 million codes, a guessed code almost never matches a game.
- 2026-10-25, Cal: decision 40 is A. No device can be removed from table
  mode. To recover from a leaked table link, the table stops sharing and
  shares the game again. Alternative: B, a list of table devices with
  Remove and a new table link. Reason: the link shows only on a table
  device, so a leak is rare.
- 2026-10-25, Cal: build every milestone. This settles the open decisions
  with the options that the design uses, and the open review findings
  with their recommended options. Each line below gives the outcome.
  - 9: C, Cloudflare Durable Objects. Rejected: Firebase RTDB, Firestore,
    Convex, and the table iPad as host. Reason: one server object per game
    orders the taps, checks them with our own model, and keeps one clock.
  - 10: A, a device id with no screen.
  - 11: A, a table device and optional player devices.
  - 12: A, the player's own turn and own reaction tile.
  - 13: B, tests of the object run in CI.
  - 14: B, a scratch browser smoke test.
  - 15 does not apply to option C.
  - 16: A, versioned keys, as today.
  - 30: B, an older page reloads when the protocol version changes.
  - Findings 8, 20, 24, 28, 33, and 34 take option A. Findings 1 and 6
    close: decision 21 covers 1, and 6 applies only to Firebase.
  - The plan problems that the reviews found outside their scope get
    fixed in the milestones that build the code.
- 2026-10-25: The Workers test pool supports only Vitest 4, and this
  repository uses Vitest 5. So the logic of the object lives in a pure
  room module in `src/model/`, with Vitest tests in `npm run check`. The
  Durable Object is a thin adapter, and the smoke test covers it. This
  keeps the intent of decision 13.

Contract owners: `docs/product.md`, the new `docs/architecture.md`, the
mockup at `docs/mockups/index.html`, the [README](../README.md), and
[AGENTS.md](../AGENTS.md).

## Design

The design uses Cloudflare Durable Objects, as decision 9 sets.

Terms:

- **Table mode:** a device role that can do every action, as the iPad does
  today. It never gets private player data.
- **Player mode:** a device role that acts only for its own seat. It sees
  the public game and the private data of that seat.
- **Join code:** six letters and digits that open player mode for a shared
  game. The join link and the QR code hold the same code.
- **Table link:** a link with a long secret that opens table mode.
- **Change:** one request from a device: an action, an undo, a pause, a
  resume, a limits change, or a seat request.
- **View:** what the sync service sends to one device. It is the public
  game, plus the private data of the seat for player mode.

### Components

- The app stays a static web app. One Worker script and one Durable Object
  class join it in the same `wrangler deploy`.
- Each shared game has one Durable Object, named by its join code. The
  object keeps the game in memory, stores it in its SQLite storage, and
  handles one change at a time.
- The object runs pure model functions from `src/model/`. A room module
  checks the role, applies the change, and builds each view. Devices run
  the same functions for instant feedback.
- `partyserver` runs the object with WebSocket hibernation, so an idle
  game costs no duration. Devices connect with `partysocket`, which
  reconnects with backoff.
- A game is small. A simulated 14-hour game with 8 players had 1,391 taps
  and 72 KB of JSON.

### Actions that name their target

A device can send a tap again on a newer state, and some taps then apply
twice:

- Two devices that both send End Turn end two turns.
- A repeated phase step in the status phase skips the round summary.
- With one unpassed player, a repeated End Turn ends a second turn of that
  player.
- An undo that names only the log length can remove another action.
- A device that loses a reply sends the same tap again.

So each action that ends or changes a clock names that clock, undo names
the action it removes, and each action carries a tap id. The model then
rejects a repeat. The stored game changes shape, so migrations become
ordered version steps, each tested with a recorded game.

### Changes and their order

1. A tap becomes a change. It carries a tap id, the tap time, its target,
   and the game id.
2. The device applies the change to its own copy at once, and marks it
   pending.
3. The object takes one change at a time. It checks the game id and the
   role of the sender, then runs the model on the newest game.
4. The object keeps every tap id that it answered, also for a tap that
   undo removed later. A repeated tap id gets its first answer.
5. One model helper puts the time of a change between the newest time in
   the game and the object's clock. The newest time covers the last
   action, pause, undone range, and limits change.
6. The object stores the change and then sends it to every device. The
   object storage confirms the write before any message leaves.
7. The sender drops its pending copy when the change comes back. When the
   object rejects the change, the device shows a notice.

Two devices that send the same tap at once cannot both apply it. The
second tap names a target that no longer runs, so the model rejects it.

### Roles, views, and private data

- The device that shares a game gets table mode. Another device gets table
  mode only through the table link, which a table device shows on request.
  The join code gives player mode.
- A player device may send the game changes of decision 12 for its own
  seat. It may also claim a seat and ask to move a seat. The object
  rejects all other changes from a player device.
- The object keeps the device roles, the device secrets, and the table
  secret in a server record. No view ever holds that record.
- The object sends each device its view. Table mode never gets private
  data, because the table iPad is a public screen.
- The view, the device record, and the shared-game record have a private
  part for each seat. This release leaves it empty, so that private
  comments and a pre-selected card can come later with no protocol change.
  The object will hold such data, and it will apply a pre-selected card
  when that pick comes up.

### Clocks, versions, and offline play

- The object's clock is the one clock. Each message from the object
  carries its time, so each device keeps an estimate of its offset.
- Each stored game marks its time base: device or server. One helper gives
  `now` from that mark. Sharing moves a solo game to server time, so the
  running clock does not jump. Stop sharing needs no shift.
- The object keeps one shared-game record: the game, the answered tap
  ids, the server record, the closed state, and the game id. It stores
  and loads only that record.
- Each device keeps one device record in `localStorage`. It holds the
  game, the pending changes, the last offset, the code, and the game id.
  It also holds the role and the secrets of the device.
- Both records pass the same parser and version steps. Milestones 3 and 4
  ship together, so the time base joins version 2 of the stored game.
- When a stored record does not parse, the object refuses to serve it,
  and the device shows its notice and keeps its own copy.
- The object sends its protocol version. An older page reloads itself,
  and the game survives in the object and in the device record.
- The table device works offline, as today. When the connection returns,
  it sends its pending changes in order. The object rejects those that are
  no longer legal, and the device shows a notice.

### Seats, presence, codes, and links

- The object knows which devices are connected, so presence needs no
  extra writes. The Join screen shows each seat as connected, offline, or
  not joined, and it lists seat move requests.
- Each device keeps a random device id and secret. A seat belongs to a
  device id. A free seat goes to the first device that claims it. A held
  seat moves only when a table device approves the request or releases
  the seat.
- Any device with the table link can become a table device. If no device
  has the link, the game cannot get a new table device. So the table link
  screen asks the host to keep the link.
- A code has six characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, as
  decision 36 sets. Typed input ignores case. The join link is
  `/join/{code}`. The table link adds the secret.
- Sharing picks a random code. The object of that code refuses it when it
  already holds a game, and the device tries another. A code never
  expires, and the sync service keeps every shared game.
- Each shared game has a random game id, and every view carries it. A
  device that finds another game id behind its code sends nothing more.
- Stop sharing closes the game. The object then rejects every change, and
  devices show that the game is no longer shared.
- A phone checks a code over HTTP before it connects, so it can show an
  unknown code or a refused try. The Worker limits how fast one address
  can try codes. A code holder can act only for a free seat, and the table
  can undo that.

## Milestone 1: Documentation and spec

State the requirements and the decisions for shared games, device roles,
and their screens. Add an architecture doc for the new components.

- [ ] Update `docs/product.md`.
  - [ ] Move the phone companion and live sync into the scope, as player
        mode and table mode. Keep push notifications as an add-on.
  - [ ] Add the requirements for sharing, the join code, the table link,
        roles, views, seats, and seat moves.
  - [ ] Add the requirements for simultaneous taps, the one clock, offline
        play on the table device, and games and codes that never expire.
  - [ ] State that table mode never gets private data. List private
        comments and a pre-selected card as later features.
  - [ ] Update the screen tables for table mode and player mode. Name the
        Join screen, the seat move flow, and the error states.
  - [ ] Update the data model sketch for actions that name their target.
  - [ ] State that a lost table link cannot be replaced, and that the
        table link screen asks the host to keep it.
  - [ ] Record decisions 10, 11, 12, 21, 30, 35, 36, and 40 as decisions
        in force.
- [ ] Add `docs/architecture.md`: the components, the flow of a change,
      and the roles. Record decision 9 and the rejected options.
- [ ] Update `README.md`: the features, the sync service, local
      development, and the key code.
- [ ] Update `AGENTS.md`: the new commands and the outcomes of decisions
      13, 14, and 16. State that server logic is pure model code in the
      room module.

## Milestone 2: Mockups

Tags: mockup

Fill the gaps in the mockup before any screen work. It lacks the way to
the Join screen, the roles, the connection states, and most phone states.

- [ ] Table device: a Join button and a sync chip in the top bar. The chip
      shows live, reconnecting, or offline. "Allow phone companions" off
      hides the button.
- [ ] Join screen: the player QR and code, "Add a table screen" with the
      table link, Stop sharing, and a row for each seat. A row shows
      connected, offline, or not joined, a move request with Approve, and
      Release seat.
  - [ ] Show the deployed address, not `ti4tempo.app`.
  - [ ] The table link screen asks the host to keep the link.
- [ ] A notice on every device for a tap that another device made first.
- [ ] Phone Join: an unknown code, a game that is no longer shared, a try
      that the rate limit refuses, and no connection. The QR card tells the
      player to use the phone camera.
- [ ] Show six-character codes on the iPad Join screen and in the phone
      code boxes, as decision 36 sets. Update the phone Join prompt and its
      note, which say four characters.
- [ ] Phone Claim seat: claim a free seat, or ask the table to move a held
      seat and wait for approval.
- [ ] Phone Waiting for the other phases, a reconnecting banner, and a
      screen for a game that is no longer shared. Make the Waiting note and
      its screen agree on the number of turns.
- [ ] Use the names table mode and player mode in the copy and the notes.

## Milestone 3: Actions that name their target

Make every action safe to apply again on a newer state. Both game keys
move to version 2, and version 1 games migrate on load.

- [ ] Add one model helper that names the running clock by round, phase,
      player, and turn or agenda number. Each action that ends or changes
      a clock carries that name. The fold rejects the action when another
      clock runs. Replace `statusStepToggled` with `statusStepSet`.
- [ ] A reaction extension also names the window length that it extends,
      so that two table devices cannot both extend the window.
- [ ] Undo names the action that it removes, not only the log length.
- [ ] Each action carries a tap id.
- [ ] Update the parser, and pass the new fields from `GameScreen.tsx`.
- [ ] Build the migration as ordered version steps, each tested with a
      recorded game. The first step moves the current game and the last
      game from version 1 to version 2. A replay of each log fills the new
      fields. The settings key keeps version 1. Decision 16 can change the
      key layout.
- [ ] Add one table-driven test that applies each change twice. Test the
      migration of recorded version 1 games under both keys.

## Milestone 4: Shared-game model

Add the pure model functions for shared games. Each has unit tests with
fixed times and a fixed random source.

- [ ] Apply a change: check the game id and the role, run the model, and
      stamp the time. Keep every answered tap id, and answer a repeated id
      with its first answer.
- [ ] One helper puts the time of a change between the newest time in the
      game and the server clock.
- [ ] Roles: table mode may send every change. Player mode may send the
      game changes of decision 12 for its own seat, a seat claim, and a
      seat move request.
- [ ] Views: the public game for every device, plus the private part of
      its seat for player mode. Roles and secrets stay in a server record
      that no view holds.
  - [ ] Test that a table view holds no private data.
  - [ ] Test that a player view holds no secret and no private part of
        another seat.
  - [ ] Test that no view of any role holds a device secret or the table
        secret.
- [ ] Outbox: the pending changes in order, the game with them applied,
      and the next step after an answer: done, or drop with a notice.
- [ ] Records: the shared-game record of the object and the device record,
      each read through the parser and the version steps. A record that
      does not parse gives a clear failure, not a crash.
- [ ] Time base: move a game to server time, and give `now` for a game
      from its time base. The mark joins version 2 of the stored game, and
      the version 1 step reads a game without it as device time.
- [ ] A limits change names one timer or the master switch, and applies to
      the newest limits of the game.
- [ ] Codes and links: make a code, a game id, and a table secret, read
      typed input, and parse both links.
- [ ] Add "Allow phone companions" to the stored settings, on by default
      as the mockup shows. A parser default keeps the settings key at
      version 1.
- [ ] Player views: who acts now and their clock, the turns before mine,
      my totals and card, my reaction tile, and my game stats.
- [ ] The room module: one shared-game record, its connections, and the
      messages in and out. Storage and connections are passed in, so the
      Vitest tests use memory fakes. This covers decision 13.

## Milestone 5: Sync server

Add the Worker and the Durable Object. No screen uses them yet. Evidence
for the game size: `.context/multiplayer-live-sync/game-size.md`.

- [ ] Add `partyserver`. Add the Worker entry, the Durable Object binding,
      and its SQLite migration to `wrangler.jsonc`. Keep the static files.
- [ ] Add the Cloudflare Vite plugin, so that `npm run dev` runs the Worker
      and the object locally.
- [ ] The object loads its shared-game record on start through the parser
      and the version steps. It applies changes with the model, stores the
      record after each change, and sends each connection its view.
- [ ] The object tracks connections for presence. It handles seat claims,
      move requests, approvals, releases, the code, and the table secret.
- [ ] Stop sharing closes the game, and the object rejects every later
      change.
- [ ] The Worker routes a code to its object, answers a code check over
      HTTP, and limits code tries per address.
- [ ] The object refuses to serve a record that does not parse.
- [ ] Decision 30: the object sends its protocol version, and it answers
      an older client with a reload message.
- [ ] Scratch check, not committed: two clients send the same tap at once
      to the local object, and exactly one applies.

## Milestone 6: Sync client

Connect the app to the sync server. No screen uses the client yet.

- [ ] Check a code over HTTP, then connect with `partysocket` with the
      device id and secret. Keep the clock offset and the connection state.
- [ ] Decision 30: reload the page when the object reports a newer
      protocol version.
- [ ] Publish: shift the game to server time, reserve a code, and upload
      the game. Stop sharing keeps the game on the table device.
- [ ] Keep the device record in `localStorage`, and send the outbox in
      order.
- [ ] Claim a seat, request a move, approve or release a seat, and join
      with the table link.
- [ ] A device that finds its game closed, or another game id behind its
      code, stops sending and reports that the game is no longer shared.

## Milestone 7: Table device screens

Tags: ui

Build the table device parts of the mockup.

- [ ] Add the Join button and the sync chip to the top bar. Hide the
      button when "Allow phone companions" is off.
- [ ] Build the Join screen: the player QR, the code, the link, the table
      link, the seat rows, move approval, Release seat, and Stop sharing.
- [ ] Add the "Allow phone companions" switch to Settings, as the mockup
      shows.
- [ ] Show the notice for a dropped tap.
- [ ] In a shared game, Settings shows the newest limits of the game and
      changes only the edited timer.
- [ ] Every screen takes `now` from the time base of its game.

## Milestone 8: Player screens

Tags: ui

Build the player mode screens of the mockup.

- [ ] Add a phone stage of 393 by 852, scaled to fit, for the join route.
      The screens go in `src/ui/screens/phone/`.
- [ ] Build Join, Claim seat with the move request, Waiting, Your turn,
      Reaction window, Pass confirmation, and Personal stats.
- [ ] Open the table view on a device that joins with the table link.
- [ ] Add the reconnecting banner, the error states, and the screen for a
      game that is no longer shared. The error states include a code try
      that the rate limit refuses.

## Milestone 9: Verification, commit, and review

Run the checks, push, and review the branch.

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Decision 14: in headless Chrome, play one round with a table device
      and two player devices against the local server. Commit nothing.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.
  - Plan review 1 of dbde952 found 8 findings. Fixed: 2, 3, 4, 5, and 7. Finding 1 got option A and stays open. Report: `.context/multiplayer-live-sync/review-1.md`.
  - Plan review 2 of 97fb703 found 4 findings, 17 to 20. Fixed: 17, 18, and 19, and the rest of 3 and 4. Report: `.context/multiplayer-live-sync/review-2.md`.
  - Plan review 3 of 9850502 found 8 findings, 22 to 29. Fixed: 22, 23, 25, 26, 27, and 29. Decision 30 is the wider fix of finding 23. Report: `.context/multiplayer-live-sync/review-3.md`.
  - Plan review 4 of 4128a52 found 4 findings, 31 to 34. Fixed: 31 and 32. Report: `.context/multiplayer-live-sync/review-4.md`.
  - Plan review 5 of 4564413 found 2 findings, 37 and 38. Fixed: 37 and 38. Report: `.context/multiplayer-live-sync/review-5.md`.
  - Plan review 6 of 58d1471 found no new findings. Report: `.context/multiplayer-live-sync/review-6.md`.
  - Plan review 7 of 4b8b1e8 found 1 finding, 39. Fixed: 39. Report: `.context/multiplayer-live-sync/review-7.md`.
  - Cal's go-ahead on 2026-10-25 settled the open findings. 1 and 6 closed. 8, 20, 24, 28, 33, and 34 took option A, and the milestone TODOs now build them. The plan problems found outside the review scopes are fixed in the TODOs of Milestones 2 to 8.
  - Follow-up: make the open game the one source of the limits in force. Effort Small. Covers finding 3. Previous examples: none.

## Post-merge follow-up (non-blocking)

- [ ] Check the deploy on `main`, then play one round on the live site
      with the iPad and two phones.
- [ ] Open a game that the MVP build saved on the iPad, and check that it
      loads.
- [ ] Decide when to delete old shared games. Decision 35 keeps them for
      now.
- [ ] Write a plan for private comments and a pre-selected card, the
      features that decision 21 prepares.
