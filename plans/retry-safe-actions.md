# Retry-safe actions

Status: Active. Draft on the branch `calummoore/firebase-multiplayer-plan`.
It is the first step of the [multiplayer plan](multiplayer-live-sync.md),
and it starts when Cal accepts that plan.

TI4 Tempo keeps each game as an append-only log of taps, and each device
folds the log into state. In a shared game, a device that loses a write
race runs its tap again on the newer state. Some taps then apply twice:

- Two devices that both send End Turn end two turns.
- A repeated phase step in the status phase skips the round summary.
- With one unpassed player, a repeated End Turn ends a second turn of that
  player.
- An undo that names only the log length can remove the action of another
  device.

This plan makes every action name its target, so that the fold rejects a
repeat. It adds no sync. The stored game changes shape, so both game keys
move to version 2, and version 1 games migrate on load.

Decisions:

- 2026-10-23: Each action that ends or changes a clock names that clock by
  round, phase, and turn or agenda number. Undo names the action that it
  removes. Alternative: add only the acting player to some actions.
  Reason: plan review finding 2 of the multiplayer plan found repeats that
  the player alone does not stop.

Open decision, proposed on 2026-10-23, numbered as in the multiplayer plan:

16. Storage keys. A: versioned keys, as today. B: one unversioned key per
    slot, as MVP review finding 6 proposes. Recommended: B.

Contract owners: `docs/product.md` and [AGENTS.md](../AGENTS.md).

## Milestone 1: Documentation

State the action targets and the stored-game rule in the docs.

- [ ] Update the data model sketch in `docs/product.md` for actions that
      name their target.
- [ ] Update the stored-game rule in `AGENTS.md` when decision 16 picks B.

## Milestone 2: Actions that name their target

Make every action safe to apply again on a newer state.

- [ ] Each action that ends or changes a clock names that clock by round,
      phase, and turn or agenda number. The fold rejects the action when
      that clock does not run. Replace `statusStepToggled` with
      `statusStepSet`.
- [ ] Undo names the action that it removes, not only the log length.
- [ ] Update the parser, and pass the new fields from `GameScreen.tsx`.
- [ ] Migrate the current game and the last game from their version 1 keys
      on load. A replay of each log fills the new fields. The settings key
      keeps version 1. Decision 16 can change the key layout.
- [ ] Add one table-driven test that applies each change twice. Test the
      migration of recorded version 1 games under both keys.

## Milestone 3: Verification, commit, and review

Run the checks, push, and review the branch.

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.

## Post-merge follow-up (non-blocking)

- [ ] Open a game that the MVP build saved on the iPad, and check that it
      loads.
