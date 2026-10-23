# Multiplayer: shared games with join codes

Status: Active. Draft on the branch `calummoore/firebase-multiplayer-plan`.
No milestone starts before Cal answers the open decisions.

TI4 Tempo runs on one iPad, and each game lives only in the browser storage
of that iPad. Cal wants multiplayer: the table shares a game, and each
player joins it with a short code or a link. The spec designs this as the
phone companion add-on. The mockup has the iPad Join screen and seven
phone screens. A player joins with a code or a QR code, claims a seat, and
acts on their own turn.

This plan adds a sync service, shared games, and the companion screens.
The design uses the recommended option of each open decision. The plan
does not cover push notifications, game history, a visible sign-in, play
without a table device, or the removal of old shared games.

Decisions:

- 2026-10-23, Cal: asked for multiplayer "with login" and a game code or
  link for everyone. Cal proposed the Firebase Realtime Database.
- 2026-10-23: The join code has four characters, as the mockup shows. The
  alphabet has no look-alike characters. Alternative: six characters.
  Reason: the mockup goal is to join in seconds. A stranger who guesses a
  live code can tap in that game, and the table can undo the tap.
- 2026-10-23: The QR code holds the join link for the phone camera app.
  The app has no QR scanner, because every phone camera reads QR codes.

Open decisions, proposed on 2026-10-23, each with its recommended option:

1. Sync service. A: Firebase RTDB and Auth. B: Firestore. C: Cloudflare
   Durable Objects. Recommended: A.
2. Login. A: anonymous, with no screen. B: Google on every device. C:
   Google on the table device only. Recommended: A.
3. Shape. A: a table device and optional phone companions. B: remote play
   with no table device. Recommended: A.
4. Companion actions. A: own turn and own reaction tile. B: A, and own
   pick and vote. C: everything. Recommended: A.
5. Rules tests. A: none. B: emulator tests in CI. Recommended: B.
6. Smoke test. A: none. B: a scratch browser test. Recommended: B.
7. Rules deploy. A: by hand. B: from CI. Recommended: B.

Contract owners: `docs/product.md`, the new `docs/architecture.md`, the
mockup, the [README](../README.md), and [AGENTS.md](../AGENTS.md).

## Design

Terms:

- **Table device:** the iPad in the middle of the table, with the full app.
- **Companion:** a phone that joined a shared game. It acts for one seat.
- **Shared game:** a game that a table device published. A four-character
  **join code** finds it.
- **Revision:** a number in a shared game that goes up with each change.

### Components

- The app stays one static web app on Cloudflare, with a table view and a
  companion view. Each device runs the game model, a fold over the log.
- The Firebase Realtime Database (RTDB) holds each shared game. Its free
  Spark plan allows 100 connections at once. Firebase Auth gives each
  device an anonymous user id.
- The app loads Firebase only to share or join a game. Firebase adds about
  71 KB gzip to the 84 KB app. Evidence:
  `.context/multiplayer-live-sync/bundle-size.md`.

### Data in the sync service

```text
codes/{code}                      gameId, expiresAt
games/{gameId}/meta               version, startedAt, players, firstSpeakerId
games/{gameId}/closed             true after the table stops sharing
games/{gameId}/rev                the revision
games/{gameId}/log/{key}          one action
games/{gameId}/pauses/{key}       one pause
games/{gameId}/voids/{key}        one undone range
games/{gameId}/limits/{key}       one limits change
games/{gameId}/seats/{playerId}   the user id of the companion on that seat
games/{gameId}/presence/{uid}     online, lastSeen, role, seat
```

- `{key}` is `r` and the zero-padded revision of its change, for example
  `r000042`. The letter stops RTDB from returning the list as an array.
- RTDB stores no null values and no empty lists. The decoder reads a
  missing list as empty, and a pause with no end as a running pause.
- The game id is a random push id. Only a code entry leads to it.

### Write path

1. A tap becomes a change: an action, an undo, a pause, a resume, or a
   limits change.
2. The device runs the existing command on the newest shared game that it
   has. When the command returns the same game, the tap is rejected.
3. The device sends the difference as one multi-path update. The update
   also sets `rev` to the old value plus one.
