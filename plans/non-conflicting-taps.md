# Taps that do not conflict

Status: Active. On branch `calummoore/tap-revision-conflict-options`, no
pull request yet. The pull request that completes the work deletes this
plan, as the `plans` skill says.

Each game runs on the server, and every device sends its taps there. Each
tap names the revision that its device saw: the change count of the game.
The server drops a tap on an older revision, so a double tap from two
devices cannot end two turns. But taps that do not conflict also drop each
other: two players who tap Mark done at the same moment, or two phones that
take or edit different seats in the lobby. The dropped tap does nothing,
and its player must tap again. On the claim screen, the player must also
enter the name, the colour, and the faction again.

This change lets a tap that can apply late name the part of the game that
it needs. Mark done names its reaction window. A claim or an edit names the
seats that the device saw. The server applies such a tap while that part
is unchanged, also on an older revision. Every other tap keeps the revision
check. Decision 3 settles what a seat dialog names when it stayed open
while another device changed its seat. The spec page
[Multiplayer](../docs/product/multiplayer.md) holds the requirements and
the decisions in force.

The change does not cover the other taps. End turn and Mark all done, for
example, still do nothing after any other tap. The change also does not
cover what the claim screen shows when a claim does not apply. The
follow-up item
[A lost claim drops the typed seat values](follow-ups/claim-dialog-loses-typed-values.md)
holds that question.

Contract owners:

- The spec page [Multiplayer](../docs/product/multiplayer.md).
- The workspace [README](../README.md), under Key code.

## Decisions

### 2. One revision drops taps that do not conflict

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Review. Finding 2 of review 1 of
  [the multiplayer plan](multiplayer.md).
- **Category:** Product bug.
- **Location:** `src/model/room.ts:87`, `docs/product/multiplayer.md:36`,
  `docs/product/multiplayer.md:217`.
- **Terms:**
  - **Revision:** The change count of a game on the server. Each tap names
    the revision that its device saw.
  - **Reaction window:** The overlay after a strategy card is played. Each
    other player taps Mark done on their own tile.
  - **Claim:** The command that takes a seat or joins as a table device. A
    seat claim carries the name, the colour, and the faction of the seat.
  - **Take a value:** The seat rule for an admin device. Its change moves a
    colour or a faction away from the seat that held it.
- **Background:**
  - The server keeps one revision for the whole game. Every change grows
    it: a game tap, a claim, a seat edit, a seat move, a deal, an admin
    switch, or a pause.
  - The server drops a tap on an older revision as stale, before the
    rights check and the model check.
  - The device then gets the state again, with no sign that its tap was
    dropped.
  - The model already refuses a Mark done for a tile that is done, or when
    no window is open. The rights check uses the live state.
- **Problem:** Taps that do not conflict also drop each other. Two phones
  that tap Mark done at the same moment collide. Two phones that take or
  edit different seats in the lobby collide too.
- **Impact if no action:** A player sees Mark done do nothing and must tap
  again. The claim dialog closes on Take seat, so after a dropped claim the
  player must enter the name, the colour, and the faction again.
- **Root question:** How can two taps that do not conflict both apply,
  while two taps that do conflict still apply only once?
- **Options:**
  - **A.** Do not grow the revision for an admin switch or a join as a
    table device. A seat claim changes the seat values, so it must still
    grow the revision. Mark done and the lobby still collide. Effort:
    Small.
  - **D.** Mark done, a claim, and an admin switch skip the revision check,
    and apply while they are still valid. A late admin claim then takes a
    faction that a phone just picked. A late claim also takes a seat from
    the phone that just took it. Effort: Small.
  - **E.** Only Mark done and an admin switch skip the revision check. This
    fixes the reaction window in one file. Lobby saves still collide. A
    late Mark done can still land in a later window. Effort: Small.
  - **B.** A tap that can apply late names the state that it needs. Mark
    done names its window. A claim or an edit names the seats that the
    device saw. The server applies the tap while that state still holds.
    Every other tap keeps the revision check. No stored shape changes.
    Effort: Medium.
  - **G.** The server keeps its recent changes in memory, with what each
    change touched. A late tap applies when no later change touched what
    it needs. The protocol does not change. When the server object sleeps,
    it forgets the list, and a late tap drops as it does now. Effort:
    Medium.
  - **H.** The server keeps its last few rooms in memory. It checks a late
    tap against the room of the revision that the tap names: the window
    for Mark done, the changed seats for a claim or an edit, and the whole
    game for every other game tap. The wire and the client do not change.
    End turn then also applies after an admin switch. After the object
    restarts, a late tap drops as now. H cannot check a dialog that opened
    on a room that the server no longer holds. Effort: Medium.
  - **I.** The device keeps each tap that may apply late until a new state
    shows its effect. When the tap did nothing while its window or seats
    still hold, the device sends it again on the new revision. Each
    collision costs one more round trip. A tap that the device sends again
    comes close to the queued taps that the spec rejects. Effort: Medium.
  - **J.** B, but a claim or an edit names its own seat and that seat's
    device as they were when its dialog opened, and the server checks them
    on every revision. Effort: Medium.
  - **C.** Keep the rule, and tell the device that its tap did not apply.
    This adds a server message and a screen state. The collisions stay. It
    also reverses the lobby plan, which rejected this message. Effort:
    Large.
