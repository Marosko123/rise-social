import type { Platform } from './schemas';

export interface ScheduleSlot {
  postIndex: number;
  localDate: string;
  byPlatform: Record<Platform, string>;
}
const DEFAULT_TIME: Record<Platform, readonly [number, number]> = {
  instagram: [12, 0],
  linkedin: [16, 0],
  facebook: [17, 0],
};

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

function localDate(date: Date, timeZone: string): string {
  const parts = localParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

function weekday(date: string): number {
  return new Date(`${date}T12:00:00.000Z`).getUTCDay();
}

function zonedDateTimeToUtc(date: string, hour: number, minute: number, timeZone: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = targetAsUtc;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = localParts(new Date(candidate), timeZone);
    const representedLocalTime = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    candidate += targetAsUtc - representedLocalTime;
  }

  return new Date(candidate).toISOString();
}

export function createDefaultSchedule(
  approvedAt: Date,
  timeZone = 'Europe/Bratislava',
): ScheduleSlot[] {
  const approvalLocalDate = localDate(approvedAt, timeZone);
  const eligibleDates = Array.from({ length: 7 }, (_, index) =>
    addCalendarDays(approvalLocalDate, index + 1),
  ).filter(date => {
    const day = weekday(date);
    return day !== 0 && day !== 6;
  });

  const chosenIndexes = [0, Math.floor((eligibleDates.length - 1) / 2), eligibleDates.length - 1];
  return chosenIndexes.map((dateIndex, postIndex) => {
    const chosenDate = eligibleDates[dateIndex];
    return {
      postIndex,
      localDate: chosenDate,
      byPlatform: Object.fromEntries(
        (Object.entries(DEFAULT_TIME) as [Platform, readonly [number, number]][]).map(
          ([platform, [hour, minute]]) => [
            platform,
            zonedDateTimeToUtc(chosenDate, hour, minute, timeZone),
          ],
        ),
      ) as Record<Platform, string>,
    };
  });
}
