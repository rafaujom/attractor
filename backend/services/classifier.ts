import type { GravityCategory } from '../../shared/types/index.js';

interface ClassifyResult {
  category: GravityCategory;
  min: number;
  max: number;
}

function classify(numbers: number[]): ClassifyResult {
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);

  let category: GravityCategory;
  if (max <= 21) {
    category = 'small-gravity';
  } else if (min >= 4) {
    category = 'high-gravity';
  } else {
    category = 'mid-gravity';
  }

  return { category, min, max };
}

export { classify };