- **Left out:**
  - Apply every tap in arrival order. This breaks the spec rule that a
    double tap cannot end two turns.
  - Use one revision for the game and one for the seats. This fails the
    goal, because two Mark done taps still collide, and so do two lobby
    saves.
  - Keep a version number for each seat and for the window in the stored
    room. B gets the same result by comparing values, with no new room
    version.
  - Merge the changed fields of two edits of one seat on the server. This
    breaks the spec rule that the first of two changes to one seat applies.
- **Wider fix:** B. Each tap that can apply late carries its own
  condition, so no unrelated change can drop it. The options check named
  H, because it also covers every other game tap with no wire field.
- **Previous examples:** None found.
- **Recommendation:** B. It fixes the reaction window and the lobby, and
  the first tap still wins in a real conflict. The options check
  recommended J. J is B with decision 3 answered by naming the seat as the
  dialog opened it, so decision 3 asks that question on its own.
- **Answer:** B. Cal chose it on 2026-11-01.

The review graded B as Large on 2026-10-26. The grade fell to Medium
because a page of another build now reloads, so the wire needs no support
for older pages, and only a few commands change.

The options check of 2026-11-01 added H, I, and J. It also would leave C
and G out: C fails the goal, because the collisions stay, and H is better
than G on every point except a little memory. The agent keeps B: H cannot
check a dialog that opened before the object last slept, and B carries the
state that a dialog saw. Reports: `.context/non-conflicting-taps/`.

### 3. An open seat dialog undoes a change made meanwhile

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Review. The options check of decision 2, 2026-11-01.
- **Category:** Product bug.
- **Location:** `src/ui/screens/SeatEditDialog.tsx:37`,
  `src/ui/screens/SeatEditDialog.tsx:41`,
  `src/ui/screens/ClaimScreen.tsx:153`, `src/ui/useGameClient.ts:69`.
- **Terms:**
  - **Seat dialog:** The dialog that a tap on a seat opens: on the claim
    screen with Take seat, or on Players & devices with Save.
  - **Holder:** The device that holds a seat. A claim of a held seat moves
    the seat to the new device, and the old holder becomes a table device.
  - **Viewer:** A table device without admin. Every control is off.
- **Background:**
  - A seat dialog keeps the values of its seat and its speaker switch from
    the moment it opens. The list behind it shows the live seats, but a
    phone shows the dialog as a sheet over the list.
  - The dialog of an admin device shows no holders of the colours and the
    factions, because an admin device takes a value.
  - Take seat and Save send every field with the latest revision, so the
    revision check never sees what the dialog started from.
  - Setup leaves the default names "Player 1" and on, so several players
    can open the same free seat in the lobby.
  - The spec allows a claim of a held seat and the take of a value on
    purpose. It also says that when two devices change the same seat at
    once, the first change applies, and the second does nothing.
- **Problem:** Two phones open the dialog of one free seat. The first takes
  the seat. The second taps Take seat later and takes the seat from the
  first phone, which becomes a viewer without a sign. A save also sends
  the fields that its player did not touch, so it undoes a change that
  another device made meanwhile. After another admin device moves the
  speaker away, Save moves it back.
- **Impact if no action:** A player loses their seat without seeing why,
  and two phones can take the seat back and forth. A change that an admin
  makes to a seat, or a move of the speaker, can disappear under a save.
- **Root question:** How does a save from an open seat dialog avoid undoing
  a change that another device made meanwhile and that its player did not
  see?
