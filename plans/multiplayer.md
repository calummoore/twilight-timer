# Multiplayer

Status: Active. The work is on branch `calummoore/multiplayer-system-design`, with no
pull request yet. The plan closes when its pull request merges.

TI4 Tempo runs a Twilight Imperium game on one device. The game is an
append-only log of taps in `localStorage`, and every screen folds that log.
This change puts the game on the server, in one Cloudflare Durable Object
per join code, so that every device at the table shows the same game and
each player can tap for their own seat from their own phone. The object runs
the same model code as the app, so the fold, the clocks, undo, and the
pauses do not change. The spec page
[Multiplayer](../docs/product/multiplayer.md) holds the requirements and the
decisions in force.

The change does not cover remote play, a lobby where each player fills their
own seat, a spectator mode, or push notifications.

Decisions, all on 2026-10-26 by Cal, from the discussion of that day:

- Decision 1 = A: every game lives in a Durable Object, and `localStorage`
  keeps only the device token, the current and recent codes, and the device
  settings. Alternative: B, keep a local game as well behind one store
  interface. Reason: one path is simpler, and a lost connection only delays
  a tap, which the game clock records truthfully.
- Decision 2 = A: setup stays on one device, and Begin game creates the
  object and the code. Devices join and claim seats after that, also
  mid-game. Alternatives: B, reserve the code when New game opens, with a
  waiting screen for early joiners; C, a lobby where each device fills its
  own seat. Reason: A is the smallest, joining takes seconds, and B or C
  can follow without rework, because the claim screen stays as the mid-game
  join path.
- Decision 3 = C: an admin code, shown only on admin devices, which Join as
  table asks for. Alternatives: A, trust the join code; B, an approval by
  an admin. Reason: a stranger with the join code cannot act for every
  player, and no admin has to be awake to approve. Superseded the same day
  by the admin decision below.
- Decision 4 = A: a seated device taps only for its own seat, when the game
  waits for that player. Alternative: B, also the shared taps such as the
  status checklist. Reason: it matches "act when it is their turn", and an
  admin device is always in the game.
- Decision 5 = A: undo stays with admins. Alternative: B, also a seated
  device when it sent the last action. Reason: undo takes time back from
  the next player's clock, so it stays a table correction.
- Decision 6 = B: keep a QR code of the join link, with a dependency. The
  option also drops the separate phone companion screens, which player mode
  replaces, and the per-player push. Alternative: A, drop the QR code too
  and show only the code and the link.
- Decision 7 = A: keep every game. Alternative: B, delete a game 30 days
  after its last change. Reason: a game is about 50 KB, and a code must not
  be reused.

Decisions of 2026-10-26 by Cal, from the lobby discussion of that day:

- Lobby decision 1 = B: Create game puts the seats on the server and opens
  Players & devices as the lobby. Start game, on an admin device, begins
  the strategy phase, so no clock runs while the phones join. Alternatives:
  A, start the game at Begin and let the host pause; C, a pause that opens
  with the lobby. Reason: the host and the phones look at the same screen
  while everyone joins, and nothing is timed before Start.
- Lobby decision 2 = A: the host still types every name and faction before
  anyone joins. Alternative: B, a phone edits its own seat in the lobby.
  Cal: "for now, later we can add allowing joining players to add/change
  their faction or colour". Not in this change.
- Lobby decision 3 = B: the screen is "Players & devices", not "Join",
  because the device joins on the claim screen. Alternative: C, "Invite".

Decision of 2026-10-26 by Cal, from the admin code discussion of that day:

- Admin decision 1 = B: no admin code. A seated device asks for admin on
  its own row, a device on the claim screen asks to join as a table device,
  and an admin device approves or dismisses the request on that row. A
  pending table device watches until it is approved. The chip in the top
  bar counts the open requests on admin devices. Alternatives: A, the admin
  code behind a tap; C, trust the join code. Reason, from Cal: the admin
  code is on the table for everyone to read, so approval by the existing
  admins is the real check. Superseded the same day by admin decision 2.
