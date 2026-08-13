export function barColor(currentStreak: number): string {
  if (currentStreak === 0) return '#cbd5e1';
  if (currentStreak <= 2)  return '#27ae60';
  if (currentStreak <= 4)  return '#f39c12';
  return '#e74c3c';
}

export function drawsAbsentColor(drawsAbsent: number): string {
  if (drawsAbsent <= 2) return '#27ae60';
  if (drawsAbsent <= 5) return '#f39c12';
  return '#e74c3c';
}