- **Options:**
  - **A.** A claim and an edit name the seats at the moment the device
    sends them, as decision 2 plans. Every problem above stays. Effort:
    Small, nothing more than decision 2.
  - **B.** A claim also names the holder of its seat as the dialog opened
    it. The second of two phones that opened one free seat does nothing,
    and sees the seat held. A save still undoes a value change or a
    speaker move that another device made meanwhile. Effort: Small.
  - **F.** The claim dialog closes when another device takes its seat, as a
    confirm closes when the revision changes. The player sees at once that
    the seat is held, but loses the typed values. The rule lives in the
    screen, where the model tests do not reach it. Effort: Small.
  - **C.** A claim and an edit name their seat and its holder as they were
    when the dialog opened. The first change to a seat always wins, also
    against an open dialog. A save then fails more often, without a
    message, for example when an admin taps Random factions while players
    fill in their seats. Effort: Medium.
  - **D.** The dialog shows the live holder and the live values of its
    seat, and says when another device changed them. Take seat and Save
    stay possible, so the player decides. This changes the dialog and its
    mockup. A save in the same moment as the change still crosses it.
    Effort: Medium.
  - **E.** B, and the dialog keeps only the changes that its player makes.
    The other fields and the speaker switch show the live seat, and Save
    sends them as they are at that moment. E adds no refusal beyond B, and
    the mockup does not change. A field that both devices changed still
    gets the player's value. A field can also change while the player
    looks at it, with no note. Effort: Medium.
  - **G.** C, widened to the whole state on which the dialog opened: every
    seat, each holder, and the speaker. The dialog also stays open after
    Take seat or Save until a new state shows the result. When the save
    does not apply, the dialog keeps the typed values and names what
    changed. This takes in the follow-up item on lost claim values, and
    changes the claim flow and its mockup. Effort: Large.
- **Left out:**
  - Lock a seat while a dialog is open on it. A dead phone counts as
    connected for up to 90 seconds, and the spec wants a player whose phone
    died to take the seat back in seconds.
  - Refuse a claim of a seat whose holder is connected, for the same
    reason.
  - A claim in one tap, with the fields after it. The spec rejects it under
    Joining.
  - Merge the changed fields of two saves on the server. This breaks the
    spec rule that the second of two changes to one seat at once does
    nothing.
  - A server message that says that a save did not apply. G gets the same
    answer from the next state.
  - A mark that shows that another device has the seat open. It does not
    meet the goal alone, because a save still undoes the change.
- **Wider fix:** G. It checks every part of the state on which the dialog
  opened, also a field that someone adds later.
- **Previous examples:** `useConfirm` in `src/ui/hooks.ts` closes a confirm
  when the revision changes, so a confirm never applies to a later state.
- **Related:** Decision 2: options B, C, E, and G use the condition that
  decision 2 adds. The follow-up item on lost claim values: G takes it in.
- **Recommendation:** E. It keeps the one new refusal of B, for two players
  who want one seat, and it stops the unseen overwrite of the fields and
  the speaker that the player did not change. The first recommendation was
  B, which is the Small step that stops only the silent takeover. G best
  protects the codebase, but it costs a new claim flow and a mockup.
- **Action:** Ask the user, because E adds rules for cases that the spec
  does not settle: a claim from a dialog that opened before another device
  took the seat, and the fields that a save sends.

## Design

The wire. The command message gets an optional field `seen`, in one of two
shapes:

- The window: the server time of the card play that opened the reaction
  window. The fold of the game records it on the window.
- The seats: each seat as the device saw it, with its name, its colour, its
  faction, and the device that held it, and the speaker of the setup.

The client. The game client adds `seen` to each command with one model
function. Mark done gets the window. A claim and an edit get the seats.
Every other command gets none. What a seat dialog names waits for decision
3.

The server. The room reducer takes `seen` with the revision and the
command:

1. A tap without a `seen` of its shape needs the current revision, as now.
2. A tap with a `seen` of its shape applies on any revision while `seen`
   holds. The rights check and the change run on the live room, as now.
3. The reducer then checks `seen` against the live room and the change:
   - Mark done: the live game has an open window that the same card play
     opened.
   - A claim or an edit: each seat that the change touches is as the
     device saw it. A seat is touched when the change gives it other
     values. The seat of the command is always touched. A claim also needs
     the holder of its seat as the device saw it. An edit that moves the
     speaker token also needs the speaker that the device saw.
4. A failed check is stale. The device gets the state again, as now.

One model module, `src/model/seen.ts`, holds both sides: the type, its
parser, the function of the client, and the check of the server. The
server step `receive` in `src/model/receive.ts` passes `seen` from the
message to the reducer. No stored shape changes. The room and the game
keep their versions. The page and the server run the same build, so the
wire needs no upgrade.

