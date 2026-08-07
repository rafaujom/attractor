import mongoose from 'mongoose';
import type {
  GravityStatsSnapshot,
  MonthlyEntry,
  AbsenceStreakEntry,
  SequentialStreakEntry,
  NumberRecencySnapshotEntry,
} from '../../shared/types/index.js';

export interface ISnapshotDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  ticketId: mongoose.Types.ObjectId;
  targetConcurso: number;
  pickedNumbers: number[];
  gravityStats: GravityStatsSnapshot;
  monthlyBreakdown: MonthlyEntry[];
  absenceStreaks: AbsenceStreakEntry[];
  sequentialStreaks: SequentialStreakEntry[];
  numberRecency: NumberRecencySnapshotEntry[];
  createdAt: Date;
}

// Frozen point-in-time copy of the stats dashboard, captured once when a
// ticket is first saved. Nested fields are stored as Mixed since this is a
// write-once historical blob, not a document we query into or evolve.
const snapshotSchema = new mongoose.Schema<ISnapshotDocument>(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      unique: true,
      index: true,
    },
    targetConcurso: { type: Number, required: true },
    pickedNumbers: { type: [Number], required: true },
    gravityStats: { type: mongoose.Schema.Types.Mixed, required: true },
    monthlyBreakdown: { type: mongoose.Schema.Types.Mixed, default: [] },
    absenceStreaks: { type: mongoose.Schema.Types.Mixed, default: [] },
    sequentialStreaks: { type: mongoose.Schema.Types.Mixed, default: [] },
    numberRecency: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<ISnapshotDocument>('Snapshot', snapshotSchema);
