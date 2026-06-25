import mongoose from 'mongoose';

export interface ITicketDocument extends mongoose.Document {
  concurso: number;
  numbers: number[];
  matches: number;
  hasPrize: boolean;
}

const ticketSchema = new mongoose.Schema<ITicketDocument>(
  {
    concurso: { type: Number, required: true, unique: true, index: true },
    numbers:  { type: [Number], required: true, validate: (v: number[]) => v.length === 15 },
    matches:  { type: Number, required: true },
    hasPrize: { type: Boolean, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ITicketDocument>('Ticket', ticketSchema);
