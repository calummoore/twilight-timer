# Multiplayer

A table can share its game, so that players follow it and act on their own
phones. The table device stays fully functional alone. Player devices are
an enhancement, never a dependency. If a phone drops off, that player uses
the table device as before.

## Shared games

- A table device can share the game that it runs. Sharing gives the game a
  join code, a join link, and a QR code that holds the link.
- A join code has six letters and digits, from an alphabet without
  look-alike characters. Typed codes ignore case. Decision: six letters and
  digits. Rejected: four characters, as the first mockup showed, and six
  digits, because a guessed code must almost never find a game.
- The sync service keeps every shared game, and it never reuses a code.
  Decision: keep games for now. Rejected: deletion 7 or 30 days after the
  last change, because storage is small and deletion can come later.
- Stop sharing closes the shared game. Player devices then show that the
  game is no longer shared. The table device keeps its game, and it can
  share the game again with a new code.
- A table device works without a connection, as before. It sends its taps
  when the connection returns. A tap that is no longer legal then drops,
  and the device says so.

## Roles

- A device is in table mode or in player mode. Table mode can do every
  action, as the table device does alone. Player mode acts only for the
  seat that the device holds.
- The device that shares a game is in table mode. Another device gets table
  mode only through the table link, which a table device shows on request.
  The join code gives player mode.
- Any number of devices can be in table mode at once.
- A lost table link cannot be replaced, so the table link screen asks the
  host to keep it. Decision: no device can be removed from table mode. To
  recover from a leaked link, stop sharing and share again. Rejected: a
  list of table devices with Remove and a new link, because a leak is rare.
- In this release, player mode can end its own turn, play its own strategy
  card, pass, and mark itself done in a reaction window. Picks, votes,
  undo, pause, and settings stay in table mode. Decision: own turn and own
  reaction tile, as the mockup designs. Rejected: own picks and votes too,
  and every action, because they need more phone screens.
- A device has no sign-in screen. It keeps a random device identity, and a
  seat belongs to that identity. Decision: no visible sign-in. Rejected:
  Google sign-in on every device or on the table device, because joining
  must take seconds.
- One table device sits at the table, and player devices are optional.
  Rejected: remote play with no table device, which needs a different
  phone design.

## Seats

- A player device can claim a free seat. A seat holds at most one device,
  and a device holds at most one seat.
- A seat that another device holds moves only when a table device approves
  the request, or when a table device releases the seat.
- The Join screen shows each seat as connected, offline, or not joined.

## Live sync

- Every device shows the same game and the same clocks. One server clock
  stamps every tap.
- When two devices make the same tap at once, exactly one tap applies. The
  other device shows that another device made it first.
- A tap that a device sends twice applies once.
- Undo on any table device takes back the last action of the game, also a
  tap from a player device.
- When the app changes how devices and the server talk, an older open page
  reloads itself. Decision: reload. Rejected: no check, because the failure
  would come in the middle of a game.
- A phone checks a code before it joins. It shows an unknown code, a game
  that is no longer shared, a refused try, and a lost connection. The
  server limits how fast one network address can try codes.

## Private data

- Each seat has private data that only the devices of that seat receive.
- Table mode never receives private data, because the table device is a
  public screen.
- This release stores no private data. Private comments and a pre-selected
  next card are later features. The server will hold them, and it will
  apply a pre-selected card when that pick comes up. Decision: prepare
  roles and private data now. Rejected: add them later, because they
  change the protocol and the stored data, and build them now, because no
  feature needs them yet.
