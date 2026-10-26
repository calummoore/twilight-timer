# Version handling

Status: Completed. [PR #30](https://github.com/calummoore/twilight-timer/pull/30)
merged on 2026-10-26. Review 1 findings 1 and 3 are decided, and branch
`calummoore/untitled-v3` implements them. The post-merge follow-up and the
three plan lines outside the scope stay open.

TI4 Nexus keeps each game in a room on the server, in one Cloudflare
Durable Object per join code. After each change, the server sends every
device the whole room in a state message, and each page runs the game
model itself: it derives the clocks from the game log and decides which
controls are on. A deploy changes the server at once, but an open page
keeps its old code until it reloads. Review 1 finding 3 of
[Multiplayer](multiplayer.md) found that such a page drops every state
message that it cannot read, so a deploy during a game freezes every open
device until someone reloads it. Stored data has the opposite direction: a
newer build reads the games that older builds stored. The game has an
upgrade chain with six versions, until PR #29 retired versions 1 to 5, so
the game parser now reads version 6 only. The room has two versions, which
one parser reads, but no chain yet.

This change gives the wire one invariant, the same build on the page and
on the server, and gives a stored room three states: none, ok, and
unreadable. A page of another build reloads once. A room that the server
holds but cannot read stays stored and says so on every device. The change
also sets the rules for future version bumps: one upgrade chain per stored
shape, and one fixture per version. It does not change the shape of the
game, of the room, or of the keys in `localStorage`. It turns the reading
of room version 1 into the first step of a room chain, and adds no new
version.

Decisions, 2026-10-26, Cal:

- Decision 1, option C. A build id from the build, in hello and in every
  server message. The page reloads once on a mismatch, with a guard
  against a loop. The object closes a socket whose hello named another
  build and applies none of its commands. Alternatives: A, reload once
  when a state message cannot be read, and B, a protocol number that a
  developer bumps, with a golden test that forces the bump. Reason: the
  page runs the model, so a page of another build is wrong even when it
  reads the state, and a build id cannot be forgotten.
- Decision 2, option A. An outdated page reloads at once, with no new
  screen. Only when the guard stops a second reload does the page show a
  notice: "A new version is live. Reload the page." Alternative: B, a
  notice with a Reload button before any reload, so that the players
  choose the moment. Reason: an outdated page is wrong, and the players
  should not have to act.
- Decision 3, option C. The object reads a stored room into one of three
  states: none, ok, or unreadable. Create refuses an unreadable room, so
  nothing overwrites it. The page gets an unreadable message and shows a
  notice: "This game needs a newer version of the app." The game stays in
  Recent games. Alternatives: A, the rules in the repository docs only,
  with the room chain at the first room bump, and B, the three states on
  the server with the page still seeing missing. Reason: it keeps the log
  safe and tells the players to wait for a fix instead of starting over.
- Decision 4, option B. From the next version bump on, each bump commits
  one JSON fixture of the old shape and a test that loads it. The helpers
  that rebuild versions 1 to 5 stay. Alternative: A, keep only the
  helpers. Reason: a real fixture is a record, a helper is a guess.
- Decision 5, option A. An idle table hears nothing about a deploy until
  a device sends a command, because the object sleeps between messages
  and a ping does not wake it. The object refuses that command, the page
  reloads, and the tap is lost, so the player taps again. The other pages
  reload on the next broadcast. Alternatives: B, the page asks the Worker
  for its build once a minute and when it shows again, on a new route,
  and C, pings that wake the object. Reason: no extra request per page,
  and a lost tap after a deploy is rare and costs one more tap.

Assumption: the first fixtures are the current shapes, game version 6 and
room version 1, captured in this change from a game that the test table
plays. The next bump then has its fixture of the old shape ready.

Update, 2026-10-26, after the merge of main: PR #27 moved the room to
version 2, so the current shapes are game version 6 and room version 2.
The fixtures are `game-v6.json` and `room-v2.json` from the current build,
and `room-v1.json` from `d467cbd`, the last build that wrote room version
1. The real room of version 1 tests the first step of the room chain.

Contract owners:

- [Multiplayer](../docs/product/multiplayer.md), the product spec of the
  game on the server.
- [New versions](../docs/product/versions.md), the product spec page of
  this change, split from Multiplayer after the merge of PR #29.
- The [workspace README](../README.md) and the repository rules in
  [CLAUDE.md](../CLAUDE.md).

## Design

Build id. The build puts a short id into the page and into the Worker
through a Vite `define`: the first seven characters of `GITHUB_SHA` in
CI, else a timestamp. `src/build.ts` exports it. The model never reads
it: callers pass it in, as they pass the clock, so tests use fixed ids.

Wire. Hello carries the build of the page. Every server message carries
the build of the server, in a top-level field whose shape never changes
again. The server messages are state, missing, unreadable, and outdated.
The page reads the build before anything else, so a page of another build
knows that it is outdated even when it cannot read the rest.

Server. The attachment of each socket keeps the token and the build from
its hello. A hello of another build gets an outdated message and a close.
A command from such a socket gets the same, and does not apply. When the
object sends the state to every socket, a socket of another build gets
outdated and a close instead. A stored room reads into none, ok, or
unreadable. A new socket on a none room gets missing. A socket on an
unreadable room gets unreadable and a close. Create refuses a room that is
not none. The code lookup reports an unreadable room as found, so the page
opens it and sees the notice.

Page. On a message of another build, or of no build, the page reloads
once. The guard keeps the build of the server that caused the reload in
`sessionStorage`, under a versioned key. When the same build causes a
second mismatch, the page shows the notice instead and stops its socket.
A matching build clears the guard. The statuses unreadable and outdated
end the connection, like missing: the page does not reconnect from them.

Transition. The pages open during the first deploy of this change send a
hello without a build, which the object ignores, and the object closes
their old sockets at its next broadcast. Those pages show the reconnecting
bar or the opening line until one manual reload. Every later deploy
reloads every open page.

Update, 2026-10-26, from the implementation: the Cloudflare docs say that
a deploy restarts every Durable Object and ends its WebSockets. A test on
the preview of PR #30 showed more. During a new preview version, the socket
of one device closed, and that device connected again, got the outdated
message, and reloaded. The other device kept its socket, and the new code
served it. That device got the outdated message at the next broadcast,
which the reconnect of the first device caused, and reloaded too. So an
idle table can keep its sockets across a deploy, and the lost tap of
decision 5 can happen. Decision 5 stays as it is. Evidence:
`.context/version-handling/smoke-preview.log`. A deploy also rolls out over
some seconds, so a page that reloads can meet the other build for a
moment. The guard then shows the notice, and RELOAD recovers.

Stored shapes. These rules go into the repository rules:

1. Every stored shape carries its own version and has its own upgrade
   chain. A container upgrades itself, then hands the nested shape to the
   nested parser.
2. Upgrades run at read time, one room at a time. Nothing lists the rooms.
3. Save writes the newest shape only.
4. A stored value that the parser rejects is unreadable, not missing.
   Nothing overwrites it.
5. The wire has no upgrade. The page and the server run the same build.
6. The field that carries the build never changes shape.
7. Each version bump commits one fixture of the old shape under
   `src/model/fixtures/`, captured from the build before the bump, and a
   test that loads it.
8. Old upgrade steps stay until a decision retires them.

## Milestone 1: Documentation and spec

State the requirements and the decisions before the mockup and the code.

- [x] Add a section to `docs/product/multiplayer.md`: one build on the
      page and on the server, the reload, the lost tap of an idle page,
      the notice after a failed reload, the three states of a stored
      game, and the notice of an unreadable game, each with its rejected
      alternatives.
- [x] Add the two requirements to the Multiplayer list in
      `docs/product.md`.
- [x] Add the stored-shape rules to the repository rules in `CLAUDE.md`,
      and keep the storage rules that are there in step with them.
- [x] Update `README.md`: the build id in the deploy section, and the
      storage rules under Key code.

## Milestone 2: Mockup

Tags: mockup

Two states of the Opening screen in `docs/mockups/index.html`, in the
style of the state for a code that no game has.

- [x] Outdated, after a failed reload: the heading "A new version is
      live", the line "Reload the page.", and a RELOAD button.
- [x] Unreadable: the heading "This game needs a newer version of the
      app", a line that says that the game is kept on the server and
      opens again after the update, and a HOME button.
- [x] Add both to the catalogue with their notes, and check that the
      ported styles in `src/styles/mockup/` need no new class.
- Evidence: `.context/version-handling/mockups/shoot.log`: the four
  Opening states in three frames, no script error, and no sideways
  overflow.

## Milestone 3: The build on the wire and the stored room

The model, the Worker, and the connection of the page. At the end, a page
of another build reloads, and the Worker never overwrites an unreadable
room. The two notices come in milestone 4.

- [x] Add `src/build.ts` with the build id, and the `define` in
      `vite.config.ts`. Check that the id reaches both the page and the
      Worker in `npm run build` and in `npm run dev`. Vite evaluates the
      config once for each environment, so the config keeps the first id
      in `TI4_BUILD` for the others.
- [x] Protocol: the build in hello and in every server message, the
      parser of the build field, and the messages unreadable and
      outdated. Tests in `src/model/protocol.test.ts`.
- [x] Receive: what the object does with a hello or a command, in
      `src/model/receive.ts`, so that `worker/` stays thin. Tests in
      `src/model/receive.test.ts`.
- [x] Room: give the room its upgrade chain, with the step from version 1
      to 2 that the parser now does inline. Keep the behaviour. The stored
      shape moves to `src/model/room-storage.ts`.
- [x] Room: read a stored value into none, ok, or unreadable, and the
      build in the state message. Tests in
      `src/model/room-storage.test.ts`.
- [x] Connection: the reload guard on a key-value store. Tests in
      `src/model/connection.test.ts`.
- [x] Fixtures: `src/model/fixtures/game-v6.json` and `room-v2.json` from
      a game that the test table plays on this build, `room-v1.json` from
      a game that the test table plays on `d467cbd`, and
      `src/model/fixtures.test.ts`, which loads each one and checks a clock.
      The capture script: `.context/version-handling/capture/`.
- [x] Worker: the three states in the object, create refuses a room that
      is not none, the build in the attachment, the outdated message and
      close for a hello or a command of another build and in the
      broadcast, and the unreadable message. Keep `worker/` thin.
- [x] Page: read the build before the message, reload once with the
      guard, the statuses unreadable and outdated with no reconnect, and
      the hello with the build. The socket moves from
      `src/ui/useGameClient.ts` to `src/ui/gameSocket.ts`.
- [x] Update the Key code section of `README.md`.
- [x] Smoke test with `vite preview`, which gives a new build per build:
      two windows in a game, then rebuild and restart. A restart ends every
      socket, as a Cloudflare deploy does, so both windows connect again,
      get outdated, reload once by themselves, and show the game. A tap
      after the reload shows on both. The lost tap needs a socket that
      outlives a deploy, so the receive tests cover it. Evidence:
      `.context/version-handling/smoke-browser.log`, steps 1 to 3, and
      `smoke-server-dev.log`: 11 checks of the object on `npm run dev`.

## Milestone 4: The notices

Tags: ui

- [x] The Opening screen states outdated and unreadable, from the mockup,
      and the statuses in `src/ui/RoomScreen.tsx`. RELOAD reloads the
      page. An unreadable game stays in Recent games.
- [x] Smoke test: set the guard key to the build of the server, then
      restart `vite preview` with a new build. The notice shows, and
      RELOAD opens the game. For unreadable, change the version of a
      stored room in the local object storage under `.wrangler/`, then
      open the game: the notice shows on every device, and the room
      stays. Evidence: `.context/version-handling/smoke-browser.log`,
      steps 4 and 5, 39 checks in all, with screenshots in `smoke/`.

## Milestone 5: Verification, commit, review, and pull request

- [x] Run the targeted tests and the complete gate named in `CLAUDE.md`.
      Evidence: `.context/version-handling/gate-1.log` and `gate-2.log`.
- [x] Commit with Conventional Commits and push the branch. The merge of
      main and its one conflict: `.context/version-handling/merge-justification.md`.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest. Review 1:
      `.context/version-handling/review-1.md`, 3 findings. Fixed: 2, with
      option C, one send helper in the object that skips a closed socket.
      Review 2 of the fix: `.context/version-handling/review-2.md`, no
      findings. Open:
      - 1. Create game skips the build check. Severity Medium, effort
        Large. Decided 2026-10-26, Cal: C. The create request names the
        build of the page, and the Worker creates every game whose setup it
        can read. It refuses only a setup that it cannot read from a page
        of another build, and that page reloads once. Alternatives: A, a
        build check on the socket only, and B, a refusal of every request
        of another build. Reason, from the recommendation: the only failure
        becomes a reload, and every setup that the server can read stays.
        Branch `calummoore/untitled-v3` implements it.
      - 3. The no-overwrite rule overstates the device store. Severity
        Low, effort Small. Decided 2026-10-26, Cal: A, the rule covers
        stored games only. Alternative: B, a device store that never writes
        over a value that it cannot read. Reason, from the recommendation:
        a device needs a working token more than a value that it cannot
        read. Branch `calummoore/untitled-v3` implements it.
      - `plans/admin-recovery.md`: the status says that PR #28 is open,
        but it merged. Separate branch.
      - `plans/multiplayer.md`: the open item "Review 1, 4" does not record
        decision B, which PR #28 shipped. Separate branch.
      - `plans/multiplayer.md`: the status paragraph says that PR #21 is
        open, but it merged. Separate branch.
- [x] After the merge of PR #29, which retired the games saved before the
      server, move the New versions section to its own page,
      `docs/product/versions.md`, because `docs/product/multiplayer.md`
      passed 250 lines. Update its links. The merge and its conflicts:
      `.context/version-handling/merge-justification.md`, merge 2.
- [x] Smoke test on the preview of PR #30, across a new preview version:
      the socket of one device closed, and that device reloaded. The other
      device kept its socket, got the outdated message at the next
      broadcast, and reloaded. Both returned to the game. This corrects the
      spec paragraph that said that a deploy ends every socket. Evidence:
      `.context/version-handling/smoke-preview.log`.
- [x] Open the pull request when every other milestone TODO is ticked.
      Put its link in the status paragraph.

## Post-merge follow-up (non-blocking)

- [ ] Deploy a later change while a game is open at `https://ti4.nexus`:
      every open page reloads and returns to the game.
