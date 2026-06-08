import express, { Request, Response } from 'express';
import Draw from '../models/Draw.js';
import { fetchLatest } from '../services/scraper.js';
import type { StatsResponse, MonthlyEntry, GravityCategory, DrawInput, StreakEntry, StreaksResponse } from '../../shared/types/index.js';

const router = express.Router();

interface CategoryCountRow {
  _id: GravityCategory;
  count: number;
}

interface MonthlyAggRow {
  _id: { year: number; month: number };
  total: number;
  highGravity: number;
  midGravity: number;
  smallGravity: number;
}

// ── GET /api/draws ──────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const page  = Math.max(1, parseInt(String(req.query.page))  || 1);
    const limit = Math.min(100, parseInt(String(req.query.limit)) || 20);
    const skip  = (page - 1) * limit;
    const filter: Record<string, unknown> = {};

    if (req.query.category) filter.category = String(req.query.category);
    if (req.query.month) {
      const [y, m] = String(req.query.month).split('-');
      filter.date = {
        $gte: new Date(`${y}-${m}-01`),
        $lt:  new Date(parseInt(m) === 12
          ? `${parseInt(y) + 1}-01-01`
          : `${y}-${String(parseInt(m) + 1).padStart(2, '0')}-01`),
      };
    }

    const [draws, total] = await Promise.all([
      Draw.find(filter).sort({ concurso: -1 }).skip(skip).limit(limit),
      Draw.countDocuments(filter),
    ]);

    res.json({
      draws,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── GET /api/draws/stats ────────────────────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [categoryCounts, monthlyRaw, latest] = await Promise.all([
      Draw.aggregate<CategoryCountRow>([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Draw.aggregate<MonthlyAggRow>([
        {
          $group: {
            _id: {
              year:  { $year: '$date' },
              month: { $month: '$date' },
            },
            total:        { $sum: 1 },
            highGravity:  { $sum: { $cond: [{ $eq: ['$category', 'high-gravity'] },  1, 0] } },
            midGravity:   { $sum: { $cond: [{ $eq: ['$category', 'mid-gravity'] },   1, 0] } },
            smallGravity: { $sum: { $cond: [{ $eq: ['$category', 'small-gravity'] }, 1, 0] } },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Draw.findOne().sort({ concurso: -1 }),
    ]);

    const cats: Record<GravityCategory, number> = {
      'high-gravity': 0,
      'mid-gravity': 0,
      'small-gravity': 0,
    };
    for (const c of categoryCounts) cats[c._id] = c.count;
    const total = Object.values(cats).reduce((a, b) => a + b, 0);

    const monthly: MonthlyEntry[] = monthlyRaw.map((m) => ({
      month:        `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
      label:        new Date(m._id.year, m._id.month - 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      total:        m.total,
      highGravity:  m.highGravity,
      midGravity:   m.midGravity,
      smallGravity: m.smallGravity,
      special:      m.midGravity + m.smallGravity,
    }));

    const response: StatsResponse = {
      total,
      categories: cats,
      monthly,
      latestConcurso: latest?.concurso ?? 0,
    };
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── GET /api/draws/streaks ──────────────────────────────────────────────────
router.get('/streaks', async (_req: Request, res: Response) => {
  try {
    const draws = await Draw.find({}, { numbers: 1 }).sort({ concurso: 1 }).lean();

    const counts: Record<number, number> = {};
    for (let n = 1; n <= 25; n++) counts[n] = 0;

    for (const draw of draws) {
      const drawn = new Set(draw.numbers);
      for (let n = 1; n <= 25; n++) {
        if (drawn.has(n)) {
          counts[n] = 0;
        } else {
          counts[n]++;
        }
      }
    }

    const streaks: StreakEntry[] = Object.entries(counts)
      .map(([num, drawsAbsent]) => ({ number: parseInt(num), drawsAbsent }))
      .sort((a, b) => b.drawsAbsent - a.drawsAbsent);

    const response: StreaksResponse = { streaks };
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── GET /api/draws/:concurso ────────────────────────────────────────────────
router.get('/:concurso', async (req: Request, res: Response) => {
  try {
    const draw = await Draw.findOne({ concurso: parseInt(req.params.concurso) });
    if (!draw) {
      res.status(404).json({ error: 'Draw not found' });
      return;
    }
    res.json(draw);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── POST /api/draws/fetch ───────────────────────────────────────────────────
router.post('/fetch', async (_req: Request, res: Response) => {
  try {
    const latest = await Draw.findOne().sort({ concurso: -1 });
    const afterConcurso = latest?.concurso ?? 0;

    const newDraws = await fetchLatest(afterConcurso);

    if (newDraws.length === 0) {
      return res.json({ inserted: 0, modified: 0, message: 'Already up to date.' });
    }

    const ops = newDraws.map((d: DrawInput) => ({
      updateOne: {
        filter: { concurso: d.concurso },
        update: { $set: d },
        upsert: true,
      },
    }));

    const result = await Draw.bulkWrite(ops);
    res.json({
      inserted: result.upsertedCount,
      modified: result.modifiedCount,
      message:  `${result.upsertedCount} new draw(s) added.`,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