4. The security rules accept the update only when `rev` goes up by exactly
   one. Of two updates from the same revision, one applies and one fails.
   A scratch check on the RTDB emulator confirmed this. Evidence:
   `.context/multiplayer-live-sync/rtdb-cas-check.md`.
5. After a failure, the device waits for the next snapshot and runs step 2
   again. Meanwhile, it shows its pending changes on top of the snapshot.

A retry is safe only when each action names its target. Today two devices
that send `turnEnded` end two turns. Milestone 3 adds the targets, so the
fold rejects a tap that another device already made.

### Clocks and offline play

- Each device adds its offset from the RTDB server clock to `Date.now()`.
  So all devices show the same clocks. Publishing moves every time in a
  solo game by the offset, so the running clock does not jump.
- Each device keeps the shared game, its pending changes, and the last
  offset in `localStorage`. The RTDB web SDK keeps its write queue in
  memory only.
- The table device works offline, as today. When the connection returns,
  its pending changes go out in order. The device drops a change that the
  fold now rejects, and shows a notice.

### Seats, presence, and codes

- A companion claims a seat with a transaction on `seats/{playerId}`. It
  can take over the seat of an offline device after a confirm.
- Each device writes its `presence` entry, and an `onDisconnect` write
  marks it offline. The Join screen shows each seat as connected, offline,
  or not joined.
- Any device can join with the code and become a table device. So a lost
  iPad does not lose the game.
