import mongoose from 'mongoose';

const drawSchema = new mongoose.Schema(
  {
    concurso: { type: Number, required: true, unique: true },
    date:     { type: Date,   required: true },
    numbers:  { type: [Number], required: true, validate: (v) => v.length === 15 },
    min:      { type: Number, required: true },
    max:      { type: Number, required: true },
    category: {
      type: String,
      enum: ['high-gravity', 'mid-gravity', 'small-gravity'],
      required: true,
    },
  },
  { timestamps: true }
);

// Virtual: formatted date string (DD/MM/YYYY)
drawSchema.virtual('dateFormatted').get(function () {
  return this.date.toLocaleDateString('pt-BR');
});

drawSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Draw', drawSchema);
