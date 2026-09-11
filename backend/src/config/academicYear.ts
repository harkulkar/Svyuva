import { SystemSetting } from '../models/SystemSetting.js';

/** Student Excel and submission years use YYYY-YY (Phase 5). Display may show YYYY-YYYY. */
export const ACADEMIC_YEAR_PATTERN = /^\d{4}-\d{2}$/;

export function isAcademicYear(value: string): boolean {
  return ACADEMIC_YEAR_PATTERN.test(value.trim());
}

export function formatAcademicYear(startYear: number): string {
  const end = (startYear + 1) % 100;
  return `${startYear}-${String(end).padStart(2, '0')}`;
}

export function academicYearLabel(value: string): string {
  const match = value.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return value;
  const start = Number(match[1]);
  return `${start}-${start + 1}`;
}

export function academicYearStart(value: string): number {
  const match = value.trim().match(/^(\d{4})-/);
  return match ? Number(match[1]) : new Date().getUTCFullYear();
}

/**
 * Default year list is configurable. June–May is NOT an official GR calendar.
 * TODO: VERIFY OFFICIAL ACADEMIC YEAR RULE
 */
export function defaultAcademicYearConfig(now = new Date()) {
  const utcYear = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const start = month >= 6 ? utcYear : utcYear - 1;
  const years = [start - 1, start, start + 1].map(formatAcademicYear);
  return {
    current: formatAcademicYear(start),
    years,
    note: 'TODO: VERIFY OFFICIAL ACADEMIC YEAR RULE'
  };
}

export async function getAcademicYearConfig() {
  const defaults = defaultAcademicYearConfig();
  const [currentRow, yearsRow] = await Promise.all([
    SystemSetting.findOne({ key: 'academicYears.current' }).lean(),
    SystemSetting.findOne({ key: 'academicYears.available' }).lean()
  ]);
  const current =
    typeof currentRow?.value === 'string' && isAcademicYear(currentRow.value) ? currentRow.value : defaults.current;
  const yearsRaw = yearsRow?.value;
  const years = Array.isArray(yearsRaw)
    ? yearsRaw.filter((item): item is string => typeof item === 'string' && isAcademicYear(item))
    : defaults.years;
  const list = years.length ? Array.from(new Set(years)) : defaults.years;
  if (!list.includes(current)) list.unshift(current);
  return {
    current,
    years: list,
    options: list.map((year) => ({ value: year, label: academicYearLabel(year) })),
    note: 'TODO: VERIFY OFFICIAL ACADEMIC YEAR RULE'
  };
}

export async function getSubmissionNumberPrefix(): Promise<string> {
  const row = await SystemSetting.findOne({ key: 'submissions.numberPrefix' }).lean();
  const prefix = typeof row?.value === 'string' ? row.value.trim().toUpperCase() : '';
  return prefix || 'SVYS';
}

export async function nextSubmissionNumber(academicYear: string): Promise<string> {
  const prefix = await getSubmissionNumberPrefix();
  const yearPart = String(academicYearStart(academicYear));
  const key = `submissions.seq.${yearPart}`;
  const row = await SystemSetting.findOneAndUpdate({ key }, { $inc: { value: 1 } }, { upsert: true, new: true });
  const seq = Math.max(1, Number(row?.value) || 1);
  return `${prefix}-${yearPart}-${String(seq).padStart(6, '0')}`;
}