- A code uses `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, and the join link is
  `/join/{code}`. A code expires seven days after its game last changed.

### Security rules

- Every read and write needs a signed-in user. A device can read one code
  entry or one game, but it cannot list them.
- A device creates a code entry only when the code is free or expired.
  It writes only its own `presence` entry.
- The first write of a game writes all of it. After that, `meta` does not
  change. Each later write under `log`, `pauses`, `voids`, or `limits` must
  step `rev` by one in the same update.
- The rules do not check the game rules. A changed client can add any
  action, and the table can undo it.

### Code layout

Pure logic goes in `src/model/` with unit tests. `src/sync/` is a thin
Firebase layer with no game logic. The companion screens go in
`src/ui/screens/phone/`, and the rules and their tests in `firebase/`.

## Milestone 1: Documentation and spec

State the requirements and the decisions for shared games. Add an
architecture doc for the new components.

- [ ] Update `docs/product.md`.
  - [ ] Move the phone companion and live sync into the scope. Keep push
        notifications as an add-on.
  - [ ] Add the requirements for sharing, joining, seats, companion
        actions, simultaneous taps, shared clocks, offline play, and codes.
  - [ ] Record the outcomes of decisions 2, 3, and 4 and the code format
        as decisions in force.
  - [ ] Update the data model sketch for actions that name their target.
- [ ] Add `docs/architecture.md`: the components and the flow of a tap.
      Record decision 1 and the rejected options.
- [ ] Update `README.md`: the features, the Firebase setup, the emulator,
      and the key code.
- [ ] Update `AGENTS.md`: the new commands, the rule that `src/sync/`
      holds no game logic, and the outcomes of decisions 5 and 7.

## Milestone 2: Mockups

Tags: mockup

Fill the gaps in the mockup before any screen work. It lacks the way to
the Join screen, the connection states, and most phone states.

- [ ] Table device: a Join button and a sync chip in the top bar. The chip
      shows live, reconnecting, or offline. "Allow phone companions" off
      hides the button.
- [ ] Join screen: Stop sharing, Release seat, and a row for each seat
      that shows connected, offline, or not joined.
- [ ] A notice on every device for a tap that another device made first.
- [ ] Phone Join: an unknown code, an expired code, and no connection. The
      QR card tells the player to use the phone camera.
- [ ] Phone Claim seat: take over the seat of an offline device after a
      confirm, and "Use this device as a table screen".
- [ ] Phone Waiting for the other phases, a reconnecting banner, and a
      screen for a game that is no longer shared.
- [ ] Update the mockup notes for the requirements of Milestone 1.

## Milestone 3: Actions that name their target

Make every action safe to retry on the state that another device made.
The stored game changes shape, so the storage keys move to version 2.

- [ ] Add `playerId` to `turnEnded`, `passed`, `strategyCardPlayed`, and
      `voteCast`, and the agenda number to `agendaResolved`. Replace
      `statusStepToggled` with `statusStepSet`. The fold rejects an action
      whose target does not match the state.
- [ ] Give `undo` the log length that it expects.
- [ ] Update the parser, and pass the new fields from `GameScreen.tsx`.
- [ ] Migrate a version 1 game on load. Replay its log, fill each new
      field from the state before the action, and save it under the
      version 2 key. MVP review finding 6 stays open for Cal.
- [ ] Unit-test each new rejection, the same tap from two devices, and the
      migration of a recorded version 1 game.

## Milestone 4: Shared-game model

Add the pure modules for shared games. Each has unit tests with fixed
times and a fixed random source.

- [ ] Remote codec: encode a game as RTDB paths with revision keys. Decode
      a snapshot as `unknown` through the parser.
- [ ] Change planner: from a change, a shared game, and the time, make one
      multi-path update with the revision step, or a rejection.
- [ ] Outbox: the pending changes in order, the game with them applied,
      and the next step after a write: done, retry, or drop with a notice.
- [ ] Clock shift: move every time in a game by an offset.
- [ ] Join codes: make a code, read typed input, and parse a join link.
- [ ] Companion views: who acts now and their clock, the turns before
      mine, my totals and card, my reaction tile, and my game stats.

## Milestone 5: Firebase project and rules

Add the Firebase configuration, the security rules, and the emulator.

- [ ] Cal: create the Firebase project on the free Spark plan, with the
      RTDB location nearest the players. Turn on anonymous sign-in, add
      the site domain to the authorized domains, and send the web config.
- [ ] Add `firebase-tools`, `firebase.json`, `.firebaserc`, and the rules.
      Add `npm run dev:sync`, which runs Vite and the emulator.
- [ ] Decision 5: test the rules with `@firebase/rules-unit-testing` in a
      separate Vitest config. Cover the revision step, two writes from one
      revision, code reservation and expiry, presence, and listing.
- [ ] Decision 7: deploy the rules from CI after the Cloudflare deploy.
      Stop with a clear error when the secret is missing.
- [ ] Add the public web config. A build without it hides sharing.

## Milestone 6: Sync client

Connect the model to Firebase. No screen uses the client yet.

- [ ] Load Firebase with a dynamic import. Sign in anonymously. Track the
      clock offset and the connection state.
- [ ] Publish: shift the game to server time, reserve a code, and write
      the game. Open a shared game by code, and decode each snapshot.
- [ ] Send the outbox through the change planner. Retry after a revision
      conflict. Keep the outbox in `localStorage`.
- [ ] Write presence with `onDisconnect`. Claim, release, and take over
      seats with transactions.
- [ ] Renew the code expiry. Stop sharing: delete the code entry and set
      `closed`. The table device keeps the game as a solo game.
- [ ] Scratch check, not committed: two Node clients against the emulator
      send the same tap at once, and exactly one applies.

## Milestone 7: Table device screens

Tags: ui

Build the table device parts of the mockup.

- [ ] Add the Join button and the sync chip to the top bar.
- [ ] Build the Join screen: the QR code, the code, the link, the seat
      rows, Stop sharing, and Release seat.
- [ ] Connect the "Allow phone companions" setting.
- [ ] Show the notice for a dropped tap.
- [ ] Open the table view on a device that joins as a table screen.
- [ ] Use the shared clock on every screen of a shared game.

## Milestone 8: Companion screens

Tags: ui

Build the companion screens of the mockup.

- [ ] Add a phone stage of 393 by 852, scaled to fit, for the join route.
- [ ] Build Join, Claim seat, Waiting, Your turn, Reaction window, Pass
      confirmation, and Personal stats.
- [ ] Add the reconnecting banner, the error states, and the screen for a
      game that is no longer shared.

## Milestone 9: Verification, commit, and review

Run the checks, push, and review the branch.

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Decision 6: in headless Chrome, play one round with a table device
      and two companions against the emulator. Commit nothing.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.

## Post-merge follow-up (non-blocking)

- [ ] Check the deploys on `main`, then play one round on the live site
      with the iPad and two phones.
- [ ] Write a plan to remove old games from the sync service.
- [ ] Consider Firebase App Check against scripted abuse.
