# Seat edits in the lobby

Status: Active. On branch `calummoore/player-lobby-setup-rules`, no pull
request yet. The plan closes when its PR merges.

Today the host types every name, colour, and faction on the Setup screen
before anyone joins, and Create game waits for a faction on every seat. A
phone that joins can only take a seat. This change lets the host create a
game with seats that have no faction yet. Each player then sets their own
seat when they claim it, and an admin device edits any seat from the
Players & devices screen, one seat at a time. Start game waits until every
seat has a faction. After Start game, only names change. The device that
creates the game lands on the claim screen too, so it claims its seat the
same way. The spec pages
[Multiplayer](../docs/product/multiplayer.md) and
[Rounds and turn order](../docs/product/rounds.md) hold the requirements
and the decisions in force. This plan supersedes lobby decision 2 of the
[multiplayer plan](multiplayer.md), which kept every field with the host.

The change does not cover a seat move after Start game, which main built
in [Seat re-ordering](seat-reordering.md) after decision 4 below, the
expansions of a game after Create game, or remote play.

Rules from Cal with the request, 2026-10-26:

- A seated device without admin changes only its own seat, and only to a
  colour or a faction that no other seat holds.
- A change from an admin device takes the value. The seat that held the
  faction has no faction again. Decision 1 gives the colour case.
- Create game no longer needs a faction on every seat. Start game does, so
  that the players can choose their factions when the host leaves them
  open.
- After Start game, the seat order, the colours, and the factions do not
  change. Update of the same day: PR #34, by Cal's decisions in
  [Seat re-ordering](seat-reordering.md), lets an admin device move seats
  after Start game on the Speaker & Seating screen. So only the colours and
  the factions stay fixed after Start game, and this change does not touch
  the seat moves.
- An admin device edits one seat at a time from Players & devices, with an
  Edit button and a dialog, as the Setup screen edits a seat.

Decisions, all on 2026-10-26 by Cal, from the discussion of that day:

- Decision 1 = B: when an admin device gives a seat a colour that another
  seat holds, the other seat gets the first free colour. Alternatives: A,
  swap the two colours as Setup does; C, a seat without a colour before
  Start game. Reason: it matches the reset of a faction, and a free colour
  always exists, because there are eight colours and at most eight players.
- Decision 2 = A: names are unique in the whole game: in Setup, for the
  edits of a seated device, and for the edits of an admin device. The check
  trims spaces and ignores case. Alternatives: B, unique only for the edits
  of a seated device; C, no name rule. Reason: one rule everywhere is easy
  to explain, and the default names are already unique.
- Decision 3 = C: the claim screen holds the fields of the seat. A tap on
  a seat opens its name, colour, and faction, and Take seat saves them with
  the claim. Before Start game, a seat without a faction gets one from the
  player who claims it. Alternatives: A, no extra step, with Edit on the
  device's own lobby row; B, the edit dialog opens after the claim. Cal:
  "if there are missing values, like faction then the user would have to
  enter them when claiming the seat".
- Decision 4 = A: the spec keeps the seat re-order after Start game as a
  later feature, with its Later control in the mockup. This change adds no
  re-order after Start game. Alternative: B, remove the must-have, the
  note on the rounds page, and the control.
- Decision 5 = A: the edit dialog of an admin device has a Speaker switch
  before Start game, like the ★ of Setup. Alternative: B, no speaker
  control in the lobby. Reason: the dialog is the Setup row in another
  place, and the switch is small.
- Decision 6 = B, 2026-10-27, Cal, asked after the second merge of main:
  an admin device changes the seat order in the lobby with a ⠿ drag handle
  on the seat rows of Players & devices before Start game, as the setup
  rows have since PR #34, with one command per drop and no position in the
  edit dialog. Alternative: A, a Seat number in the edit dialog, as the plan
  first said. Reason: the setup rows and the ring both move by drag now,
  and the spec rejected ▲ and ▼ beside the handle.

Design decisions of the same day, from the implementation side:

- The expansions travel with the game. Create game sends the host's
  expansions with the seats, and the room stores them. The faction lists
  of the lobby and the lobby deal use them, not the setting of the phone.
  The room version becomes 3, with the upgrade step from version 2, which
  reads as every expansion on. The device still keeps its own choice for
  its next Setup.