Design calls of 2026-11-01, by the agent:

- The window is named by the server time of the card play that opened it.
  Server times only grow, so after an undo of the card play, a new card
  play always has a later time. Rejected: `startMs` of the window, because
  an undo moves the entry clock back, so a new card play can in theory get
  the old start. Rejected: the place of the card play in the log, because
  an undo and a new card play can reuse the place.
- Mark all done keeps the revision check, as option B says. A late Mark all
  done would close a window that another device extended meanwhile, so the
  close would win over Add 1:00.
- A claim or an edit names every seat, and the server compares only the
  seats that the change touches on the live room. So the first change
  still wins for one seat, one colour, one faction, and the speaker, and
  changes to different seats both apply. Rejected: a compare of every
  seat, because two saves of different seats would still collide.
  Rejected: a compare of the seat of the command only, because an admin
  change could then take a faction that a phone picked a moment before.
- The server checks `seen` on every revision, not only on an older one.
  On the current revision a `seen` from the latest state always holds, so
  this changes nothing unless decision 3 names an older state.
- The client adds `seen` in one place, from the room that it shows.
  Rejected: a `seen` that each screen builds, because each screen would
  then repeat the rule.
- A `seen` that the server cannot read counts as none, so the tap keeps
  the revision check. The page and the server run one build, so such a
  `seen` is a bug, and the rule before this change is the safe fallback.
  Rejected: dropping the whole message, because that adds a rejection for
  a field that only helps.
- The admin switch keeps the revision check, as option B says.

## Milestone 1: Documentation and spec

Depends on: none. Waits for decision 3 for the sentences on seat dialogs.

State the new rule and its decision in the spec.

- [ ] `docs/product/multiplayer.md`, The game on the server: a tap applies
      to the state that the device saw, with the exceptions for taps that
      do not conflict, and the rejected alternatives.
- [ ] `docs/product/multiplayer.md`, Seats: a change to a seat applies
      while each seat that it changes is as the device saw it. A claim also
      needs the holder of its seat, and a speaker move the speaker. Changes
      to two different seats at once both apply. The rule of decision 3
      for a seat dialog.
- [ ] Search `src/ui/`, the mockup, and `README.md` for text that states
      the old rule, and update it.
- [x] `plans/multiplayer.md`: record Cal's choice for finding 2 of review
      1, and name this plan.

## Milestone 2: The model and the server

Depends on: 1

- [ ] Tests first. See each test fail before the change:
  - [ ] Two Mark done taps on one revision both apply.
  - [ ] A late Mark done does nothing when its window closed, also when a
        new window opened, and after an undo and a new card play.
  - [ ] Two claims of different seats on one revision both apply. Two
        claims of one seat keep the first.
  - [ ] A late claim from an admin device does not take a faction that a
        phone picked after the admin device saw the seats.
  - [ ] Two edits of different seats on one revision both apply. A late
        edit of a seat that changed does nothing.
  - [ ] A late move of the speaker token does nothing when the speaker
        moved first.
  - [ ] A late End turn, and a late claim without `seen`, do nothing.
  - [ ] The message parser reads both shapes of `seen`, and reads a message
        with a broken `seen` as one without it.
  - [ ] `receive` passes `seen` from the message to the reducer.
- [ ] The fold records the server time of the card play on the window.
- [ ] `src/model/seen.ts`: the type, the parser, the function of the
      client, and the check of the server.
- [ ] The room reducer takes `seen` and checks it. The Durable Object
      passes it from `receive`.
- [ ] The test server sends a command as a device that saw an earlier room.
- [ ] `README.md`, Key code: `seen.ts`, and the line of `protocol.ts`.

## Milestone 3: The game client and the seat dialogs

Tags: ui

Depends on: 2. Waits for decision 3. The TODOs below follow its
recommendation, E.

- [ ] `src/ui/useGameClient.ts`: `send` adds `seen` from the room that the
      screen shows.
- [ ] The claim names the holder of its seat as the dialog opened it.
- [ ] The seat dialog keeps only the fields and the speaker switch that its
      player changes. The other fields follow the live seat. A model
      function with tests merges the changes into the live seat.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Smoke test on the dev server. Two devices in one reaction window send
      Mark done on one revision, and both tiles are done. Two devices take
      different seats on one revision, and both hold them. A page sends its
      claim with the seats that it shows.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

None. The smoke test of milestone 4 runs before the merge.
