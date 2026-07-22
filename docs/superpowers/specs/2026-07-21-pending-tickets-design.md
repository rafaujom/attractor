# Pending Tickets (buy before the draw) — Design

## Problem

Today a "My Ticket" can only be attached to a `Draw` document that already exists —
`POST /api/tickets` 404s if no `Draw` matches the given `concurso`. That forces the
unrealistic workflow of picking numbers *after* the result is known. In reality the
player buys a ticket and picks numbers for an upcoming concurso, then waits for the
draw to happen.

## Goal

Let a user add a ticket for a concurso that hasn't been drawn yet, from the "Todos os
Concursos" table. The row for that concurso shows placeholders (`—`) for Data,
Categoria and Números Sorteados until `POST /api/draws/fetch` pulls in the real
result, at which point the ticket is scored automatically and the row becomes a
normal, fully-populated row.

## Backend changes

### `backend/models/Ticket.ts`

`matches` and `hasPrize` become nullable (`default: null`) instead of always-required.
`null` means "pending — no draw result yet to score against."

### `backend/services/scoring.ts` (new)

Extract the match/prize computation that currently lives inline in
`routes/tickets.ts` into a small shared helper, so both `routes/tickets.ts` and
`routes/draws.ts` use one source of truth:

```ts
export const PRIZE_THRESHOLD = 11;

export function scoreTicket(pickedNumbers: number[], drawNumbers: number[]): { matches: number; hasPrize: boolean } {
  const drawSet = new Set(drawNumbers);
  const matches = pickedNumbers.filter((n) => drawSet.has(n)).length;
  return { matches, hasPrize: matches >= PRIZE_THRESHOLD };
}
```

### `POST /api/tickets`

- Remove the 404 when no `Draw` exists for `concurso`.
- If a `Draw` exists: score immediately via `scoreTicket` (unchanged behavior).
- If no `Draw` exists: save with `matches: null, hasPrize: null` (pending), **unless**
  `concurso` is ≤ the latest known concurso (`Draw.findOne().sort({ concurso: -1 })`),
  in which case reject with 400 — a concurso that old should already have a result,
  so a missing draw there is treated as a typo, not a future ticket.

### `GET /api/tickets/pending` (new)

Returns tickets where `matches` is `null`, sorted by `concurso` desc. Backs the
placeholder rows in the table.

### `POST /api/draws/fetch`

After the existing `bulkWrite` of newly-fetched draws, for each newly-fetched draw,
look up a pending `Ticket` (`matches: null`) with that `concurso`. If found, score it
with `scoreTicket` and save. This is what "graduates" a pending ticket into a scored
one the next time results are fetched.

## Frontend changes

### `shared/types/index.ts`

`Ticket.matches`/`Ticket.hasPrize` become `number | null` / `boolean | null`.

### `frontend/src/services/api.ts`

Add `getPendingTickets(): Promise<Ticket[]>` → `GET /api/tickets/pending`.

### `frontend/src/App.tsx`

Pass `stats?.latestConcurso` down to `ResultsTable` as a prop (stats is already
fetched here), so the table can suggest the next concurso number.

### `frontend/src/components/ResultsTable.tsx`

- New prop: `latestConcurso?: number`.
- New state: `pendingTickets: Ticket[]`, and the existing `modalDraw` state is
  replaced by a small discriminated `modalTarget` so the same modal can open in three
  modes: view/edit a scored ticket (existing behavior), edit an existing pending
  ticket, or create a brand-new pending ticket.
- `load()` also calls `getPendingTickets()`.
- New **"+ Nova Aposta"** button next to the category filter. Opens the modal in
  "create pending" mode with a suggested concurso of `latestConcurso + 1`.
- When `page === 1` and no category filter is active, pending tickets render as extra
  rows pinned above the normal paginated rows, visually distinguished (amber tint).
  Data/Categoria/Números Sorteados show `—`; the ticket cell shows something like
  `🕒 15 números` and opens the modal in "edit pending" mode on click.
- Category filter hides pending rows (they have no category yet).
- `handleSave` branches on the server response: `saved.matches != null` → merge into
  the existing `tickets` map (and drop it from `pendingTickets` if present there);
  `saved.matches == null` → upsert into `pendingTickets` (add or replace by
  concurso), keeping the list sorted desc by concurso.

### `frontend/src/components/TicketModal.tsx`

- `draw` prop becomes `Draw | null`.
- New props: `concurso: number` (value to display), `concursoEditable: boolean`
  (true only when creating a brand-new pending ticket; false when editing an
  existing pending ticket or viewing/editing against a real draw).
- Phase logic changes from `existingTicket ? 'result' : 'pick'` to
  `draw && existingTicket ? 'result' : 'pick'` — a pending ticket (no draw yet)
  always opens in the editable "pick" phase, since there's no result to compare
  against.
- When `concursoEditable` is true, the header renders a numeric input instead of
  static `Concurso #N` text.
- The "Resultado do Concurso" reference section only renders when `draw` is present.
- Saving a pending ticket (`draw` is `null`) just calls `onSave` and closes the
  modal — no result view to flip to.
- `onSave` narrows from `(ticket: Ticket) => void` to `(ticket: TicketInput) => void`
  — the caller never used the client-computed `matches`/`hasPrize`, only the
  server's authoritative response.

## Edge cases

- **Typo protection**: a concurso ≤ latest known with no `Draw` is rejected (400),
  rather than silently becoming a permanently-unscoreable pending ticket.
- **Overwrite semantics**: entering a concurso that already has a ticket (pending or
  scored) upserts onto it — unchanged from today's edit behavior, no new handling
  needed.
- **Multiple pending tickets**: supported; each renders as its own pinned row,
  sorted desc by concurso.
- **Fetch idempotency**: `POST /api/draws/fetch` only scores a pending ticket the
  first time its concurso's draw appears; already-scored tickets are untouched on
  subsequent fetches.

## Testing

No automated test suite exists in this repo (per `CLAUDE.md`). Verify manually by
running both dev servers: add a pending ticket for a future concurso, confirm it
renders as a placeholder row, trigger "Buscar Novos Resultados" (or manually insert a
matching `Draw` for local testing), and confirm the ticket is scored and the row
becomes a normal row.
