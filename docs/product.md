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

The core concepts have their own pages:

- [Rounds and turn order](product/rounds.md): the round structure, seating
  and the speaker, factions, initiative order, and passing.
- [Clocks and corrections](product/clocks.md): the reaction window, time
  limits and overtime, pauses, and corrections.

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
| **Reaction Window** | Overlay: fixed-window countdown, per-player done tiles, new speaker for Politics |
| **Game Paused**     | Overlay: pause clock, Pause or Rule check, rule-check time, Resume       |
| **Status Phase**    | Table timer + the seven status steps as a checklist                      |
| **Agenda Phase**    | Discussion timer, speaker-order voting with per-player timers            |
| **Round Summary**   | Per-player time this round, split by phase                               |
| **History & Undo**  | Action log; undo repeatedly to rewind, or edit any duration               |
| **Post-game Stats** | Totals, averages, longest turns, phase breakdown, overtime count, rule-check time |
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
- [ ] Strategy phase: assign cards 1–8, derive initiative order with the Naalu
      "0" token, handle two-cards-each at 3–4 players
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

- [ ] Pause the whole game (food, rules argument, someone's on the phone), and
      time rule checks during a pause
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
  [Pauses](product/clocks.md#pauses) gives the rules, with rule checks.
- **Component actions during another player's turn.** Not tracked. The time is
  real, but attributing it costs more taps than it's worth.
- **7–8 player games.** Each player takes one card from the normal set of eight,
  as the [initiative table](product/rounds.md#initiative-order) says. No tie-breaking rule is needed.

---

## Mockups

Open [`mockups/index.html`](mockups/index.html) in a browser — it's a single
self-contained file with no dependencies. Load it on the actual iPad to check
legibility at real size and real viewing distance.

The prototype has live timers, so the action phase and reaction window can be
watched running rather than just looked at.