- A seat of the setup has a faction or none, with its own type and parser,
  as the rows of the Setup screen already have. A player of the game always
  has a faction, as main requires since the games saved before the server
  were retired. Start game turns the seats into players, so the game and
  its parser do not change.
- One command per save. The claim command carries the values of the seat,
  and the edit command carries every field of one seat. The server applies
  the same rules again. Rejected: a claim followed by an edit, because the
  second command would name a stale revision and do nothing.
- The rules of a change follow the device that sends it, also for a claim.
  An admin device takes a value, and a device without admin picks only a
  free value. The device that created the game joins with admin, so its
  claim takes a value too.
- After Start game, the claim and the edit keep only the name. The claim
  screen shows the colour and the faction as text. Rejected: a one-tap
  claim after Start game, because one flow is one screen and one rule, and
  the second tap costs little.
- A rename after Start game also updates the player list inside the game,
  which the in-game screens, the stats, and the recent games read. The log
  and the game version do not change.
- The lobby deal is the `deal` command, for an admin device. The server
  deals with its own random source, which the room reducer takes next to
  the clock and the connections, so one tap applies to the live seats.
- Start game does nothing while a seat has no faction, on the server as on
  the screen.
- The name rule applies to the commands and to Create game, not to stored
  rooms, so a room with two equal names from before this change still
  loads. A name is trimmed, and an empty name is not valid.
- The seat order: an admin device drags a seat row of the lobby by its ⠿
  handle, with the drag hook and the list move of the setup rows. Each drop
  is one command: the player moves to the place of the row under the
  finger, and the rows between shift by one place. The speaker stays with
  its player. The rows of a device without admin have no handle.
- The edit dialog has no address, like the other dialogs, as the
  [Addresses](../docs/product/addresses.md) page says. The claim screen
  keeps its address, the join link, and the open seat is a state of it.
- A save that loses a race does nothing, as every tap does. The claim
  screen stays open with the live seats, so the player sees the value that
  is now taken and picks again. The edit dialog closes on Save, and the row
  shows the live seat. Rejected: a rejection message in the protocol,
  because the race is rare and the live state shows the result.
- The name, colour, and faction fields are one shared component for Setup,
  the claim screen, and the edit dialog. The dialog uses the shared Dialog
  control, which opens as a sheet on a phone.

Update, 2026-10-26, after the merge of main: PR #27 moved the room to
version 2 and opens the claim screen after Create game, so this change
takes version 3 and the host claims with the fields. PR #28 added the
admin recovery, which the rights module and the room reducer carry as an
input; the new commands keep it. PR #29 retired the games saved before the
server and made the faction of a player required, so the setup gets its own
seat type. PR #30 set the version rules: the fixture `room-v2.json` of the
old shape already exists, and this change adds the fixture of version 3.

Second update, 2026-10-26, after the second merge of main: PR #34 moves
seats after Start game, with the game at version 7, and the setup rows
drag by a ⠿ handle, so decision 4 is moot, the Later control is gone, and
decision 6 above is open. PR #31 gives each screen an address: the claim
screen is the join link, Change seat is a panel over Players & devices,
and a dialog has no address. PR #32 reads Create game in the model, so the
seat rules of Create game go there and the Worker stays thin. The fixture
rule of `AGENTS.md` keeps the fixture of the old shape, so this change
reads `room-v2.json` as version 3 and captures no new fixture.

Contract owners:

- The [product spec](../docs/product.md), with its pages
  [Multiplayer](../docs/product/multiplayer.md) and
  [Rounds and turn order](../docs/product/rounds.md).
- The [mockup](../docs/mockups/index.html).
- The [workspace README](../README.md) and `AGENTS.md`.

## Milestone 1: Documentation and protocol

Write the requirements and the decisions above into the spec, so that the
mockup and the code follow them.

- [x] Update [Multiplayer](../docs/product/multiplayer.md): the claim
      screen with the fields of the seat and a missing faction, also for
      the device that created the game, the new rows of Who may tap what,
      the Setup, Claim seat, and Players & devices entries under Screens,
      the rejected alternatives that this change replaces, and the
      expansions of a game under Settings.
- [x] Update [Rounds and turn order](../docs/product/rounds.md) under
      Factions: Create game without a faction on every seat, Start game
      that waits, the taken rule in the lobby for a seated device and for
      an admin device, and the unique name rule.
