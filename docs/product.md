# TI4 Tempo

A shared-table time tracker for **Twilight Imperium (4th Edition)**.

It sits on an iPad in the middle of the table and answers the question every TI4
group eventually asks: *where did six hours go?*

---

## Goal

Twilight Imperium is long. Nobody disputes that. What groups actually disagree
about is **who** made it long — and without data, that argument is unwinnable and
mildly poisonous. TI4 Tempo replaces the argument with a record.

The app is a **chess clock for the action phase**, wrapped in enough of TI4's
round structure to know whose turn it is and when it's legal to pass.

### Design principles

1. **Recording instrument, not referee.** The app never takes an action out of a
   player's hands. Timers going over is information, not enforcement.
2. **Readable across a table.** Every primary number is legible from a metre
   away at an angle. Colour does the identification work; text is confirmation.
3. **One tap per turn.** The common case — "I'm done, next player" — is a single
   large target. Everything else is secondary.
4. **Mistakes are expected.** A shared screen in a room with six excited people
   gets mis-tapped. Undo is a permanent, first-class control.
5. **Tracking first, limits opt-in.** Time limits ship **off**. Groups that want
   them can turn them on per-timer.

---

## Non-goals

- **Not a rules engine.** It doesn't validate tactical actions, resolve combat,
  track resources, or know what's on the board.
- **Not a score tracker.** Victory points belong on the board. (Possible later,
  explicitly out of scope now.)
- **Not a replacement for the game.** If the app is wrong, the table is right.
  Every value is editable.

---

## Core concepts

### Round structure

The app models the full TI4 round so it always knows what it's timing:

| Phase        | What's timed                                                       |
| ------------ | ------------------------------------------------------------------ |
| **Strategy** | Per-player pick time, in speaker order                             |
| **Action**   | Per-player turn clock — the chess clock. The bulk of the game.      |
| **Status**   | Whole-table timer across the seven status steps                     |
| **Agenda**   | Per-agenda discussion timer + per-player voting timer, seating order |

Agenda phase only appears once the Custodians token has been removed from
Mecatol Rex; before that the round goes Strategy → Action → Status.

### Seating and the speaker

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

### Initiative order

Strategy card number **is** turn order. The app takes the card assignments from
the strategy phase and derives the action phase running order from them — no
separate ordering step.

- **5–6 players (and 7–8 with PoK):** one card each
- **3–4 players:** two cards each; a player takes a turn at each of their
  initiative numbers. Not in the MVP. Confirm the turn-order rule before
  building it: the official rules may give one turn per cycle, at the
  player's lowest card.

Unchosen cards accumulate a trade good, shown on the strategy phase screen.

### Passing

Passing is sticky. A passed player is dimmed on the rail and skipped for the
remainder of the round.

A player may only pass once they have **played their strategy card**. The app
knows whether each player has taken their strategic action, and warns — but does
not block — on an illegal pass. (The table is the authority; sometimes a rule is
being bent deliberately.)

The action phase ends when the last unpassed player passes.

### The reaction window

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

### Time limits and overtime

All limits are **off by default**. When on, expiry is soft:

- The clock turns red and **flips to counting overtime upward**
- An **alarm sounds** so the table notices without watching the screen
- The overage is logged and surfaces in the round and post-game stats
- Nothing advances, nothing is blocked

Configurable limits: turn, reaction window, agenda discussion, per-player vote,
status phase, strategy pick. Each is independently on/off with its own duration,
under a master "enforce time limits" switch.

### Corrections

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

---

## Screens

### iPad (the table device)

| Screen              | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| **Setup**           | Player count, names, colours, factions, seating order, speaker token     |
| **Settings**        | Time limits, alarm, display options                                      |
| **Speaker & Seating** | Table ring; tap a seat to move the speaker, both orders re-derive       |
| **Strategy Phase**  | Card selection in speaker order; sets initiative                         |
| **Action Phase**    | **The hero screen.** Active clock, initiative rail, End Turn             |
| ↳ *rail rows*       | Show each player's strategy card; blue = still to play, grey ✓ = used    |
| **Action Overtime** | Same screen in its expired state — red, alarming, counting up            |
| **Reaction Window** | Overlay: fixed-window countdown, per-player done tiles                   |
| **Status Phase**    | Table timer + the seven status steps as a checklist                      |
| **Agenda Phase**    | Discussion timer, speaker-order voting with per-player timers            |
| **Round Summary**   | Per-player time this round, split by phase                               |
| **History & Undo**  | Action log; undo repeatedly to rewind, or edit any duration               |
| **Post-game Stats** | Totals, averages, longest turns, phase breakdown, overtime count         |
| **Join**            | QR + join code for phone companions                                      |

