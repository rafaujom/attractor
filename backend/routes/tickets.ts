import express, { Request, Response } from 'express';
import Ticket, { ITicketDocument } from '../models/Ticket.js';
import Draw from '../models/Draw.js';
import { scoreTicket } from '../services/scoring.js';
import type { Ticket as TicketType } from '../../shared/types/index.js';

const router = express.Router();

function serialize(t: ITicketDocument): TicketType {
  return {
    concurso:  t.concurso,
    numbers:   t.numbers,
    matches:   t.matches,
    hasPrize:  t.hasPrize,
    label:     t.label,
    description: t.description,
    createdAt: t.createdAt?.toISOString(),
  };
}

// ── GET /api/tickets?concursos=1,2,3 ──────────────────────────────────────────
// Returns the player's saved tickets. When `concursos` is provided, only the
// tickets for those draws are returned (used to hydrate the results table).
router.get('/', async (req: Request, res: Response) => {
  try {
    const raw = typeof req.query.concursos === 'string' ? req.query.concursos : '';
    const concursos = raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n));

    const filter = concursos.length > 0 ? { concurso: { $in: concursos } } : {};
    const tickets = await Ticket.find(filter).sort({ concurso: -1 });
    res.json(tickets.map(serialize));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── GET /api/tickets/pending ───────────────────────────────────────────────────
// Tickets bought for a concurso that hasn't been drawn yet (matches is null).
// Used to render placeholder rows in "Todos os Concursos" before the result exists.
router.get('/pending', async (_req: Request, res: Response) => {
  try {
    const tickets = await Ticket.find({ matches: null }).sort({ concurso: -1 });
    res.json(tickets.map(serialize));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── POST /api/tickets ─────────────────────────────────────────────────────────
// Upsert the player's ticket for a draw. If the draw hasn't happened yet, the
// ticket is saved as pending (matches/hasPrize null); POST /api/draws/fetch scores
// it later once that concurso's result comes in. matches/hasPrize are always
// computed on the server so they can't be spoofed by the client.
router.post('/', async (req: Request, res: Response) => {
  try {
    const { concurso, numbers, label, description } = req.body as {
      concurso: unknown;
      numbers: unknown;
      label?: unknown;
      description?: unknown;
    };

    if (!Number.isInteger(concurso)) {
      res.status(400).json({ error: 'A valid concurso number is required.' });
      return;
    }
    const concursoNum = concurso as number;

    if (!Array.isArray(numbers) || numbers.length !== 15) {
      res.status(400).json({ error: 'Ticket must contain exactly 15 numbers.' });
      return;
    }

    const nums = numbers as number[];

    if (nums.some((n) => !Number.isInteger(n) || n < 1 || n > 25)) {
      res.status(400).json({ error: 'All numbers must be integers between 1 and 25.' });
      return;
    }

    if (new Set(nums).size !== 15) {
      res.status(400).json({ error: 'All 15 numbers must be unique.' });
      return;
    }

    const draw = await Draw.findOne({ concurso: concursoNum });

    let matches: number | null = null;
    let hasPrize: boolean | null = null;

    if (draw) {
      ({ matches, hasPrize } = scoreTicket(nums, draw.numbers));
    } else {
      const latest = await Draw.findOne().sort({ concurso: -1 });
      const latestConcurso = latest?.concurso ?? 0;
      if (concursoNum <= latestConcurso) {
        res
          .status(400)
          .json({ error: `Draw #${concursoNum} not found and is not a future concurso.` });
        return;
      }
      // concurso is in the future: save as pending, scored later by POST /api/draws/fetch
    }

    const ticket = await Ticket.findOneAndUpdate(
      { concurso: concursoNum },
      {
        concurso: concursoNum,
        numbers: nums,
        matches,
        hasPrize,
        label: typeof label === 'string' && label.trim() ? label.trim() : undefined,
        description:
          typeof description === 'string' && description.trim() ? description.trim() : undefined,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(serialize(ticket));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

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
