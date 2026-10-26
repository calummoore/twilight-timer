# Multiplayer

Part of the [TI4 Tempo product spec](../product.md).

One game runs on the server, and every device at the table joins it with a
join code. A device is a table device, which acts for every player, or a
seated device, which acts for one player. Every device shows the same
screens.

## The game on the server

A game lives on the server from the moment it begins. The device that
begins the game joins it at once as a table device. There is no game on a
device alone. Rejected: a game that lives on one device with no server,
next to the shared game, because two kinds of game double every command,
every screen state, and every test.

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
game on the server. The game then gets a code, and the device joins it as a
table device. A saved game that cannot be read shows a notice, as before.

## Codes

Each game has a join code: six characters, letters and digits, without the
letters and digits that look alike, such as the letter O and the digit zero.
The app shows a code in capitals and accepts it in any case. No two games
share a code, and a code is never reused.

The Join screen of every device shows the join code, a link that holds it,
and a QR code of the link. A phone that scans the QR code or opens the link
goes straight to the claim screen of that game. Rejected: no QR code, because
a six-character code is quick to type, but a scan is quicker and cannot be
misread across a table.

Each game also has an admin code of the same form. Only an admin device
shows it. A device needs the admin code to become a table device. An admin
device can also give admin to a seated device, see
[Admin rights](#admin-rights). Rejected: trusting the join code for admin,
because anyone who reads the code across a room could then act for every
player. Rejected: an approval by an admin device, because it needs an admin
to be present and awake at that moment.

## Devices and modes

A device is one browser. It keeps its place in a game, so a reload, a closed
tab, or a lost connection returns it to the same game with the same seat and
the same rights.

A device in a game is a table device or a seated device:

- A **table device** has no seat and is always an admin. It acts for every
  player. The device in the middle of the table is usually a table device.
- A **seated device** holds one seat, so it acts for that player. It can
  also be an admin.

An admin device may do every tap in the game, and may change the rights of
other devices. At least one admin device always exists in a game. A device
that is neither has not joined the game, and only sees the claim screen.

### Joining

A device joins a game with the join code, by typing it on the home screen or
by opening the link. The claim screen then lists the seats of the game: each
player's name, colour, faction, and whether a device holds the seat. The
device takes a seat, or enters the admin code to join as a table device.

The device that begins a game is a table device from the start. It can take
a seat later and stays an admin.

One device holds a seat at a time. When a device takes a seat that another
device holds, the holder loses the seat: a holder that is an admin becomes a
table device, and any other holder returns to the claim screen. So a player
whose phone dies takes their seat again on another phone in seconds.
Rejected: a confirmation by the holder, because the dead phone cannot
answer.

A device can change its seat, or become a table device with the admin code,
at any time on the Join screen. A device can also leave a game: the device
forgets the game, and the game keeps the device's place, shown as away.
Rejected: removing a device from a game, because the last admin could not
leave, and a seat is taken in one tap anyway.

More than one table device can be in a game, for example an iPad in the
middle and a laptop at the side. There is no watch-only device. Rejected: a
spectator mode, because the join code is the trust boundary, and a seat or
the admin code is always at hand.

### Admin rights

An admin device can give admin to a seated device, and can take it away
from a seated device, except from the last admin device of the game. A
table device is always an admin, so its admin cannot be taken away. The
Join screen lists every device of the game with its seat or Table, its
admin state, and whether it is connected.

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
| Pause, resume, rule check, time limits                                  | No                              | Yes                          |
| Undo                                                                    | No                              | Yes                          |
| Change own seat, join as table with the admin code                      | Yes                             | Yes                          |
| Give or take admin                                                      | No                              | Yes, not from the last admin |

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
- **Setup**: unchanged, on one device. Begin game puts the game on the
  server and shows the join code. Rejected: a code during setup with a
  waiting screen for early joiners, because it saves a few seconds at most,
  and it can be added later. Rejected: a lobby where each player fills their
  own seat, because the setup then becomes a shared document with its own
  rules for every field, and the claim screen is needed anyway for a device
  that joins mid-game.
- **Claim seat**: the seats of the game, and the admin code field for a
  table device.
- **Join**: the join code, the link, the QR code, the admin code on an admin
  device, the seats with their holders, and the devices with their rights.
- The top bar of every in-game screen shows the device's seat or Table, and
  opens the Join screen.
- Every other screen is the same on every device, with the controls that
  the device may not use disabled. There are no separate phone companion
  screens. Rejected: separate companion screens for a seated phone, because
  one set of screens is one set of rules, one mockup, and one port.
