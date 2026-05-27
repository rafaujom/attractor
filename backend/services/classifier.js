/**
 * Classify a Lotofácil draw into one of three gravity categories.
 *
 * Rules:
 *   small-gravity → all 15 numbers are ≤ 21  (max ≤ 21)
 *   mid-gravity   → all 15 numbers are ≥ 4 AND at least one > 21  (min ≥ 4, max ≥ 22)
 *   high-gravity  → has at least one number ≤ 3 AND at least one ≥ 22  (full range)
 *
 * @param {number[]} numbers - Array of 15 drawn numbers
 * @returns {{ category: string, min: number, max: number }}
 */
function classify(numbers) {
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);

  let category;
  if (max <= 21) {
    category = 'small-gravity';
  } else if (min >= 4) {
    category = 'mid-gravity';
  } else {
    category = 'high-gravity';
  }

  return { category, min, max };
}

export { classify };
