# Clocks and corrections

Part of the [TI4 Nexus product spec](../product.md).

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

Only one strategic action per strategy card per round, so at most one window
per card per action phase.

The top bar stays usable while the window is open, so the table can pause, undo,
or move the speaker. Rejected: covering the top bar with the window, because the
table can need a break during a window.

The window has no undo control of its own. Rejected: an Undo last button in the
window footer, because it does the same as the Undo in the top bar, which stays
in view.

## Time limits and overtime

All limits are **off by default**. When on, expiry is soft:

- The clock turns red and **flips to counting overtime upward**
- An **alarm sounds** so the table notices without watching the screen
- The overage is logged and surfaces in the round and post-game stats
- Nothing advances, nothing is blocked

Configurable limits: turn, reaction window, agenda discussion, per-player vote,
status phase, strategy pick. Each is independently on/off with its own duration,
under a master "enforce time limits" switch.

## Pauses

The table can pause the whole game from the top bar: for food, a phone call, or
a rules discussion. A pause stops every player clock and every table clock, such
as the reaction window, so it charges nobody.

A pause can have a **reason**. The one reason is **Rule check**, for a rules
discussion. A new pause is always a plain pause: the pause screen shows
**Pause** selected. While the game is paused, one tap on Rule check starts a
rule check, and the screen shows its running time. A tap on Pause ends the rule
check, and the game stays paused. Resume also ends it. One pause can hold
several rule checks. Rejected: letting the last reason cover the whole pause,
because a rules discussion can end while the table stays paused. A rule check
misses the seconds before its tap, and that is accepted.

Rule-check time is **game time** that nobody is charged for. The game clock runs
during a rule check, and the post-game stats count rule checks in the game time,
as their own part of it. Plain pause time is not game time, so the game clock,
the round lengths, and the phase totals leave it out. Rejected: leaving rule
checks out of game time, because a rules discussion is part of playing the game,
and a break is not.

The stats show only time with a reason. The post-game stats show the time and
the number of rule checks, and their share of the game. Rejected: showing plain
pause time or a paused total, because a plain pause does not say where the time
went. The round summary shows no pause time, so its round length leaves rule
checks out.

A rule check counts in full, also when a later undo takes back the tap before
the pause, because the table really spent that time. So after such an undo, the
game clock keeps the rule check, and every player and table clock returns to its
value at the undone tap. Undo does not change a pause or its rule checks. The
reason can change only while the game is paused.

A game saved by a build without reasons has no rule checks.

## Corrections

Game state is a fold over an **append-only log of actions**. The log records
every game tap: card picks, turns ended, passes, strategy cards played,
reaction marks and window changes, phase steps, status steps, the Custodians
switch, votes, agenda resolutions, speaker moves, Naalu token moves, player
removals, and the game end. So undo can take back any tap. Pauses with their
rule checks, and time-limit changes, are kept beside the log, not in it.

Because state is *derived*, it is never edited directly. There are exactly two
correction operations, and deliberately no others:

**Undo** — pops the last action off the log. It lives permanently on the action
bar, and pressing it repeatedly keeps stepping back, so the table can rewind to
the last correct state and carry on from there. It restores **elapsed time as
well as state**, so a mis-tapped End Turn costs nobody their seconds. Every
clock returns to its value at the moment of the undone action. The game clock
also keeps the rule checks in between (see [Pauses](#pauses)). The time between
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
