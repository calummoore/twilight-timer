# Core concepts

The game rules that TI4 Tempo models. The [product spec](product.md) holds the
goal, the screens, and the requirements.

## Round structure

The app models the full TI4 round so it always knows what it's timing:

| Phase        | What's timed                                                       |
| ------------ | ------------------------------------------------------------------ |
| **Strategy** | Per-player pick time, in speaker order                             |
| **Action**   | Per-player turn clock — the chess clock. The bulk of the game.      |
| **Status**   | Whole-table timer across the seven status steps                     |
| **Agenda**   | Per-agenda discussion timer + per-player voting timer, seating order |

Agenda phase only appears once the Custodians token has been removed from
Mecatol Rex; before that the round goes Strategy → Action → Status.

## Seating and the speaker

Seating is a **ring**, set once at game start to match where people are actually
sitting. The **speaker is a pointer into that ring** — nothing more.

Two orders derive from it, and they are not the same:

| Order                   | Derivation                                          |
| ----------------------- | --------------------------------------------------- |
| **Strategy pick order** | Speaker first, then clockwise                        |
| **Agenda voting order** | Starts to the speaker's left, clockwise; speaker last |

The speaker votes last because they break ties.

Because both are derived, **moving the speaker token is the only action needed** —
the app never asks anyone to re-order anything. This matters because the token
genuinely moves during play: the Politics (3) primary ability hands it to a
player who does not hold it, and some agendas elect a new speaker. The token is
editable from the speaker chip in the top bar, visible on every in-game screen.

