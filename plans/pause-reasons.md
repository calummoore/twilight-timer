# Pause reasons

Status: Active. [PR #13](https://github.com/calummoore/twilight-timer/pull/13)
is open. The plan closes when its PR merges. Cal answered decisions 1 to 3
on 2026-10-25. Review findings 2 and 3 wait for Cal.

The table can pause the game from the top bar. A pause stops every clock
and charges nobody. The app stores each pause as a start time and an end
time, beside the action log. But no screen shows pause time, and the app
cannot tell a food break from a rules discussion. So a group cannot see how
much time its rule checks take. The mockup also has no pause screen: the
pause overlay exists only in the app.

This change lets the table give a pause a reason. A new pause is a plain
pause, and the pause screen shows the default option "Pause" as selected.
While the game is paused, one tap selects Rule check, and the rule check
starts at that tap. A tap on Pause ends the rule check, and the game stays
paused. Resume also ends it. One pause can hold several rule checks. The
post-game stats show the time and the count of rule checks. Plain pause
time is not tracked. Game time does not change: pauses stay outside every
clock and every phase total.

The change does not cover other reasons, a change of reason after the game
resumes, edits to pause or rule-check times, pause time on the round
summary, a list of single rule checks, or the phone screens of the mockup.
The phone companion is a later phase.

Decisions:

- 2026-10-25, Cal: the table can give a pause a reason, so that the app
  tracks where pause time goes. The options are the default pause and Rule
  check. The default pause is always the default option. Once paused, the
  table can select Rule check, so that the app logs the time of each rules
  discussion. Later builds may add more reasons.
- 2026-10-25, Cal: decision 1, option B. A reason starts at the tap that
  selects it, so a rule check splits the pause. The table can select Pause
  again to end the rule check, and the game stays paused. Cal: "its not a
  problem to miss a few seconds of a rule pause timing, and you may decide
  to turn it off later but keep the game paused". Alternative: A, the last
  selected reason covers the whole pause, which was the recommendation.
- 2026-10-25, Cal: decision 2, option A, changed. Only the post-game stats
  show pause time, and only the time of pauses with a reason. Plain pause
  time is not tracked, and the stats show no paused total. Cal: "we should
  only track paused with reason time, not the default/general pause".
  Alternatives: B, pause time on the round summary too, which was the
  recommendation, and the plain pause time and the paused total that
  option A included.
- 2026-10-25, Cal: decision 3, option A. Split `docs/product.md`, which
  has 395 lines, into linked pages in this branch, in its own commit with
  no wording change. Alternative: B, split it on a separate branch.
  Reason: the `documentation` skill asks for a split in the change that
  touches a spec page of more than about 250 lines.
- 2026-10-25: the default option shows as "Pause", the word that Cal used.
  A plain pause has no reason, so the saved game stores no reason for it.
- 2026-10-25: the saved game moves to version 4 under `.v4` keys, as the
  saved-game rule in `AGENTS.md` requires. Main took version 3 for player
  removals in PR #9 while this plan was open. When a `.v4` key is empty,
  load reads its `.v3` key, then `.v2`, then `.v1`. A game of version 1, 2,
  or 3 has no rule checks.
- 2026-10-25: a saved reason range that the parser cannot use is dropped,
  and the game stays valid. Its time counts as a plain pause. Reason: the
  reason only labels time, and the global rules prefer to continue on
  recoverable input. A new rejection would also need Cal's approval.
- 2026-10-25: a rule check counts in full also when a later undo takes back
  the tap before the pause. Reason: the table really spent that time,
  often on the rule check that led to the undo. The game clock does not
  change, because it already leaves out both ranges.

Contract owners:

- The product spec at `docs/product.md`, and its linked pages under
  `docs/product/` after the split.
- The mockup at `docs/mockups/index.html`.
- The [workspace README](../README.md).

## Design

- `types.ts` gets `PAUSE_REASONS = ['ruleCheck'] as const` and the type
  `PauseReason`. A `ReasonRange` is an `Interval` with a `reason`. A
  `Pause` is an `Interval` with `reasons`: its reason ranges, oldest first,
  each inside the pause. A pause with no range is a plain pause.
  `Game.pauses` holds `Pause` items, and `Game.version` becomes 4. `voids`
  keep the plain `Interval`.
- `pause` opens a pause with no reason range. The new command
  `setPauseReason(game, reason, now)` takes a reason, or null for a plain
  pause. It ends the open range of the open pause at `now`. For a reason,
  it then opens a new range at `now`. It returns the same game when no
  pause is open or when the reason does not change.
- `resume` ends the open range together with its pause. Undo does not
  touch pauses, as before.
- The reason moves no clock. Game time, the entries, and the action clock
  in `fold.ts` read only the `from` and `to` of each pause.
- `derive` gives the open pause: its running time since the pause began,
  its reason or null, and the running time of its open range. The pause
  overlay reads it from the view, not from the stored game.
- A new module `pauses.ts` totals the reason ranges: the time and the count
  for each reason, in `PAUSE_REASONS` order. An open range counts up to
  `now`. A range counts only inside its pause, so a broken saved range
  cannot count more than its pause. `derive` puts the totals in the view.
  `stats.ts` keeps the entry stats. It has 183 lines now.
- `parse.ts` reads versions 1 to 4. A pause of version 1, 2, or 3 gets no
  reason range. In a version 4 pause, a missing range list becomes empty,
  and a broken range or a range with an unknown reason is dropped.
  `storage.ts` puts the `.v4` keys in front of the `.v3`, `.v2`, and `.v1`
  keys. Save and archive remove the older keys, as before.
- The pause overlay moves from `GameScreen.tsx` into its own screen
  component. It gets an accessible single-choice control with Pause, the
  default, and one option for each reason. One label map in `src/ui/`
  gives "Pause" and "Rule check". While a reason is selected, the card also
  shows the running time of the open range.
- The post-game stats get one stat tile for each reason, with its time and
  its count, as the mockup shows. The tiles come from a component in its
  own file, because `StatsScreen.tsx` has 254 lines.
- The mockup holds the pause card styles, with the class names of
  `src/styles/app.css`. Milestone 5 ports them to `src/styles/mockup/` and
  removes the copies from `src/styles/app.css`.

## Milestone 1: Documentation and spec

State the pause reasons as requirements before the code changes.

- [x] Decision 3: split `docs/product.md` into linked pages under
      `docs/product/`, each under about 250 lines. Move the text with no
      wording change, in its own commit. Fix the links inside the spec.
- [x] Add a "Pauses" section to the spec with these requirements and the
      decisions in force:
  - [x] A pause stops every clock and charges nobody.
  - [x] A new pause is a plain pause. The table can select a reason only
        while the game is paused. The one reason is Rule check.
  - [x] Decision 1: a rule check runs from the tap that selects it to the
        tap on Pause or to Resume. The game stays paused when the rule
        check ends. One pause can hold several rule checks. Give the
        rejected option.
  - [x] Pause time is outside game time. A rule check counts in full, also
        when a later undo takes back the tap before the pause. Undo does
        not change a pause or its rule checks.
  - [x] Decision 2: only time with a reason is tracked. The post-game
        stats show the time and the count for each reason. Give the
        rejected options.
  - [x] A game from an older build has no rule checks.
- [x] Link the answer "Pausing the clock" to the new section. Add rule
      checks to the should-have pause item.
- [x] Add the pause screen to the screen table. Add the rule-check time to
      the Post-game Stats row.
- [x] Update `README.md`: rule checks in the key features, and `pauses.ts`
      and the pause reason in the key code.
- The split is commit 490bdfc. Evidence:
  `.context/pause-reasons/split/verify.log`: the old spec, rebuilt from
  the new pages, matches byte for byte.

## Milestone 2: Mockup

Tags: mockup

Show the pause screen and the rule-check time before the screens change.

- [x] Add the iPad screen "Game Paused" next to the action phase screens:
      the pause card over the action screen, with the pause clock, the
      reason control with Pause selected, and RESUME. Reuse a choice style
      that the mockup has, such as the player count on setup.
- [x] Add the screen "Game Paused — Rule Check", with Rule check selected
      and the running time of the rule check under the pause clock.
- [x] Post-game stats: show the time and the count of rule checks. Show no
      plain pause time and no paused total. Keep every existing panel and
      figure.
- [x] Write the notes of the new screens. Update the note of the post-game
      stats.
- [x] Put the pause card styles in the mockup, with the class names that
      `src/styles/app.css` uses now.
- [x] Render the new and changed screens in headless Chrome. Save the
      screenshots under `.context/pause-reasons/mockup/`.
- The pause card reuses `.overlay`, which the mockup already had for the
  Naalu picker. The post-game stats show rule checks as a fifth stat tile.
- Evidence: `.context/pause-reasons/mockup/*.png` and `render.log`. No
  screen has a script error.

## Milestone 3: Merge origin/main

Main added the removal of a player who leaves the game (PR #9), with
saved-game version 3. Merge it before the model changes, and keep both
sides of each conflict.

- [x] Commit Milestones 1 and 2: a86328e, 5b03115, and e3865f2.
- [x] Merge `origin/main` at b6f658d. Resolve `docs/product.md` by
      splitting main's spec again, then put the pause edits back. Keep
      both sides in the mockup navigation and the post-game stats note.
- [x] Check the merge: the spec pages hold main's text word for word, the
      links work, the mockup has no script error, and the unit tests pass.
- [x] Move this plan to saved-game version 4, because main took version 3.
- Merge commit 114d814. Justifications:
  `.context/pause-reasons/merge/justifications.md`. The PR description
  copies them. Evidence: `verify-spec.log` and `audit-merge.log` beside it.

## Milestone 4: Game model

Store the rule checks of each pause, total their time, and keep the saved
games of older builds loading.

- [x] `types.ts` and `commands.ts`: the reasons, `ReasonRange`, `Pause`,
      version 4, `setPauseReason`, and a `resume` that ends the open range.
- [x] `derive` and the view: the open pause with its reason, and the totals
      for each reason.
- [x] `pauses.ts`: the totals.
- [x] `parse.ts` and `storage.ts`: version 4 under the `.v4` keys, with the
      `.v3`, `.v2`, and `.v1` fallback.
- [x] `test-table.ts`: a step that sets the pause reason.
- [x] Unit tests with the fake clock:
  - [x] A new pause has no reason, also after a pause with a rule check.
  - [x] A rule check starts at the tap that selects it. A tap on Pause ends
        it, and the game stays paused. Resume ends an open rule check.
  - [x] Two rule checks in one pause count as two.
  - [x] A reason change while the game runs returns the same game. A tap on
        the current reason returns the same game.
  - [x] A reason change moves no clock: the game time, the timer, the
        entries, and the pause clock stay the same.
  - [x] The totals give the time and the count of rule checks, with no
        plain pause time. An open rule check counts up to `now`.
  - [x] A rule check inside a range that a later undo voids counts in full.
  - [x] A saved range that reaches outside its pause counts only inside
        the pause.
  - [x] A version 4 game loads with its rule checks. A version 3 game loads
        from its `.v3` key with no rule checks. Versions 1 and 2 still
        load.
  - [x] Save and archive remove the `.v3`, `.v2`, and `.v1` keys.
  - [x] A range with an unknown reason, a broken range, and a missing range
        list load as no rule check. A version 5 game is invalid.
- [x] Move the existing storage tests from the `.v3` keys to the `.v4`
      keys, with the same assertions. The unknown-version test moves from
      version 4 to version 5.
- `src/model/pauses.test.ts` holds the pause tests, and
  `src/model/storage.test.ts` the version 4 tests. Evidence:
  `.context/pause-reasons/mutations.log`: each of eight broken pause rules
  makes at least one test fail.

## Milestone 5: Screens

Tags: ui

Show the reason control and the rule-check time as the mockup shows them.

- [x] Move the pause overlay from `GameScreen.tsx` into its own screen
      component. Read the open pause from the view.
- [x] Add the reason control. A tap sets the reason at the time of the
      tap. Show the running time of an open rule check.
- [x] Port the pause styles from the mockup to `src/styles/mockup/`, and
      remove their copies from `src/styles/app.css`:
  - [x] `.pause-card`, `.reasons`, `.reason-time`, and `.big.small`.
  - [x] `.stat-grid.five`, for the fifth stat tile.
  - [x] `.overlay` and `.dialog`: the mockup holds them in its Naalu block,
        but the Naalu port left them in `src/styles/app.css`.
- [x] Post-game stats: the time and the count of rule checks, from a
      component in its own file.
- [x] Scratch smoke test, not committed: build, serve the preview, and
      drive it in headless Chrome.
  - [x] Pause, and see Pause selected. Select Rule check, then Pause, and
        see that the game stays paused.
  - [x] Select Rule check again, reload, and see Rule check still selected.
  - [x] Resume, pause again, and see Pause selected.
  - [x] End the game. Check the rule-check time and a count of 2 on the
        post-game stats.
  - [x] Load a saved version 3 game with a pause. Check that it loads with
        no rule checks.
  - [x] Save the log and the screenshots under
        `.context/pause-reasons/smoke/`.
- The pause card is `src/ui/screens/PauseOverlay.tsx`, the tiles are
  `src/ui/screens/ReasonTiles.tsx`, and `src/ui/reasons.ts` holds the
  words for each reason.
- Evidence: `.context/pause-reasons/smoke/smoke.log` and the screenshots
  beside it. All 22 checks passed, with no console error.

## Milestone 6: Verification, commit, and review

Run the checks, push, and review the branch.

- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
  Evidence: `.context/pause-reasons/check.log`.
- [x] Commit with Conventional Commits, push the branch, and open the pull
      request. Link it in the status paragraph.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.
  - Review 1 found 3 findings. Fixed: 1, the pause card had no dialog role
    for screen readers. Option B: a shared `Overlay` control sets the role
    for every full-stage overlay. Report:
    `.context/pause-reasons/review-1.md`.
  - Review 2 checked fix commit b93292e: finding 1 is resolved, and it
    found no new finding. Report: `.context/pause-reasons/review-2.md`.
  - The fix round ran the smoke test again with checks for the dialog role:
    25 of 25 passed. Its log replaced the first run in
    `.context/pause-reasons/smoke/smoke.log`.
  - 2. New clock-step rules have no test. Severity Low, effort Small. Recommended: A, example tests that step the fake clock back during a rule check.
  - 3. Pause card says no clock runs. Severity Low, effort Small. Recommended: B, "Game paused · no game clock is running" in the app and the mockup.
  - `src/ui/screens/SettingsScreen.tsx` and `src/ui/screens/SeatingScreen.tsx`: the Settings and Seating screens cover the game screen without a dialog role, so VoiceOver can reach the hidden game buttons. Separate branch.

## Post-merge follow-up (non-blocking)

- [ ] Check that the deploy step passed on `main`.
- [ ] On the iPad, pause a game, select Rule check, select Pause, resume,
      and check the rule-check time on the post-game stats.
