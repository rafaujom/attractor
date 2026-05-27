import axios from 'axios';
import * as cheerio from 'cheerio';
import { classify } from './classifier.js';
import type { DrawInput } from '../../shared/types/index.js';

const BASE_URL = 'https://asloterias.com.br/resultados-da-lotofacil-';

async function fetchYear(year: number): Promise<DrawInput[]> {
  const url = `${BASE_URL}${year}`;
  const { data } = await axios.get<string>(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LotofacilBot/1.0; +https://github.com)',
    },
    timeout: 15000,
  });

  const $     = cheerio.load(data);
  const draws: DrawInput[] = [];

  const text  = $.text();
  const regex =
    /Concurso:\s*(\d+)\s*[-–]\s*(\d{2}\/\d{2}\/\d{4})\s*\([^)]+\)\s*((?:\d{2}\s*){15})/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const concurso = parseInt(match[1], 10);
    const [day, month, yearStr] = match[2].split('/');
    const date    = new Date(`${yearStr}-${month}-${day}T12:00:00Z`);
    const numbers = match[3].trim().split(/\s+/).map(Number);

    if (numbers.length !== 15) continue;

    const { category, min, max } = classify(numbers);
    draws.push({ concurso, date, numbers, category, min, max });
  }

  return draws;
}

async function fetchLatest(afterConcurso = 0): Promise<DrawInput[]> {
  const currentYear = new Date().getFullYear();
  const years = [currentYear];

  if (new Date().getMonth() < 2) years.push(currentYear - 1);

  const allDraws: DrawInput[] = [];
  for (const year of years) {
    try {
      const draws = await fetchYear(year);
      allDraws.push(...draws);
    } catch (err) {
      console.error(`Failed to fetch year ${year}:`, err instanceof Error ? err.message : String(err));
    }
  }

  const seen = new Set<number>();
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
