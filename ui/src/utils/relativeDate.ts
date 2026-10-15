/** Relative offset units. Minutes are spelled "min" because "m" already means months. */
export type RelativeDateUnit = "y" | "m" | "w" | "d" | "h" | "min" | "s";
export type RelativeDatePart = { amount: number; unit: RelativeDateUnit };
export type RelativeDateExpression = { sign: "" | "+" | "-"; parts: RelativeDatePart[] };

const RELATIVE_UNIT_RANKS: Record<RelativeDateUnit, number> = { y: 7, m: 6, w: 5, d: 4, h: 3, min: 2, s: 1 };
const TIME_UNITS: ReadonlySet<RelativeDateUnit> = new Set(["h", "min", "s"]);

/** Parses a signed offset; `allowTime` enables the h, min, and s parts that only timestamp filters accept. */
export function parseRelativeDateExpression(value: string, allowTime = true): RelativeDateExpression | undefined {
  const match = /^([+-]?)((?:\d+(?:min|[ymwdhs]))+)$/i.exec(value.trim());
  if (!match) return undefined;

  const parts: RelativeDatePart[] = [];
  let previousRank = Number.POSITIVE_INFINITY;
  for (const partMatch of match[2].matchAll(/(\d+)(min|[ymwdhs])/gi)) {
    const amount = Number(partMatch[1]);
    const unit = partMatch[2].toLowerCase() as RelativeDateUnit;
    if (
      !Number.isInteger(amount) ||
      amount > 2_147_483_647 ||
      (!allowTime && TIME_UNITS.has(unit)) ||
      RELATIVE_UNIT_RANKS[unit] >= previousRank
    )
      return undefined;
    parts.push({ amount, unit });
    previousRank = RELATIVE_UNIT_RANKS[unit];
  }

  const sign = match[1] as RelativeDateExpression["sign"];
  if (sign === "" && (parts.length !== 1 || parts[0].amount !== 0 || parts[0].unit !== "d")) return undefined;
  return { sign, parts };
}

export function isValidRelativeDate(value: string, allowTime = false): boolean {
  return parseRelativeDateExpression(value, allowTime) !== undefined;
}

export function looksLikeRelativeDate(value: string): boolean {
  return /^[+-]|^\d+(?:min|[ymwdhs])[\dymwdhins+-]*$/i.test(value.trim());
}

/** Resolves an exact or relative filter value to an epoch timestamp. */
export function parseDateFilterValue(value: string | undefined, reference: Date, dateOnly = false): number {
  if (!value) return Number.NaN;

  const relative = parseRelativeDateExpression(value, !dateOnly);
  if (!relative) return Date.parse(value);

  const sign = relative.sign === "-" ? -1 : 1;
  const result = new Date(reference);
  if (dateOnly) result.setUTCHours(0, 0, 0, 0);

  for (const part of relative.parts) {
    const amount = sign * part.amount;
    if (part.unit === "h") {
      result.setUTCHours(result.getUTCHours() + amount);
    } else if (part.unit === "min") {
      result.setUTCMinutes(result.getUTCMinutes() + amount);
    } else if (part.unit === "s") {
      result.setUTCSeconds(result.getUTCSeconds() + amount);
    } else if (part.unit === "d" || part.unit === "w") {
      result.setUTCDate(result.getUTCDate() + amount * (part.unit === "w" ? 7 : 1));
    } else {
      addUtcCalendarUnits(result, amount, part.unit === "y");
    }
  }

  return result.getTime();
}

function addUtcCalendarUnits(value: Date, amount: number, years: boolean) {
  const originalDay = value.getUTCDate();
  value.setUTCDate(1);
  if (years) {
    value.setUTCFullYear(value.getUTCFullYear() + amount);
  } else {
    value.setUTCMonth(value.getUTCMonth() + amount);
  }

  const endOfTargetMonth = new Date(value);
  endOfTargetMonth.setUTCMonth(endOfTargetMonth.getUTCMonth() + 1, 0);
  value.setUTCDate(Math.min(originalDay, endOfTargetMonth.getUTCDate()));
}

export const RELATIVE_UNIT_LABELS: Record<RelativeDateUnit, string> = {
  y: "year",
  m: "month",
  w: "week",
  d: "day",
  h: "hour",
  min: "minute",
  s: "second",
};

/** Describes a relative offset in words, such as "1 hour 30 minutes ago"; undefined for any other value. */
export function describeRelativeDate(value: unknown, dateOnly: boolean): string | undefined {
  if (typeof value !== "string") return undefined;
  const relative = parseRelativeDateExpression(value, !dateOnly);
  if (!relative) return undefined;
  const nonzeroParts = relative.parts.filter((part) => part.amount !== 0);
  if (nonzeroParts.length === 0) return dateOnly ? "today" : "now";

  const duration = nonzeroParts
    .map(({ amount, unit }) => `${amount} ${RELATIVE_UNIT_LABELS[unit]}${amount === 1 ? "" : "s"}`)
    .join(" ");
  return relative.sign === "-" ? `${duration} ago` : `${duration} from now`;
}
