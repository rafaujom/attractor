import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import drawsRouter   from './routes/draws.js';
import ticketsRouter from './routes/tickets.js';

const app  = express();
const PORT = process.env.PORT ?? 3001;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI is not set');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

app.use('/api/draws',   drawsRouter);
app.use('/api/tickets', ticketsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅  MongoDB connected');
    app.listen(PORT, () => console.log(`🚀  Server running on http://localhost:${PORT}`));
  })
  .catch((err: Error) => {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);
  });
