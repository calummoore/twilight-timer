# Three- and four-player games

Status: Active. [PR #11](https://github.com/calummoore/twilight-timer/pull/11)
is open on `main`. It was stacked on
[PR #9](https://github.com/calummoore/twilight-timer/pull/9), which merged on
2026-10-25. The plan closes when its PR merges.

Setup offers 5 to 8 players, and each player takes one strategy card. TI4
also plays with 3 or 4 players. Then each player takes two strategy cards,
and the lower card sets their initiative. The MVP left these games out until
the turn-order rule was confirmed. This change adds 3 and 4 players: two
picks each in the strategy phase, one place for each player in the turn
order at their lowest card, and a play button for each card in the action
phase. A strategic action now logs its card, so the saved game moves to
version 5.

The change follows the TI4 Living Rules Reference (LRR): 84.1 for the second
pick, 84.2 for trade goods, 48.3 for initiative, 3.4 and 82.2 for passing,
and 33.9 for players who leave. It does not cover strategy card swaps, such
as the Imperial Arbiter law, or the phone screens of the mockup.

Decisions:

- 2026-10-25, Cal: decision 1, option A. A player's initiative is their
  lowest card, as LRR 48.3 says. Each player has one place in the turn order
  and plays either card on a turn. Alternative: B, a turn at each card
  number, as the spec said. Reason: it is the official rule.
- 2026-10-25, Cal: decision 2, option B. This branch is stacked on PR #9,
  player removal, which changes the same fold functions and the saved-game
  version. Alternatives: A, build on `origin/main` and merge PR #9 later, and
  C, wait until PR #9 merges. Reason: work starts now, and one branch builds
  and tests the shared rules.
- 2026-10-25, Cal: decision 3, answered by workspace 95, "Strategy Card Turn
  End". There, Cal chose that a tap that closes the reaction window also ends
  the turn. So a turn holds at most one strategic action, and this branch
  adds no rejection for a second one. Alternatives: A, reject a second
  strategic action in a turn, B, warn and allow it, and C, allow it with no
  warning. Until that change merges, a player can play their second card in
  the same turn, after the first window closes.
- 2026-10-25, Cal: decision 4, option A. This plan records the change.
  Alternative: B, the PR description only.
- 2026-10-25, Cal: review finding 3, option C. The TI4 rules give one action
  in a turn, so a player plays one strategy card in a turn. Cal merged PR
  #12 first, and this branch merged `main` in Milestone 6. A window close
  now ends the turn, so the second card waits for a later turn.
  Alternatives: A, a plan note only, B, a list of cards on a turn entry, and
  D, reject a second strategic action in a turn.

Contract owners:

- The product spec at `docs/product.md`.
- The mockup at `docs/mockups/index.html`.
- The [workspace README](../README.md).

## Design

- `rules.ts`: setup offers 3 to 8 players. `cardsEach` gives two cards for
  3 or 4 players, else one. The fold passes the player count at the start of
  the game, so the count stays when a player leaves, as LRR 33.9 says.
- The fold keeps the cards of each player for the round, in pick order. The
  picks go round the pick order once for each card: the next picker is the
  first player in pick order with the fewest cards. A speaker move derives
  the picker again, as before.
- The action phase begins when every seated player has their cards. A player
  who leaves in the strategy phase returns all of their cards.
- `initiativeOrder` gives each player their lowest card, or 0 for the holder
  of the Naalu token.
- `strategyCardPlayed` carries its card. The fold accepts a card that the
  active player holds and has not played. The fold keeps the cards played in
  the round, in place of the players who played.
- A game from an older build logged no card, because each player had one.
  Its strategic actions load with no card, and the fold plays the lowest card
  that the active player has not played.
- The saved game moves to version 5 under `.v5` keys, because PR #12 took
  version 4 for the window rule. When a `.v5` key is empty, load reads the
  `.v4` to `.v1` keys. Load gives an older game the shape of the next
  version until it has the newest shape, and one parser reads every game.
  A version 4 game with no window rule is from a preview of this change: it
  has cards, and it keeps the old window rule.
- With the window rule of PR #12, a window close ends the turn. So a turn
  holds one strategic action, and the second card waits for a later turn.
- The view gives each rail row its cards, each with a played flag, and the
  hero the cards of the active player. The game view gives the number of
  cards each.
- Screens: setup offers 3 to 8 players and shows the cards each. The
  strategy screen counts every pick and names the second card. The hero
  shows a play button for each card, and the rail shows each card. The pass
  warning names each card that is not played yet.

## Milestone 1: Documentation and spec

State the two-card rules as requirements before the code changes.

- [x] Update "Initiative order" in `docs/product.md`: two cards each at 3 or
      4 players, the second round of picks from the speaker, initiative from
      the lowest card, one turn in each cycle, and the rejected turn at each
      card number.
- [x] Update "Passing": a player passes after they play each of their cards.
- [x] Update "The reaction window": one strategic action for each card in a
      round.
- [x] Update "Players who leave": the players keep the number of cards of
      the game start, and a player who leaves returns each card.
- [x] Update the rail rows in the screens table. Remove the 5 to 8 players
      exception from the MVP scope.
- [x] Update the key features in `README.md`.
- `docs/product.md` has 443 lines, past the 250-line target. Split it on a
  separate branch after PR #9 and the turn-end change merge, because both
  edit it.

## Milestone 2: Mockup

Tags: mockup

Show a four-player game on the mockup before the screens change.

- [x] Setup: correct the help text of the Game panel. Each player picks two
      cards, and the lower card sets the initiative.
- [x] Add the screen "Strategy Phase — Four Players": the second round of
      picks.
- [x] Add the screen "Action Phase — Four Players": a play button for each
      card on the hero, and two cards on each rail row.
- [x] Render the changed screens in headless Chrome. Save the screenshots
      under `.context/three-and-four-player-games/mockup/`.
- The hero puts the two play buttons and Pass in three columns, at 14px,
  so that "Construction (4) played ✓" fits. The faction name on a rail row
  moves to its own line as a whole when two cards fill the line.
- Evidence: `.context/three-and-four-player-games/mockup/*.png`. The
  screens render with no script error.

## Milestone 3: Game model

Give each player two cards at 3 or 4 players, order the turns by the lowest
card, and log the card of each strategic action.

- [x] `rules.ts`: 3 players at least, and `cardsEach`.
- [x] `orders.ts`: the initiative from the lowest card.
- [x] The fold: the cards of each player, the pick order once for each card,
      the start of the action phase, and the strategic action with its card.
- [x] The view: the cards each, the cards on each rail row, and the cards of
      the active player.
- [x] `parse.ts` and `storage.ts`: version 4, the card on a strategic
      action, no card for older versions, and the `.v4` keys.
- [x] Adapt the screens to the new view fields, so that the build passes.
      The hero plays the lowest card that is not played. Milestone 4 gives
      each card its own button.
- [x] Unit tests:
  - [x] `cardsEach` gives two cards for 3 or 4 players, else one.
  - [x] Four players pick twice in pick order, from the speaker. A pick out
        of turn or a third card is rejected. The action phase begins after
        the eighth pick.
  - [x] Four players leave no trade good. Three players leave two cards with
        a trade good each.
  - [x] The turns follow the lowest card, one turn for each player in a
        cycle. The Naalu token holder goes first with two cards.
  - [x] A strategic action plays the chosen card. A card that the player does
        not hold, or has played, is rejected. Politics as a second card
        offers the new speaker.
  - [x] A speaker move in the second round of picks moves the pick clock.
  - [x] A player who leaves in the strategy phase returns both cards. After a
        removal, a five-player game keeps one card each, and a four-player
        game keeps two.
  - [x] Undo of a second pick returns the clocks to the pick.
  - [x] Every moment of a four-player round belongs to one entry.
  - [x] A version 3 game loads and plays the only card of each player. A
        version 4 game loads as it was saved. A version 4 strategic action
        without a card makes the game invalid.
- Evidence: `.context/three-and-four-player-games/mutation.log`. Each of 8
  broken two-card rules makes at least one test fail.

## Milestone 4: Screens

Tags: ui

Show two cards each on the screens as the mockup shows them.

- [x] Setup: 3 to 8 players, the cards each, and the help text.
- [x] Strategy screen: count every pick, and name the second card.
- [x] Hero: a play button for each card. The pass warning names each card
      that is not played yet.
- [x] Rail: a chip for each card.
- [x] Port the new mockup styles to `src/styles/mockup/`.
- [x] Scratch smoke test, not committed: build, serve the preview, and play
      a four-player round in headless Chrome. Save the screenshots under
      `.context/three-and-four-player-games/smoke/`.
- Evidence: `.context/three-and-four-player-games/smoke/smoke.log` and the
  screenshots beside it. A four-player round and a six-player start pass 28
  of 28 checks, with no console error.

## Milestone 5: Verification, commit, and review

Run the checks, push, open the stacked PR, and review it.

- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
  Evidence: `.context/three-and-four-player-games/check-2.log`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Merge the two newer commits of the PR #9 branch, 61483f8 and 5648ce2.
      The merge had no conflict, and the gate passed again.
- [x] Open the PR on the PR #9 branch, and link it in the status paragraph.
- [x] Review the complete local diff against the PR #9 branch, the base of
      this stacked PR, with the `implementation-review` skill after the
      push. Report the findings, then apply the review-fix rule: fix the
      `Auto-fix: yes` findings, re-review once, and report the rest.
  - Review 1 found 5 findings. Fixed: 1, an older saved game failed to
    load after its first save, with option C: load upgrades each older
    version, and one parser reads every game. Fixed: 4, the six-player
    mockup said "Cannot pass", with option B: one Pass fragment. Report:
    `.context/three-and-four-player-games/review-1.md`.
  - Finding 2, the conflict with PR #9 commit 70e4e9f, is resolved by merge
    7c04191, as decision 2 needs for a stacked branch.
  - 3. A turn keeps only its last card. Decided 2026-10-25: C, in Milestone 6.
  - 5. No test checks the held-card order. Severity Low, effort Small. Recommended: B, Kira picks Warfare before Trade in `FOUR_PICKS`.
  - `src/model/parse.ts`: PR #9 and the turn-end branch both save version 3 under `ti4tempo.game.v3` with different shapes. Separate branch.
  - `docs/mockups/index.html`: the hero clock line says "cumulative", but the app says "game total". Separate branch.
  - `src/ui/screens/StrategyScreen.tsx`: "Every card is picked" shows while cards stay unpicked at 3, 5, 6, or 7 players. Separate branch.
  - Review 2 checked fix commit 662916d and merge 7c04191: findings 1, 2,
    and 4 are resolved. It found 2 findings. Fixed: 6, a test comment
    misstated the version 4 card rule. Finding 7, the PR description
    missed the fix round, is resolved by an update of the description. No
    further fix round runs. Report:
    `.context/three-and-four-player-games/review-2.md`.
  - `docs/mockups/index.html`: the phone "Your Turn" screen still greys Pass as "PASS — strategy card unplayed", but Pass only warns. Separate branch.
- [x] Merge `origin/main` after PR #9 landed as b6f658d. Each conflicted
      path equals the PR #9 tip on `main`, so the merge keeps this branch's
      version, and it adds only the #10 change. Retarget PR #11 to `main`.
      Justifications: `.context/three-and-four-player-games/merge-main.log`.
      The PR description copies them.

## Milestone 6: Merge main with the window rule

PR #12 merged first, as review finding 3 decided. It ends the turn when the
reaction window closes, and it also took saved-game version 4. Merge it,
and move this branch to version 5.

- [x] Merge `origin/main` at 046492d and resolve the conflicts in
      `docs/mockups/index.html`, `src/model/parse.ts`, and the reaction,
      stats, storage, and undo tests.
- [x] Move the saved game to version 5. Upgrade a main version 4 game with
      null cards, and a version 4 game of this preview with the old window
      rule, as `AGENTS.md` asks.
- [x] Split `storage.test.ts`, which passed 300 lines. The older-version
      tests move to `storage-versions.test.ts`, and the memory store to
      `test-store.ts`.
- [x] Let the window close end the turn in the two-card tests. Test the
      second card in a new turn when everyone else has passed.
- [x] State in the spec and in the mockup note that the second card waits
      for a later turn.
- [x] Run the complete gate.
  Evidence: `.context/three-and-four-player-games/merge-12/check.log`.
- [x] Scratch smoke test, not committed: play a four-player round with the
      window rule in headless Chrome.
  Evidence: `.context/three-and-four-player-games/merge-12/smoke.log`. 34 of
  34 checks passed, also a main version 4 save that loads twice.
- [x] Commit, push, and copy the merge justifications into the PR
      description.
- [x] Merge `origin/main` again at 0bcabe7, the random faction deal of
      PR #15. Resolve the conflicts in `README.md`, the mockup screen list,
      `src/model/parse.ts`, and the setup panel imports.
  Evidence: `.context/three-and-four-player-games/merge-15/check.log` and
  `smoke.log`. The gate passed with 152 tests, and 34 of 34 browser checks
  passed.
- [x] Review the merge with the `implementation-review` skill after the
      push. Report the findings, then apply the review-fix rule: fix the
      `Auto-fix: yes` findings, re-review once, and report the rest.
  - Review 3 found 3 findings. Fixed: 1, a test row of `main` lost
    strength, with option A: the row of `main` is back. Fixed: 2, two test
    comments named the wrong builds. Finding 3, the stale PR description,
    is resolved by the update of the description. Report:
    `.context/three-and-four-player-games/review-3.md`.
  - `plans/strategic-action-ends-turn.md`: the status says that PR #12 is open, but it merged as 046492d. Separate branch.
  - `docs/mockups/index.html`: the History screen logs "Turn ended — Priya → Sam" after a window, the rule that PR #12 replaced. Separate branch.
  - `docs/mockups/index.html`: the rail rows show fixed turn counts that do not match the hero's turn number. Separate branch.
  - Review 4 checked fix commit 73c90a0 and the merge with PR #15: findings
    1, 2, and 3 of review 3 are resolved. Finding 4, the PR description
    missed the merge with PR #15, is resolved by an update of the
    description. No further fix round runs. Report:
    `.context/three-and-four-player-games/review-4.md`.
  - `plans/random-factions.md`: the status says that PR #15 is open, but it merged as 0bcabe7. Separate branch.

## Post-merge follow-up (non-blocking)

- [ ] Check that the deploy step passed on `main`.
- [ ] Play one round with four players on the iPad.
