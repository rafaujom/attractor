/**
 * Scraper for Lotofácil results from asloterias.com.br
 * Fetches the full year page and parses draw data.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { classify } from './classifier.js';

const BASE_URL = 'https://asloterias.com.br/resultados-da-lotofacil-';

/**
 * Fetch and parse all draws for a given year.
 * @param {number} year
 * @returns {Promise<Array>}
 */
async function fetchYear(year) {
  const url = `${BASE_URL}${year}`;
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; LotofacilBot/1.0; +https://github.com)',
    },
    timeout: 15000,
  });

  const $     = cheerio.load(data);
  const draws = [];

  // Each draw appears as a <p> or <div> block containing:
  //   "Concurso: 3595 - 23/01/2026 (Quinta)  01 02 04 ..."
  // We look for lines matching that pattern in the page text.
  const text = $.text();
  const regex =
    /Concurso:\s*(\d+)\s*[-–]\s*(\d{2}\/\d{2}\/\d{4})\s*\([^)]+\)\s*((?:\d{2}\s*){15})/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const concurso = parseInt(match[1], 10);
    const [day, month, yearStr] = match[2].split('/');
    const date    = new Date(`${yearStr}-${month}-${day}T12:00:00Z`);
    const numbers = match[3]
      .trim()
      .split(/\s+/)
      .map(Number);

    if (numbers.length !== 15) continue;

    const { category, min, max } = classify(numbers);
    draws.push({ concurso, date, numbers, category, min, max });
  }

  return draws;
}

/**
 * Fetch draws for the current year and the previous year
 * (covers cases where the last known draw was in December of the prior year).
 * Returns only draws newer than `afterConcurso`.
 *
 * @param {number} afterConcurso - Only return draws with concurso > this value
 * @returns {Promise<Array>}
 */
async function fetchLatest(afterConcurso = 0) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear];

  // Also include previous year if we're in Jan/Feb (draws may roll over)
  if (new Date().getMonth() < 2) years.push(currentYear - 1);

  const allDraws = [];
  for (const year of years) {
    try {
      const draws = await fetchYear(year);
      allDraws.push(...draws);
    } catch (err) {
      console.error(`Failed to fetch year ${year}:`, err.message);
    }
  }

  // Deduplicate and filter
  const seen = new Set();
  return allDraws
    .filter((d) => {
      if (d.concurso <= afterConcurso) return false;
      if (seen.has(d.concurso)) return false;
      seen.add(d.concurso);
      return true;
    })
    .sort((a, b) => a.concurso - b.concurso);
}

export { fetchLatest, fetchYear };
