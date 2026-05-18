function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nthWeekday(year: number, month: number, nth: number, weekday: number): Date {
  if (!Number.isFinite(year)) throw new Error('nthWeekday: invalid year');
  const d = new Date(year, month - 1, 1);
  let count = 0;
  for (let i = 0; i < 31; i++) {
    if (d.getDay() === weekday && ++count === nth) return new Date(d);
    d.setDate(d.getDate() + 1);
  }
  throw new Error('nthWeekday: not found');
}

function lastWeekday(year: number, month: number, weekday: number): Date {
  if (!Number.isFinite(year)) throw new Error('lastWeekday: invalid year');
  const d = new Date(year, month, 0); // last day of month
  for (let i = 0; i < 7; i++) {
    if (d.getDay() === weekday) return d;
    d.setDate(d.getDate() - 1);
  }
  throw new Error('lastWeekday: not found');
}

function observedDate(year: number, month: number, day: number): string {
  const d = new Date(year, month - 1, day);
  const dow = d.getDay();
  if (dow === 6) d.setDate(day - 1); // Saturday → Friday
  else if (dow === 0) d.setDate(day + 1); // Sunday → Monday
  return toYMD(d);
}

function usFederalHolidays(year: number): Set<string> {
  const h = new Set<string>();
  h.add(observedDate(year, 1, 1));   // New Year's Day
  h.add(toYMD(nthWeekday(year, 1, 3, 1)));  // MLK Day — 3rd Mon Jan
  h.add(toYMD(nthWeekday(year, 2, 3, 1)));  // Presidents' Day — 3rd Mon Feb
  h.add(toYMD(lastWeekday(year, 5, 1)));     // Memorial Day — last Mon May
  h.add(observedDate(year, 6, 19));  // Juneteenth
  h.add(observedDate(year, 7, 4));   // Independence Day
  h.add(toYMD(nthWeekday(year, 9, 1, 1)));  // Labor Day — 1st Mon Sep
  h.add(toYMD(nthWeekday(year, 10, 2, 1))); // Columbus Day — 2nd Mon Oct
  h.add(observedDate(year, 11, 11)); // Veterans Day
  h.add(toYMD(nthWeekday(year, 11, 4, 4))); // Thanksgiving — 4th Thu Nov
  h.add(observedDate(year, 12, 25)); // Christmas Day
  return h;
}

export function addBusinessDays(dateStr: string, days: number): Date {
  const datePart = dateStr.split('T')[0].split(' ')[0];
  const d = new Date(datePart + 'T12:00:00');
  if (!Number.isFinite(d.getTime())) throw new Error(`Invalid date: ${dateStr}`);
  let added = 0;
  // Pre-compute holidays for the year(s) we'll traverse
  const holidays = new Set([
    ...usFederalHolidays(d.getFullYear()),
    ...usFederalHolidays(d.getFullYear() + 1),
  ]);
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6 && !holidays.has(toYMD(d))) added++;
  }
  return d;
}

export function signoutTarget(receivedDate: string | null): { label: string; overdue: boolean } | null {
  if (!receivedDate) return null;
  try {
    const target = addBusinessDays(receivedDate, 4);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = target < today;
    const label = target.toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
    return { label, overdue };
  } catch {
    return null;
  }
}
