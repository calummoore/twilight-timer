# Strategic action ends the turn

Status: Active. [PR #12](https://github.com/calummoore/twilight-timer/pull/12)
is open. The plan closes when its PR merges.

In TI4, a strategic action is the whole action of a turn. The active player
resolves the primary ability, the other players resolve the secondary
ability, and the turn ends. The app stops the active player's clock when
the strategy card is played, and it opens the reaction window. Before this
change, a closed window resumed the turn of the same player, and somebody
had to tap END TURN. The rules give the player no further action in that
gap, but the gap went on their clock.

This change ends the turn when a tap closes the window. The next player's
clock starts at once. A window past its limit stays open and counts
overtime, so that only a tap ends a turn. The change does not cover games
with 3 or 4 players, the phone companion, or a change to the MARK ALL DONE
label.

Decisions:

- 2026-10-25, Cal: MARK ALL DONE closes the window and ends the turn. Cal:
  "that is your go, you're not allowed to do anything else after that
  anyway".
- 2026-10-25, Cal: decision 1, option B. The last MARK DONE also ends the
  turn. Alternative: A, only MARK ALL DONE ends the turn. Reason: both taps
  give the same end state, because every player is done.
- 2026-10-25, Cal: decision 2, option C. A window past its limit stays
  open. Its clock turns red, counts overtime, and sounds the alarm. A tap
  closes it and ends the turn. Alternatives: A, the window closes itself at
  its limit and ends the turn, and B, it closes itself and the turn
  resumes. Reason: a turn then ends only on a tap that undo can take back,
  and every limit follows one soft rule. This replaces the MVP decision of
  2026-10-23 that the window closes itself at its limit.
- 2026-10-25: a game from an older build keeps its old rule, because the
  repository rule in `AGENTS.md` requires that it still loads. Its log
  follows the old rule, so a new rule would charge the wrong clocks.
- 2026-10-25: the MARK ALL DONE label stays. The window header says "their
  turn took 0:10" in place of "their clock is paused at 0:10", because the
  clock does not run again in that turn.
- 2026-10-25, Cal: review finding 2, option A. The undo test of a late
  extension undo also runs on an older game. Alternative: B, run every
  window and undo test that does not depend on the rule under both rules.
  Reason: one short test brings back the exact case.
- 2026-10-25, Cal: review decision 3, option B. `AGENTS.md` gets a rule:
  when a game rule changes, search `src/ui/` and the mockup for text that
  states the old rule. Alternatives: A, no rule, and C, the same check
  under "Review focus". Reason: the author finds a stale text before the
  review, which saves a fix round.
- 2026-10-25: merge of PR #9, player removal. PR #9 took version 3 and
  the `.v3` keys, so this change moves saved games to version 4 under
  `.v4` keys. Versions 1 to 3 load with the old window rule, because
  their builds resumed the turn when the window closed. The exception is
  a game that this change saved as version 3 before the merge: it stores
  the rule, and it keeps it.
- 2026-10-25: merge of PR #9. In a game with the new rule, the removal of
  the last player a window waits for ends the turn, as the last MARK DONE
  does. Reason: decision 1B, because every player is done. In an older
  game the removal resumes the turn, as PR #9 built it.

Contract owners:

- The product spec at `docs/product.md`.
- The mockup at `docs/mockups/index.html`.
- The [workspace README](../README.md) and `AGENTS.md`.

## Design

- The stored game gets `windowEndsTurn`. `startGame` sets it to true. The
  parser gives false to a version 1, 2, or 3 game, so that its log folds
  as before. A version 3 game that stores the field keeps it, because this
  change saved its games as version 3 before main took that version.
- The saved game moves to version 4 under new `.v4` keys. When a `.v4` key
  is empty, load reads the `.v3` key, then the `.v2` key, then the `.v1`
  key. Save and archive remove the older keys that they replace.
- In a game with the new rule, a tap that closes the window ends the turn:
  the last `reactionDone`, `reactionClosed`, or the removal of the last
  player the window waits for. The turn entry closes where the window
  began, with only the time before the card was played. Then the window
  entry closes, and the next unpassed player in initiative order starts a
  turn, as when the card player leaves during the window.
- When every other player has passed, the next turn belongs to the same
  player. Their turn count goes up by one, as for an END TURN.
- In a game with the new rule, the window does not close itself at its
  limit. Its entry counts overtime, so the round and game stats show it.
  An extension moves the limit, as before.
- A game end during an open window closes the window and the turn. It
  starts no new turn.
- The window view gives `endsTurn`, so that the overlay text follows the
  rule of the game. The view field `pausedTurnMs` becomes `turnMs`,
  because in the new rule the clock does not resume.
- The alarm sounds once when the window passes its limit, as for the other
  timers. The TURN LIMIT EXCEEDED banner shows only for a turn clock.

## Milestone 1: Documentation and spec

State the new window rules as requirements before the code changes.

- [x] Update "The reaction window" in `docs/product.md`: a tap that closes
      the window ends the turn, a window past its limit stays open and
      counts overtime, and a game from an older build keeps its rule. Give
      each decision in force with its rejected alternative.
- [x] Remove "fixed-duration" and "fixed-window" from `docs/product.md`,
      because the window can now pass its limit.
- [x] Add to the key features in `README.md` that closing the window ends
      the turn.

## Milestone 2: Mockup

Tags: mockup

Show the new rule and the window past its limit on the mockup.

- [x] Window header: "her turn took 1:47" in place of "her clock is
      paused at 1:47".
- [x] Window footer note: the window closes, and the turn ends, when the
      last player marks done.
- [x] Add the screen "Reaction Window — Over Limit": the window clock is
      red and counts overtime, the bar is empty, and two players still
      wait.
- [x] Update the notes of the reaction and Politics screens.
- [x] Render the changed screens in headless Chrome. Save the screenshots
      under `.context/strategic-action-ends-turn/mockup/`.
- Evidence: `.context/strategic-action-ends-turn/mockup/*.png`, with no
  console error.

## Milestone 3: Game model

End the turn on a tap that closes the window, keep the window open past its
limit, and keep old saved games as they were.

- [x] `types.ts` and `commands.ts`: version 3 and `windowEndsTurn`, set by
      `startGame`.
- [x] `parse.ts` and `storage.ts`: read versions 1, 2, and 3, and use the
      `.v3` keys with the `.v2` and `.v1` fallbacks.
- [x] The fold: a tap that closes the window ends the turn, the window
      stays open past its limit, and a game end starts no new turn. Only
      in a game with the new rule.
- [x] The view: `endsTurn` and `turnMs` on the window. Rename the field in
      the screens, so that the build passes.
- [x] Unit tests, with a test table for a game from an older build:
  - [x] MARK ALL DONE and the last MARK DONE end the turn. The turn entry
        keeps the time before the card. The next player's clock starts at
        the close.
  - [x] When every other player has passed, the same player starts a new
        turn.
  - [x] A window past its limit stays open, takes marks, and counts
        overtime from the extended limit. The stats count the overtime.
  - [x] Undo of the close reopens the window and returns every clock to
        its value at the close.
  - [x] A game end during a window closes the window and the turn only.
  - [x] Every moment of a round with a window past its limit belongs to
        exactly one entry.
  - [x] In a game from an older build, the close resumes the turn, and the
        window closes itself at its limit.
  - [x] A version 2 game loads from a `.v2` key with the old rule and
        folds as before. Save and archive move it to the `.v3` keys. A
        version 3 game without a valid `windowEndsTurn` is invalid.
  - [x] Adapt the tests that close a window and then end the turn.
- Evidence: before the model change, 22 of the new and adapted tests fail.
  `.context/strategic-action-ends-turn/tests-before-fold.log`.

## Milestone 4: Screens

Tags: ui

Show the new rule and the window past its limit as the mockup shows them.

- [x] Reaction overlay: the header and footer texts from the view, and the
      clock that counts overtime in red past the limit.
- [x] Sound the alarm when the window passes its limit. Show the TURN
      LIMIT EXCEEDED banner only for a turn clock.
- [x] Scratch smoke test, not committed: build, serve the preview, and play
      a strategy card. Check that MARK ALL DONE and the last MARK DONE
      start the next turn, and that a window past its limit counts
      overtime. Save screenshots under
      `.context/strategic-action-ends-turn/smoke/`.
- Evidence: `.context/strategic-action-ends-turn/smoke/smoke.log` and the
  screenshots beside it. All 22 checks passed, with no console error.

## Milestone 5: Verification, commit, and review

Run the checks, push, and review the branch.

- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
  Evidence: `.context/strategic-action-ends-turn/check.log`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.
  - Review 1 of 9f97715 found 2 findings. Fixed: 1, the Settings help text
    said that the window closes at its limit. Report:
    `.context/strategic-action-ends-turn/review-1.md`.
  - Review 2 checked fix commit f035c51: finding 1 is resolved, and it found
    no new finding. Report: `.context/strategic-action-ends-turn/review-2.md`.
  - 2. Undo test lost its older-game window case. Severity Low, effort Small. Recommended: A, an older-game copy of the test. Cal chose A on 2026-10-25. Done in Milestone 6.
  - Decision for Cal, from finding 1: a rule in `AGENTS.md` to search the screen texts and the mockup when a game rule changes. Effort Small. Previous examples: Naalu review findings 3, 4, and 5. Cal chose B on 2026-10-25. Done in Milestone 6.
  - `docs/mockups/index.html`: the Settings "Vote" row says "in speaker order", but voting starts at the speaker's left. Separate branch.
  - `docs/mockups/index.html`: the live clock of the "Reaction Window (overlay)" screen turns red at 0:00, but its label still says "Window remaining · 2:00". Separate branch.
  - `plans/naalu-initiative-token.md` and `plans/mvp-review-follow-ups.md`: the status lines say that PR #7 and PR #2 are open, but both merged on 2026-10-23. Separate branch.

## Milestone 6: Review decisions

Apply Cal's answers to review finding 2 and review decision 3.

- [x] Finding 2, option A: run the undo test of a late extension undo on a
      new game and on an older game.
- [x] Check that the older-game case fails when the window limit check
      ignores undo voids.
- [x] Decision 3, option B: add the screen-text rule to "Repository rules"
      in `AGENTS.md`.
- [x] Apply the new rule to this change: search `src/ui/` and the mockup
      for text that states the old window rules. Nothing else is stale.
- [x] Run the complete gate, commit, and push.
  Evidence: `.context/strategic-action-ends-turn/check-3.log`.
- [x] Review the new commits against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.
  - Review 3 of 3f2953f and 68487c4: both commits do what Cal chose. Its
    one finding, a stale PR description, follows the `git-commit` rule,
    so the description is updated with each push. Report:
    `.context/strategic-action-ends-turn/review-3.md`.
  - `src/model/fold.ts`: no test fails when the window limit check of the
    fold ignores undo voids, also on `origin/main`. Separate branch.
- Evidence: `.context/strategic-action-ends-turn/undo-probe.log`.

## Milestone 7: Merge of main with player removal

PR #9 on `main` adds the removal of a player who leaves the game, with the
saved-game version 3. Merge it, and keep both features.

- [x] Move this change's saved games to version 4 under `.v4` keys. Load
      versions 1 to 3 with the old window rule.
- [x] Share one window close step between the fold and the removal, so
      that a window whose card player left starts the next turn once.
- [x] In a game with the new rule, end the turn when the removal of the
      last player a window waits for closes it.
- [x] Keep the overlay text for a card player who left the game.
- [x] Run main's removal tests that assert the old rule on an older game,
      with every assertion kept. Add the same cases under the new rule.
- [x] Run the complete gate on the merged tree, commit the merge, and run
      the merge audit. Evidence:
      `.context/strategic-action-ends-turn/check-merge.log`.
- [x] Push, and review the merge with the `implementation-review` skill.
      Report the findings, then apply the review-fix rule: fix the
      `Auto-fix: yes` findings, re-review once, and report the rest.
  - Review 4 of the merge found 3 findings. Fixed: 4, a version 3 game that
    this change saved before the merge lost its window rule, and 6, two
    stale code comments. Report:
    `.context/strategic-action-ends-turn/review-4.md`. Review 4 numbers
    them 1 to 3.
  - 5. No undo test for the removal close. Severity Low, effort Small. Recommended: B, one undo test of a removal that closes the window.
  - Decision for Cal, from finding 4: a rule in `AGENTS.md` for a merge that moves the saved-game version: take the next free version, and keep reading the shape that the branch saved before. Effort Small. Previous examples: review 3, and Milestone 10 of the Naalu plan.
  - `docs/mockups/index.html`: the reaction note says that a player who left shows a Left tile, but no window screen draws the Left chip or the "left the game" header. Separate branch.
- [x] Re-review the fix of findings 4 and 6 once.
  - Review 5 checked fix commit 41b8162: findings 4 and 6 are resolved. It
    found 2 findings. Finding 8, a stale PR description, follows the
    `git-commit` rule, so the description is updated. Report:
    `.context/strategic-action-ends-turn/review-5.md`. Review 5 numbers
    them 1 and 2.
  - 9. Comments name the early builds "this change". Severity Low, effort Small. Recommended: A, name the builds by feature in the `windowRule` comment and the storage test.

## Post-merge follow-up (non-blocking)

- [ ] On the iPad, play a strategy card and tap MARK ALL DONE. Check that
      the next player's clock starts.