- Admin decision 2, 2026-10-26, Cal, after the mockup of the requests
  looked messy: no admin request. Join as table device is instant and
  makes the device an admin, and a seated device gets admin only with the
  admin switch of an existing admin, on the Players & devices screen.
  Alternative: keep the requests. Reason: one switch does the job, and the
  rows stay clean.
- Admin decision 3, 2026-10-26, Cal: a device that joins as a table device
  is a viewer, with no seat and no admin, and an admin gives it admin with
  the same switch as a seated device. Alternative: a table device that is
  always an admin, from admin decision 2. Reason: one switch for every
  device, and a new table device gets no rights without a check.

Design decisions of the same day, from the implementation side:

- The object is authoritative. It stores the same game JSON that
  `localStorage` stores today, plus the devices and a revision counter. A
  device sends a command, the object checks the device's rights, calls the
  model with its own clock, saves, and broadcasts the whole game to every
  socket. Rejected: a relay that stores whatever a device sends, because
  two devices would overwrite each other, and rights could not be enforced.
- Each command names the revision that the device saw. A command with an
  old revision is rejected, and the device re-renders. This gives the
  "first tap applies" rule of the spec.
- Each state message carries the server time. A device keeps the offset to
  its own clock and derives every running clock from the server time.
- One WebSocket per device, with the WebSocket Hibernation API, so idle
  sockets cost nothing during a six-hour game. The object stores its data
  with the SQLite storage backend, which the Workers Free plan allows.
- The pure parts live in `src/model/`, so the Vitest rule of `AGENTS.md`
  holds: the codes, the devices and the last-admin rule, the permission
  rules, the message parsing, and the room reducer. The object class and
  the routes are thin and live in `worker/`.
- `@cloudflare/vite-plugin` runs the Worker and the object inside
  `npm run dev`, and the build writes the Worker next to the client. Deploy
  and the pull request previews use the built configuration. Workers
  Previews create a separate object namespace for each preview, per the
  Cloudflare docs.
- `qrcode.react` draws the QR code as SVG, with no other dependency.

Contract owners:

- The [product spec](../docs/product.md), with its page
  [Multiplayer](../docs/product/multiplayer.md).
- The [mockup](../docs/mockups/index.html).
- The [workspace README](../README.md) and `AGENTS.md`.

## Design

Components:

- **Worker routes**: create a game from the setup result or from a saved
  game, look a code up, and open the WebSocket of a game. Everything else
  is static assets.
- **Game object**: one Durable Object per join code. It holds the room:
  the join code, the admin code, the seats and the settings from Create
  game, the game from Start game, the devices, and the revision. It applies
  commands with the model, saves, and broadcasts.
- **Game client**: the hook in the app that owns the socket, the
  reconnect, the server time offset, and the revision. The screens get the
  game, the device's rights, and a dispatch function, as they get them
  from the local store today.

Messages, from the device: hello with the device token, claim a seat or
the table, set the admin flag of a device, start the game, and a game
command with the revision: an action input, undo, pause, resume, the
pause reason, or the time limits. From the object: the state, with the
revision, the server time, the game, the devices with their connection
state, and the rights of this device; and a rejection with a reason.

Rights: a device has a seat or none, and an admin flag. A device without
a seat is a table device: with admin it acts for every player, and without
admin it is a viewer that may only take a seat. A device that has not
joined sees the claim screen. A seat holder that loses its seat becomes a
table device with its admin unchanged. The last admin cannot lose admin. The permission module takes the derived
view, the device, and a command, and says whether the command is allowed.
The object and the screens call the same function.

Storage: the room is one JSON value with its own version. The game inside
keeps the saved-game versions, so the parser reads a game that an older
build saved and a device uploads. `localStorage` keeps the device token,
the current code, the recent codes with a short summary, and the device
settings.

## Milestone 1: Documentation and spec

State the requirements and the decisions before the mockups and the code.