The token does not move at the start of a round. A player moves it in one of
two places: the Speaker & Seating screen, which the speaker chip opens, or the
new speaker choice in a Politics reaction window (see
[The reaction window](#the-reaction-window)). The one other move follows the
TI4 rules: when the speaker leaves the game, the token passes to the player on
their left (see [Players who leave](#players-who-leave)). Rejected: passing the
token automatically each round, because the TI4 rules move it only through
Politics, a few other cards, and a speaker who leaves the game.

Re-ordering the seats themselves is possible but deliberately understated. It is
a correction for a setup mistake — people do not swap chairs mid-game — so it
lives behind a secondary control rather than in the main flow.

## Factions

Each player picks their faction at setup from the list of official factions.
The game cannot begin until every seat has a faction. The app stores the faction
itself, not a typed name, so a rule that depends on a faction can find its
player. Two players cannot hold the same faction: taking a faction that another
seat holds swaps the two, as colours do.

Rejected: a free-text faction field, because the app cannot apply a faction rule
to a name that a player typed. A faction outside the official list cannot be
entered. Rejected: an optional faction, because a forgotten Naalu faction would
put the Naalu player in card order for the whole game, with no fix after the
start.

The base game is always in play. Setup has one on/off choice for each expansion
that adds factions: Prophecy of Kings, Thunder's Edge, and the Council Keleres.
The Council Keleres came in Codex III, and the Thunder's Edge box also holds it.
The choices sit on the setup screen, next to the random deal. All three start on,
and the device keeps the choice for the next game. Rejected: a choice on the
Settings screen, because the choice matters only at setup, where the deal uses
it. Rejected: one choice of game version, because a table can own Thunder's
Edge without Prophecy of Kings, or a printed Codex III without Thunder's Edge.
Rejected: only Prophecy of Kings on at first, because the lists would then
change for a table that never uses the choice.

The faction list of each seat offers only the factions of the base game and of
the expansions that are on. A seat keeps a faction that it holds when its
expansion turns off. Rejected: every official faction in every list, because
the choice then means one thing for the list and another for the deal.

While a seat has no faction, setup offers a random deal for the empty seats. One
tap gives each seat without a faction a random faction of the base game or of an
expansion that is on, which no other seat holds. A seat that has a faction keeps
it. Rejected: a new faction for every seat at each tap, because setup has no
undo, and the tap would discard the factions that players chose. The deal
applies no faction rules, because the app is not a rules engine.

A game saved by an older build can hold a player without a faction, because
those builds did not require one.

## Initiative order

Strategy card number **is** turn order, with one exception: the Naalu "0" token
below. The app takes the card assignments from the strategy phase and derives
the action phase running order from them — no separate ordering step.

At the end of each strategy phase, the Naalu Collective player puts the "0"
token on their strategy card. Their initiative becomes 0, so they go first in
the action phase. The rail and the active player's card show initiative 0. The
strategy card keeps its number and its name everywhere else, for example on the
strategic action.

The Naalu promissory note, Gift of Prescience, gives the token to its holder for
one round instead. The table moves the token from the strategy screen before the
action phase begins, and undo takes the move back. The token returns to the
Naalu player when the next round starts. Rejected: leaving the note out, because
a round with the note would then have the wrong turn order and charge the wrong
clocks.

A game without a Naalu player has no token. A game saved by a build without the
token keeps card order for every player, because its log follows that rule.

- **5–6 players (and 7–8 with PoK):** one card each
- **3–4 players:** two cards each; a player takes a turn at each of their
  initiative numbers. Not in the MVP. Confirm the turn-order rule before
  building it: the official rules may give one turn per cycle, at the
  player's lowest card.

Unchosen cards accumulate a trade good, shown on the strategy phase screen.

## Passing

Passing is sticky. A passed player is dimmed on the rail and skipped for the
remainder of the round.

A player may only pass once they have **played their strategy card**. The app
knows whether each player has taken their strategic action, and warns — but does
not block — on an illegal pass. (The table is the authority; sometimes a rule is
being bent deliberately.)

The action phase ends when the last unpassed player passes.

## Players who leave

A player can leave before the game ends, for example when they are
eliminated or when they go home. The table removes the player on the
Speaker & Seating screen. The removal is a tap in the log, so undo brings
the player back.

A removed player takes no more strategy picks, turns, reactions, or votes.
The pick order, the voting order, and the initiative order derive again
without them. Their seat stays on the table ring, empty. Their recorded time
stays in the round and game stats. The game stats name the round in which
they left.

A removal applies at once, in any phase:

- When the player's clock runs, it stops, and the clock of the next player
  starts. When nobody is left to act in the action phase, the status phase
  begins.
- In the strategy phase, the card that they picked returns to the common
  play area, and another player can take it.
- After the strategy phase, nobody plays their card for the rest of the
  round.
- In a reaction window, a player who leaves counts as done. When the player
  who played the card leaves, their turn ends. The next turn starts when the
  window closes.
- When the speaker leaves, the token passes to the next player clockwise, the
  player on their left, as the TI4 rules say. The remove dialog names that
  player before the table confirms. Rejected: asking the table for the new
  speaker, because the rules name the player and the speaker chip can still
  move the token. Rejected: blocking the removal of the speaker, because it
  adds two taps.
- When the Naalu player leaves, the "0" token leaves the game. A player who
  holds the token through Gift of Prescience keeps it for the rest of the
  round.
- When another holder leaves in the strategy phase, the Naalu player gets the
  token back, if they are still in the game.

The other players keep one strategy card each, also when four or fewer
players remain, as the TI4 rules say. The table can remove players until one
player remains.

Rejected: deleting the entries of a removed player, because the record is
what the app exists to keep. Rejected: keeping the player in the round as a
passed player, because they would still get a reaction tile and a vote.

## The reaction window

This is the mechanic that makes a naive chess clock wrong for TI4.

When a player takes a **strategic action**, they resolve the primary ability, and
then every *other* player may spend a command token to resolve the secondary.
That's real table time that belongs to nobody in particular.

So: playing a strategy card **stops the active player's clock** and opens a
**reaction window** — a separate timer that is not charged to any individual
player. Each other player gets a tile they tap to mark themselves done (whether
they resolved the secondary or declined it).

When the card is **Politics (3)**, the window also asks for the **new speaker**,
because the primary ability hands the token to a player who does not hold it.
It offers every player except the one who held the token when the window
opened, the Politics player included. One tap moves the token, and a tap on
another player changes the choice. The choice is optional: the window closes as
usual without it, and the speaker chip still moves the token afterwards.
Rejected: opening the Speaker & Seating screen when Politics is played, because
it hides the window and takes two taps. Rejected: requiring the choice before
the window opens, because a forced step blocks the table after a mis-tap.

The window closes when every other player has marked themselves done. The
table can also close the window early with **Mark all done**. It marks
every player who is still waiting as done at that moment, and the window closes
at once. Rejected: a warning before the window closes, because the label says
what the tap does, and undo reverts a mis-tap.

Closing the window **ends the active player's turn**, because the strategic
action is their action for the turn. The next unpassed player in initiative
order starts their turn at once. The turn that ends keeps only the time before
the card was played. When every other player has passed, the same player starts
a new turn. Rejected: resuming the active player's turn after the window,
because the rules give them no further action, and the wait for End Turn would
go on their clock. Rejected: ending the turn only on Mark all done, because the
last player who marks done leaves the window in the same state.

With a window limit, the window stays open past the limit, as every other limit
does: the clock turns red, counts overtime, and the alarm sounds. Only a tap
closes the window. Rejected: closing the window when its limit passes, because
the turn would then end without a tap, and the next player's clock would run
while players still resolve the secondary.

A game saved by a build before these rules keeps the rules of that build:
closing the window resumes the turn, and the window closes itself when its
limit passes.

Per-player completion times inside the window are recorded, so a player who
consistently soaks the whole secondary window shows up in the stats.

Only one strategic action per player per round, so at most one window per player
per action phase.

The top bar stays usable while the window is open, so the table can pause, undo,
or move the speaker. Rejected: covering the top bar with the window, because the
table can need a break during a window.

## Time limits and overtime

All limits are **off by default**. When on, expiry is soft:

- The clock turns red and **flips to counting overtime upward**
- An **alarm sounds** so the table notices without watching the screen
- The overage is logged and surfaces in the round and post-game stats
- Nothing advances, nothing is blocked

Configurable limits: turn, reaction window, agenda discussion, per-player vote,
status phase, strategy pick. Each is independently on/off with its own duration,
under a master "enforce time limits" switch.

## Corrections

Game state is a fold over an **append-only log of actions**. The log records
every game tap: card picks, turns ended, passes, strategy cards played,
reaction marks and window changes, phase steps, status steps, the Custodians
switch, votes, agenda resolutions, speaker moves, Naalu token moves, player
removals, and the game end. So undo can take back any tap. Pauses and time-limit changes are kept
beside the log, not in it.

Because state is *derived*, it is never edited directly. There are exactly two
correction operations, and deliberately no others:

**Undo** — pops the last action off the log. It lives permanently on the action
bar, and pressing it repeatedly keeps stepping back, so the table can rewind to
the last correct state and carry on from there. It restores **elapsed time as
well as state**, so a mis-tapped End Turn costs nobody their seconds. Every
clock returns to its value at the moment of the undone action. The time between
that action and the undo is charged to nobody, like a pause.

**Edit time** — changes a duration and nothing else. A duration is a leaf value:
nothing is derived from it, so editing one has no consequence beyond the totals
it feeds. Freely available on any logged entry, at any time, with no guards.

The history screen lists every action, newest first, and offers those same two
operations per row. "Undo to here" is not a third operation — it is just undo
repeated, so the row states how many presses it saves and what comes off.

What is deliberately **not** offered: reassigning a turn to a different player,
or deleting a logged entry. Turn order is derived from initiative, so a turn
belonging to someone else is not a state the game can produce, and deleting one
shifts every turn after it. Both would silently corrupt the record the app
exists to keep.

Worth noting: an accidental End Turn is cheap even if nobody catches it. The
time is still attributed to the right player — only the turn count moves — so
the totals stay honest.
