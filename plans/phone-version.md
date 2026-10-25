# Phone version

Status: Active. The work is on branch
`calummoore/player-mobile-version-mockups`, with no pull request yet. The plan
closes when its pull request merges.

TI4 Tempo runs a Twilight Imperium game on one shared table device. The first
release drew a fixed 1194 by 834 iPad layout and scaled it to fit the window.
On a phone, that layout was a third of its size, and the page was blank
because of a centring bug. This change makes the app responsive. A phone, an
iPad, and a computer show the same screens with the same content and
controls. Only the arrangement changes with the space that the app has.

The plan does not cover the phone companion, where each player uses their own
phone with live sync. The spec keeps it as phase 2.

Decisions:

- 2026-10-23, Cal: "player mobile version" means that a phone can run the
  whole game (review 1, decision 10, option A). Alternatives: the phone
  companion, or both. Reason: phones work now, with no server.
- 2026-10-23, Cal: "mobile should mirror ipad mode, they should be the same
  (but layout may need to change obviously based on screen size)", and "can
  we not use window port sizes? responsive design?" (review 1, decision 11).
  One responsive app arranges the same screens for the space. Rejected: a
  window-size rule that switches between separate phone and iPad layouts, and
  the scaled stage.
- 2026-10-23, Cal: write this plan, and put the requirements in the spec
  first (review 1, finding 1, option A).
- 2026-10-23, Cal: the mockup draws both layouts from one definition of each
  screen, and the iPad layouts match the built app. Controls that the first
  release left out stay in the mockup, marked "Later" (finding 2, option C).
  Each label is defined once (finding 6, option B). This also settles finding
  9, the phone stats time format.
- 2026-10-23, Cal: the top bar stays above the reaction window on every
  device (finding 5, option B). This settles finding 3 of the MVP review.
- 2026-10-23: each screen has one template, and CSS container queries
  arrange it for the width of its container. The mockup draws that template
  in an iPad frame and a phone frame, and the app ports the same CSS.
  Alternative: separate phone templates, as in commit `c2205db`. Reason: one
  source for the content, the labels, and the CSS, as the two decisions
  above ask.
- 2026-10-23: the pause overlay and the confirmation dialogs still cover the
  top bar. Reason: the overlay freezes the game and a dialog waits for an
  answer, so an Undo behind them would change the game under them. Cal can
  widen finding 5 to them.
- 2026-10-25, Cal: finding 25 = B. Each label set that two layouts show has
  one list: the stats column names, and the top bar phase names of finding
  16. Alternative: A, one list for the stats columns only. Reason: one
  pattern settles both findings.
- 2026-10-25, Cal: finding 22 = B. The top bar stays at the top at every
  height, so Undo and Pause stay in reach on a phone held sideways.
  Alternatives: A, record that the bar scrolls away under 500 px tall; C, a
  one-row bar for short windows; D, upright-only phones with a prompt to turn
  a sideways phone. Reason: Undo stays permanent, as the design principles
  say. The bar covers the active player's name when End Turn is in view.
- 2026-10-25, Cal: decision 19 = A. The faction menu may cut a long faction
  name in a tight seat row. Alternatives: B and D, a wider faction menu; C,
  a seat list that is its own size container. Reason: the open menu list
  shows each full name, so the table can still pick and check a faction.
- 2026-10-25, Cal: finding 28 = D. The game top bar is compact up to 740 px
  wide, and up to 900 px wide on windows 500 px tall or less: two lines and
  a thin phase line. Alternatives: A, accept the hidden clock; B, the compact
  bar only on short windows; C, a one-row bar for short windows. Reason: the
  whole clock shows on sideways phones, and the bar never wraps its buttons.
- Open, for Cal: review 1 findings 4, 7, and 8.

Contract owners:

- The [product spec](../docs/product.md) and the
  [core concepts](../docs/concepts.md).
- The [mockup](../docs/mockups/index.html).
- The [workspace README](../README.md) and `AGENTS.md`.

## Milestone 1: Documentation and spec

State the responsive requirement and the top bar rule in the spec before the
mockups and the build change.

