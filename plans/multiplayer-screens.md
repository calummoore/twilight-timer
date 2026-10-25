# Multiplayer screens

Status: Active. Draft on the branch `calummoore/firebase-multiplayer-plan`.
It starts after the [live sync](multiplayer-live-sync.md) plan merges.

TI4 Tempo runs on one iPad in the middle of the table. The live sync plan
adds shared games and two device roles. Table mode can do every action, as
the iPad does today. Player mode acts only for its own seat, usually on a
phone. This plan builds the screens for both roles. The mockup already has
the iPad Join screen and seven phone screens.

Decisions:

- 2026-10-23: The QR code holds the join link for the phone camera app.
  The app has no QR scanner, because every phone camera reads QR codes.

Open decision, proposed on 2026-10-23, numbered as in the live sync plan.
Decisions 11 and 12 of the live sync plan set the shape of the game and
the actions of player mode.

14. Smoke test. A: none. B: a scratch browser test. Recommended: B.

Contract owners: `docs/product.md`, the mockup at
`docs/mockups/index.html`, and the [README](../README.md).

## Milestone 1: Documentation

State the screen requirements for both roles.

- [ ] Update the screen tables in `docs/product.md` for table mode and
      player mode. Name the Join screen, the seat move flow, and the error
      states.
- [ ] Update `README.md` with the new screens and the key code.

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
- [ ] A notice on every device for a tap that another device made first.
- [ ] Phone Join: an unknown code, an expired code, and no connection. The
      QR card tells the player to use the phone camera.
- [ ] Phone Claim seat: claim a free seat, or ask the table to move a held
      seat and wait for approval.
- [ ] Phone Waiting for the other phases, a reconnecting banner, and a
      screen for a game that is no longer shared.
- [ ] Use the names table mode and player mode in the copy and the notes.

## Milestone 3: Player views

Add the pure model functions that the player screens show. Each has unit
tests with fixed times.

- [ ] Add the player views: who acts now and their clock, the turns before
      mine, my totals and card, my reaction tile, and my game stats.

## Milestone 4: Table device screens

Tags: ui

Build the table device parts of the mockup.

- [ ] Add the Join button and the sync chip to the top bar, and connect
      the "Allow phone companions" setting.
- [ ] Build the Join screen: the player QR, the code, the link, the table
      link, the seat rows, move approval, Release seat, and Stop sharing.
- [ ] Show the notice for a dropped tap.
- [ ] In a shared game, Settings shows the newest limits of the game and
      changes only the edited timer.
- [ ] Every screen takes `now` from the time base of its game.

## Milestone 5: Player screens

Tags: ui

Build the player mode screens of the mockup.

- [ ] Add a phone stage of 393 by 852, scaled to fit, for the join route.
      The screens go in `src/ui/screens/phone/`.
- [ ] Build Join, Claim seat with the move request, Waiting, Your turn,
      Reaction window, Pass confirmation, and Personal stats.
- [ ] Open the table view on a device that joins with the table link.
- [ ] Add the reconnecting banner, the error states, and the screen for a
      game that is no longer shared.

## Milestone 6: Verification, commit, and review

Run the checks, push, and review the branch.

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Decision 14: in headless Chrome, play one round with a table device
      and two player devices against the local server. Commit nothing.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.
  - 8. Join mockup names a domain the app lacks. Severity Low, effort Small. Recommended: A, show the deployed address.
  - Follow-up: make the open game the one source of the limits in force. Effort Small. Covers finding 3. Previous examples: none.
  - `docs/mockups/index.html`: the Waiting note says "3 turns away", but its screen says "2 turns away". Separate branch.

## Post-merge follow-up (non-blocking)

- [ ] Check the deploy on `main`, then play one round on the live site
      with the iPad and two phones.
