# Remove a Pending Ticket — Design

## Problem

Since the "pending tickets" feature (see
`2026-07-21-pending-tickets-design.md`), a user can save a ticket for a
concurso that hasn't been drawn yet. There is currently no way to remove one
— if it was a mistake, a change of mind, or leftover test data, it just sits
there until its draw eventually happens and scores it. Scored tickets (real
history for a real draw) should stay permanent; only pending tickets need to
be removable.

## Backend changes

### `DELETE /api/tickets/:concurso` (new, in `backend/routes/tickets.ts`)

- Parse `concurso` from the URL param; 400 if not a valid integer.
- Look up the ticket by `concurso`. 404 if none exists.
- If found but already scored (`matches !== null`), reject with 400 — this
  endpoint only removes pending tickets; scored history is not deletable
  through it.
- Otherwise delete it and respond `200 { deleted: true }`.

## Frontend changes

### `frontend/src/services/api.ts`

Add `deleteTicket(concurso: number): Promise<void>` → `DELETE /tickets/:concurso`.

### `frontend/src/components/ResultsTable.tsx`

Each pending row's "My Ticket" cell currently shows one button (`🕒 N
números`, opens the edit modal). Add a second, small 🗑️ button next to it,
with inline click-to-confirm state (no native `confirm()`, no modal):

- **Default state:** a 🗑️ icon button.
- **1st click:** swaps that button to two small buttons — ✓ (confirm,
  red) and ✕ (cancel) — for that row only.
- **Click ✕:** reverts to the default 🗑️ state, no request sent.
- **Click ✓:** calls `deleteTicket(concurso)`. While in flight, both
  buttons are disabled. On success, the ticket is removed from the
  `pendingTickets` state (row disappears). On failure (e.g. the draw landed
  and the ticket got scored between page load and the delete click, now
  returning the backend's 400), revert to the default 🗑️ state and show a
  small inline error message in the cell, cleared on the next interaction —
  mirroring the error-handling pattern already used in `TicketModal`'s save
  flow.

State needed: which row (if any) is in confirm mode, which row (if any) has
a delete in flight, and a per-row error message. Scoped with the ticket's
`concurso` as the key (e.g. `confirmDeleteConcurso: number | null`,
`deletingConcurso: number | null`, `deleteError: { concurso: number;
message: string } | null`).

This control only ever renders on pending rows — scored-ticket rows
(`ticketButton`) are untouched, preserving them as permanent history.

## Edge cases

- **Race with scoring:** if `POST /api/draws/fetch` scores the ticket
  between the row rendering and the user clicking ✓, the backend's 400
  response is surfaced as described above rather than silently failing.
- **Double-click:** buttons disable during the in-flight request, so a
  second click can't fire a duplicate delete.
- **Confirm state persistence:** confirm mode is local component state, not
  persisted — navigating pages or refreshing resets it to the default 🗑️
  state, which is fine since nothing has been deleted yet.

## Testing

No automated test suite exists in this repo (per `CLAUDE.md`). Verify
manually: create a pending ticket, delete it via the row control (confirm
flow), confirm it disappears and does not reappear on reload; attempt to
delete a scored ticket's concurso directly via `curl` to confirm the 400
guard.
