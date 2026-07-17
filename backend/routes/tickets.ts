import express, { Request, Response } from 'express';
import Ticket, { ITicketDocument } from '../models/Ticket.js';
import Draw from '../models/Draw.js';
import type { Ticket as TicketType } from '../../shared/types/index.js';

const router = express.Router();

const PRIZE_THRESHOLD = 11; // 11+ matches wins a prize in Lotofácil

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

// ── POST /api/tickets ─────────────────────────────────────────────────────────
// Upsert the player's ticket for a draw. matches/hasPrize are scored on the
// server against the draw's winning numbers so they can't be spoofed by the client.
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

    const draw = await Draw.findOne({ concurso });
    if (!draw) {
      res.status(404).json({ error: `Draw #${concurso} not found.` });
      return;
    }

    const drawSet = new Set(draw.numbers);
    const matches = nums.filter((n) => drawSet.has(n)).length;
    const hasPrize = matches >= PRIZE_THRESHOLD;

    const ticket = await Ticket.findOneAndUpdate(
      { concurso },
      {
        concurso,
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

export default router;
