# Multiplayer

Part of the [TI4 Nexus product spec](../product.md).

One game runs on the server, and every device at the table joins it with a
join code. A device is a table device, which acts for every player, or a
seated device, which acts for one player. Every device shows the same
screens.

## The game on the server

A game lives on the server from the moment the host creates it. Create
game, at the end of setup, puts the seats on the server and opens the claim
screen, where the device that creates the game joins it, see
[Joining](#joining). Then the device shows the Players & devices screen as a
lobby. There is no game on a device alone. Rejected: a game that lives on
one device with no server, next to the shared game, because two kinds of
game double every command, every screen state, and every test.

No clock runs before Start game. Start game, on an admin device, begins the
strategy phase. A device that joins before Start sees the lobby and waits.
A device that joins after Start lands in the running game. Rejected:
starting the game when the host creates it, because the game clock and the
first pick clock would run while the phones join. Rejected: a pause that
opens with the lobby, because a phone that joins would see a paused game,
and a pause is not a tap.

Every device shows every tap, from any device, as soon as it applies.

Every tap gets the time at which it reaches the server. So every device
shows the same clocks, and the time attribution rules of
[Clocks and corrections](clocks.md) hold with one clock. A device shows a
running clock from the server time, so a slow network shows as a short
delay, never as a different total.

A tap applies to the state that the device saw. When two devices tap on the
same state, the first tap applies, and the second does nothing. So a double
tap from two devices cannot end two turns. Rejected: applying every tap in
arrival order, because the second End Turn would end the next player's turn.

While a device has no connection, it shows that it is reconnecting, and its
controls are disabled. A tap waits for the connection. It is not queued.
Rejected: queued taps, because a tap that arrives late would be charged at
the wrong time, and the table can tap on another device.

A game stays on the server, reachable by its code, without a time limit.
Rejected: deleting old games, because a game is small, and a code must not
be reused.

A device that holds a game saved by an older build offers to continue that
game on the server. The game then gets a code, and the device joins it at
once as a table device with admin, without the claim screen. A saved game
that cannot be read shows a notice, as before.

## Codes

Each game has a join code: six characters, letters and digits, without the
letters and digits that look alike, such as the letter O and the digit zero.
The app shows a code in capitals and accepts it in any case. No two games
share a code, and a code is never reused.

The Players & devices screen of every device shows the join code, a link
that holds it, and a QR code of the link. A phone that scans the QR code or opens the link
goes straight to the claim screen of that game. Rejected: no QR code, because
a six-character code is quick to type, but a scan is quicker and cannot be
misread across a table.

The code and the link can be selected and copied. A tap on the link opens it
in a new tab, and Players & devices stays open. Copy link puts the link on the
clipboard, so that a player can send it in a chat. Rejected: opening the link
in the same tab, because the page then loads again, and during a game it
leaves Players & devices.

The join code is the only code. A device becomes an admin only when an
admin device gives it admin, see [Admin rights](#admin-rights). The device
that creates the game is the first admin. Rejected: an
admin code shown on admin devices, because it is readable wherever the
join code is, on the device in the middle of the table. Rejected: a
request for admin that an admin approves, because it adds a pending state
and a row of buttons, and an admin gives admin with one switch anyway.

## Devices and modes

A device is one browser. It keeps its place in a game, so a reload, a closed
tab, or a lost connection returns it to the same game with the same seat and
the same rights.

A device in a game is a table device or a seated device:

- A **table device** has no seat. With admin it acts for every player,
  like the device in the middle of the table. Without admin it is a
  **viewer**: it sees the game, and every control is disabled.
- A **seated device** holds one seat, so it acts for that player. It can
  also be an admin.

An admin device may do every tap in the game, and may change the rights of
other devices. Once the device that creates a game has joined it, at least
one admin device always exists in the game. A device that is neither has not
joined the game, and only sees the claim screen.

### Joining

A device joins a game with the join code, by typing it on the home screen or
by opening the link. The claim screen then lists the seats of the game: each
player's name, colour, faction, and whether a device holds the seat. The
device takes a seat, or joins as a table device. A device that joins gets
no admin, so a new table device is a viewer until an admin device gives it
admin. The device that creates the game is the only exception.

The device that creates a game with Create game also joins it on the claim
screen, which Create game opens. It takes a seat or joins as a table device,
and it gets admin either way, as the first admin of the game. Until it joins,
it sees the claim screen, also after a reload. It can change its seat later
and stays an admin. Rejected: the device that creates the game as a table
device from the start, because a host can create the game on a phone, take
their seat, and add the device in the middle of the table later.

One device holds a seat at a time. When a device takes a seat that another
device holds, the holder loses the seat and becomes a table device, with its
admin unchanged. So a player whose phone dies takes their seat again on
another phone in seconds. Rejected: a confirmation by the holder, because
the dead phone cannot answer.

A device can change its seat, or become a table device, at any time on
the Players & devices screen. A device can also leave a game: the device
forgets the game, and the game keeps the device's place, shown as away.
Rejected: removing a device from a game, because the last admin could not
leave, and a seat is taken in one tap anyway.

More than one table device can be in a game, for example an iPad in the
middle with admin, and a laptop at the side that only watches.

### Admin rights

An admin device gives admin to any other device, seated or table, and
takes it away, with the admin switch on the row of that device on the
Players & devices screen, except from the last admin device of the game.
Rejected: a table device that is always an admin, because a device that
joins as a table device would then be an admin with no check, while a
viewer and the switch are the same check as for a seated device. The
Players & devices screen lists every device of the game with its seat or
Table, its admin state, and whether it is connected.

## Who may tap what

A seated device acts for its player only, and only when the game waits for
that player. The table below gives the rule for each tap. The server applies
the same rules, so a tap outside the rights of a device does nothing,
whatever the device shows.

| Tap                                                                     | Seated device                   | Admin device                 |
| ----------------------------------------------------------------------- | ------------------------------- | ---------------------------- |
| Pick a strategy card                                                    | When it is the player's pick    | Any time                     |
| End turn, play a strategy card, pass                                    | On the player's turn            | Any time                     |
| Mark done in a reaction window                                          | The player's own tile           | Any tile                     |
| Mark all done, extend the window, choose the Politics speaker           | When the player played the card | Any time                     |
| Cast a vote                                                             | When it is the player's vote    | Any time                     |
| Status steps, Custodians, next phase, open voting, resolve, next round  | No                              | Yes                          |
| Move the speaker, move the Naalu token, remove a player, end the game   | No                              | Yes                          |
| Swap two seats                                                          | No                              | Yes                          |
| Pause, resume, rule check, time limits                                  | No                              | Yes                          |
| Start game, from the lobby                                              | No                              | Yes                          |
| Undo                                                                    | No                              | Yes                          |
| Change own seat, become a table device                                  | Yes                             | Yes                          |
| Give or take admin                                                      | No                              | Yes, not from the last admin |

A viewer may only take a seat.

Rejected: shared taps for seated devices, such as the status checklist or
the next phase, because a seated device acts when it is the player's turn,
and an admin device is always in the game. Rejected: undo by a seated device
of its own last tap, because undo takes time back from the next player's
clock, and such a correction stays with the table.

A control that the device may not use is disabled, not hidden, so every
device shows the same screens. A disabled main control names the player
that the game waits for. Rejected: hidden controls, because a player who
looks at another device would not find them.

## Settings

Time limits and the end of the game belong to the game, so only an admin
device changes them, and every device follows them. The alarm, keep awake,
the cumulative display, and the expansions for the next setup belong to the
device. The Settings screen shows the two groups apart.

## Screens

- **Home**: start a new game, join a game by code, and reopen a recent game
  of this device.
- **Setup**: unchanged, on one device. Create game puts the seats on the
  server and opens the claim screen. After the claim, Players & devices
  opens as the lobby. Rejected: a code during setup with a waiting screen
  for early joiners, because it saves a few seconds at most, and it can be
  added later. Rejected: a lobby where each player fills their own seat,
  because the setup then becomes a shared document with its own rules for
  every field, and the claim screen is needed anyway for a device that
  joins mid-game.
- **Claim seat**: the seats of the game, and Join as table device. On a
  device that is an admin, or that gets admin when it joins, the screen
  says that the device acts for every player, in a seat or at the table.
- **Players & devices**: the join code, the link with Copy link, the QR code,
  and one row per seat with the device that holds it, its admin switch, and
  its connection state, then the table devices.
  Before Start game it is the lobby, with Start game on an admin device and
  a waiting line on every other device. Rejected: the name "Join", because
  the device joins on the claim screen, and this screen lists who is in.
- The top bar of every in-game screen shows the device's seat, Table, or
  Viewer, and opens the Players & devices screen.
- Every other screen is the same on every device, with the controls that
  the device may not use disabled. There are no separate phone companion
  screens. Rejected: separate companion screens for a seated phone, because
  one set of screens is one set of rules, one mockup, and one port.
