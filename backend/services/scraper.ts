import axios from 'axios';
import * as cheerio from 'cheerio';
import { classify } from './classifier.js';
import type { DrawInput } from '../../shared/types/index.js';

const BASE_URL = 'https://asloterias.com.br/resultados-da-lotofacil-';
const CAIXA_URL = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil';

interface CaixaResult {
  numero: number;
  dataApuracao: string;
  listaDezenas: string[];
}

async function fetchYearPage(year: number, page: number): Promise<{ draws: DrawInput[]; html: string }> {
  const url = page === 1
    ? `${BASE_URL}${year}`
    : `${BASE_URL}${year}?pag=${page}&url_ano=${year}`;

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
    /Concurso:\s*(\d+)\s*[-–]\s*(\d{2}\/\d{2}\/\d{4})\s*\([^)]+\)[^0-9]*((?:\d{2}\s*){15})/g;

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

  return { draws, html: data };
}

// asloterias.com.br caps each year's listing at a fixed page size (150 rows) and
// paginates the rest via ?pag=N. Requesting a page beyond the last one just
// re-returns the last valid page, so the page count must come from page 1's
// own pagination links rather than looping until an empty page appears.
async function fetchYear(year: number): Promise<DrawInput[]> {
  const { draws, html } = await fetchYearPage(year, 1);

  const pageNumbers = [...html.matchAll(/[?&]pag=(\d+)&url_ano=/g)].map((m) => parseInt(m[1], 10));
  const maxPage = pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1;

  for (let page = 2; page <= maxPage; page++) {
    const next = await fetchYearPage(year, page);
    draws.push(...next.draws);
  }

  return draws;
}

async function fetchCaixaDraw(concurso?: number): Promise<DrawInput> {
  const { data } = await axios.get<CaixaResult>(
    concurso ? `${CAIXA_URL}/${concurso}` : CAIXA_URL,
    { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 },
  );

  const [day, month, year] = data.dataApuracao.split('/');
  const numbers = data.listaDezenas.map(Number).sort((a, b) => a - b);
  const { category, min, max } = classify(numbers);

  return { concurso: data.numero, date: new Date(`${year}-${month}-${day}T12:00:00Z`), numbers, category, min, max };
}

// asloterias.com.br can lag the official results by days, so anything newer than
// what the scrape returned is filled in from the Caixa API, one concurso at a time.
async function fetchCaixaGap(afterConcurso: number): Promise<DrawInput[]> {
  try {
    const latest = await fetchCaixaDraw();
    if (latest.concurso <= afterConcurso) return [];

    const draws: DrawInput[] = [];
    for (let n = afterConcurso + 1; n < latest.concurso; n++) {
      draws.push(await fetchCaixaDraw(n));
    }
    draws.push(latest);
    return draws;
  } catch (err) {
    console.error('Failed to fetch from Caixa API:', err instanceof Error ? err.message : String(err));
    return [];
  }
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

  const scrapedMax = allDraws.reduce((m, d) => Math.max(m, d.concurso), afterConcurso);
  allDraws.push(...(await fetchCaixaGap(scrapedMax)));

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
