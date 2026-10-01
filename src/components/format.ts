const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

function calendarDate(year: number, month: number, day: number): CalendarDate | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function parseCalendarDate(value: string): CalendarDate | null {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) return calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(trimmed);
  if (!us) return null;
  const year = us[3].length === 2 ? 2000 + Number(us[3]) : Number(us[3]);
  return calendarDate(year, Number(us[1]), Number(us[2]));
}

export function formatDeskDate(value: string): string {
  const date = parseCalendarDate(value);
  if (!date) return value;
  return `${date.day} ${MONTHS[date.month - 1]} ${date.year}`;
}

export function formatDeskDateOrBlank(value: string | null | undefined): string {
  if (!value || !value.trim()) return "";
  return formatDeskDate(value.trim());
}

function daysUntil(value: string, now: Date): number | null {
  const date = parseCalendarDate(value);
  if (!date) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const target = Date.UTC(date.year, date.month - 1, date.day);
  return (target - today) / 86_400_000;
}

export function isPastDeadline(value: string, now = new Date()): boolean {
  const ahead = daysUntil(value, now);
  return ahead !== null && ahead < 0;
}

export function isDueSoon(value: string, now = new Date()): boolean {
  const ahead = daysUntil(value, now);
  return ahead !== null && ahead >= 0 && ahead <= 7;
}

export function yesNo(value: boolean | null): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
}

export function statusLooksOpen(status: string): boolean {
  return /\bopen\b/i.test(status);
}

export function solicitationCount(count: number): string {
  return `${count} ${count === 1 ? "solicitation" : "solicitations"}`;
}
