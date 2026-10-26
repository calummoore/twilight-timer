# Seat re-ordering by drag and drop

Status: Active. On branch `conductor/seat-re-ordering-drag-and-drop`, no
pull request yet. The plan closes when its PR merges. Cal and an agent
wrote the draft of this plan in the `skills` workspace during the design
discussion of 2026-10-26, on `origin/main` at `ed4b3ad`. Main had not
moved when this branch started.

Setup sets the seat ring of TI4 Nexus once, with ▲ and ▼ buttons, and no
screen changes it after that. The spec cut seat re-ordering after setup from
the MVP, and the mockup shows a `⠿ Re-order seats` button marked Later on
the Speaker & Seating screen. This change lets an admin device move a seat
to another place on the ring, with an iOS-style long press or with that
button. The seats between shift by one into the gap. It also lets setup
rows drag by a ⠿ handle. Each move on the ring is a logged tap, so Undo
takes it back, and the saved game moves to version 7. The
change keeps the speaker rules, the initiative order, and the tiles of an
open reaction window.

Decisions:

- 2026-10-26, Cal: decision 1, option E. A long press of about 500 ms on a
  seat starts re-order mode, as on the iOS home screen. Every seat shakes,
  and the held seat follows the finger at once. The `Re-order seats` button
  also starts the mode. Done or a tap outside the seats ends it.
  Alternatives: A, drag always on, B, the button only, C, a seat list with
  handles, and D, the long press only. Reason: the long press feels natural
  on the iPad and keeps a plain tap for the speaker token. The button keeps
  the mode easy to find, also from a keyboard.
- 2026-10-26, Cal: decision 2, option A. A drop on another seat swaps the
  two players. A tap on one seat and then on another does the same. While
  the finger is over a seat, that seat slides into the place that the held
  seat left. Alternative: B, a move in which the seats between slide by one,
  as iOS icons do. Reason: it matches the colour and faction swaps of setup,
  needs no preview, and gives a tap alternative at no cost.
- 2026-10-26, Cal: decision 3, option A. Each drop is one logged tap that
  applies at once on every device. Undo takes back one drop, and Done only
  ends the mode. Alternative: B, a draft that Save applies as one tap.
  Reason: one rule for every tap. Both options charge the seconds of the
  fix to some player.
- 2026-10-26, Cal: decision 4, option B. Setup rows also drag, by a ⠿
  handle, so that the name field still takes text. Alternative: A, keep
  only ▲ and ▼.
- 2026-10-26, Cal: decision 5, option A. A new twilight-timer workspace
  gets this draft and builds the change. Alternatives: B, Cal starts that
  workspace, and C, the `~/twilight-timer` clone, worked from the `skills`
  workspace. Reason: Conductor shows the diff and the pull request of the
  workspace's own repository.
- Readings of decisions 2 and 4. Cal saw them but has not confirmed them:
  setup follows decision 2A, so a drop on another row swaps the two rows.
  The speaker star stays with its player, as ▲ and ▼ do now. The setup
  handle starts the drag at once, because the handle has no other action.
  ▲ and ▼ stay as the tap and keyboard alternative. Their removal needs
  Cal's approval. Cal answered on 2026-10-26, in the next two entries.
- 2026-10-26, Cal, after a try of the swap on a running build: decision 2
  changes to option B. "It should shuffle everything along so it fits in
  the gap, not swap with the original dragged item." A drop moves the held
  seat into the place of the seat under the finger, and the seats between
  shift one place toward the gap. Alternative: A, the swap, which this
  supersedes. Reason: the swap felt wrong in use.
- 2026-10-26, Cal: the setup screen also drags its rows by a ⠿ handle. "I
  thought this page would also use drag to re-order with a drag handle?" A
  drop moves the held row, and the rows between shift by one, as decision
  2B says for the ring. Cal did not change the other two readings, so the
  agent builds them as the draft states: the speaker star stays with its
  player, the handle drags at once, and ▲ and ▼ stay.
- The agent's reading of decision 2B on a ring, which Cal has not seen: the
  seats shift along the shorter way round the table, or clockwise when both
  ways are as long. A move along the seat numbers would shift every other
  seat for a move between the last seat and seat 1, which are neighbours.

Other branches that touch this change, read on 2026-10-26:

