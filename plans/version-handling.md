# Version handling

Status: Active. On branch `calummoore/protocol-version-handling`, no pull
request yet. The plan closes when its PR merges.

TI4 Tempo keeps each game in a room on the server, in one Cloudflare
Durable Object per join code. After each change, the server sends every
device the whole room in a state message, and each page runs the game
model itself: it derives the clocks from the game log and decides which
controls are on. A deploy changes the server at once, but an open page
keeps its old code until it reloads. Review 1 finding 3 of
[Multiplayer](multiplayer.md) found that such a page drops every state
message that it cannot read, so a deploy during a game freezes every open
device until someone reloads it. Stored data has the opposite direction: a
newer build reads the games that older builds stored. The game has an
upgrade chain with six versions. The room has a version but no chain yet.

This change gives the wire one invariant, the same build on the page and
on the server, and gives a stored room three states: none, ok, and
unreadable. A page of another build reloads once. A room that the server
holds but cannot read stays stored and says so on every device. The change
also sets the rules for future version bumps: one upgrade chain per stored
shape, and one fixture per version. It does not change the shape of the
game, of the room, or of the keys in `localStorage`, and it adds no
upgrade step, because nothing needs one yet.

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
- Decision 5 is open: how an idle page learns about a deploy. See below.
  Milestone 5 waits for it.

Assumption: the first fixtures are the current shapes, game version 6 and
room version 1, captured in this change from a game that the test table
plays. The next bump then has its fixture of the old shape ready.

## Open decision 5: how an idle page learns about a deploy

The object hibernates between messages, and a ping gets an automatic
answer that does not wake it. After a deploy, the new code runs at the
next wake: a hello, a command, or a closed socket. So an idle table hears
nothing about a deploy until a device sends a command. The object refuses
that command, because the page is outdated, and the page reloads. The tap
is lost, and the player taps again. The reload sends a new hello, and the
object then closes every other outdated socket, so the other pages reload
within a second.

- A. Accept it. The first tap after a deploy on an idle table reloads the
  page and is lost. No code.
- B. The page asks the Worker for its build once a minute and when the
  page shows again, on a new route `GET /api/build`. The Worker runs the
  new code at once after a deploy, so an idle page reloads within a
  minute, in most cases before the next tap. Cost: one small request per
  page per minute. Effort: Small.
- C. Pings wake the object, which then closes the outdated sockets. Cost:
  the object wakes every 20 seconds for every page, which defeats
  hibernation. Effort: Small.

Recommended: B.

Contract owners:

- [Multiplayer](../docs/product/multiplayer.md), the product spec of the
  game on the server.
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

- [ ] Add a section to `docs/product/multiplayer.md`: one build on the
      page and on the server, the reload, the notice after a failed
      reload, the three states of a stored game, and the notice of an
      unreadable game, each with its rejected alternatives.
- [ ] Add the two requirements to the Multiplayer list in
      `docs/product.md`.
- [ ] Add the stored-shape rules to the repository rules in `CLAUDE.md`,
      and keep the storage rules that are there in step with them.
- [ ] Update `README.md`: the build id in the deploy section, and the
      storage rules under Key code.

## Milestone 2: Mockup

Tags: mockup

Two states of the Opening screen in `docs/mockups/index.html`, in the
style of the state for a code that no game has.

- [ ] Outdated, after a failed reload: the heading "A new version is
      live", the line "Reload the page.", and a RELOAD button.
- [ ] Unreadable: the heading "This game needs a newer version of the
      app", a line that says that the game is kept on the server and
      opens again after the update, and a HOME button.
- [ ] Add both to the catalogue with their notes, and check that the
      ported styles in `src/styles/mockup/` need no new class.

## Milestone 3: The build on the wire and the stored room

The model, the Worker, and the connection of the page. At the end, a page
of another build reloads, and the Worker never overwrites an unreadable
room. The two notices come in milestone 4.

- [ ] Add `src/build.ts` with the build id, and the `define` in
      `vite.config.ts`. Check that the id reaches both the page and the
      Worker in `npm run build` and in `npm run dev`.
- [ ] Protocol: the build in hello and in every server message, the
      parser of the build field, and the messages unreadable and
      outdated. Tests in `src/model/protocol.test.ts`.
- [ ] Room: read a stored value into none, ok, or unreadable, and the
      build in the state message. Tests in
      `src/model/room-storage.test.ts`.
- [ ] Connection: the reload guard on a key-value store. Tests in
      `src/model/connection.test.ts`.
- [ ] Fixtures: `src/model/fixtures/game-v6.json` and `room-v1.json` from
      a game that the test table plays, and `src/model/fixtures.test.ts`,
      which loads each one and checks a clock.
- [ ] Worker: the three states in the object, create refuses a room that
      is not none, the build in the attachment, the outdated message and
      close for a hello or a command of another build and in the
      broadcast, and the unreadable message. Keep `worker/` thin.
- [ ] Page: read the build before the message, reload once with the
      guard, the statuses unreadable and outdated with no reconnect, and
      the hello with the build. Split `src/ui/useGameClient.ts` when it
      passes 200 lines.
- [ ] Update the Key code section of `README.md`.
- [ ] Smoke test with `vite preview`, which gives a new build per build:
      two windows in a game, rebuild and restart, then tap in one window.
      It reloads and the tap is lost, the other window reloads on the next
      broadcast, and both show the game. Evidence under
      `.context/version-handling/`.

## Milestone 4: The notices

Tags: ui

- [ ] The Opening screen states outdated and unreadable, from the mockup,
      and the statuses in `src/ui/RoomScreen.tsx`. RELOAD reloads the
      page. An unreadable game stays in Recent games.
- [ ] Smoke test: set the guard key in the console to the build of the
      server, then restart `vite preview` with a new build. The notice
      shows, and RELOAD opens the game. For unreadable, change the version
      of a stored room in the local object storage under `.wrangler/`,
      then open the game: the notice shows on every device, and the room
      stays. Evidence under `.context/version-handling/`.

## Milestone 5: The build check of an idle page

Waits for decision 5. With option A, remove this milestone. With option B:

- [ ] The route `GET /api/build` in `worker/index.ts`, which answers the
      build of the Worker.
- [ ] The page asks for the build once a minute and when it shows again,
      and reloads on a mismatch through the same guard.
- [ ] The requirement in `docs/product/multiplayer.md`, and the route in
      `README.md`.

## Milestone 6: Verification, commit, review, and pull request

- [ ] Run the targeted tests and the complete gate named in `CLAUDE.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.
- [ ] Open the pull request when every other milestone TODO is ticked.
      Put its link in the status paragraph.

## Post-merge follow-up (non-blocking)

- [ ] Deploy a later change while a game is open at `https://ti4.nexus`:
      every open page reloads and returns to the game.
