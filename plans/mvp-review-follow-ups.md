# MVP review follow-ups

Status: Active. [PR #2](https://github.com/calummoore/twilight-timer/pull/2) is open. The plan
closes when its PR merges.

[PR #1](https://github.com/calummoore/twilight-timer/pull/1) shipped the TI4
Tempo MVP, and its review left six findings open. On 2026-10-23, Cal answered
four of them, and this change applies those answers. Finding 6, the versioned
storage key, stays open. Finding 11 no longer applies, because the answer to
finding 1 replaces the recommendation that it questioned. The findings and
their options are in the [MVP plan](ti4-tempo-mvp.md).

Decisions:

- 2026-10-23, Cal: finding 1 = B. Undo always charges the time from the
  undone tap to the undo to nobody, so every clock returns to its value at
  the tap. Alternative: A, void the time only when the tap changed which
  clock ran. Reason: one rule that matches the spec, with no hand-written
  clock check.
- 2026-10-23, Cal: finding 3 = B. The top bar stays above the reaction
  window backdrop, so Pause, Undo, Settings, and the speaker chip work
  while the window is open. Alternative: A, a Pause button in the window
  footer. Reason: one change keeps every game-wide control reachable.
- 2026-10-23, Cal: finding 5 = A. Example tests for the undo and timing
  paths that had no test. Alternative: B, one seeded random test.
- 2026-10-23, Cal: finding 10 = B. One shared plural helper for the counts
  on screen. Alternative: A, singular forms written inline.

Contract owners:

- The product spec at [docs/product.md](../docs/product.md).
- The mockup at [docs/mockups/index.html](../docs/mockups/index.html).

## Milestone 1: Documentation

- [x] State in the spec that the top bar stays usable while a reaction
      window is open.
- [x] Record the answers to findings 1, 3, 5, and 10 in the MVP plan, and
      tick its deploy follow-up.

## Milestone 2: Mockup

Tags: mockup

- [x] Keep the top bar above the scrim on the mockup's reaction screen, and
      move the window panel below the top bar.
- [x] Say in the reaction screen note that the table can pause or move the
      speaker during the window.

## Milestone 3: Undo rule and tests

- [x] Change the undo test for a tap that changes no clock, so that it
      expects the clock at its value at the tap. See it fail.
- [x] Make undo always add the void, and delete the clock check.
- [x] Add example tests: undo of the game end, undo across a pause, undo
      after a window closed itself, entries that add up to the game time
      over a round, and saved games with an unknown version or a broken
      pause range.

## Milestone 4: Screens

Tags: ui

- [x] Keep the game top bar above the reaction window backdrop, as in the
      mockup.
- [x] Add a shared `plural` helper to `src/ui/format.ts`, and use it for
      the counts on screen.

## Milestone 5: Verification, commit, and review

- [x] Run the complete gate named in `AGENTS.md`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.
  - The review found one finding and no `Auto-fix: yes` finding, so no fix
    round ran. Report: `.context/mvp-review-follow-ups/review-1.md`.
  - 13. Pause during a reaction window has no test. Severity Low, effort Small. Recommended: B, three examples in `reaction.test.ts`: a pause, a game end, and a limit change during an open window.

## Post-merge follow-up (non-blocking)

- [ ] Check that the deploy step passed on `main`.
- [ ] On the iPad, open a reaction window and check that Pause works.
