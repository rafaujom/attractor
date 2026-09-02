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

// Scores every pending ticket (matches === null) whose concurso matches one of
// the given draws. Called after new draws are inserted so tickets bought ahead
// of a result get resolved automatically. Several tickets may share a concurso.
export async function scorePendingTickets(
  draws: { concurso: number; numbers: number[] }[]
): Promise<void> {
  for (const draw of draws) {
    const pendingTickets = await Ticket.find({ concurso: draw.concurso, matches: null });
    for (const pending of pendingTickets) {
      const { matches, hasPrize } = scoreTicket(pending.numbers, draw.numbers);
      pending.matches = matches;
      pending.hasPrize = hasPrize;
      await pending.save();
    }
  }
}
