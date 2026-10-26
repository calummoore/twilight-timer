# Rounds and turn order

Part of the [TI4 Nexus product spec](../product.md).

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

Seating is a **ring**, set at setup to match where people are actually
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
[The reaction window](clocks.md#the-reaction-window)). The one other move follows the
TI4 rules: when the speaker leaves the game, the token passes to the player on
their left (see [Players who leave](#players-who-leave)). Rejected: passing the
token automatically each round, because the TI4 rules move it only through
Politics, a few other cards, and a speaker who leaves the game.

### Seat swaps

A seat swap fixes a ring that does not match the table, for example after two
players sat down in each other's chairs. An admin device swaps two seats on the
Speaker & Seating screen, in re-order mode.

- A long press of about half a second on a seat starts re-order mode, as on the
  iOS home screen. **Re-order seats** starts it too.
- In the mode, every seat of a player in the game shakes. The held seat follows
  the finger at once.
- A drop of one seat on another swaps the two players. While the finger is over
  a seat, that seat slides into the place that the held seat left.
- A tap on one seat and then on another also swaps the two players. A second tap
  on the same seat lets it go. This also works from a keyboard.
- **Done**, a tap outside the seats, or Close ends the mode. Outside the mode, a
  tap on a seat moves the speaker token.

Each swap is one tap in the log. It applies at once on every device, and undo
takes back one swap. A swap changes the ring from the tap on. The pick order and
the voting order derive again, and the initiative order does not change. When a
swap changes the player who picks or votes now, the clock of that player stops,
and the clock of the new player starts. Earlier picks and votes stay as they
were. Re-order mode stops no clock. A reaction window that is open keeps its
tiles. The speaker token stays with its player. The empty seat of a player who
left keeps its place, and it cannot be swapped. No swap applies after the game
ends.

Rejected: drag that is always on, only the button, only the long press, and a
seat list with handles. The long press feels natural on the iPad and keeps a
plain tap for the speaker token, and the button keeps the mode easy to find,
also from a keyboard. Rejected: a move in which the seats between slide by one
place, as iOS icons do, because a swap matches the colour and faction swaps of
setup, needs no preview, and gives a tap alternative at no cost. Rejected: a
draft of the new ring that a Save applies as one tap, because every other change
is one tap that applies at once. Rejected: a swap that changes the ring from the
start of the game, because the earlier picks and votes would then not follow the
order of their time.

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
- **3–4 players:** two cards each. When every player has one card, the
  second round of picks starts with the speaker again and goes clockwise.

With two cards, a player's initiative is their lowest card. So each player has
one place in the turn order and takes one turn in each cycle. On a turn, the
player can play either card that they have not played yet. The strategic
action is the action of the turn, so the window close ends the turn, and the
second card waits for a later turn. Rejected: a turn at each of the player's
card numbers, because the TI4 rules give each player one initiative.

The player count at the start of the game sets the number of cards each, also
when a player leaves later.

Unchosen cards accumulate a trade good, shown on the strategy phase screen.

## Passing

Passing is sticky. A passed player is dimmed on the rail and skipped for the
remainder of the round.

A player may only pass once they have **played their strategy card**, or both of
their cards at 3–4 players. The app knows whether each player has taken their
strategic actions, and warns — but does not block — on an illegal pass. (The
table is the authority; sometimes a rule is being bent deliberately.)

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
- In the strategy phase, each card that they picked returns to the common
  play area, and another player can take it.
- After the strategy phase, nobody plays their cards for the rest of the
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

The other players keep the number of strategy cards each that the game started
with. So a game that started with five or more players keeps one card each,
also when four or fewer players remain, as the TI4 rules say. The table can
remove players until one player remains.

Rejected: deleting the entries of a removed player, because the record is
what the app exists to keep. Rejected: keeping the player in the round as a
passed player, because they would still get a reaction tile and a vote.