- [PR #28](https://github.com/calummoore/twilight-timer/pull/28), admin
  recovery, merged on 2026-10-26, and this branch merged it. Its wider
  rights table and its device rows stay. A seated device that takes admin
  while every admin device is away may swap seats, as it may do every
  admin tap.
- [PR #30](https://github.com/calummoore/twilight-timer/pull/30), the
  version handling, merged on 2026-10-26, and this branch merged it. A page
  of another build now reloads by itself, so the deploy of this change
  reloads every open game page. PR #30 also committed the version 6
  fixture, `src/model/fixtures/game-v6.json`, from the build before this
  bump. This branch keeps that fixture in place of its own capture.
- [PR #29](https://github.com/calummoore/twilight-timer/pull/29), the
  retirement of the games saved before the server, merged on 2026-10-26,
  and this branch merged it. PR #29 retired the upgrade steps of game
  versions 1 to 5. This branch gives the upgrade chain of the game parser
  one step, from version 6 to 7, so the game `78JVZ7` and every other
  stored game still load.

Contract owners:

- The product spec: `docs/product.md`, `docs/product/rounds.md`,
  `docs/product/clocks.md`, and `docs/product/multiplayer.md`.
- The mockup at `docs/mockups/index.html`.
- The [README](../README.md).

## Design

### Model

- New action `{ kind: 'seatMoved'; playerId: string; toId: string }`. The
  player moves into the seat of `toId`. It replaces the action
  `seatsSwapped` of decision 2A, which no build on `main` or a preview
  wrote.
- A model helper in `orders.ts` moves a player in the ring: the seated
  players between shift one seat toward the gap, along the shorter way
  round the table, or clockwise when both ways are as long. The empty seats
  of players who left keep their places. The fold and the screens share
  it.
- `FoldState` gets `ring`: every player id, also of players who left, in
  clockwise order. It starts as `game.players`. `seats` stays the seated
  players, in ring order.
- The fold rejects a move when a player left or is unknown, when the two
  ids are equal, and after the game ends. A pause already blocks every tap.
- After a move, the fold calls `followOrder`, as a speaker move does. When
  the picker or the voter changes, their clock stops and the clock of the
  new player starts. Earlier picks and entries stay as they are.
- The ring changes from the tap on. Rejected: a rewrite of `game.players`,
  because the fold would then reject earlier picks, which it checks against
  the pick order.
- An open reaction window keeps its tiles, because it took its players when
  it opened.
- `removePlayer` keeps using `seats`, so a speaker who leaves passes the
  token to their new left neighbour.
- `GameView.players` follows the ring. The ring, the seat number of the
  Action screen, the Remove a player dialog, and the player choices of the
  strategy screen then follow it with no change of their own.
- A model helper gives the ring of a running game as players, for the claim
  screen and Players & devices. Before Start game, both keep
  `setup.players`.
- Rights: only an admin device may move seats. `mayActFor` already refuses
  an unlisted kind to a seated device. A test pins this.
- Saved game version 7. `parseActionInput` reads `seatMoved`. The
  upgrade chain of the game parser gets the step from version 6 to 7, with
  no other change, because the two have the same shape. `startGame` writes
  version 7. The room version stays 2. No `localStorage` key changes,
  because the app no longer saves a game on the device.
- The version 6 fixture of PR #30 is the fixture of this bump. A test reads
  it as version 7 with no other change, and the tests of PR #30 check its
  clocks.

### Speaker & Seating screen

- The ring moves to its own component, `SeatRing.tsx`, because
  `SeatingScreen.tsx` already has 177 lines.
- A shared hook, `src/ui/useDragReorder.ts`, follows the pointer and finds
  the target under it. Each target has a `data-drag-id` attribute. The hook
  measures the targets when the drag starts and hit-tests the pointer
  against those places, because the seats slide away from under the finger.
  The screen tells the hook where each item moves for a target, so the ring
  and the setup list share it. The ring passes a hold time of 500 ms. Setup
  passes no hold time.
- The long press on the ring:
  - A move of more than about 8 px before 500 ms cancels the hold, so a
    scroll or a careless tap stays normal.
  - A release before 500 ms is a tap, and it moves the speaker token, as
    now.
  - At 500 ms, re-order mode starts, and the held seat follows the finger.
    The release after the hold does not count as a tap.
  - A non-passive `touchmove` listener blocks the page scroll while a seat
    is held. iOS Safari does not apply a `touch-action` change during a
    touch.
  - The seats turn off text selection, the iOS touch callout, and the
    context menu.
  - Fallback if iOS Safari is not reliable: the hold only starts the mode,
    and the drag is a new touch.
- Re-order mode:
  - Every seat of a player in the game shakes. The shake animates the CSS
    `rotate` property, so the `translate` that places the seat stays.
  - A device set to reduced motion shows a still dashed outline in place of
    the shake.
  - The seats have `touch-action: none` in the mode, so a drag that starts
    there does not scroll.
  - While the finger is over a seat, the seats between slide to their new
    places, and the gap moves to the seat under the finger.
  - A tap selects a seat. A tap on another seat moves the selected player
    there. A tap on the same seat lets it go.
  - A drop or a second tap shows the move at once, until the next state of
    the game arrives from the server, also when the server refuses the
    move.
  - The empty seat of a player who left does not move and takes no drop.
  - Done, a tap on the empty ring area, or Close ends the mode. The mode
    also ends when the device loses admin.
- Copy, to settle in the mockup: the ring note adds "hold a seat to
  re-order". The mode note says "drag a seat to its place". `Re-order
  seats` becomes Done in the mode.

### Setup screen

- Each row gets a ⠿ handle with `touch-action: none`, and the drag starts
  at once. ▲ and ▼ stay.
- A drop on another row moves the held row there, and the rows between
  shift by one. They slide while the finger is over a row.
- The speaker star stays with its player.
- Setup is local state until Create game, so a setup move is not a logged
  tap.

## Milestone 1: Documentation and spec

State the swap rules as requirements before the code changes.

- [x] `docs/product.md`: remove "No seat re-ordering after setup" from the
      MVP exceptions. Update the Speaker & Seating row of the screens
      table.
- [x] `docs/product.md`: the Setup row of the screens table.
- [x] `docs/product/rounds.md`, "Seating and the speaker": replace the
      paragraph on understated re-ordering with the rules of the decisions
      and the Model section. Add the rejected alternatives of decisions 1
      to 3, and the rejected rewrite of the starting ring.
- [x] The same section: the setup handle, beside ▲ and ▼.
- [x] Decision 2B: a drop moves a seat, and the seats between shift into
      the gap. Update `rounds.md`, the Speaker & Seating row of
      `product.md`, the logged taps of `clocks.md`, the rights table of
      `multiplayer.md`, and the README features.
- [x] `docs/product/clocks.md`, "Corrections": add seat swaps to the logged
      taps.
- [x] `docs/product/multiplayer.md`: add "swap seats" to the admin row of
      the rights table.
- [x] `README.md`: the key features. The new files go under Key code in
      the milestones that add them.
- [x] Search `src/ui/` and the mockup for text that states the old rule,
      as `AGENTS.md` asks. Only the mockup states it, and Milestone 2
      rewrites it. The search is in
      `.context/seat-reordering/m1-old-rule-search.txt`.

## Milestone 2: Mockup

Tags: mockup

Show re-order mode and the setup handle before the screens change.

- [x] Speaker & Seating: remove the Later tag from `Re-order seats`. Add
      the hold hint to the ring note. Rewrite the help line under the
      button in a positive frame.
- [x] Add the screen "Speaker & Seating — Re-order seats": the seats shake,
      one seat is held over another, that seat slides to the gap, and Done
      shows.
- [x] Put the long press, the tap alternative, and reduced motion in the
      note below the screen.
- [x] Setup: a ⠿ handle on each row, beside ▲ and ▼, in the iPad, upright
      iPad, and phone frames, and a screen with a row held over another.
      Render them in headless Chrome.
- [x] Decision 2B: the re-order screen shows a seat held two seats away,
      with the seats between shifted into the gap. Update its notes and the
      mode note. Render it in headless Chrome. The screenshots of both TODOs
      are in `.context/seat-reordering/mockup/moves/`.
- [x] Render the changed screens in headless Chrome. Save the screenshots
      under `.context/seat-reordering/mockup/`. The Speaker & Seating
      screens, also with reduced motion, are there.

## Milestone 3: Game model

Log a seat swap, derive the ring, and move the saved game to version 7.

- [x] Capture the version 6 fixture from the build before the bump. The
      scratch capture is in `.context/seat-reordering/capture/`.
- [x] `types.ts`: the `seatsSwapped` action and version 7.
- [x] The fold: `ring`, the swap with its checks, and `followOrder`.
- [x] The view: players in ring order, and the ring helper.
- [x] `parse-parts.ts`, `parse.ts`, and `commands.ts`: the action and
      version 7.
- [x] Adapt the screens that need it, so that the build passes.
- [x] `README.md`: the ring helper under Key code.
- [x] Unit tests:
  - [x] A swap changes the ring, the pick order, and the voting order.
  - [x] A swap with a player who left, an unknown player, or the same
        player is rejected.
  - [x] A swap during a pick moves the pick clock only when the picker
        changes. Every moment belongs to one entry.
  - [x] A swap during voting moves the vote clock, and earlier votes stay.
  - [x] Undo of a swap returns the ring and every clock.
  - [x] A speaker who leaves after a swap passes the token to their new
        left neighbour.
  - [x] The empty seat of a player who left keeps its place.
  - [x] The view and the ring helper list the players in ring order.
  - [x] An admin device may swap seats. A seated device and a viewer may
        not.
  - [x] `seatsSwapped` parses as an action and in an `act` command. A
        version 6 game loads as version 7.
  - [x] The version 6 fixture loads as version 7 and keeps its clocks.

## Milestone 4: Screens

Tags: ui

Build re-order mode and the setup handle as the mockup shows them.

- [x] `useSwapDrag.ts`: the pointer drag, the hold, the target, the blocked
      scroll, and the swallowed release.
- [x] `SeatRing.tsx`: re-order mode, the shake, reduced motion, the slide
      to the gap, the tap alternative, and Done.
- [x] Speaker & Seating: the button, the notes, and the dispatch of
      `seatsSwapped`.
- [x] Claim screen and Players & devices: the order and the seat numbers
      of a running game come from the ring.
- [x] Port the new mockup styles to `src/styles/mockup/`.
- [x] `README.md`: the new files under Key code.
- [x] Scratch smoke test, not committed: in headless Chrome with touch
      emulation, long-press, drag, and drop on the ring. Check both orders,
      a plain tap on a seat, and Undo. Save the evidence under
      `.context/seat-reordering/smoke/`. The logs `ring-ipad.log`,
      `ring-phone.log`, and `ring-desktop.log` hold 46 passed checks.

## Milestone 5: Seat moves in the model

Decision 2B: the logged tap moves a seat, and the seats between shift into
the gap.

- [x] `orders.ts`: the helper that moves a player in the ring, along the
      shorter way round, with the empty seats in place.
- [x] Replace `seatsSwapped` with `seatMoved` in `types.ts`, the fold, the
      parser, and the rights tests.
- [x] Unit tests:
  - [x] A move to a neighbour, a move two seats away, a move the other way
        round, and the clockwise way for two equal ways.
  - [x] The empty seat of a player who left keeps its place, and the move
        skips it.
  - [x] Every earlier case of the swap: the orders, the clocks, undo, the
        rights, the parser, and the server.

## Milestone 6: Seat moves and the setup handle on the screens

Tags: ui

Show the shift into the gap on the ring, and drag setup rows by a handle.

- [ ] `useDragReorder.ts`: the screen gives the places that the items take
      for a target. Rename the hook and its attribute.
- [ ] `SeatRing.tsx`: the seats between slide into the gap, the drop and
      the tap move a seat, and the pending move shows at once.
- [ ] Setup: the ⠿ handle and the row move. The speaker star stays with
      its player. ▲ and ▼ stay.
- [ ] Port the new mockup styles to `src/styles/mockup/`.
- [ ] `README.md`: the renamed hook under Key code.
- [ ] Scratch smoke test, not committed, in headless Chrome with touch
      emulation: move a ring seat two seats away and to a neighbour, the
      tap alternative, and Undo. Drag a setup row up and down. Save the
      evidence under `.context/seat-reordering/smoke/`.

## Milestone 7: Verification, commit, review, and pull request

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest. Review 1 is in
      `.context/seat-reordering/review-1.md`. It fixed findings 2 and 3.
      Review 3, after the merges of PR #28, #29, and #30, is in
      `.context/seat-reordering/review-3.md`. It fixed findings 3 and 4,
      and its findings 1 and 2 are review 1, 4 and review 2, 1 below.
  - Review 1, 1. Deploy leaves older game pages stale. Resolved on
    2026-10-26: PR #30 merged first, so the deploy reloads every open page.
  - Review 1, 4. Spec and code disagree on ending the mode. Severity Low,
    effort Small. Recommended: B, a tap anywhere outside the seats and the
    buttons ends the mode, as decision 1 says.
  - Review 2, 1. Plan misstates the open review findings. Severity Low,
    effort Small. Recommended: B, keep the agent's recommendation for
    finding 4, and add the reviewer's option A. Review 2 is in
    `.context/seat-reordering/review-2.md`.
  - Outside the scope: `src/ui/useGameClient.ts`, a page drops a state
    message that it cannot read and shows no notice. Resolved on
    2026-10-26 by PR #30: a page reads the build of each message first,
    and a page of another build reloads.
  - Outside the scope: `plans/admin-recovery.md`,
    `plans/retire-pre-server-games.md`, `plans/version-handling.md`, and
    `plans/multiplayer.md` still say that their pull requests are open,
    but PRs #28, #29, #30, and #21 merged. Separate branch.
- [ ] Open the pull request when every other milestone TODO is ticked. Put
      its link in the status paragraph. Copy the merge justifications in
      `.context/seat-reordering/merge-1.md` and `merge-2.md` into its
      description. The description asks Cal to test the preview on an iPad
      and a phone before the merge: the long press, no text selection or
      menu, no scroll during a drag, a plain tap on a seat, and reduced
      motion.

## Post-merge follow-up (non-blocking)

- [ ] Check that the deploy step passed on `main`.
- [ ] Move a seat with a long press on the iPad at https://ti4.nexus.
