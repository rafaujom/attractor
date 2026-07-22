# Remove a Pending Ticket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user remove a pending ticket (one saved for a concurso that hasn't been drawn yet) directly from its placeholder row in "Todos os Concursos," with an inline click-to-confirm control. Scored tickets remain permanent and are not deletable through this feature.

**Architecture:** A new `DELETE /api/tickets/:concurso` endpoint removes a ticket only if it's still pending (`matches === null`); it 400s if the ticket is already scored, and 404s if it doesn't exist. The frontend adds a small 🗑️ control next to each pending row's existing ticket button, with local component state driving a two-click confirm (🗑️ → ✓/✕ → gone). The axios-error-unwrapping helper introduced by the pending-tickets feature's post-review fix (`extractErrorMessage`, currently private to `TicketModal.tsx`) moves to `frontend/src/services/api.ts` so both `TicketModal.tsx` and `ResultsTable.tsx` can reuse it instead of duplicating it.

**Tech Stack:** Express + Mongoose (backend), React + TypeScript + Tailwind (frontend), shared types in `shared/types/index.ts`. No test framework is configured in this repo — verification is manual (curl for the API, typecheck + code reading for the UI, live browser if available), per `CLAUDE.md`.

## Global Constraints

- No automated test suite or linter exists in this repo — do not introduce one; verify manually as described in each task.
- Backend dev server: `cd backend && npm run dev` (port 3001). Frontend dev server: `cd frontend && npm run dev` (port 5173, proxies `/api` to 3001).
- `backend/.env` with a real `MONGODB_URI` already exists — verification steps hit a real MongoDB Atlas database. Any throwaway test data created during verification must be cleaned up in the same task.
- Follow existing code style: 2-space indent, matching current formatting exactly; Portuguese (pt-BR) copy for all user-facing frontend text.
- Only pending tickets (`matches === null`) are deletable. Scored tickets are permanent history and must never be removable through this feature, front or back end.

---

### Task 1: Backend — `DELETE /api/tickets/:concurso`

**Files:**
- Modify: `backend/routes/tickets.ts`

**Interfaces:**
- Consumes: `Ticket` model (`backend/models/Ticket.ts`), already has nullable `matches`.
- Produces: `DELETE /api/tickets/:concurso` — 400 if `:concurso` isn't a valid integer; 404 if no ticket exists for it; 400 if the ticket exists but is already scored (`matches !== null`); otherwise deletes it and responds `200 { deleted: true }`. Consumed by Task 2 (frontend `api.ts`).

- [ ] **Step 1: Add the route**

In `backend/routes/tickets.ts`, insert this new route directly above the final `export default router;` line:

```ts
// ── DELETE /api/tickets/:concurso ─────────────────────────────────────────────
// Removes a pending ticket (matches is still null — no result yet). Scored
// tickets are permanent history and cannot be deleted through this endpoint.
router.delete('/:concurso', async (req: Request, res: Response) => {
  try {
    const concurso = Number(req.params.concurso);
    if (!Number.isInteger(concurso)) {
      res.status(400).json({ error: 'A valid concurso number is required.' });
      return;
    }

    const ticket = await Ticket.findOne({ concurso });
    if (!ticket) {
      res.status(404).json({ error: `Ticket for draw #${concurso} not found.` });
      return;
    }

    if (ticket.matches !== null) {
      res.status(400).json({ error: 'Only pending tickets (not yet drawn) can be removed.' });
      return;
    }

    await Ticket.deleteOne({ concurso });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
