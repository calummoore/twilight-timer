# Multiplayer: live sync and device roles

Status: Active. Draft on the branch `calummoore/firebase-multiplayer-plan`.
No milestone starts before Cal answers the open decisions.

TI4 Tempo runs on one iPad, and each game lives only in the browser storage
of that iPad. Cal wants multiplayer: the table shares a game, and each
player joins it with a short code or a link. The spec designs this as the
phone companion add-on, and the mockup has its iPad Join screen and seven
phone screens.

This plan adds the sync service, shared games, and two device roles. The
[multiplayer screens](multiplayer-screens.md) plan builds the screens on
top of it. This plan prepares for private player data, but it builds no
private feature. The design uses the recommended option of each open
decision. The plan does not cover push notifications, game history, a
visible sign-in, play without a table device, or the removal of old shared
games. It starts after the [retry-safe actions](retry-safe-actions.md)
plan merges.

Decisions:

- 2026-10-23, Cal: asked for multiplayer "with login" and a game code or
  link for everyone. Cal proposed the Firebase Realtime Database.
- 2026-10-25, Cal: decision 21 is B. Prepare for player mode and table
  mode now, but build no private feature yet. Alternatives: A, add roles
  later, and C, build full player mode now. Reason: roles and private data
  change the protocol, the stored data, and the security model. That is
  cheaper before the first release.
- 2026-10-25: The multiplayer work has three plans, with one pull request
  each: retry-safe actions, this plan, and multiplayer screens. Reason: one
  plan for all of it passed 300 lines, and smaller pull requests are easier
  to review.

Open decisions, proposed on 2026-10-23, each with its recommended option.
They follow the plan review findings 1 to 8. Milestone 5 lists the open
findings of this plan. Decision 14 is in the multiplayer screens plan, and
decision 16 is in the retry-safe actions plan.

9. Sync service. A: Firebase RTDB and Auth. B: Firestore. C: Cloudflare
   Durable Objects. D: Convex. E: the table iPad as host. Recommended: C.
   On 2026-10-25 the recommendation moved from A to C, after a closer look
   at races, roles, and private data.
10. Sign-in. A: a device id with no screen. B: Google on every device. C:
    Google on the table device only. Recommended: A.
11. Shape. A: a table device and optional player devices. B: remote play
    with no table device. Recommended: A.
12. Player mode in the first release. A: own turn and own reaction tile.
    B: A, and own pick and vote. C: every action. Recommended: A.
13. Server tests. A: model tests only. B: also Durable Object tests in CI.
    Recommended: B.
15. Rules deploy, only for option A of decision 9. A: by hand. B: from
    CI. Recommended: B.

Contract owners: `docs/product.md`, the new `docs/architecture.md`, the
[README](../README.md), and [AGENTS.md](../AGENTS.md).

## Design

The design follows option C of decision 9. The last section says what
changes with option A.

Terms:

- **Table mode:** a device role that can do every action, as the iPad does
  today. It never gets private player data.
- **Player mode:** a device role that acts only for its own seat. It sees
  the public game and the private data of that seat.
- **Join code:** four characters that open player mode for a shared game.
  The join link and the QR code hold the same code.
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
- The object runs pure model functions from `src/model/`. They check the
  role, apply the change, and build each view. Devices run the same
  functions for instant feedback.
- `partyserver` runs the object with WebSocket hibernation, so an idle
  game costs no duration. Devices connect with `partysocket`, which
  reconnects with backoff.
- A game is small. A simulated 14-hour game with 8 players had 1,391 taps
  and 72 KB of JSON. Evidence: `.context/game-size/result.txt`.

### Changes and their order

1. A tap becomes a change. It carries a tap id, the tap time, and the
   target that the retry-safe actions plan adds.
2. The device applies the change to its own copy at once, and marks it
   pending.
3. The object takes one change at a time. It checks the role of the
   sender, then runs the model on the newest game. A tap id that it has
   seen gets its first answer again.
4. The object keeps the tap time between the last action and its own
   clock. It stores the change and then sends it to every device. The
   object storage confirms the write before any message leaves.
5. The sender drops its pending copy when the change comes back. When the
   object rejects the change, the device shows a notice.

Two devices that send the same tap at once cannot both apply it. The
second tap names a target that no longer runs, so the model rejects it.

### Roles, views, and private data

- The device that shares a game gets table mode. Another device gets table
  mode only through the table link, which a table device shows on request.
  The join code gives player mode.
- A player device may send only changes for its own seat. Decision 12 sets
  which changes. The object rejects all other changes.
- The object sends each device its view. Table mode never gets private
  data, because the table iPad is a public screen.
- The view and the stored game have a private part for each seat. This
  release leaves it empty, so that private comments and a pre-selected
  card can come later with no protocol change. The object will hold such
  data, and it will apply a pre-selected card when that pick comes up.
- A free seat goes to the first device that claims it. A held seat moves
  only when a table device approves the request or releases the seat.

### Clocks and offline play

- The object's clock is the one clock. Each message from the object
  carries its time, so each device keeps an estimate of its offset.
- Each stored game marks its time base: device or server. One helper gives
  `now` from that mark. Sharing moves a solo game to server time, so the
  running clock does not jump. Stop sharing needs no shift.
- Each device keeps the game, its pending changes, and the last offset in
  `localStorage`, so a reload restores them.
- The table device works offline, as today. When the connection returns,
  it sends its pending changes in order. The object rejects those that are
  no longer legal, and the device shows a notice.

### Seats, presence, codes, and links

- The object knows which devices are connected, so presence needs no
  extra writes. The Join screen shows each seat as connected, offline, or
  not joined, and it lists seat move requests.
