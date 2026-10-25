# Rounds and turn order

Part of the [TI4 Tempo product spec](../product.md).

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

The token never moves on its own, also not at the start of a round. A player
moves it in one of two places: the Speaker & Seating screen, which the speaker
chip opens, or the new speaker choice in a Politics reaction window (see
[The reaction window](clocks.md#the-reaction-window)). Rejected: passing the token
automatically each round, because the TI4 rules move it only through Politics
and a few other cards.

Re-ordering the seats themselves is possible but deliberately understated. It is
a correction for a setup mistake — people do not swap chairs mid-game — so it
lives behind a secondary control rather than in the main flow.

## Factions

Each player picks their faction at setup from the list of official factions.
The list holds every faction of the base game, its expansions, and the codices.
The game cannot begin until every seat has a faction. The app stores the faction
itself, not a typed name, so a rule that depends on a faction can find its
player. Two players cannot hold the same faction: taking a faction that another
seat holds swaps the two, as colours do.

Rejected: a free-text faction field, because the app cannot apply a faction rule
to a name that a player typed. A faction outside the official list cannot be
entered. Rejected: an optional faction, because a forgotten Naalu faction would
put the Naalu player in card order for the whole game, with no fix after the
start.

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
