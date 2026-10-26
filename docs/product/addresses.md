# Addresses

Part of the [TI4 Nexus product spec](../product.md).

Each screen of the app has its own address. Back returns to the screen
before, a reload keeps the screen, and a link opens the screen on another
device.

| Address                 | Screen                                                                  |
| ----------------------- | ----------------------------------------------------------------------- |
| `/`                     | Home                                                                    |
| `/settings`             | Settings, over Home                                                     |
| `/new`                  | The setup of a new game                                                 |
| `/new/settings`         | Settings, over the setup                                                |
| `/join/<code>`          | The claim screen of a game. This is the join link of the game.          |
| `/game/<code>`          | The game: the lobby before Start game, the running game, then the stats |
| `/game/<code>/players`  | Players & devices, over the running game                                |
| `/game/<code>/seating`  | Speaker & seating, over the running game                                |
| `/game/<code>/settings` | Settings, over the lobby or the running game                            |
| `/game/<code>/seat`     | Change seat, over the lobby or over Players & devices                   |

A code in an address works in any letter case, and the address then shows
it in capitals. An address that no screen has opens Home. A code that no
game has says so, and the address stays.

## Back and Close

Each tap that opens a screen adds an entry to the history of the browser, so
Back returns to the screen before. Close and Cancel on a screen over the game
return to the screen under it, and leave no copy of it in the history. So
Back on a phone, such as the back gesture of an Android phone, closes a
screen over the game. Rejected: screens over the game without an address,
because Back on them would leave the game.

Some steps replace the address, so that Back does not return to the screen
before:

- Create game replaces the setup with the claim screen of the new game. So
  Back cannot create a second game from the same setup.
- Take a seat and Join as table device replace the claim screen with the
  game.

## The address of a game

A device that has not joined a game sees the claim screen, also at an
address under `/game/<code>`, and the address changes to the join link. A
device that joined sees the game, also at the join link, and the address
changes to `/game/<code>`. So each address of a game can go to another
player.

A screen over the game closes when the game has no such screen at that
moment, and the address changes to `/game/<code>`. The lobby is Players &
devices, and it has no Speaker & seating. The stats have no screen over
them.

The server moves the phase of a game, opens the reaction window, and starts
a pause, so no address names them. A confirmation dialog has no address
either. Rejected: an address for each phase, because a link to a phase would
be wrong after the next tap.

## Return to a game

A new visit to Home opens the game that the device had open last, for
example in a new tab, or from the app on the home screen of an iPad. A device
that shows Home or the setup has no game open. A reload of Home, and Back to
Home, show Home.
