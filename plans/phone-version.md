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

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
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
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.
  - Review 1 ran on commits `3620109` and `c2205db`. Fixed: finding 3.
    Report: `.context/phone-mockups/review-1.md`.
  - Review 2 ran on the full branch after commit `866c2f5`. Fixed: 9, 10, 11, 12, 13, and 17. Report: `.context/phone-version/review-2.md`. Evidence: `.context/phone-version/reach-after-fix.log`.
  - Review 3 re-checked the fix commit `01fb447`: findings 9 to 13 and 17 are resolved. New finding 18, colour swatches wrap and stretch the seat rows, is fixed with option B. Verification after it found the 320 and 360 px wide phones scrolled sideways on two screens; the same commit fixes that. Report: `.context/phone-version/review-3/`.
  - 4. Phone History and Join have no way in. Severity Low, effort Small. Recommended: B, add the controls.
  - 7. Up and down keys block keyboard scrolling. Severity Low, effort Small. Recommended: A, use the I and P keys.
  - 8. Mockup file grows past 2,000 lines. Severity Low, effort Small. Recommended: A, record an exception in `AGENTS.md`.
  - 14. Limit changes do not reach an open reaction window. Severity Low, effort Small. Recommended: A, state the current rule in `docs/concepts.md`.
  - 15. No model tests for top bar taps during a window. Severity Low, effort Small. Recommended: A, three model tests.
  - 16. Top bar defines the phase labels twice. Severity Low, effort Small. Recommended: B, one phase table.
  - Decision: make the seat list its own size container, so that each seat row picks its form from its own width (finding 18, option C). Effort Small. Covers findings 10 and 18. Since the merge of `origin/main`, tight seat rows also clip long official faction names, at about 1024 px wide and on phones held sideways.
  - `docs/product.md`: "Must have (v1, iPad only)" and "Live sync between iPad and phones" still name only the iPad. Separate branch.
  - `src/styles/mockup/reaction.css`: with long player names, the three-column tile grid is wider than the window at about 601 to 650 px. Separate branch.
  - `docs/mockups/index.html`: the demo reaction clock counts into overtime, but the app closes the window at its limit. Separate branch.
  - Review 1 also listed three iPad mockup problems outside its scope: the reaction clock runs behind the scrim, the agenda runs two clocks, and the strategy demo picks skip Kira. Milestone 2 fixes them while it aligns the iPad layouts with the app.
  - `docs/mockups/index.html`: no iPad layout opens the Join screen. Finding 4 covers it.
  - `docs/mockups/index.html`: the companion Pass Confirmation note calls it the only confirmation dialog. Separate branch.
  - `src/ui/screens/StatsScreen.tsx`: the Between rounds bar has low contrast against its track. Separate branch.

## Post-merge follow-up (non-blocking)

- [ ] Check that the deploy step passed on `main`.
- [ ] Play one round on a phone and one on an iPad, from the deployed app.