```

(i.e. replace the file's final line, `export default router;`, with the block above, which ends with that same line.)

- [ ] **Step 2: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify against the real database**

Start the backend dev server if it isn't already running: `cd backend && npm run dev` (leave it running; use a second terminal below).

Get the latest concurso and create a throwaway pending ticket far enough ahead that it can't collide with a real one:
```bash
LATEST=$(curl -s http://localhost:3001/api/draws/stats | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).latestConcurso))")
TEST_CONCURSO=$((LATEST + 777))
curl -s -X POST http://localhost:3001/api/tickets \
  -H "Content-Type: application/json" \
  -d "{\"concurso\": $TEST_CONCURSO, \"numbers\": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]}"
```
Expected: `"matches":null` in the response (pending).

Delete it and confirm success:
```bash
curl -s -w "\nHTTP %{http_code}\n" -X DELETE "http://localhost:3001/api/tickets/$TEST_CONCURSO"
```
Expected: `HTTP 200` and body `{"deleted":true}`.

Confirm it's actually gone:
```bash
curl -s http://localhost:3001/api/tickets/pending | grep "$TEST_CONCURSO"
```
Expected: no output (not found in the pending list).

Confirm the 404 case (deleting a concurso that never existed):
```bash
curl -s -w "\nHTTP %{http_code}\n" -X DELETE "http://localhost:3001/api/tickets/$TEST_CONCURSO"
```
Expected: `HTTP 404` (it was already deleted above).

Confirm the 400 guard against deleting a scored ticket. Find any existing scored ticket's concurso and try to delete it:
```bash
SCORED=$(curl -s http://localhost:3001/api/tickets | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const list=JSON.parse(d);const t=list.find((x)=>x.matches!==null);console.log(t?t.concurso:'');})")
echo "scored concurso to test: $SCORED"
curl -s -w "\nHTTP %{http_code}\n" -X DELETE "http://localhost:3001/api/tickets/$SCORED"
```
Expected: `HTTP 400` and body `{"error":"Only pending tickets (not yet drawn) can be removed."}`. This must NOT actually delete the ticket — confirm it's still there:
```bash
curl -s "http://localhost:3001/api/tickets?concursos=$SCORED"
```
Expected: the ticket is still present with its original `matches`/`hasPrize`.

No cleanup needed beyond what the steps above already did (the test ticket was deleted as part of verifying the delete itself; the scored ticket was never actually removed).

- [ ] **Step 4: Commit**

```bash
git add backend/routes/tickets.ts
git commit -m "feat: add DELETE /api/tickets/:concurso for removing pending tickets"
```

---

### Task 2: Frontend — remove control on pending rows

**Files:**
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/components/TicketModal.tsx`
- Modify: `frontend/src/components/ResultsTable.tsx`

**Interfaces:**
- Consumes: `DELETE /api/tickets/:concurso` from Task 1.
- Produces:
  - `deleteTicket(concurso: number): Promise<void>` in `api.ts`.
  - `extractErrorMessage(err: unknown, fallback: string): string` in `api.ts` — moved out of `TicketModal.tsx` (which currently has a private, hardcoded-fallback copy) so `ResultsTable.tsx` can reuse the same axios-error-unwrapping logic instead of duplicating it.

- [ ] **Step 1: Move `extractErrorMessage` into `api.ts` and add `deleteTicket`**

In `frontend/src/services/api.ts`, add these two exports after the existing `getPendingTickets` export and before `saveTicket`:

```ts
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: unknown } | undefined;
    if (typeof data?.error === 'string') return data.error;
  }
  return fallback;
}

export const deleteTicket = (concurso: number): Promise<void> =>
  api.delete(`/tickets/${concurso}`).then(() => undefined);
```

The full set of exports in `api.ts`, in order, should now be: `getStats`, `getDraws`, `fetchLatest`, `getRecency`, `getSequentialStreaks`, `getTickets`, `getPendingTickets`, `extractErrorMessage`, `deleteTicket`, `saveTicket`.

- [ ] **Step 2: Update `TicketModal.tsx` to use the shared helper**

In `frontend/src/components/TicketModal.tsx`, replace the import line and remove the local `extractErrorMessage` function:

Replace:
```tsx
import { useState } from 'react';
import axios from 'axios';
import type { Draw, Ticket, TicketInput } from '@shared/types';

interface Props {
  draw: Draw | null;
  concurso: number;
  concursoEditable: boolean;
  existingTicket: Ticket | null;
  onSave: (ticket: TicketInput) => Promise<Ticket>;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: unknown } | undefined;
    if (typeof data?.error === 'string') return data.error;
  }
  return 'Erro ao salvar aposta. Tente novamente.';
}
```

with:
```tsx
import { useState } from 'react';
import { extractErrorMessage } from '../services/api';
import type { Draw, Ticket, TicketInput } from '@shared/types';

interface Props {
  draw: Draw | null;
  concurso: number;
  concursoEditable: boolean;
  existingTicket: Ticket | null;
  onSave: (ticket: TicketInput) => Promise<Ticket>;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}
```

Then, in the same file's `handleSave`, update the one call site:

Replace:
```tsx
    } catch (err) {
      setSaveError(extractErrorMessage(err));
    } finally {
```
with:
```tsx
    } catch (err) {
      setSaveError(extractErrorMessage(err, 'Erro ao salvar aposta. Tente novamente.'));
    } finally {
```

Nothing else in `TicketModal.tsx` changes.

- [ ] **Step 3: Add delete state, handler, and UI to `ResultsTable.tsx`**

In `frontend/src/components/ResultsTable.tsx`, update the import line:

Replace:
```tsx
import { getDraws, getTickets, getPendingTickets, saveTicket } from '../services/api';
```
with:
```tsx
import { getDraws, getTickets, getPendingTickets, saveTicket, deleteTicket, extractErrorMessage } from '../services/api';
```

Add three new pieces of state right after the existing `modalTarget` state declaration:

Replace:
```tsx
  const [modalTarget,    setModalTarget]    = useState<ModalTarget | null>(null);
```
with:
```tsx
  const [modalTarget,    setModalTarget]    = useState<ModalTarget | null>(null);
  const [confirmDeleteConcurso, setConfirmDeleteConcurso] = useState<number | null>(null);
  const [deletingConcurso,      setDeletingConcurso]      = useState<number | null>(null);
  const [deleteError,           setDeleteError]           = useState<{ concurso: number; message: string } | null>(null);
```

Add a `handleDelete` function right after the existing `handleSave` function:

```tsx
  function handleDelete(concurso: number) {
    setDeletingConcurso(concurso);
    setDeleteError(null);
    deleteTicket(concurso)
      .then(() => {
        setPendingTickets((prev) => prev.filter((t) => t.concurso !== concurso));
        setConfirmDeleteConcurso(null);
      })
      .catch((err) => {
        setDeleteError({ concurso, message: extractErrorMessage(err, 'Erro ao remover aposta. Tente novamente.') });
        setConfirmDeleteConcurso(null);
      })
      .finally(() => {
        setDeletingConcurso(null);
      });
  }
```

Update `pendingTicketButton` to disable itself while that row is in confirm or deleting state, and add a new `pendingDeleteControl` function right after it:

Replace:
```tsx
  function pendingTicketButton(ticket: Ticket) {
    return (
      <button
        onClick={() => setModalTarget({ kind: 'pending-edit', ticket })}
        className="px-2 py-1 text-xs rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors whitespace-nowrap"
      >
        🕒 {ticket.numbers.length} números
      </button>
    );
  }
```
with:
```tsx
  function pendingTicketButton(ticket: Ticket) {
    const disabled = confirmDeleteConcurso === ticket.concurso || deletingConcurso === ticket.concurso;
    return (
      <button
        onClick={() => setModalTarget({ kind: 'pending-edit', ticket })}
        disabled={disabled}
        className="px-2 py-1 text-xs rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      >
        🕒 {ticket.numbers.length} números
      </button>
    );
  }

  function pendingDeleteControl(ticket: Ticket) {
    const isDeleting = deletingConcurso === ticket.concurso;

    if (confirmDeleteConcurso === ticket.concurso) {
      return (
        <span className="inline-flex items-center gap-1">
          <button
            onClick={() => handleDelete(ticket.concurso)}
            disabled={isDeleting}
            title="Confirmar remoção"
            className="px-1.5 py-1 text-xs rounded-lg border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ✓
          </button>
          <button
            onClick={() => setConfirmDeleteConcurso(null)}
            disabled={isDeleting}
            title="Cancelar"
            className="px-1.5 py-1 text-xs rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ✕
          </button>
        </span>
      );
    }

    return (
      <button
        onClick={() => setConfirmDeleteConcurso(ticket.concurso)}
        title="Remover aposta"
        className="px-1.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        🗑️
      </button>
    );
  }
```

Finally, update the pending row's "My Ticket" cell to render both controls plus any row-scoped error:

Replace:
```tsx
                    <td className="px-4 py-2">
                      {pendingTicketButton(ticket)}
                    </td>
                  </tr>
                ))}
                {data?.draws?.map((draw, i) => (
```
with:
```tsx
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        {pendingTicketButton(ticket)}
                        {pendingDeleteControl(ticket)}
                      </div>
                      {deleteError?.concurso === ticket.concurso && (
                        <p className="text-xs text-red-600 mt-1">{deleteError.message}</p>
                      )}
                    </td>
                  </tr>
                ))}
                {data?.draws?.map((draw, i) => (
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Verify**

If you have working Chrome browser automation tools available (they may be deferred — try loading them and checking whether a tab context comes back successfully; the extension has not been connected for any part of this feature so far, so don't be surprised if it still isn't), start both dev servers if not already running and drive the UI: add a pending ticket via "+ Nova Aposta," click its row's 🗑️, confirm it swaps to ✓/✕, click ✕ and confirm it reverts, click 🗑️ again then ✓ and confirm the row disappears and the ticket is gone from the pending list.

If the extension is not connected, fall back to: confirming the typecheck is clean, and tracing the code path by hand for both outcomes (successful delete removes the row via the `.then` branch's `setPendingTickets` filter; a 400 from attempting to delete a since-scored ticket sets `deleteError` and reverts `confirmDeleteConcurso` via the `.catch` branch, without touching `pendingTickets`, so the row stays visible with the small red message beneath it). Report the limitation honestly rather than claiming a live check that didn't happen.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/api.ts frontend/src/components/TicketModal.tsx frontend/src/components/ResultsTable.tsx
git commit -m "feat: add remove control for pending ticket rows"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers the backend delete endpoint with both guards (404 not found, 400 already-scored) exactly as the spec requires. Task 2 covers the inline 🗑️ → ✓/✕ confirm flow, the disabled-while-in-flight state, the per-row error message on failure, and the `extractErrorMessage` de-duplication the spec calls out explicitly.
- **Type consistency:** `deleteTicket(concurso: number): Promise<void>` in `api.ts` matches its one call site in `ResultsTable.tsx`'s `handleDelete`. `extractErrorMessage(err: unknown, fallback: string): string`'s signature is used identically at both call sites (`TicketModal.tsx`'s `handleSave` catch block, `ResultsTable.tsx`'s `handleDelete` catch block), each passing its own fallback string.
- **No placeholders:** every step has complete, runnable code or exact commands with expected output.
