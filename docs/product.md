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

## Spec pages

- [Game rules and model](game-rules.md): the round, the orders, the clocks,
  the corrections, and the data model sketch.
- [Screens](screens.md): the table device and the phone screens.
- [Multiplayer](multiplayer.md): shared games, roles, seats, live sync, and
  private data.
- [Architecture](architecture.md): the components and the flow of a change.

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

### Multiplayer

[Multiplayer](multiplayer.md) gives the requirements and the decisions.

- [ ] Share a game with a join code, a join link, and a QR code
- [ ] Player mode on phones: claim a seat, act on own turn, mark done in a
      reaction window
- [ ] More table devices through the table link
- [ ] Live sync between table devices and player devices
- [ ] Private data for each seat, prepared but empty in this release

### Add-on (phase 2)

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