### Phone (companion — add-on)

Explicitly a **later phase**. The tabletop device is fully functional alone; the
phone is an enhancement, never a dependency. If a phone drops off, that player
uses the iPad exactly as before.

| Screen              | Purpose                                                           |
| ------------------- | ----------------------------------------------------------------- |
| **Join**            | Enter code or scan QR                                             |
| **Claim seat**      | Pick which player at the table you are                            |
| **Waiting**         | Whose turn it is, their clock, your standing — glanceable          |
| **Your turn**       | Colour-flooded, huge clock, End Turn / Play SC / Pass              |
| **Reaction window** | Countdown + a single "I'm done" button                            |
| **Pass confirm**    | Guard rail — passing is irreversible for the round                |
| **Personal stats**  | Your time, your average, your worst turn                          |

---

## Data model (sketch)

```
Game
  id, createdAt, config (TimeLimits), custodiansRemoved: bool
  players: Player[]
  rounds:  Round[]

Player
  id, name, colour, faction, seatIndex, isSpeaker

Round
  number
  strategyPicks:  { playerId, cardNumber }[]
  phases:         PhaseLog[]

PhaseLog        // Strategy | Action | Status | Agenda
  phase, startedAt, endedAt
  entries: Entry[]

Entry           // one timed unit
  kind:     'turn' | 'reactionWindow' | 'vote' | 'pick' | 'phase'
  playerId: string | null      // null for table-wide entries
  durationMs, limitMs | null, overtimeMs
  edited: bool                 // flagged if the duration was hand-edited

Action          // the undo log — append-only, state is a fold over this
  one action per game tap, as Corrections lists, with its time
```

Two rules make corrections tractable:

- **Durations are elapsed milliseconds**, never start/stop wall-clock pairs. An
  edit is a simple value change and the totals recompute cleanly.
- **State is never stored, only derived** by folding the action log. Undo is
  therefore a pop, not a patch — there is no way for the displayed state and the
  log to disagree.

---

## Requirements

### MVP scope

The first release builds the must-have list below, with these exceptions:

- 5–8 players only. Games with 3–4 players wait for the turn-order rule.
- No history list and no duration editing. Undo stays in the top bar.
- No seat re-ordering after setup.
- No agenda vote tally.

From the should-have list, the MVP adds the pause.

### Must have (v1, iPad only)

- [ ] Setup: 3–8 players with name, colour, faction, seat order, speaker
- [ ] Speaker movable at any time; strategy pick and agenda voting orders derive
      from it automatically. Seats re-orderable as a correction.
- [ ] Strategy phase: assign cards 1–8, derive initiative order, handle
      two-cards-each at 3–4 players
- [ ] Action phase chess clock with one-tap End Turn
- [ ] Pass tracking with skip-on-pass and illegal-pass warning
- [ ] Reaction window with per-player done marking
- [ ] Status and agenda phase timing
- [ ] Optional per-timer limits, soft expiry with alarm and overtime counting
- [ ] Repeatable undo over the action log, restoring elapsed time as well as state
- [ ] History list with per-entry undo and duration editing
- [ ] Round summary and post-game stats
- [ ] Screen stays awake; survives app backgrounding without losing time

### Should have

- [ ] Pause the whole game (food, rules argument, someone's on the phone)
- [ ] Export a game as JSON / CSV
- [ ] Game history across sessions

### Add-on (phase 2)

- [ ] Phone companion: join by code/QR, claim seat, act on own turn
- [ ] Live sync between iPad and phones
- [ ] Per-player push when their turn begins

### Explicitly out of scope

- Victory point / objective tracking
- Rules validation of any kind
- Board state, units, resources, tech
- Online play

---

## Answered questions

- **Pausing the clock.** A pause charges nobody. The pause duration is logged
  separately, so the total game time still reconciles. Rejected: keeping the
  active player's clock running, because a break is not their turn.
- **Component actions during another player's turn.** Not tracked. The time is
  real, but attributing it costs more taps than it's worth.
- **7–8 player games.** Each player takes one card from the normal set of eight,
  as the initiative table says. No tie-breaking rule is needed.

---

## Mockups

Open [`mockups/index.html`](mockups/index.html) in a browser — it's a single
self-contained file with no dependencies. Load it on the actual iPad to check
legibility at real size and real viewing distance.

The prototype has live timers, so the action phase and reaction window can be
watched running rather than just looked at.
