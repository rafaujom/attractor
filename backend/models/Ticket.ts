import mongoose from 'mongoose';

export interface ITicketDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  concurso: number;
  matches: number | null;
  hasPrize: boolean | null;
  numbers: number[];
  label?: string;
  description?: string;
  snapshotId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new mongoose.Schema<ITicketDocument>(
  {
    concurso: { type: Number, required: true, unique: true, index: true },
    matches:  { type: Number, default: null },
    hasPrize: { type: Boolean, default: null },
    numbers: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) =>
          v.length === 15 && new Set(v).size === 15 && v.every((n) => n >= 1 && n <= 25),
        message: 'Ticket must have exactly 15 unique numbers between 1 and 25.',
      },
    },
    label: { type: String, trim: true },
    description: { type: String, trim: true },
    // Frozen stats context captured the moment this ticket was first saved
    // (see backend/services/snapshotService.ts). Set once and never changed.
    snapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Snapshot', default: null },
  },
  { timestamps: true }
);

export default mongoose.model<ITicketDocument>('Ticket', ticketSchema);
