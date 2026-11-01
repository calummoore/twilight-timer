# A lost claim drops the typed seat values

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-01, from branch `calummoore/tap-revision-conflict-options`, the options check of the plan for taps that do not conflict.
- **Location:** `src/ui/screens/ClaimScreen.tsx:153`, `src/ui/screens/SeatEditDialog.tsx:94`.
- **Reason:** The branch that found it changes which taps the server applies, not what the claim screen shows when a claim does not apply.

- **Terms:**
  - **Claim screen:** The screen where a device takes a seat or joins as a
    table device. A tap on a seat opens the seat dialog with the name, the
    colour, and the faction of the seat.
  - **Take seat:** The button of the seat dialog on the claim screen. It
    sends the claim with the values of the dialog.
- **Background:**
  - The seat dialog closes at once when the player taps Take seat. Then
    the device sends the claim to the server.
  - When the claim does not apply, the server sends the state again with
    no sign. The player sees the claim screen with the live seats.
  - A claim does not apply when another device first changed what the
    claim needs. For example, another phone took the seat, or an admin
    device gave the seat other values.
  - `docs/product/multiplayer.md`, under Seats, says that the second device
    sees the live seats and picks again.
  - The lobby work of 2026-10-26 rejected a message that tells the device
    that its tap did not apply, because such a race is rare and the live
    seats show the result.
- **Problem:** A player whose claim does not apply loses the name, the
  colour, and the faction that they typed. They must open a seat and enter
  the values again.
- **Impact if no action:** In a rare race, a player types their seat values
  twice.
- **Root question:** How does a player keep the values that they typed when
  their claim does not apply?
- **Options:**
  - **A.** Keep the dialog open after Take seat until a new state arrives.
    Close it when the device holds the seat. Otherwise keep the typed
    values and show the live problem, such as the device that now holds
    the seat. This changes the claim flow and its mockup. Effort: Medium.
  - **B.** Keep the last typed values on the device, and fill them in when
    the player opens a seat again. The values can then land on another
    seat than the one that the player first chose. Effort: Medium.
  - **C.** Tell the device that its claim did not apply, with a new server
    message, and show it on the claim screen. Effort: Large.
- **Left out:**
  - Queue the claim and send it again. The spec rejects queued taps,
    because a late tap applies to a state that the player did not see.
- **Wider fix:** A. A dialog that waits for the answer serves every seat
  dialog, also Save on Players & devices.
- **Previous examples:** `usePending` in `src/ui/hooks.ts` shows a tap until
  the next state arrives, for a seat move on the ring of Speaker & Seating.
- **Recommendation:** A. The player keeps the values and sees why the claim
  did not apply, with no new server message.
- **Action:** Ask the user, because A changes the claim flow that the lobby
  work chose, and adds a waiting state that no requirement covers.
