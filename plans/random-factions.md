# Random faction deal

Status: Active. [PR #14](https://github.com/calummoore/twilight-timer/pull/14)
is open. The plan closes when its PR merges.

On the setup screen, BEGIN GAME stays off until every seat has a faction.
So each game needs five to eight faction picks, also each test game. Many
TI4 tables also deal factions at random. This change adds a random deal to
the Game panel of the setup screen. A tap gives each seat with no faction a
random faction that no other seat holds. The deal uses only the factions of
the base game and of the expansions that the table chooses. The same choice
limits the faction list of each seat.

The base game has 17 factions, Prophecy of Kings has 7, and Thunder's Edge
has 5. The Council Keleres came in Codex III, a free print-at-home pack.
The Thunder's Edge box also includes it. Retail listings say that Thunder's
Edge needs only the base game. Sources:
[the Thunder's Edge announcement](https://www.fantasyflightgames.com/en/news/2025/7/31/thunders-edge/)
and [the Thunder's Edge wiki page](https://twilight-imperium.fandom.com/wiki/Thunder's_Edge).

The change does not cover player counts or colours, although 7 or 8
players and the orange and pink colours need Prophecy of Kings. The deal
applies no faction rules. For example, the Council Keleres needs at least
one of Mentak, Xxcha, and Argent Flight out of play, and the table fixes
such a deal by hand. The change also does not cover a random speaker, a
faction draft, or the Twilight's Fall mode of Thunder's Edge, which uses no
normal factions.

Decisions:

- 2026-10-25, Cal: add a random faction deal, which "really helps with
  manual testing", and ask the table which expansions it plays with. The
  deal is a product feature for every table, not a test tool, because many
  tables deal factions at random. Cal answered the decisions below on this
  basis.
- 2026-10-25, Cal: decision 1, option A. The deal fills only the seats with
  no faction, and its button shows only while a seat has no faction.
  Alternatives: B, deal a new faction to every seat at each tap, and C, fill
  the empty seats, then re-deal every seat. Reason: one tap still fills a
  new setup, and the deal never discards a faction that a player chose.
- 2026-10-25, Cal: decision 2, option B. The Game panel shows one chip for
  each expansion, next to the random deal. The app saves the choice with
  the settings. Alternatives: A, a panel on the Settings screen with a
  read-only row on setup, and C, a picker at the first tap of the deal.
  Reason: the choice sits next to the button that uses it, and the table
  sees it at every setup.
- 2026-10-25, Cal: decision 3, option B. Three chips: Prophecy of Kings,
  Thunder's Edge, and Council Keleres. The base game has no chip, because
  it is always in play. Alternatives: A, two chips with the Keleres in
  Thunder's Edge, and C, one choice of version. Reason: each chip names the
  factions that it adds, so every collection fits, also a printed Codex III.
- 2026-10-25, Cal: decision 4, option B. The faction list of each seat
  shows only the factions of the base game and the chosen expansions. A
  seat keeps the faction that it holds when its expansion turns off.
  Alternative: A, the chips limit only the deal. Reason: one setting then
  means "the factions we play with", and a shorter list is faster to use
  on the iPad.
- 2026-10-25, Cal: decision 5, option A. All three chips start on.
  Alternative: B, only Prophecy of Kings on. Reason: nothing changes for a
  table that never touches the chips.
- 2026-10-25, Cal: create the plan, then build only the mockup milestone.
  Milestone 1 and the milestones after Milestone 2 wait for Cal.
- 2026-10-25, Cal: review 1 finding 1, option B. Write Milestone 1 now,
  from the five recorded decisions. Alternative: A, write it after the
  mockup review. Reason: the spec text depends on nothing open. This
  replaces the wait for Milestone 1 in the entry above.
- 2026-10-25, Cal: review 1 finding 5, option A. Add the three missing
  checks to Milestones 3 and 4. Alternative: B, also a model function for
  the deal button rule. Reason: the deal button uses the condition that
  turns BEGIN GAME off, so a smoke check is enough.
- 2026-10-25, Cal: review 2 finding 6, option B. One decision line under
  the review TODO tracks the button reset. Alternative: A, keep the
  outside-scope line beside it.
- 2026-10-25, Cal: decision 7, option B. The app button reset centres
  button labels, and only the rules that need it set left alignment. A
  separate branch does it and checks every button rule. Alternative: A,
  each rule from the mockup sets its own alignment. Reason: a right
  default removes the class of drift, and it centres BEGIN GAME, BEGIN
  ACTION PHASE, and END TURN, as the mockup shows.

Contract owners:

- The product spec at `docs/product.md`.
- The mockup at `docs/mockups/index.html`.
- The [workspace README](../README.md).

## Design

- `src/model/factions.ts`: each faction gets its game set, which is the
  base game or one of three expansions. A list of the expansions gives each
  its id and its name: `pok`, `te`, and `keleres`. The faction ids do not
  change.
- The settings get `expansions`: one on or off value for each expansion,
  all on by default. The parser falls back to the default for each value
  that is missing or broken.
- The settings key stays `ti4tempo.settings.v1`. The versioned-key rule in
  `AGENTS.md` is for saved games. Settings saved by an older build load
  with every expansion on, and an older build ignores the new field. When
  an older build saves its settings, the choice returns to the default.
- A new module, `src/model/deal.ts`, holds three pure functions:
  - The factions in play: the factions of the base game and the chosen
    expansions, in name order.
  - The choices of one seat: the factions in play, and the faction that
    the seat holds when its expansion is off, in name order.
  - The deal: it gives each empty seat inside the seat count a faction
    from the factions in play that no row holds. Rows past the seat count
    keep their factions, and the deal leaves those factions out, so a
    larger count later has no duplicate. When the pool runs out, the
    remaining seats stay empty. With the base game always in play, the
    pool cannot run out at 8 seats.
- The caller passes the random source, as it passes the time. The screen
  passes `Math.random`, and the tests pass a fixed sequence.
- The setup screen:
  - The Game panel shows the "Expansions" label and the three chips above
    BEGIN GAME. A tap turns a chip on or off and saves the settings.
  - While a seat has no faction, the panel shows the hint and the button
    "Random factions for empty seats", above BEGIN GAME.
  - The summary rows of the Game panel scroll when the panel is full. So
    the chips, the deal, and BEGIN GAME always stay in view.
  - Each faction list shows the choices of its seat.
  - Every seat row keeps one faction column width. The seat list becomes
    one grid, and each row takes its columns from it with CSS subgrid.
    So a seat that keeps a faction outside the chosen expansions does not
    shift its row. A browser without subgrid keeps the current columns of
    each row.
  - The setup screen gets a callback that saves changed settings.
    `App.tsx` passes its settings change handler.
  - The new mockup classes move to `src/styles/mockup/setup.css`.
- The saved game does not change. It stores faction ids, and the
  expansions matter only at setup.
- The setup screen has no phone variant. The phone companion has no setup
  screen, and the iPad stage scales to fit the window.

## Milestone 1: Documentation and spec

State the expansions, the faction lists, and the deal as requirements
before the code changes.

- [x] Update "Factions" in `docs/product.md`: the expansion chips and
      their default, the faction list of each seat, and the random deal
      for the empty seats. Add each decision in force with its rejected
      alternative.
- [x] Update the Setup row of the iPad screens table in `docs/product.md`.
- [x] Add the expansions and the deal to the setup item of the key
      features in `README.md`.
- [x] Add the expansions and the deal to the setup item of the must-have
      list in `docs/product.md`.
- `docs/product.md` has 419 lines, past the target of about 250 lines in
  the documentation skill. Decision 8, a split into linked pages, waits
  for Cal.

## Milestone 2: Mockup

Tags: mockup

Show the expansion chips and the deal on the setup screens before the
screens change.

- [x] Setup — New Game: add the "Expansions" label and the three chips
      above BEGIN GAME, all on.
- [x] Setup — Faction Missing: add the chips, and the button "Random
      factions for empty seats" below the hint.
- [x] Add the screen "Setup — Random Factions": a new setup with no
      faction picked. Thunder's Edge and Council Keleres are off.
  - The time limits show their default, off. With no Naalu faction
    picked, the Naalu row is hidden.
- [x] Update the setup notes for the chips, the faction lists, and the
      deal.
- [x] With the chips and the deal, the Game panel of Setup — Faction
      Missing ran past the bottom of the iPad frame. Let the panel shrink,
      and let its summary rows scroll, so that BEGIN GAME stays in view.
- [x] Render the setup screens in headless Chrome with no script error.
      Save the screenshots under `.context/random-factions/mockup/`.
- Evidence: `.context/random-factions/mockup/render.log` and the
  screenshots beside it. All 24 screens render with no script error. On
  each setup screen, the Game panel ends inside the frame.

## Milestone 3: Game model

Give each faction its game set, store the expansions, and add the deal.

- [x] `factions.ts`: the game set of each faction and the list of
      expansions.
- [x] `settings.ts` and `parse.ts`: the `expansions` setting, all on by
      default.
- [x] `deal.ts`: the factions in play, the choices of one seat, and the
      deal.
- [x] Add `deal.ts` to the key code in `README.md`.
- [x] Unit tests:
  - [x] The factions in play: 30 with every expansion on, the 17 of the
        base game with every expansion off, and each expansion adds only
        its own factions.
  - [x] The choices of a seat add its faction when its expansion is off,
        in name order. They add nothing for an empty seat.
  - [x] The deal fills only the empty seats inside the seat count and
        keeps every held faction. No faction repeats across all rows,
        also the rows past the count.
  - [x] The deal gives only factions in play. When the pool runs out,
        the remaining seats stay empty.
  - [x] The deal takes its picks from the random source. A fixed
        sequence gives a fixed deal.
  - [x] Stored settings without `expansions`, or with a broken value,
        load with every expansion on. A saved choice loads as saved.
  - [x] A broken value for one expansion falls back for that expansion
        only. The other values load as saved.
- The tests are in `src/model/deal.test.ts` and `src/model/storage.test.ts`.
  Evidence: each of 5 mutations of `deal.ts` and `parse.ts` fails at least
  one test. `.context/random-factions/mutations/results.log`.

## Milestone 4: Setup screen

Tags: ui

Show the chips, the faction lists, and the deal as the mockup shows them.

- [x] The chips in the Game panel. A tap saves the settings.
- [x] The button "Random factions for empty seats", shown while a seat
      has no faction. It calls the deal with `Math.random`.
- [x] Each faction list shows the choices of its seat.
- [x] Keep one faction column width in every seat row with CSS subgrid,
      also while a seat keeps a faction outside the chosen expansions.
  - Give the seat list `align-content: start`, so that its rows do not
    stretch to fill the list.
  - The padding and the border of each seat row take room from its first
    and last columns. Widen those columns by about 12 pixels to keep the
    current look.
  - Give the seat list the column gap of a seat row, 11 pixels. A
    different gap takes room from the fixed columns, and the swatch
    column then overflows.
- [x] Let the Game panel shrink and its summary rows scroll, as the
      mockup does.
- [x] Move the new mockup classes to `src/styles/mockup/setup.css`.
- [x] Keep `SetupScreen.tsx` near 200 lines. Move the seat row to its own
      component if the screen passes 250 lines.
  - The seat row moved to `SetupSeat.tsx`. `SetupScreen.tsx` has 194 lines.
- [x] Scratch smoke test, not committed: build, serve the preview, and
      drive headless Chrome. Save the log and the screenshots under
      `.context/random-factions/smoke/`.
  - [x] The deal fills every empty seat with a different faction, and
        BEGIN GAME turns on. A hand pick stays.
  - [x] With Thunder's Edge off, the list of each seat without a Thunder's
        Edge faction shows none of its factions. The deal gives none of
        them.
  - [x] A seat that holds a Thunder's Edge faction keeps it when Thunder's
        Edge turns off, and its list still shows that faction.
  - [x] The deal button goes away when every seat has a faction.
  - [x] Every seat row keeps one faction column width while a seat keeps
        a faction outside the chosen expansions.
  - [x] The chips keep their state after a reload.
- Evidence: `.context/random-factions/smoke/smoke.log`, `results.json`,
  and the screenshots beside them. All 26 checks passed, with no console
  error or warning. A control check without subgrid gives the row that
  keeps Deepwrought Scholarate a 191 px faction column and the other rows
  171 px. With subgrid, every row has 191 px.

## Milestone 5: Verification, commit, and review

Run the checks, push, and review the branch.

- [ ] Merge `origin/main` each time it moves ahead, with the `git-merge`
      skill. Save the justifications under `.context/random-factions/`,
      and copy them into the PR description.
  - 2026-10-25: merged `b6f658d`, PR #9, player removal, in `075896f`.
    The one conflict, the iPad screen list of the mockup, keeps both
    sides. Justifications:
    `.context/random-factions/merge/justifications.md`. The description
    of PR #14 holds them.
  - Open PRs #11 and #12 also change the spec, the mockup, the README,
    and `src/model/parse.ts`. PR #11 also changes
    `src/ui/screens/SetupGamePanel.tsx`. Expect conflicts when they
    merge.
- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
  Evidence: `.context/random-factions/check-final.log`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Open the PR and link it in the status paragraph.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.
  - Review 1 checked the plan and the mockup at 9944bb9. It found 5
    findings. Fixed: 2, a mockup note left out the base game, 3, the deal
    button rule set no text alignment for the CSS port, and 4, a faction
    list for each seat could shift its seat row. Report:
    `.context/random-factions/review-1.md`.
  - Review 2 checked fix commit 1bfe11a: findings 2, 3, and 4 are
    resolved. It found 1 finding. No further fix round runs. Report:
    `.context/random-factions/review-2.md`.
  - Review 3 checked Milestone 1 and the merge of `main` at 899933a. It
    found no finding. Report: `.context/random-factions/review-3.md`.
  - Findings 1, 5, and 6: Cal chose B, A, and B on 2026-10-25, as the
    decisions record. Milestone 1 holds finding 1, Milestones 3 and 4
    hold the checks of finding 5, and the line below applies finding 6.
  - Decision 7, the wider fix of finding 3: Cal chose B. `src/styles/app.css`: the button reset centres button labels, and only the rules that need it set left alignment. This also centres BEGIN GAME, BEGIN ACTION PHASE, and END TURN, which sit at the left today, as Milestone 9 of `plans/naalu-initiative-token.md` records. Effort Medium. Separate branch.
  - `docs/mockups/index.html`: the setup seat rows show a drag handle and six colour swatches, but the app has move buttons and eight colours. Separate branch.

## Post-merge follow-up (non-blocking)

- [ ] Check that the deploy step passed on `main`.
- [ ] On the iPad, turn Thunder's Edge off, deal the factions, and begin a
      game.
