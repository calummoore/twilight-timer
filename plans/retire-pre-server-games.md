# Retire the games saved before the server

Status: Active. On branch `calummoore/retire-pre-server-games`, no pull
request yet. The plan closes when its PR merges. It can run in parallel
with [Version handling](version-handling.md): the two change different
code, and the second to merge resolves small conflicts in `CLAUDE.md`, the
Key code of `README.md`, `src/model/protocol.ts`, `src/model/test-room.ts`,
and `docs/mockups/index.html`, with the `git-merge` skill. Cal confirmed
the scope below on 2026-10-26, which is the approval that the removal of
functionality on `origin/main` needs.

Builds from 2026-10-23 to 2026-10-26 saved the game in `localStorage`,
under one key per version, and the game shape went from version 1 to 6 in
those days. When the game moved to the server, the app kept the upgrade
chain from version 1 to 5, the six keys of each slot, and Continue on the
Home screen, which puts such a game on the server. The only game that
matters, `78JVZ7`, went to the server through Continue on 2026-10-26. It
is a version 6 game with six players from the faction list, and it keeps
two values of its build: a window close resumes the turn, and its 28
strategy plays log no card.

This change removes the device path: the chain, the keys, Continue, the
create request with a game, their tests and helpers, the Home mockup
state, and the doc sentences. It keeps the two old-rule branches in the
fold, the window rule and the lowest unplayed card, with their tests,
because the continued game needs them. It also requires a faction for
every player of a game, which every stored game has. The stored shape does
not change: every game on the server is version 6 with a faction id for
each player and a reasons list in each pause, so the game version stays 6
and no fixture changes.

Decisions:

- 2026-10-26, Cal: decision 6 of the version-handling discussion, option
  E. The device path goes, after Cal continued the one game that matters,
  and every player of a game needs a faction. Alternatives: A, keep
  everything, B, retire only the two steps that pull request previews
  wrote, C, the device path alone, and D, also the old-rule branches with
  a version 7 that rejects an old value. Reason: nothing on the server
  needs the device path, every stored game has a faction for each player,
  and D would break the clocks and the history of the continued game,
  which keeps the old window rule and null cards.
- 2026-10-26: the null cards stay null, and the fold keeps its branch that
  plays the lowest unplayed card. Alternative: an upgrade step that fills
  each null card. Rejected: the fill needs the active player at each play,
  which only the fold knows, and a parse step must not run the fold.
- 2026-10-26: with a faction for every player, the player type loses its
  null faction, the parser rejects a null, and the setup rows get their
  own type for an empty seat. The empty faction name served only games
  from the first build, which allowed an unlisted faction.
- 2026-10-26: this is the decision that rule 8 of the stored-shape rules
  asks for, which says that old upgrade steps stay until a decision
  retires them. A game of version 1 to 5 is unreadable from this change
  on, and a device that still holds one no longer sees it on Home.

Contract owners:

- [Multiplayer](../docs/product/multiplayer.md) and
  [Rounds](../docs/product/rounds.md).
- The [workspace README](../README.md) and the repository rules in
  [CLAUDE.md](../CLAUDE.md).

## Milestone 1: Documentation and rules

- [x] Remove the sentence on a game saved by an older build from
      `docs/product/multiplayer.md`, and the sentence on a player without
      a faction from `docs/product/rounds.md`.
- [x] Update the repository rules in `CLAUDE.md`: the saved-game keys of
      the builds before the server go, and the room reads a game of
      version 6 and later.
- [x] Update the stored-games line of the review focus in `CLAUDE.md`: a
      game that an older build saved on a device no longer loads.
- [x] Update `README.md`: the Home feature line, and the Key code entries
      of `storage.ts`, `parse.ts`, and `index.ts`.

## Milestone 2: Mockup

Tags: mockup

- [x] Remove the Home state "Saved on this device" from
      `docs/mockups/index.html`, with its sample data and its branch of
      the Home screen. Remove the styles that only it used, in the mockup
      and in `src/styles/mockup/`.

## Milestone 3: Remove the device path

One milestone across the model, the Worker, and the Home screen, because
the Home route imports the storage functions and the build must compile at
the end.

- [ ] `src/model/parse.ts`: remove the upgrade chain and its helpers. The
      parser reads version 6 only. `src/model/parse-parts.ts`: a pause
      needs its reasons list.
- [ ] `src/model/storage.ts`: remove the two slots, their six keys each,
      load, and forget. The settings stay.
- [ ] Remove the create request with a game, the room of a game, and the
      setup of a game, from `src/model/protocol.ts`, `src/model/room.ts`,
      and `src/model/setup.ts`, and the game branch of create in
      `worker/index.ts`.
- [ ] `src/ui/HomeRoute.tsx` and `src/ui/screens/HomeScreen.tsx`: remove
      the saved games, Continue, Dismiss, and their notice.
      `src/ui/api.ts`: create takes a setup only.
- [ ] Tests: remove `src/model/storage-versions.test.ts`, the saved-game
      tests of `src/model/storage.test.ts`, the two preview tests of
      `src/model/storage-pauses.test.ts`, and the helpers that only they
      used in `test-shapes.ts`, `test-store.ts`, and `test-room.ts`. Move
      the tests that reach live behaviour through the removed helpers to
      the parser and the room, with the same assertions. Keep the old
      table and the null-card helpers with their tests.
- [ ] Run the deletion audit of the `git-commit` skill, and save the
      searches that show each removed item unused under
      `.context/retire-pre-server-games/`.
- [ ] Smoke test on the dev server: Home shows no saved game, a new game
      is created from the setup, and a game that a test puts on the server
      with the old window rule and null cards shows its clocks.

## Milestone 4: A faction for every player

Small, across the model type and the screens that read it, so that the
build compiles at the end.

- [ ] `src/model/types.ts` and `src/model/parse-parts.ts`: the faction id
      of a player is never null. `src/model/factions.ts`: the faction name
      takes an id.
- [ ] The setup rows get their own type with an empty seat, in
      `src/ui/screens/SetupScreen.tsx` and `src/ui/screens/SetupSeat.tsx`,
      and the other screens drop their null fallbacks.
- [ ] Tests of the parser: a player without a faction is rejected.

## Milestone 5: Verification, commit, review, and pull request

- [ ] Run the targeted tests and the complete gate named in `CLAUDE.md`.
- [ ] Commit with Conventional Commits and push the branch. Record the
      approval of the removal and each plan edit in the pull request
      description.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.
- [ ] Open the pull request when every other milestone TODO is ticked.
      Put its link in the status paragraph.

## Post-merge follow-up (non-blocking)

- [ ] Open `78JVZ7` at `https://ti4.nexus` after the deploy: the stats
      and the history show as before.
