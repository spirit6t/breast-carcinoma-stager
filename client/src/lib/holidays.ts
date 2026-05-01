/**
 * US federal holidays 2024–2030 (observed dates).
 * Used to compute signout date (4 working days from received date).
 */

const US_FEDERAL_HOLIDAYS_OBSERVED: string[] = [
  // 2024
  '2024-01-01', '2024-01-15', '2024-02-19', '2024-05-27',
  '2024-06-19', '2024-07-04', '2024-09-02', '2024-10-14',
  '2024-11-11', '2024-11-28', '2024-12-25',
  // 2025
  '2025-01-01', '2025-01-20', '2025-02-17', '2025-05-26',
  '2025-06-19', '2025-07-04', '2025-09-01', '2025-10-13',
  '2025-11-11', '2025-11-27', '2025-12-25',
  // 2026
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-05-25',
  '2026-06-19', '2026-07-03', '2026-09-07', '2026-10-12',
  '2026-11-11', '2026-11-26', '2026-12-25',
  // 2027
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-05-31',
  '2027-06-18', '2027-07-05', '2027-09-06', '2027-10-11',
  '2027-11-11', '2027-11-25', '2027-12-24',
  // 2028
  '2028-01-17', '2028-02-21', '2028-05-29', '2028-06-19',
  '2028-07-04', '2028-09-04', '2028-10-09', '2028-11-10',
  '2028-11-23', '2028-12-25',
  // 2029
  '2029-01-01', '2029-01-15', '2029-02-19', '2029-05-28',
  '2029-06-19', '2029-07-04', '2029-09-03', '2029-10-08',
  '2029-11-12', '2029-11-22', '2029-12-25',
  // 2030
  '2030-01-01', '2030-01-21', '2030-02-18', '2030-05-27',
  '2030-06-19', '2030-07-04', '2030-09-02', '2030-10-14',
  '2030-11-11', '2030-11-28', '2030-12-25',
];

const HOLIDAY_SET = new Set(US_FEDERAL_HOLIDAYS_OBSERVED);

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isBusinessDay(d: Date): boolean {
  const wd = d.getDay();
  if (wd === 0 || wd === 6) return false;
  return !HOLIDAY_SET.has(toIso(d));
}

/**
 * Add N business days to an ISO date (YYYY-MM-DD), skipping Sat/Sun + US federal
 * holidays. Returns ISO date string.
 */
export function addBusinessDays(iso: string, n: number): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  const start = new Date(y, m - 1, d);
  let count = 0;
  const cur = new Date(start);
  while (count < n) {
    cur.setDate(cur.getDate() + 1);
    if (isBusinessDay(cur)) count++;
  }
  return toIso(cur);
}

export function computeSignoutDate(receivedIso: string | null | undefined): string {
  if (!receivedIso) return '';
  return addBusinessDays(receivedIso, 4);
}
