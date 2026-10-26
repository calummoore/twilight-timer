# Admin recovery

Status: Active. [PR #28](https://github.com/calummoore/twilight-timer/pull/28)
is open. The plan closes when its PR merges.

Only an admin device gives admin, starts the game, steps a phase, undoes,
or pauses. The device that creates a game is its only admin until it gives
admin to another device. When that device is gone for good, for example a
closed private tab or cleared site data, no device can give admin, and the
table taps stay off on every device. This change lets a seated device give
itself admin while no admin device has a connection, so the table can
finish the game. The spec page [Multiplayer](../docs/product/multiplayer.md)
holds the requirement and the decision in force.

The change does not cover a recovery for a table device without a seat. A
viewer takes a seat first, then takes admin.

Decision, 2026-10-26, Cal, from finding 4 of review 1 of
[the multiplayer plan](multiplayer.md): B. While no admin device has a
connection, a seated device may switch its own admin on. Alternatives: A,
a tip in the lobby to give admin to a second device, which leaves the stuck
state possible; C, a recovery link for the device that creates the game,
which is a second secret, close to the admin code that Cal rejected.
Reason: it keeps the game playable, and it gives admin only to a device that
holds a seat at the table.

Design calls of the same day, from the implementation side:

- The rule has no grace period. A seated device may take admin at once when
  every admin device is away. Rejected: a wait of some minutes, because the
  table is stuck for that time, and a seat holder is a player at the table.
- The server decides with its own view of the connections: an admin device
  is connected while it has an open socket that said hello. The screens use
  the connection state of the devices in the state message, so they show
  the same rule.
- Players & devices explains the state in one notice, on every device while
  every admin device is away. The disabled table taps on the other screens
  keep "Waiting for the table".
- A device counts as connected only while its socket showed a sign of life
  in the last 90 seconds: a message, or a ping that the runtime answered.
  A device pings every 20 seconds, and a hidden page may ping only once a
  minute. Rejected: an open socket alone, because a device whose battery
  dies never closes its socket, and the server would wait many minutes for
  the network to give up.
- Pings do not wake the object, so it does not send a new state when a
  device goes quiet. Players & devices asks for a fresh state when it opens
  and every 15 seconds while it is open. Rejected: an alarm in the object
  that checks every device, because it wakes the object all game long for
  a state that matters only on that screen.

Contract owners:

- The spec page [Multiplayer](../docs/product/multiplayer.md).
- The [mockup](../docs/mockups/index.html).

## Design

The rights module takes one more input: whether every admin device is away.
The room reducer gets the tokens of the connected devices from the object,
derives that input, and passes it to the rights module. The state message
carries the same input, and the screens use it. An admin command from
a device without admin is allowed only when the input holds, the device
holds a seat, the command names the device itself, and it turns admin on.
The last-admin rule does not change, because taking admin only adds an
admin.

## Milestone 1: Documentation and spec

State the requirement and the decision.

- [x] Update `docs/product/multiplayer.md`: a seated device gives itself
      admin while no admin device has a connection, with the rejected
      alternatives, and the row "Give or take admin" of the tap table.

## Milestone 2: Mockup

Tags: mockup

- [x] Players & devices on a seated phone while every admin device is away:
      the notice, the switch on the phone's own row on, and the switches of
      the other rows off.
- [x] Screenshot the new state in every frame. Evidence:
      `.context/admin-recovery/mockups/shoot.log`: the new state and the
      three other Players & devices states in three frames, no script error,
      and no sideways overflow.

## Milestone 3: Server and model

- [x] The rights module allows a seated device to switch its own admin on
      while every admin device is away. Tests.
- [x] The room reducer takes the connected tokens and passes the input to
      the rights module. The object passes its connections. Tests.
- [x] The object counts a socket as connected only within 90 seconds of its
      last message or ping. A hello on an open socket gets a fresh state,
      and the other devices get it only when a connection changed.

## Milestone 4: Players & devices

Tags: ui

- [x] The switch on the own row of a seated device, and the notice while
      every admin device is away. The switches ask the rights module.
- [x] Players & devices asks for a fresh state when it opens and every 15
      seconds while it is open.
- [x] Remove the Later mark of the new mockup state.
- [x] Update `README.md` where it describes admin.
- [x] Smoke test on the dev server: the admin device leaves, a seated phone
      takes admin, and the table taps come back on that phone. Evidence:
      `.context/admin-recovery/smoke.log`: 6 checks passed, also for an
      admin device that goes silent without closing its socket.

## Milestone 5: Verification, commit, review, and pull request

- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the review-fix rule: fix the `Auto-fix: yes` findings,
      re-review once, and report the rest. Review 1:
      `.context/admin-recovery/review-1.md`, 5 findings. Fixed: 4. Review
      2 of the fix: `.context/admin-recovery/review-2.md`, no findings.
      Open:
      - 1. The spec does not define a connected device. Severity Medium,
        effort Small. Recommended: A, add the 90-second rule to the spec
        once Cal approves it.
      - 2. No check that pings keep a device connected. Severity Medium,
        effort Small. Recommended: C, a smoke step and a unit-tested pure
        function. The smoke step passed:
        `.context/admin-recovery/smoke.log`.
      - 3. A refresh after eviction reaches every device. Severity Low,
        effort Small. Recommended: A, keep the last sent connection key on
        each socket.
      - 5. No test keeps the table taps closed while away. Severity Low,
        effort Small. Recommended: A, run the admin-only commands with the
        away state on.
      - `src/ui/GameScreen.tsx`: the screen stays awake only in the running
        game, so the host iPad can lock in the lobby, and the phones then
        see the recovery notice. Separate branch.
      - `docs/mockups/index.html:1087`: the comment above the device list
        says that the iPad is an admin because it is a table device.
        Separate branch.
- [x] Open the pull request when every other milestone TODO is ticked.
      Put its link in the status paragraph.

## Milestone 6: The creator before it joins

The merge of main brought the claim screen after Create game: a new game
has no device until the device that creates it joins. Until then, no admin
device exists, so a phone that joined first could take admin from the host.

- [x] The device that creates the game counts as an admin device until it
      joins. The server decides whether every admin device is away, and
      sends it in the state, so the screens use the same answer. Test.
- [x] Update `docs/product/multiplayer.md`.
- [x] Run the complete gate, commit, and push.
