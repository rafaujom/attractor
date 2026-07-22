import Ticket from '../models/Ticket.js';

export const PRIZE_THRESHOLD = 11; // 11+ matches wins a prize in Lotofácil

export function scoreTicket(
  pickedNumbers: number[],
  drawNumbers: number[]
): { matches: number; hasPrize: boolean } {
  const drawSet = new Set(drawNumbers);
  const matches = pickedNumbers.filter((n) => drawSet.has(n)).length;
  return { matches, hasPrize: matches >= PRIZE_THRESHOLD };
}

// Scores any pending ticket (matches === null) whose concurso matches one of the
// given draws. Called after new draws are inserted so tickets bought ahead of a
// result get resolved automatically.
export async function scorePendingTickets(
  draws: { concurso: number; numbers: number[] }[]
): Promise<void> {
  for (const draw of draws) {
    const pending = await Ticket.findOne({ concurso: draw.concurso, matches: null });
    if (!pending) continue;
    const { matches, hasPrize } = scoreTicket(pending.numbers, draw.numbers);
    pending.matches = matches;
    pending.hasPrize = hasPrize;
    await pending.save();
  }
}
