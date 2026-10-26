# New versions

Part of the [TI4 Nexus product spec](../product.md). The game and its
devices are on the [Multiplayer](multiplayer.md) page.

A version of the app is one update of the server and the pages together.
The server changes at once. An open device keeps its version until it
reloads.

A device always runs the version of the server. A device of another
version reloads by itself, with no question first, and returns to the same
game. So every update reloads every open device once. Rejected: a version
number that changes only when the messages change, and a reload only when a
device cannot read a message, because every device runs the game rules too.
A device of an older version can read the game and still show wrong clocks.
Rejected: a notice with a Reload button before the reload, because a device
of another version shows wrong data, and the players should not have to
act.

The server applies no tap from a device of another version. An update can
end the connection of a device, or keep it open. A device whose connection
ends connects again, learns of the update, and reloads. A device that keeps
its connection learns of the update at the next change in the game: a tap,
or a device that connects or leaves. When that change is a tap from a
device of the older version, the tap does nothing, that device reloads, and
the player taps again. Rejected: a device that asks the server for its
version once a minute, and a connection check that wakes the game on the
server, because a lost tap after an update is rare and costs one more tap.

A device reloads by itself once for each new version. When the reload does
not bring the version of the server, the device stops and shows "A new
version is live", with a Reload button. So a device never reloads in a
loop.

A code has no game, a game that the server can read, or a game that the
server holds but cannot read, for example after a faulty update. The server
keeps a game that it cannot read as it is, and never puts another game
under its code. Every device in such a game shows "This game needs a newer
version of the app", and the game stays in Recent games. The game opens
again when a version that can read it is live. Rejected: showing such a
game as a code with no game, because the players would start a new game,
and the record of the old game would be lost in practice.
