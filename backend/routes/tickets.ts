import express, { Request, Response } from 'express';
import Ticket from '../models/Ticket.js';
import Draw from '../models/Draw.js';
import type { DrawResult, Ticket as TicketType, TicketPerformance } from '../../shared/types/index.js';

const router = express.Router();

// ── GET /api/tickets ─────────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── POST /api/tickets ────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { numbers, label } = req.body as { numbers: unknown; label?: unknown };

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

    const ticket = await Ticket.create({
      numbers: nums,
      label: typeof label === 'string' && label.trim() ? label.trim() : undefined,
    });

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── DELETE /api/tickets/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }
    res.json({ message: 'Ticket deleted.' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── GET /api/tickets/:id/performance ────────────────────────────────────────
router.get('/:id/performance', async (req: Request, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }

    const draws = await Draw.find().sort({ concurso: -1 });
    const ticketSet = new Set(ticket.numbers);

    const drawResults: DrawResult[] = draws.map((draw) => {
      const matchedNumbers = draw.numbers.filter((n) => ticketSet.has(n));
      const matches = matchedNumbers.length;
      return {
        concurso:       draw.concurso,
        date:           draw.date.toISOString(),
        drawNumbers:    draw.numbers,
        matches,
        matchedNumbers,
        prizeTier:      matches >= 11 ? matches : null,
      };
    });

    const hitsByTier: Record<string, number> = { '11': 0, '12': 0, '13': 0, '14': 0, '15': 0 };
    let totalHits = 0;
    for (const r of drawResults) {
      if (r.prizeTier !== null) {
        hitsByTier[String(r.prizeTier)]++;
        totalHits++;
      }
    }

    const hitRate = draws.length > 0
      ? Math.round((totalHits / draws.length) * 10000) / 100
      : 0;

    const ticketOut: TicketType = {
      _id:      String(ticket._id),
      numbers:  ticket.numbers,
      label:    ticket.label,
      createdAt: ticket.createdAt.toISOString(),
    };

    const response: TicketPerformance = {
      ticket:     ticketOut,
      totalDraws: draws.length,
      hitsByTier,
      hitRate,
      draws:      drawResults,
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
