import dayjs from "dayjs";
import type { MemoTimeBasis } from "@/contexts/ViewContext";
import { combineCELFilters } from "@/lib/cel-filter";

export const MONTH_DATE_FORMAT = "YYYY-MM" as const;
export const ISO_DATE_FORMAT = "YYYY-MM-DD" as const;

export const getToday = (): string => dayjs().format(ISO_DATE_FORMAT);
export const getCurrentMonth = (): string => dayjs().format(MONTH_DATE_FORMAT);

export const addMonths = (date: Date | string, count: number): string => {
  return dayjs(date).add(count, "month").format(MONTH_DATE_FORMAT);
};

/** "August 2026" for `YYYY-MM`, in the viewer's language. */
export const formatMonthLabel = (month: string, locale: string): string =>
  dayjs(month).toDate().toLocaleString(locale, { year: "numeric", month: "long" });

/**
 * The local midnight named by `YYYY-MM-DD`, or undefined for anything else — including
 * dates JS would silently roll forward (2026-02-30 → March 2).
 */
export const parseLocalDate = (value: string): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const candidate = new Date(year, month - 1, day);
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return undefined;
  return candidate;
};

/** How many years back an "On this day" filter reaches. */
export const ON_THIS_DAY_LOOKBACK_YEARS = 30;

/** The `MM-DD` an "On this day" filter carries for `date`. */
export const getMonthDay = (date: Date = new Date()): string => dayjs(date).format("MM-DD");

/**
 * The `YYYY-MM-DD` days sharing `monthDay` in each earlier year, newest first. A Feb 29
 * only exists in leap years, so the other years are skipped rather than rolled into March.
 */
export const getOnThisDayDates = (monthDay: string, today: Date = new Date(), years = ON_THIS_DAY_LOOKBACK_YEARS): string[] => {
  if (!/^\d{2}-\d{2}$/.test(monthDay)) return [];
  const dates: string[] = [];
  for (let offset = 1; offset <= years; offset++) {
    const date = `${today.getFullYear() - offset}-${monthDay}`;
    if (parseLocalDate(date)) dates.push(date);
  }
  return dates;
};

/** A half-open `[start, end)` window in epoch seconds, in the viewer's local time zone. */
export interface LocalTimestampRange {
  startTimestamp: number;
  endTimestamp: number;
}

const toRange = (start: Date, end: Date): LocalTimestampRange => ({
  startTimestamp: Math.floor(start.getTime() / 1000),
  endTimestamp: Math.floor(end.getTime() / 1000),
});

/** The local calendar day named by `YYYY-MM-DD`, or undefined for an invalid date. */
export const getLocalDayTimestampRange = (value: string): LocalTimestampRange | undefined => {
  const start = parseLocalDate(value);
  if (!start) return undefined;
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return toRange(start, end);
};

/** The local calendar month named by `YYYY-MM`, or undefined for an invalid month. */
export const getLocalMonthTimestampRange = (value: string): LocalTimestampRange | undefined => {
  const start = parseLocalDate(`${value}-01`);
  if (!start) return undefined;
  return toRange(start, new Date(start.getFullYear(), start.getMonth() + 1, 1));
};

/** The CEL timestamp field a time basis is stored under. */
export const getTimeBasisField = (timeBasis: MemoTimeBasis): "created_ts" | "updated_ts" =>
  timeBasis === "update_time" ? "updated_ts" : "created_ts";

/** A CEL clause selecting memos whose `field` falls inside `range`. */
export const buildTimestampRangeFilter = (field: "created_ts" | "updated_ts", range: LocalTimestampRange): string =>
  `${field} >= timestamp(${range.startTimestamp}) && ${field} < timestamp(${range.endTimestamp})`;

/** A CEL clause selecting memos whose `field` falls on any of the `YYYY-MM-DD` `dates`; undefined when none are valid. */
export const buildDaysFilter = (field: "created_ts" | "updated_ts", dates: string[]): string | undefined => {
  const clauses = dates
    .map(getLocalDayTimestampRange)
    .filter((range): range is LocalTimestampRange => range !== undefined)
    .map((range) => `(${buildTimestampRangeFilter(field, range)})`);
  return clauses.length > 0 ? clauses.join(" || ") : undefined;
};

/** `filter` narrowed to memos whose `timeBasis` timestamp falls inside `range`; unchanged when there is no range. */
export const withTimestampRange = (
  filter: string | undefined,
  range: LocalTimestampRange | undefined,
  timeBasis: MemoTimeBasis,
): string | undefined => (range ? combineCELFilters(filter, buildTimestampRangeFilter(getTimeBasisField(timeBasis), range)) : filter);