- [x] Add `docs/product/multiplayer.md`: the game on the server, codes,
      devices and modes, who may tap what, settings, and screens.
- [x] Update `docs/product.md`: every device shows the same screens, the
      Home, Claim seat, and Join screens, the multiplayer requirements, and
      remote play as a non-goal. Remove the phone companion section.

## Milestone 2: Mockups

Tags: mockup

Draw the new screens and the player-mode states in the iPad, the upright
iPad, and the phone frame, in the same style as the table screens.

- [x] Home: New game, Join game with the code field, and Recent games.
      The recent games replace the Load last game button of the setup
      screen, so that button is gone.
- [x] Claim seat: the seats with their holders, and the admin code field
      for Join as table.
- [x] Join: replace the companion Join screen. The join code, the link, the
      QR code, the admin code on an admin device, and one row per seat with
      the device that holds it, its admin switch, and its connection state,
      then the table devices.
- [x] The top bar chip with the device's seat or Table, also in the compact
      phone bar. On the compact bar the speaker chip shows the star and the
      name only, so that both chips fit on one line.
- [x] Action phase on a seated device that waits: End Turn disabled and
      naming the active player, and the reaction window with only the
      device's own tile enabled.
- [x] Settings in two groups: Game, for admins, and This device.
- [x] The reconnecting state.
- [x] Remove the seven companion phone screens, their catalogue section, and
      the "Allow phone companions" settings row. Player mode replaces them,
      as decision 6 says. Their styles went with them, and the shell lost
      its per-screen frame field, because every screen now draws in every
      frame.
- [x] Screenshot every new or changed screen in every frame. Evidence:
      `.context/multiplayer/mockups/`, with `shoot.log`: 31 screens in
      three frames, no script error, and no sideways overflow.
- The new screens, the chip, and the settings groups carry the Later mark
  until the UI milestones build them.

## Milestone 3: Lobby mockups

Tags: mockup

Draw the lobby of the lobby decisions, and rename the Join screen.

- [x] Rename the Join screen to Players & devices in the mockup, the chip
      note, the Home help, and the claim help.
- [x] Setup ends with Create game, not Begin game.
- [x] The lobby: Players & devices before Start game, on the host's iPad
      with Start game and Settings, and on a seated phone with the waiting
      line and no admin code.
- [x] Screenshot the new and changed screens in every frame. Evidence:
      `.context/multiplayer/mockups/`, with `shoot.log`: 33 screens in
      three frames, no script error, and no sideways overflow.

## Milestone 4: Admin request mockups

Tags: mockup

Draw the admin decision: no admin code, requests with inline approval, and
the pending device.

- [x] Remove the admin code from the Players & devices screen, the lobby,
      and the claim screen. The claim screen asks to join as a table device.
- [x] A request on its row: Ask for admin on the device's own row, Approve
      and Dismiss on admin devices, and the request as text on the others.
      A pending table device in the lobby.
- [x] The chip counts the open requests on admin devices, and reads Pending
      on a pending device.
- [x] The pending device: the action phase with every control disabled and
      the waiting bar.
- [x] Screenshot the new and changed screens in every frame. Evidence:
      `.context/multiplayer/mockups/`, with `shoot.log`: 34 screens in
      three frames, no script error, and no sideways overflow.

## Milestone 5: Admin switch mockups

Tags: mockup

Draw admin decision 2: no requests, no pending device, and Join as table
device at once.

- [x] Remove the requests, the pending device screen, the Pending chip, and
      the badge from the mockup. The claim screen joins as a table device
      at once. A seated device without admin sees the admin states as text.
- [x] Screenshot the changed screens in every frame. Evidence:
      `.context/multiplayer/mockups/`, with `shoot.log`: 33 screens in
      three frames, no script error, and no sideways overflow.

## Milestone 6: Viewer mockups

Tags: mockup

Draw admin decision 3: a new table device is a viewer, with the same admin
switch as a seated device.

