/** Demo booking rules (Africa/Kinshasa, weekdays 09:00–17:00, 30 min, next 14 days). */

export const DEMO_BOOKING_TIMEZONE = "Africa/Kinshasa";
/** Kinshasa is permanently UTC+1 (no DST). */
export const DEMO_BOOKING_UTC_OFFSET = "+01:00";
export const DEMO_BOOKING_START_HOUR = 9;
export const DEMO_BOOKING_END_HOUR = 17;
export const DEMO_BOOKING_SLOT_MINUTES = 30;
export const DEMO_BOOKING_WINDOW_DAYS = 14;
export const DEMO_REQUEST_TO_EMAIL = "marcilungambuyu@gmail.com";

export type DemoTimeSlot = {
  /** Local date YYYY-MM-DD in Africa/Kinshasa */
  date: string;
  /** Local time HH:mm start */
  time: string;
  /** ISO 8601 with offset, e.g. 2026-08-27T09:00:00+01:00 */
  startsAt: string;
  label: string;
};

export type DemoDayOption = {
  date: string;
  label: string;
  weekdayLabel: string;
  weekdayShort: string;
  dayNumber: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Current calendar parts in Africa/Kinshasa. */
export function getKinshasaNowParts(now: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DEMO_BOOKING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short"
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour,
    minute: Number(get("minute")),
    weekday: weekdayMap[get("weekday")] ?? 0
  };
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number
): { year: number; month: number; day: number; weekday: number } {
  // Noon UTC avoids DST edge issues when deriving weekday for Kinshasa (+01:00).
  const utc = new Date(Date.UTC(year, month - 1, day + days, 11, 0, 0));
  const parts = getKinshasaNowParts(utc);
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    weekday: parts.weekday
  };
}

export function buildStartsAt(date: string, time: string): string {
  return `${date}T${time}:00${DEMO_BOOKING_UTC_OFFSET}`;
}

function formatDayLabel(date: string): {
  label: string;
  weekdayLabel: string;
  weekdayShort: string;
  dayNumber: number;
} {
  const startsAt = buildStartsAt(date, "12:00");
  const d = new Date(startsAt);
  const weekdayLabel = new Intl.DateTimeFormat("fr-FR", {
    timeZone: DEMO_BOOKING_TIMEZONE,
    weekday: "long"
  }).format(d);
  const weekdayShort = new Intl.DateTimeFormat("fr-FR", {
    timeZone: DEMO_BOOKING_TIMEZONE,
    weekday: "short"
  }).format(d);
  const label = new Intl.DateTimeFormat("fr-FR", {
    timeZone: DEMO_BOOKING_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(d);
  const dayNumber = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: DEMO_BOOKING_TIMEZONE,
      day: "numeric"
    }).format(d)
  );
  return {
    label,
    weekdayLabel: weekdayLabel.charAt(0).toUpperCase() + weekdayLabel.slice(1),
    weekdayShort: weekdayShort.replace(/\.$/, ""),
    dayNumber
  };
}

function isWeekend(weekday: number): boolean {
  return weekday === 0 || weekday === 6;
}

function slotStartMinutes(): number[] {
  const starts: number[] = [];
  const dayStart = DEMO_BOOKING_START_HOUR * 60;
  const dayEnd = DEMO_BOOKING_END_HOUR * 60;
  for (let m = dayStart; m + DEMO_BOOKING_SLOT_MINUTES <= dayEnd; m += DEMO_BOOKING_SLOT_MINUTES) {
    starts.push(m);
  }
  return starts;
}

export function listDemoDays(now: Date = new Date()): DemoDayOption[] {
  const today = getKinshasaNowParts(now);
  const days: DemoDayOption[] = [];

  for (let offset = 0; offset < DEMO_BOOKING_WINDOW_DAYS; offset += 1) {
    const day = addCalendarDays(today.year, today.month, today.day, offset);
    if (isWeekend(day.weekday)) continue;
    const date = formatDateKey(day.year, day.month, day.day);
    const slots = listDemoSlotsForDate(date, now);
    if (slots.length === 0) continue;
    days.push({ date, ...formatDayLabel(date) });
  }

  return days;
}

export function listDemoSlotsForDate(date: string, now: Date = new Date()): DemoTimeSlot[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return [];

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = getKinshasaNowParts(new Date(buildStartsAt(date, "12:00")));
  if (isWeekend(probe.weekday)) return [];

  const today = getKinshasaNowParts(now);
  const todayKey = formatDateKey(today.year, today.month, today.day);
  const windowEnd = addCalendarDays(today.year, today.month, today.day, DEMO_BOOKING_WINDOW_DAYS - 1);
  const windowEndKey = formatDateKey(windowEnd.year, windowEnd.month, windowEnd.day);

  if (date < todayKey || date > windowEndKey) return [];

  const nowMinutes = today.hour * 60 + today.minute;
  const slots: DemoTimeSlot[] = [];

  for (const startMin of slotStartMinutes()) {
    if (date === todayKey && startMin <= nowMinutes) continue;
    const hour = Math.floor(startMin / 60);
    const minute = startMin % 60;
    const time = `${pad2(hour)}:${pad2(minute)}`;
    const startsAt = buildStartsAt(date, time);
    slots.push({
      date,
      time,
      startsAt,
      label: time
    });
  }

  return slots;
}

export function isValidDemoSlot(startsAt: string, now: Date = new Date()): boolean {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):00\+01:00$/.exec(startsAt);
  if (!match) return false;
  const date = match[1];
  const time = match[2];
  return listDemoSlotsForDate(date, now).some((slot) => slot.time === time && slot.startsAt === startsAt);
}

export function formatDemoSlotForDisplay(startsAt: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return startsAt;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: DEMO_BOOKING_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

/**
 * Placeholder for future Google Calendar event creation.
 * Returns a structured stub so the booking API can stay stable.
 */
export async function createDemoGoogleCalendarEvent(_input: {
  startsAt: string;
  fullName: string;
  email: string;
  phone: string;
  company: string;
  unitsCount: string;
}): Promise<{ created: false; reason: "NOT_IMPLEMENTED" }> {
  return { created: false, reason: "NOT_IMPLEMENTED" };
}
