import express, { Request, Response } from 'express';
import Ticket from '../models/Ticket.js';
import type { Ticket as TicketType } from '../../shared/types/index.js';

const router = express.Router();

// GET /api/tickets?concursos=1,2,3
router.get('/', async (req: Request, res: Response) => {
  try {
    const raw = String(req.query.concursos ?? '');
    const concursos = raw.split(',').map(Number).filter((n) => Number.isFinite(n) && n > 0);
    if (concursos.length === 0) {
      res.json([]);
      return;
    }
    const tickets = await Ticket.find({ concurso: { $in: concursos } }).select('-__v');
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/tickets  { concurso, numbers, matches, hasPrize }
router.post('/', async (req: Request, res: Response) => {
  try {
    const { concurso, numbers, matches, hasPrize } = req.body as TicketType;

    if (!concurso || !Array.isArray(numbers) || numbers.length !== 15) {
      res.status(400).json({ error: 'concurso and exactly 15 numbers are required' });
      return;
    }

    const ticket = await Ticket.findOneAndUpdate(
      { concurso },
      { concurso, numbers, matches, hasPrize },
      { upsert: true, new: true }
    ).select('-__v');

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
