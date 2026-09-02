/**
 * Indonesian date formatting, in one place.
 *
 * Uses the platform's `Intl.DateTimeFormat` rather than a date library — the
 * app only ever formatted dates, never parsed or did arithmetic on them.
 * Formatters are built once at module load; constructing them per render is
 * the expensive part of Intl.
 */

const LOCALE = "id-ID";

const long = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const longWithTime = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const short = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const shortWithTime = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const withWeekday = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export type DateInput = string | number | Date | null | undefined;

/** Returns null for anything that isn't a real date, so callers never render "Invalid Date". */
const toDate = (value: DateInput): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const using =
  (formatter: Intl.DateTimeFormat) =>
  (value: DateInput, fallback = "-"): string => {
    const date = toDate(value);
    return date ? formatter.format(date) : fallback;
  };

/** "5 September 2026" */
export const formatTanggal = using(long);

/** "5 September 2026 pukul 11.18" */
export const formatTanggalWaktu = using(longWithTime);

/** "5 Sep 2026" */
export const formatTanggalSingkat = using(short);

/** "5 Sep 2026, 11.18" */
export const formatTanggalSingkatWaktu = using(shortWithTime);

/** "Kamis, 5 September 2026" */
export const formatTanggalHari = using(withWeekday);

/** "Hari ini" / "Kemarin", falling back to the long date. */
export const formatWaktuRelatif = (value: DateInput, fallback = "-"): string => {
  const date = toDate(value);
  if (!date) return fallback;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Hari ini";
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";
  return long.format(date);
};

/** True when the deadline has passed. Invalid dates are treated as not passed. */
export const sudahLewat = (value: DateInput): boolean => {
  const date = toDate(value);
  return date ? date.getTime() < Date.now() : false;
};
