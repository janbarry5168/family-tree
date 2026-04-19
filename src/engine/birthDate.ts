// Small helpers for the partial-date string format used by Person.birthDate.
//
// Format: "" (unknown) | 4-digit year (YYYY) | 8-digit full date (YYYYMMDD).
// Year-only is supported for ancestors whose exact month/day are unknown.
// Empty string is the canonical "unknown" marker (matches project convention
// for unset string fields — see CLAUDE.md on "never null / undefined").

const BIRTH_DATE_RE = /^(\d{4}|\d{8})$/;

export function isValidBirthDate(value: string): boolean {
  if (value === "") return true;
  return BIRTH_DATE_RE.test(value);
}

// Extracts the year portion as a number. Returns 0 when the date is empty or
// malformed — callers use 0 as the sentinel for "no comparable year."
export function birthYearOf(birthDate: string): number {
  if (!birthDate || birthDate.length < 4) return 0;
  const year = Number(birthDate.slice(0, 4));
  return Number.isFinite(year) ? year : 0;
}

// Human-readable render: "19900315" → "1990/03/15", "1990" → "1990", "" → "".
export function formatBirthDate(birthDate: string): string {
  if (birthDate.length === 8) {
    return `${birthDate.slice(0, 4)}/${birthDate.slice(4, 6)}/${birthDate.slice(6, 8)}`;
  }
  if (birthDate.length === 4) return birthDate;
  return "";
}
