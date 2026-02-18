// England & Wales Bank Holidays 2025–2026
const BANK_HOLIDAY_MAP: Record<string, string> = {
  '2025-01-01': "New Year's Day",
  '2025-04-18': 'Good Friday',
  '2025-04-21': 'Easter Monday',
  '2025-05-05': 'Early May Bank Holiday',
  '2025-05-26': 'Spring Bank Holiday',
  '2025-08-25': 'Summer Bank Holiday',
  '2025-12-25': 'Christmas Day',
  '2025-12-26': 'Boxing Day',
  '2026-01-01': "New Year's Day",
  '2026-04-03': 'Good Friday',
  '2026-04-06': 'Easter Monday',
  '2026-05-04': 'Early May Bank Holiday',
  '2026-05-25': 'Spring Bank Holiday',
  '2026-08-31': 'Summer Bank Holiday',
  '2026-12-25': 'Christmas Day',
  '2026-12-28': 'Boxing Day (substitute)',
};

export const BANK_HOLIDAYS = new Set(Object.keys(BANK_HOLIDAY_MAP));

export function isBankHoliday(dateStr: string): boolean {
  return BANK_HOLIDAYS.has(dateStr);
}

export function getBankHolidayName(dateStr: string): string {
  return BANK_HOLIDAY_MAP[dateStr] ?? 'Bank Holiday';
}