- Each device keeps a random device id and secret. A seat belongs to a
  device id. Any device can join with the table link and become a table
  device, so a lost iPad does not lose the game.
- A code has four characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, as the
  mockup shows. The join link is `/join/{code}`. The table link adds the
  secret.
- Sharing picks a random code. The object of that code refuses it while a
  live game holds it, and the device tries another. A code expires seven
  days after its game last changed.
- The Worker limits how fast one address can try codes. A code holder can
  act only for a free seat, and the table can undo that.

### If decision 9 picks option A

- The RTDB design of commit `3064b5a` comes back: revision-checked writes,
  the RTDB data paths, and the security rules. Decisions 13 and 15 and
  finding 6 then apply as first written.
- The rules then add role checks, a private path for each seat, and a
  hidden table secret.
- A pre-selected card then needs the owner's phone online at the pick, or
  Cloud Functions on the paid Blaze plan.

## Milestone 1: Documentation and spec

State the requirements and the decisions for shared games and device
roles. Add an architecture doc for the new components.

- [ ] Update `docs/product.md`.
  - [ ] Move the phone companion and live sync into the scope, as player
        mode and table mode. Keep push notifications as an add-on.
  - [ ] Add the requirements for sharing, the join code, the table link,
        roles, views, seats, and seat moves.
  - [ ] Add the requirements for simultaneous taps, the one clock, offline
        play on the table device, and the code lifetime.
  - [ ] State that table mode never gets private data. List private
        comments and a pre-selected card as later features.
  - [ ] Record decisions 10, 11, 12, and 21 and the code format as
        decisions in force.
- [ ] Add `docs/architecture.md`: the components, the flow of a change,
      and the roles. Record decision 9 and the rejected options.
- [ ] Update `README.md`: the sync service, local development, and the key
      code.
- [ ] Update `AGENTS.md`: the new commands, the rule that server logic is
      pure model code, and the outcome of decision 13.

## Milestone 2: Shared-game model

Add the pure model functions for shared games. Each has unit tests with
fixed times and a fixed random source.

- [ ] Apply a change: check the role, run the model, and stamp the time. A
      repeated tap id gets its first answer.
- [ ] Roles: table mode may send every change. Player mode may send the
      changes of decision 12, for its own seat only.
- [ ] Views: the public game for every device, plus the private part of
      its seat for player mode. Test that a table view never holds private
      data.
- [ ] Outbox: the pending changes in order, the game with them applied,
      and the next step after an answer: done, or drop with a notice.
- [ ] Time base: move a game to server time, and give `now` for a game
      from its time base. The mark is a new stored version with its own
      migration step, which reads a game without the mark as device time.
- [ ] A limits change names one timer or the master switch, and applies to
      the newest limits of the game.
- [ ] Codes and links: make a code and a table secret, read typed input,
      and parse both links.

## Milestone 3: Sync server

Add the Worker and the Durable Object. No screen uses them yet.

- [ ] Add `partyserver`. Add the Worker entry, the Durable Object binding,
      and its SQLite migration to `wrangler.jsonc`. Keep the static files.
- [ ] Add the Cloudflare Vite plugin, so that `npm run dev` runs the Worker
      and the object locally.
- [ ] The object loads the game on start, applies changes with the model,
      stores each change, and sends each connection its view.
- [ ] The object tracks connections for presence, seats, move requests,
      the code and its expiry, and the table secret.
- [ ] The Worker routes a code to its object and limits code tries per
      address.
- [ ] Decision 13: test the object with `@cloudflare/vitest-pool-workers`.
- [ ] Scratch check, not committed: two clients send the same tap at once
      to the local object, and exactly one applies.

## Milestone 4: Sync client

Connect the app to the sync server. No screen uses the client yet.

- [ ] Connect with `partysocket` with the device id and secret. Keep the
      clock offset and the connection state.
- [ ] Publish: shift the game to server time, reserve a code, and upload
      the game. Stop sharing keeps the game on the table device.
- [ ] Send the outbox in order, and keep it in `localStorage`.
- [ ] Claim a seat, request a seat move, and join with the table link.

## Milestone 5: Verification, commit, and review

Run the checks, push, and review the branch.

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.
  - Plan review 1 of dbde952 found 8 findings. Fixed: 2, 3, 4, 5, and 7. Finding 1 got option A and stays open. The fixes of findings 2 and 5 moved to `plans/retry-safe-actions.md`. Report: `.context/multiplayer-live-sync/review-1.md`.
  - Plan review 2 of 97fb703 found 4 findings, 17 to 20. Fixed: 17, 18, and 19, and the rest of 3 and 4. Report: `.context/multiplayer-live-sync/review-2.md`.
  - Finding 8, the follow-up for finding 3, and the mockup problem outside the scope moved to `plans/multiplayer-screens.md`.
  - 1. A code holder can erase the game. Severity High, effort Small. Recommended: close it, because decision 21 covers it: the join code opens player mode only, and table mode needs the table link.
  - 6. CI steps for the rules are missing. Severity Low, effort Small. Recommended: A, a CI test step, the rules deploy first, and Cal's credential. It applies only if decision 9 picks A.
  - 20. Finding 1 line cites an unrecorded option. Severity Low, effort Small. Recommended: A, record option D in the review report.

## Post-merge follow-up (non-blocking)

- [ ] Check that the deploy on `main` passed with the Worker and the
      Durable Object.
- [ ] Write a plan to remove old games from the sync service.
- [ ] Write a plan for private comments and a pre-selected card, the
      features that decision 21 prepares.