- [x] The table device rows get the admin switch. A viewer row in the lobby
      and in the game. The claim screen says that a table device joins as a
      viewer.
- [x] The chip reads Viewer on a table device without admin, and the action
      phase on a viewer has every control disabled.
- [x] Screenshot the changed screens in every frame. Evidence:
      `.context/multiplayer/mockups/`, with `shoot.log`: 34 screens in
      three frames, no script error, and no sideways overflow.

## Milestone 7: Server

Add the Worker, the object, and the pure model modules. The app still runs
from `localStorage` at the end of this milestone.

- [ ] Add to `src/model/`, each with tests: the join code, the devices with
      the last-admin rule and the seat takeover, the permission rules of the
      spec table, the message parser, and the room reducer that applies a
      message to a room.
- [ ] Add `worker/`: the routes and the game object with the WebSocket
      Hibernation API and SQLite storage.
- [ ] Configure `wrangler.jsonc`: the Worker entry, the object binding and
      its migration, the routes that the Worker serves first, and the
      previews block with the object binding.
- [ ] Add `@cloudflare/vite-plugin`, a tsconfig for `worker/`, and the
      generated runtime types. Keep the Vitest config apart from the plugin.
- [ ] Point the deploy script and the CI preview and deploy steps at the
      built configuration.
- [ ] Update `README.md` and `AGENTS.md`: the deploy, the dev server, the
      key code, and the storage rule, which now covers the room version and
      the game versions inside it.
- [ ] Smoke test: start the dev server, create a game with the API, and
      open its socket. Evidence: `.context/multiplayer/server/`.

## Milestone 8: Shared table

Tags: ui

Put the game on the server, with every device as a table device. Player
mode comes in the next milestone.

- [ ] Home screen, with New game, Join game, and Recent games. Create game
      puts the seats on the server, and the device joins as a table device.
- [ ] The lobby on the Players & devices screen, and Start game on an admin
      device. No clock runs before Start.
- [ ] Join by code or by the `/join/<code>` link, as a table device. The
      new device is a viewer, and the first device gives it admin.
- [ ] The game client hook: the socket, the reconnect, the revision, and the
      server time offset. The reconnecting state disables the controls.
- [ ] The Players & devices screen: the code, the link, the QR code, the
      seats, and the devices. The top bar chip opens it.
- [ ] Recent games, Leave game, and Continue on the server for a game that
      an older build saved on the device.
- [ ] Settings in two groups. Time limits go through the object.
- [ ] Port the mockup styles of the Home, Claim seat, and Players & devices
      screens, the top bar chips, and the reconnecting bar to
      `src/styles/mockup/`, and remove their Later marks in the mockup.
- [ ] Stop saving the game in `localStorage`. Keep the parser for the
      upload of an older game.
- [ ] Smoke test on the dev server: two windows, one creates and one joins
      as table, and taps show on both. Evidence: `.context/multiplayer/app/`.

## Milestone 9: Player mode

Tags: ui

Seats, rights, and the disabled controls.

- [ ] The claim screen, and seat changes on the Players & devices screen.
- [ ] Gate every control with the permission module, and name the player
      that a disabled main control waits for: the strategy, action,
      reaction, status, agenda, summary, seating, settings, and stats
      screens, and the top bar.
- [ ] Admin switches for seated and table devices on the Players & devices
      screen, never taking admin from the last admin. The viewer state.
- [ ] Remove the Later marks of the seated screens in the mockup.
- [ ] Smoke test on the dev server: three windows, one table and two seats.
      A seated device ends its own turn and cannot end another's, and the
      admin toggles work. Evidence: `.context/multiplayer/app/`.

## Milestone 10: Verification, commit, and review

Run the checks, push, and review the branch.

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.

## Post-merge follow-up (non-blocking)

- [ ] Smoke test production at `https://ti4.nexus` with an iPad and two
      phones: create, scan the QR code, claim seats, end turns.
- [ ] Check that the pull request preview got its own object namespace, and
      that the futex account plan allows the object.