- [x] Update the [product spec](../docs/product.md): the Setup, Claim
      seat, and Players & devices rows of the screens table, and the Setup
      must-have.
- [x] Update the key features of the [README](../README.md).

## Milestone 2: Mockup

Tags: mockup

Draw the new flow in `docs/mockups/index.html`, in the iPad, upright iPad,
and phone frames, with the notes of each screen.

- [x] Setup: CREATE GAME on while seats have no faction, with the line that
      says that the players pick in the lobby, and the deal.
- [x] Claim seat, and Claim seat after Create game: one seat open with its
      name, colour swatches, faction list, and TAKE SEAT, before Start game.
      A taken colour or faction is off and names its holder. An empty seat
      says that it has no faction.
- [x] Lobby on an admin device: Edit on every seat row, START GAME off with
      the line that names the seats without a faction, and the deal button.
- [x] Lobby on a seated phone: Edit on its own row only.
- [x] Edit seat dialog of an admin device before Start game: name, colour,
      faction, Speaker switch, Save, and Cancel. The note says that after
      Start game only the name stays.
- [x] The ⠿ handle on the seat rows of the lobby on an admin device, as the
      setup rows have, with a row held over another row.
- [x] The Speaker & Seating screen and the setup rows do not change.

## Milestone 3: Model and server

The rules live in `src/model/`, where the tests reach them, and `worker/`
stays thin.

- [x] The setup carries the expansions and seats with a faction or none,
      with the seat type and its parser. The room version becomes 3, with
      the upgrade step from version 2 in the room chain, which reads with
      every expansion on. Start game turns the seats into players.
- [x] A test reads the fixture `room-v2.json` as a room of version 3 with
      every expansion on, as `AGENTS.md` says under Stored shapes and
      versions. The fixture of the old shape exists, so no capture.
- [x] A seat rules module: the name key, the free values of a seat, take
      a value for an admin device with the first free colour, the move to a
      Seat number, the speaker, the deal for the empty seats, and the
      problems of a setup.
- [x] Protocol: the claim command with the values of the seat, the edit
      command, the deal command, and the seat move command of the lobby,
      with their parsers.
- [x] Rights: edit for an admin device or for the own seat of a seated
      device, and deal for an admin device.
- [x] Room: the claim and edit cases with the rules of the device, also
      for the device that created the game, Start game that waits for every
      faction, a rename that updates the game, and the deal with the random
      source that the reducer takes next to the clock and the connections.
- [x] Worker: the create reading of the model rejects a setup that breaks
      the seat rules, and the object passes the secure random source of the
      Worker to the deal.
- [x] Tests: the seat rules, the room cases for an admin device and for a
      seated device before and after Start game, the rights, the parsers,
      and the rooms of version 1 and 2 that still load.

## Milestone 4: Screens

Tags: ui

- [ ] A shared component for the name, colour, and faction fields, used by
      Setup, the claim screen, and the edit dialog.
- [ ] Setup: Create game without a faction on every seat, the line and the
      deal, Create game off while two seats share a name, and the
      expansions in the create request.
- [ ] Claim seat: a tap opens the fields of the seat, and Take seat sends
      the claim with the values. At the join link, the screen stays until
      the device holds the seat, then the address becomes the game. As the
      Change seat panel, it returns to Players & devices at once. The device
      that created the game lands here after Create game and claims the
      same way. An empty seat shows that it has no faction, here and on
      Players & devices.
- [ ] Players & devices: Edit on the rows that the device may edit, the
      edit dialog with the fields of the device's rights and of the game
      state, the ⠿ handle on the seat rows for an admin device before Start
      game, START GAME that waits for every faction, and the deal button.
- [ ] Port the new mockup styles to `src/styles/mockup/`, with the class
      names of the mockup.
- [ ] Smoke test with two browsers: create a game without factions, claim a
      seat with a faction from a phone window, edit a seat as the admin,
      take a faction that another seat holds, start the game, and rename
      after the start.

## Milestone 5: Verification, commit, review, and pull request

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest.
- [ ] Open the pull request when every other milestone TODO is ticked.
      Put its link in the status paragraph.

## Post-merge follow-up (non-blocking)

- [ ] Smoke test on `https://ti4.nexus` with real phones: create a game
      with open factions, claim seats with factions, and start.
