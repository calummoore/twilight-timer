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
genuinely moves during play: the Politics (3) primary ability hands it to another
player, and some agendas elect a new speaker. The token is editable from the
speaker chip in the top bar, visible on every in-game screen.

The token never moves on its own, also not at the start of a round. In the MVP,
a player moves it by hand from the speaker chip. Rejected: passing the token
automatically each round, because the TI4 rules move it only through Politics
and a few other cards. A later version can open the speaker picker when Politics
is played.

Re-ordering the seats themselves is possible but deliberately understated. It is
a correction for a setup mistake — people do not swap chairs mid-game — so it
lives behind a secondary control rather than in the main flow.

## Initiative order

Strategy card number **is** turn order. The app takes the card assignments from
the strategy phase and derives the action phase running order from them — no
separate ordering step.

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

## The reaction window

This is the mechanic that makes a naive chess clock wrong for TI4.

When a player takes a **strategic action**, they resolve the primary ability, and
then every *other* player may spend a command token to resolve the secondary.
That's real table time that belongs to nobody in particular.

So: playing a strategy card **stops the active player's clock** and opens a
**reaction window** — a separate, fixed-duration timer that is not charged to any
individual player. Each other player gets a tile they tap to mark themselves
done (whether they resolved the secondary or declined it).

The window closes when **either**:
- every other player has marked themselves done, **or**
- the window timer expires

Per-player completion times inside the window are recorded, so a player who
consistently soaks the whole secondary window shows up in the stats.

Only one strategic action per player per round, so at most one window per player
per action phase.

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
switch, votes, agenda resolutions, speaker moves, and the game end. So undo can
take back any tap. Pauses and time-limit changes are kept beside the log, not in
it.

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