- [x] Split `docs/product.md`, which passes the 250-line target. Move the core
      concepts, word for word, to `docs/concepts.md`.
- [x] Add the requirements to `docs/product.md`: every table device shows the
      same screens, and the layout follows the space. The top bar stays
      usable while a reaction window is open.
- [x] Describe the device switch and the "Later" marker in the spec's mockup
      section and in `README.md`.

## Milestone 2: Mockups

Tags: mockup

Draw every table screen once, in an iPad frame and a phone frame, so that the
two layouts cannot drift.

- [x] Add a phone layout to each table screen, the Paused and Pass Warning
      screens, and the device switch. Commit `c2205db`.
- [x] Add the Between rounds row to the phone stats (review 1, finding 3).
      Commit `33608e1`.
- [x] Make the frame a size container. Arrange each screen with container
      queries. Remove the separate phone templates and their styles.
- [x] Bring the iPad layouts in line with the built app: copy, controls, and
      demo data. Mark each control that the app leaves out "Later".
- [x] Keep the top bar above the reaction window. Start the window below it.
- [x] Add an upright iPad frame, 834 by 1194, to the device switch.
- [x] Rewrite the phone notes for the shared templates.
- [x] Screenshot every table screen in every frame. Check for script errors
      and sideways overflow. Evidence: `.context/phone-version/`, with
      `interact.log` for the device switch, the keys, and the links.

## Milestone 3: Top bar above the reaction window

Tags: ui

Make Pause, Undo, Settings, and the speaker chip usable while a reaction
window is open.

- [x] Put the in-game top bar above the reaction window scrim, and start the
      window below the top bar.
- [x] Smoke test: open a reaction window on the dev server, then pause and
      resume. Evidence: `.context/phone-version/app/m3-*.png`.

## Milestone 4: Responsive app

Tags: ui

Replace the scaled stage with the responsive layout from the mockups.

- [x] Replace the stage with a full-window root that is a size container.
- [x] Port the mockup's container queries to `src/styles/mockup/`.
- [x] Move layout styles from the screen components into classes. Add the
      markup that the responsive CSS needs.
- [x] Respect the safe areas of phones with a notch.
- [x] Use device-neutral copy: "Stops the screen sleeping mid-game."
- [x] Let the web app manifest open in any orientation.
- [x] Update the Product section of `AGENTS.md` and the key code in
      `README.md`.
- [x] Smoke test on the dev server at phone, upright iPad, iPad, sideways
      phone, and desktop sizes.
  - A scripted game ran from setup to the post-game stats at eight window
    sizes, from 375 by 667 to 1440 by 900, with no script error and no
    sideways overflow. The production build passed the same run at 393 by
    852. Evidence: `.context/phone-version/app/`.
  - `responsive.css` matches the mockup word for word. Evidence:
    `.context/phone-version/css-sync.log`.
- [x] Centre the text of the big buttons, as the mockup does. The app's
      button reset had aligned it to the left since the first release.

## Milestone 5: Verification, commit, and review

Run the checks, push, and review the branch.

- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Merge `origin/main` into the branch, which brings in PRs #2 to #10:
      the Politics speaker choice, Mark all done, the safe-area stage, and
      the Naalu "0" token with the required faction list. The branch keeps
      the responsive stage, and the stage contains the fixed overlays inside
      the safe area. The mockup and the ported CSS carry main's screens.
      Justifications for each path: `.context/phone-version/merge-notes.md`.
- [x] Let a dialog that is taller than a short window scroll inside its
      overlay. The checks after the merge found the Naalu token dialog cut
      off on a phone held sideways, with its Cancel button out of reach.
      Evidence: `.context/phone-version/merge/safe/dialog-before.log` and
      `dialog-after.log`.
- [x] Merge `origin/main` again for PR #9, which removes a player who leaves
      the game. Its dialogs open as a bottom sheet on a phone, and the
      mockup draws its screens in every frame. Justifications:
      `.context/phone-version/merge-notes.md`.
- [x] Leave a 10 px gap between the top bar buttons and the phase line on a
      phone, as Cal asked on 2026-10-25. A later rule had reset the gap.
      Evidence: `.context/phone-version/merge/topgap/`.
