# Naalu "0" initiative token

Status: Active. [PR #7](https://github.com/calummoore/twilight-timer/pull/7)
is open. The plan closes when its PR merges.

In TI4, the Naalu Collective faction has the ability Telepathic. At the end
of each strategy phase, it puts the Naalu "0" token on the Naalu player's
strategy card. The token makes that player first in initiative order. The
Naalu promissory note, Gift of Prescience, lets another player take the
token for one round instead. The app does not know the token. It orders the
action phase by card number for every player. So a Naalu player takes turns
in the wrong place, and each End Turn charges the wrong clock. The MVP plan
put the token out of scope.

This change gives the token holder initiative 0 in each round. The holder
goes first in the action phase, and the rail and the hero show initiative
0. The strategy card of the holder keeps its number and its name. To find
the Naalu player, setup now picks each faction from a fixed list of the 30
official factions, and the saved game stores the faction id.

The change does not cover strategy card swaps, such as the Imperial Arbiter
law. It also does not cover games with 3 or 4 players, faction edits after
setup, factions outside the official list, or the phone screens of the
mockup.

Decisions:

- 2026-10-23, Cal: build the Naalu "0" token, which the MVP plan left out.
- 2026-10-23, Cal: decision 1, option B. The saved game moves to version 2
  under new `.v2` keys. Load reads the `.v1` key when a `.v2` key is
  empty, and a version 1 game has no token. Alternatives: A, an optional
  field under version 1, and C, one unversioned key for each slot. Reason:
  B keeps the versioned-key rule in `AGENTS.md`.
- 2026-10-23, Cal: decision 2, option B. The table can move the token to
  another player for the current round, from the strategy screen. The
  token returns to the Naalu player in the next round. Alternative: A,
  leave Gift of Prescience out. Reason: without it, a round with the note
  has the wrong turn order and the wrong clocks.
- 2026-10-23, Cal: decision 3, a new option. Setup picks each faction from
  a fixed list, and the saved game stores faction ids. Cal: "they are all
  known upfront". The Naalu player is the player with the Naalu id.
  Alternatives: A, match "naalu" in the free-text faction field, and B, a
  Naalu selector in setup.
- 2026-10-23: the list holds the 30 official factions, with the 5 factions
  of Thunder's Edge. A faction outside the list cannot be entered, so a
  player can choose no faction instead.
- 2026-10-23, Cal: decision 4, option C. Every seat must pick an official
  faction, and BEGIN GAME stays off until each seat has one. This replaces
  the "no faction" choice of the entry above. Alternatives: A, keep the
  faction optional, B, warn and continue, and D, require a choice with a
  "No faction" choice, which was the recommendation. Reason: a forgotten
  Naalu faction puts the Naalu player in card order for the whole game,
  with no fix after the start. A faction outside the list cannot be
  entered at all.

Contract owners:

- The product spec at `docs/product.md`.
- The mockup at `docs/mockups/index.html`.
- The [workspace README](../README.md) and `AGENTS.md`.

## Design

- `src/model/factions.ts` holds the 30 official factions in name order,
  each with a stable id and a name. It replaces the suggestion list in
  `src/ui/factions.ts`.
- A player stores `factionId`, a faction id or null, in place of the
  free-text `faction`. The screens show the name from the list.
- Setup shows one faction select for each seat. Its empty choice is a
  placeholder that a player cannot pick. BEGIN GAME stays off until every
  seat has a faction. Taking a faction that another seat holds swaps the
  two factions, as colours do. The Game panel names the Naalu player when
  one is chosen.
- A player can still have no faction in a game from an older build, so
  `factionId` stays nullable.
- The stored game gets `naaluTokenOwnerId`: the player with the Naalu
  faction, or null. `startGame` sets it. A version 1 game gets null, so it
  folds exactly as before, also when a player is the Naalu.
- The fold keeps the token holder of the current round. The holder starts
  as the owner, and it resets to the owner when the next round starts.
- The new action `naaluTokenMoved` gives the token to another seated
  player for the current round. It is valid only in the strategy phase of
  a game with a token owner. Undo takes it back, and every clock returns to
  its value at the move, as for every tap.
- One function in `orders.ts` maps the picks and the holder to initiative
  numbers. The holder gets 0, and each other player gets their card number.
  The first turn, the next turn, the rail, and the order strip of the
  strategy screen all use it.
- The view gives each rail row its initiative next to its card, and the
  hero the initiative of the active player. The strategy view gives the
  order so far, the token owner, and the holder.
- A saved game lives under `ti4tempo.game.v2` and `ti4tempo.lastGame.v2`.
  When a `.v2` key is empty, load reads its `.v1` key. Save and archive
  remove the `.v1` key that they replace, so an old game cannot come back.
- The parser reads version 1 and version 2 games. In a version 1 game, a
  faction text that matches a faction name or id in any letter case
  becomes that id. Other text becomes no faction.

## Milestone 1: Documentation and spec

State the token rules, the faction list, and the storage rule as
requirements before the code changes.

- [x] Update "Initiative order" in `docs/product.md`. The token holder has
      initiative 0 and goes first. The card keeps its number and its name.
      Gift of Prescience moves the token for one round. Add each decision
      in force with its rejected alternative.
- [x] State in `docs/product.md` that setup picks factions from the list
      of official factions, or none, and that the Naalu id finds the token
      owner.
- [x] Add the token to the strategy-phase item of the must-have list in
      `docs/product.md`.
- [x] Add to the saved-game rule in `AGENTS.md`: keep reading the keys of
      older versions.
- [x] Record the outcome of decision 1 at review finding 6 in
      `plans/ti4-tempo-mvp.md`.
- [x] Add the token to the key features in `README.md`, and the faction
      list to its key code.

## Milestone 2: Mockup

Tags: mockup

Show the faction list and the token on the mockup before the screens
change.

- [x] Give Sam the Naalu Collective in the demo data. Sam keeps card 4.
- [x] Setup: add a "Naalu 0 token" row with Sam to the Game panel.
- [x] Action phase: list Sam first on the rail, with initiative 0 and the
      Construction card. Take the card name of each rail row from its card,
      not from its initiative.
- [x] Strategy phase: add the 0-token button with Sam to the order strip.
- [x] Add the screen "Strategy Phase — Naalu 0 Token": the token picker
      over the strategy screen.
- [x] Update the setup, strategy, and action notes for the faction list
      and the token.
- [x] Render the changed screens in headless Chrome. Save the screenshots
      under `.context/naalu-initiative-token/mockup/`.
- Evidence: `.context/naalu-initiative-token/mockup/*.png`.

## Milestone 3: Game model

Store faction ids, put the token holder first in the fold, and keep old
saved games as they were.

- [x] `factions.ts`: the 30 factions with ids, the faction name lookup,
      and the id guard.
- [x] `types.ts` and `commands.ts`: version 2, `factionId` on each player,
      and `naaluTokenOwnerId`, set by `startGame`.
- [x] `orders.ts`: the initiative map with the token holder.
- [x] The fold: the holder of each round, the first turn, the next turn,
      and the `naaluTokenMoved` action.
- [x] The view: the initiative on each rail row and on the hero. The
      strategy order so far, the token owner, and the holder.
- [x] `parse.ts` and `storage.ts`: read versions 1 and 2, and use the
      `.v2` keys with the `.v1` fallback.
- [x] Adapt the screens to the renamed faction field, so that the build
      passes. Milestone 4 builds the new controls.
- [x] Unit tests, with a test table that seats a Naalu player:
  - [x] `startGame` sets the owner from the Naalu id, and null without it.
  - [x] The holder takes the first turn. The turns then follow card order
        and come back to the holder. A passed holder is skipped.
  - [x] Each turn entry charges the player whose turn it is.
  - [x] The rail and the hero show initiative 0 and keep the card.
  - [x] The strategy order so far shows the holder with 0.
  - [x] A token move is accepted in the strategy phase. It is rejected in
        other phases, for an unknown player, for the holder, and in a game
        with no owner.
  - [x] The token returns to the owner in the next round. Undo of a move
        restores the holder and voids no time.
  - [x] A version 1 game loads from a `.v1` key, maps its faction texts,
        has no owner, and folds as before. A version 2 game loads as it
        was saved. An unknown faction id or owner makes the game invalid.
  - [x] Save and archive remove the `.v1` keys that they replace.
- Evidence: with the token rule turned off, 7 of the new tests fail.
  `.context/naalu-initiative-token/tests-without-token.log`.

## Milestone 4: Screens

Tags: ui

Show the faction list and the token on the screens as the mockup shows
them.

- [x] Setup: the faction select with the swap, and the "Naalu 0 token"
      row in the Game panel. Split the screen if it passes 300 lines.
- [x] Hero, rail, and reaction tiles: show the faction name from its id.
- [x] Rail and hero: show the initiative from the view.
- [x] Strategy screen: render the order strip from the view.
- [x] Strategy screen: the 0-token button and the token picker.
- [x] Scratch checks, not committed: build, serve the preview, and take
      headless screenshots of the setup, strategy, and action screens of a
      Naalu game. Save them under `.context/naalu-initiative-token/`.
- The setup screen is 236 lines after its Game panel moved to
  `SetupGamePanel.tsx`.
- Evidence: `.context/naalu-initiative-token/smoke/smoke.log` and the
  screenshots beside it. All 16 checks passed, with no console error.

## Milestone 5: Verification, commit, and review

Run the checks, push, and review the branch.

- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
  Evidence: `.context/naalu-initiative-token/check.log`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.
  - Review 1 found 3 findings. Fixed: 1, the faction select cut off long
    names. Report: `.context/naalu-initiative-token/review-1.md`.
  - Review 2 checked fix commit 158a7ee: finding 1 is resolved, and it found
    no new finding. The smoke log now has 17 checks, with the name-fit
    check. Report: `.context/naalu-initiative-token/review-2.md`.
  - 2. No test loads a player with no faction. Severity Low, effort Small. Recommended: D, one round-trip test of a sample game with one action of every kind, every faction, and no faction.
  - 3. Rail header says the card sets initiative. Severity Low, effort Small. Recommended: A, the header "Initiative order" in the app and the mockup.
  - `src/model/commands.ts`: undo of a Naalu token move leaves the time since the move on the running clock, as open finding 1 of the MVP plan describes. Resolved by PR #2, merged from `origin/main` in Milestone 10: undo now returns every clock to its value at the tap.

## Milestone 6: Required faction in the spec

Decision 4 makes the faction required. State it in the spec before the
screens change.

- [x] Update "Factions" in `docs/product.md`: every seat needs a faction
      before the game begins, with the rejected optional faction.

## Milestone 7: Required faction in the mockup

Tags: mockup

Show the setup screen while a seat has no faction.

- [x] Add the screen "Setup — Faction Missing": one seat shows the
      placeholder, BEGIN GAME is off, and a hint asks for every faction.
- [x] Update the setup note.
- [x] Render the setup screens in headless Chrome. Save the screenshots
      under `.context/naalu-initiative-token/mockup/`.
- Evidence: `.context/naalu-initiative-token/mockup/setupMissing.png`.

## Milestone 8: Required faction on the setup screen

Tags: ui

Turn BEGIN GAME off until every seat has a faction.

- [x] Make the placeholder choice of the faction select unpickable.
- [x] Turn BEGIN GAME off and show the hint while a seat has no faction.
- [x] Scratch smoke test, not committed: BEGIN GAME is off with a missing
      faction and on when every seat has one.
- Evidence: `.context/naalu-initiative-token/smoke/smoke.log` and
  `setup-missing.png`. All 22 checks passed, with no console error.

## Milestone 9: Verification, commit, and review of decision 4

Run the checks, push, and review the branch again.

- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
  Evidence: `.context/naalu-initiative-token/check-3.log`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest. Findings 2 and 3 of review 1
      stay open under Milestone 5.
  - Review 3 found 2 findings. Fixed: 4, doc comments said a player can
    pick no faction, and 5, the setup note said the Naalu always goes
    first. Report: `.context/naalu-initiative-token/review-3.md`.
  - Review 4 checked fix commit df26f09: findings 4 and 5 are resolved,
    and it found no new finding. Report:
    `.context/naalu-initiative-token/review-4.md`.
  - `src/styles/app.css`: the button reset sets `text-align: inherit`, so BEGIN GAME, BEGIN ACTION PHASE, and END TURN sit at the left, but the mockup centres them. Separate branch.
  - `src/model/types.ts`: the `naaluTokenOwnerId` comment says that the Naalu player holds the token each round, but Gift of Prescience can move it for one round. Separate branch.

## Milestone 10: Merge origin/main

Main moved ahead with PRs #2 to #6. Merge it, keep both sides of each
conflict, and adapt the tests that met a rule from main.

- [x] Merge `origin/main` at e8bd201 and resolve the conflicts in
      `README.md`, `docs/mockups/index.html`, `plans/ti4-tempo-mvp.md`,
      `src/model/derive.ts`, and `src/ui/screens/StrategyScreen.tsx`.
- [x] Make the token undo test expect main's undo rule, and give main's
      unknown-version test version 3 under the `.v2` key.
- [x] Render the merged mockup screens in headless Chrome with no script
      error.
- Justifications for each path:
  `.context/naalu-initiative-token/merge/justifications.md`. The PR
  description copies them.
- [x] Run the complete gate, audit the merge, and push.
  Evidence: `.context/naalu-initiative-token/merge/check.log`.
- [x] Open the PR and link it in the status paragraph.
- [ ] Review the merge with the `implementation-review` skill after the
      push. Report the findings, then apply the review-fix rule: fix the
      `Auto-fix: yes` findings, re-review once, and report the rest.

## Post-merge follow-up (non-blocking)

- [ ] Check that the deploy step passed on `main`.
- [ ] Play one round with a Naalu player on the iPad.
