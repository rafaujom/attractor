import express from 'express';
import Draw from '../models/Draw.js';
import { fetchLatest } from '../services/scraper.js';

const router = express.Router();

// ── GET /api/draws ────────────────────────────────────────────────────────────
// Returns paginated list of draws, newest first.
// Query params: page (default 1), limit (default 20), category, month (YYYY-MM)
router.get('/', async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(100, parseInt(req.query.limit) || 20);
    const skip     = (page - 1) * limit;
    const filter   = {};

    if (req.query.category) filter.category = req.query.category;
    if (req.query.month) {
      const [y, m] = req.query.month.split('-');
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
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/draws/stats ──────────────────────────────────────────────────────
// Returns overall stats + monthly breakdown
router.get('/stats', async (req, res) => {
  try {
    const [categoryCounts, monthlyRaw, latest] = await Promise.all([
      // Count per category
      Draw.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Monthly breakdown
      Draw.aggregate([
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

      // Latest draw
      Draw.findOne().sort({ concurso: -1 }),
    ]);

    // Normalise category counts into an object
    const cats = { 'high-gravity': 0, 'mid-gravity': 0, 'small-gravity': 0 };
    for (const c of categoryCounts) cats[c._id] = c.count;
    const total = Object.values(cats).reduce((a, b) => a + b, 0);

    // Format monthly data
    const monthly = monthlyRaw.map((m) => ({
      month:        `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
      label:        new Date(m._id.year, m._id.month - 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      total:        m.total,
      highGravity:  m.highGravity,
      midGravity:   m.midGravity,
      smallGravity: m.smallGravity,
      special:      m.midGravity + m.smallGravity,
    }));

    res.json({ total, categories: cats, monthly, latestConcurso: latest?.concurso ?? 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/draws/:concurso ──────────────────────────────────────────────────
router.get('/:concurso', async (req, res) => {
  try {
    const draw = await Draw.findOne({ concurso: parseInt(req.params.concurso) });
    if (!draw) return res.status(404).json({ error: 'Draw not found' });
    res.json(draw);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/draws/fetch ─────────────────────────────────────────────────────
// Scrapes latest results and inserts any new draws into the DB.
router.post('/fetch', async (req, res) => {
  try {
    const latest = await Draw.findOne().sort({ concurso: -1 });
    const afterConcurso = latest?.concurso ?? 0;

    const newDraws = await fetchLatest(afterConcurso);

    if (newDraws.length === 0) {
      return res.json({ inserted: 0, message: 'Already up to date.' });
    }

    const ops = newDraws.map((d) => ({
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
    res.status(500).json({ error: err.message });
  }
});

export default router;
