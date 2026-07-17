import mongoose from 'mongoose';

export interface ITicketDocument extends mongoose.Document {
  concurso: number;
  matches: number;
  hasPrize: boolean;
  numbers: number[];
  label?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new mongoose.Schema<ITicketDocument>(
  {
    concurso: { type: Number, required: true, unique: true, index: true },
    matches:  { type: Number, required: true },
    hasPrize: { type: Boolean, required: true },
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
  },
  { timestamps: true }
);

export default mongoose.model<ITicketDocument>('Ticket', ticketSchema);