- [x] Merge `origin/main` again for PRs #12 and #15: closing the reaction
      window ends the turn, and setup gets the expansions and a random
      faction deal. The seat list subgrid takes the responsive columns, and
      a phone keeps its seat cards. Justifications:
      `.context/phone-version/merge-notes.md`.
- [x] Merge `origin/main` again for PR #11, three- and four-player games.
      The mockup no longer marks them as Later, and a phone shows both
      cards of each player. Justifications:
      `.context/phone-version/merge-notes.md`.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.
  - Review 1 ran on commits `3620109` and `c2205db`. Fixed: finding 3.
    Report: `.context/phone-mockups/review-1.md`.
  - Review 2 ran on the full branch after commit `866c2f5`. Fixed: 9, 10, 11, 12, 13, and 17. Report: `.context/phone-version/review-2.md`. Evidence: `.context/phone-version/reach-after-fix.log`.
  - Review 3 re-checked the fix commit `01fb447`: findings 9 to 13 and 17 are resolved. New finding 18, colour swatches wrap and stretch the seat rows, is fixed with option B. Verification after it found the 320 and 360 px wide phones scrolled sideways on two screens; the same commit fixes that. Report: `.context/phone-version/review-3/`.
  - Review 4 ran on the branch after the two merges of `origin/main`, at commit `33d0eb4`. Its findings 1 to 5 are numbered 21 to 25 here. Fixed: 21, 16 px fields where an iPhone shows the app; 23, the layout helpers move to `layout.css`; and 24, two comments name only the reaction window. Report: `.context/phone-version/review-4.md`. Evidence: `.context/phone-version/merge/fields-after-arrow.log`.
  - Review 5 re-checked the fix commit `f328463`: findings 21, 23, and 24 are resolved. New finding 26, upright iPads cut long faction names, is fixed with option B: the 16 px fields apply to phones only. New finding 27 asked for the follow-up line of finding 21 below. Report: `.context/phone-version/review-5.md`. Evidence: `.context/phone-version/merge/fields-after-26.log`.
  - 22. Undo and Pause scroll off sideways phones. Decided 2026-10-25: B. Evidence: `.context/phone-version/finding-22/`.
  - Review 6 checked commits `9c4fae6`, `60bd775`, `d6af04b`, and `a460113`. No finding is Auto-fix yes. Report: `.context/phone-version/review-6.md`.
  - 28. Sticky top bar covers clocks on small sideways phones. Decided 2026-10-25: D. It also fixes the two top bar problems from 601 to 730 px wide. Examples: `.context/phone-version/finding-28/`.
  - 29. Decisions 22 and 19 live only in the plan. Severity Low, effort Small. Recommended: A, add both to `docs/product.md`.
  - 30. Reaction window sticky rule has no effect now. Severity Low, effort Small. Recommended: B, one sticky base rule for the top bar.
  - 31. Phone phase line gap is set twice. Severity Low, effort Small. Recommended: B, side margins in place of the shorthand.
  - Review 7 checked the merge `3951140` of PRs #12 and #15. Fixed: 32, the reaction footer note may break inside a long word in the narrow layout; 33, the Random Factions note says the chips wrap on a phone; and 34, PR #12 settled the recorded line about the demo reaction clock, which now counts overtime as the app does. Report: `.context/phone-version/review-7.md`.
  - Review 8 checked `3d141dc` and the merge `9a1bfe9` of PR #11: findings 32 to 34 are resolved. Fixed: 35, on a phone, Pass takes its own row when the three buttons of a two-card turn do not fit; and 36, the decision line below names only what it covers. Report: `.context/phone-version/review-8.md`.
  - Review 9 checked `88ce738`, option D of finding 28. The phone layout and the other top bars do not change. Fixed: 40, the decision line on the phone layout band names finding 28 only as a previous example. Report: `.context/phone-version/review-9.md`.
  - 39. Short sideways windows still cut the clocks. Severity Medium, effort Small. Recommended: B, the phone sizes for the hero and the agenda screen on windows 360 px tall or less.
  - Decision: one shared wrapping row for rows of controls, such as the hero buttons, the reaction footer, and the top bar tools, so that the last controls move to a new line when they do not fit. Effort Medium. Covers finding 35. Previous examples: `7fa480d` for review 3, findings 28 and 32, and the reaction tile grid line.
  - Decision: use the phone layout up to about 700 to 760 px wide, in place of 600 px. Effort Small. Covers finding 32 and the tile grid line below. A new phone limit must move the 740 px limit of the compact top bar too. Previous examples: finding 28, fixed in `88ce738`, and the 320 and 360 px phones of review 3, fixed in `7fa480d`.
  - 4. Phone History and Join have no way in. Severity Low, effort Small. Recommended: B, add the controls.
  - 7. Up and down keys block keyboard scrolling. Severity Low, effort Small. Recommended: A, use the I and P keys.
  - 8. Mockup file grows past 2,000 lines. Severity Low, effort Small. Recommended: A, record an exception in `AGENTS.md`.
  - 14. Limit changes do not reach an open reaction window. Severity Low, effort Small. Recommended: A, state the current rule in `docs/concepts.md`.
  - 15. No model tests for top bar taps during a window. Severity Low, effort Small. Recommended: A, three model tests.
  - 16. Top bar defines the phase labels twice. Decided 2026-10-25 with finding 25: one phase table.
  - 25. Stats column labels are defined twice. Decided 2026-10-25: B, one list for each label set. The app and the mockup render the same labels as before. Evidence: `.context/phone-version/finding-25/`.
  - Follow-up: give every field 16 px text at every size, finding 21 option C. Effort Small. Covers finding 21. Previous examples: none found.
  - Decision 19, the seat list as its own size container (finding 18, option C), and the cut faction names: decided 2026-10-25, A. The cut names stay. Examples: `.context/phone-version/decision-19/`.
  - `docs/product.md`: "Must have (v1, iPad only)" and "Live sync between iPad and phones" still name only the iPad. Separate branch.
  - `src/styles/mockup/reaction.css`: with long player names, the three-column tile grid is wider than the window at about 601 to 650 px. Separate branch.
  - Review 1 also listed three iPad mockup problems outside its scope: the reaction clock runs behind the scrim, the agenda runs two clocks, and the strategy demo picks skip Kira. Milestone 2 fixes them while it aligns the iPad layouts with the app.
  - `docs/mockups/index.html`: no iPad layout opens the Join screen. Finding 4 covers it.
  - `docs/mockups/index.html`: the companion Pass Confirmation note calls it the only confirmation dialog. Separate branch.
  - `src/ui/screens/StatsScreen.tsx`: the Between rounds bar has low contrast against its track. Separate branch.
  - `docs/mockups/index.html`: the file is built from sources in `~/tools/mock/`, outside the repository, so a new build can lose a direct edit. Separate branch.
  - `docs/mockups/index.html`: a script comment says that overlays open under the top bar, but only the reaction window does, as in finding 24. Separate branch.
  - `docs/mockups/index.html`: in the upright iPad frame, the stats top bar wraps the text of its four buttons, because of the two Later export buttons. Separate branch.
  - `docs/mockups/index.html`: the History log shows a turn that ends after "Reaction window closed", which PR #12 no longer allows. origin/main has the same log. Separate branch.
  - `src/styles/mockup/responsive.css`: the phone rule `.count b{padding:10px 0}` does not reach the app's count buttons, so they are 2 px taller than in the mockup. Separate branch.
  - `docs/mockups/index.html`: the setup note says that the iPad keeps the expansion choice, but any table device keeps it. origin/main has the same note. Separate branch.
  - `src/styles/mockup/responsive.css`: from 901 to 948 px wide, the one-row top bar wraps onto two lines, so it is 81 px tall, not 68 px. Separate branch.
  - `src/styles/mockup/responsive.css`: from 741 to about 824 px wide, a long speaker name wraps in the speaker chip, so the two-row top bar is 124 to 141 px tall. Separate branch.

## Post-merge follow-up (non-blocking)

- [ ] Check that the deploy step passed on `main`.
- [ ] Play one round on a phone and one on an iPad, from the deployed app.
