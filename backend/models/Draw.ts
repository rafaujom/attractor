import mongoose from 'mongoose';
import type { GravityCategory } from '../../shared/types/index.js';

export interface IDrawDocument extends mongoose.Document {
  concurso: number;
  date: Date;
  numbers: number[];
  min: number;
  max: number;
  category: GravityCategory;
  dateFormatted: string;
}

const drawSchema = new mongoose.Schema<IDrawDocument>(
  {
    concurso: { type: Number, required: true, unique: true },
    date:     { type: Date,   required: true },
    numbers:  { type: [Number], required: true, validate: (v: number[]) => v.length === 15 },
    min:      { type: Number, required: true },
    max:      { type: Number, required: true },
    category: {
      type: String,
      enum: ['high-gravity', 'mid-gravity', 'small-gravity'] as GravityCategory[],
      required: true,
    },
  },
  { timestamps: true }
);

drawSchema.virtual('dateFormatted').get(function (this: IDrawDocument) {
  return this.date.toLocaleDateString('pt-BR');
});

drawSchema.set('toJSON', { virtuals: true });

export default mongoose.model<IDrawDocument>('Draw', drawSchema);
