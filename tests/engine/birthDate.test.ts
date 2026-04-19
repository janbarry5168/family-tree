import { describe, it, expect } from "vitest";
import { isValidBirthDate, birthYearOf, formatBirthDate } from "../../src/engine/birthDate";

describe("isValidBirthDate", () => {
  it("accepts empty string", () => {
    expect(isValidBirthDate("")).toBe(true);
  });
  it("accepts 4-digit year (ancient: month/day unknown)", () => {
    expect(isValidBirthDate("1990")).toBe(true);
  });
  it("accepts 8-digit full date", () => {
    expect(isValidBirthDate("19900315")).toBe(true);
  });
  it("rejects 6-digit year+month (intermediate format not supported)", () => {
    expect(isValidBirthDate("199003")).toBe(false);
  });
  it("rejects other formats", () => {
    expect(isValidBirthDate("199")).toBe(false);
    expect(isValidBirthDate("19900")).toBe(false);
    expect(isValidBirthDate("1990031")).toBe(false);
    expect(isValidBirthDate("199003150")).toBe(false);
    expect(isValidBirthDate("1990/03/15")).toBe(false);
    expect(isValidBirthDate("abcd")).toBe(false);
  });
});

describe("birthYearOf", () => {
  it("returns 0 for empty or too-short values", () => {
    expect(birthYearOf("")).toBe(0);
    expect(birthYearOf("123")).toBe(0);
  });
  it("extracts year from year-only and full dates", () => {
    expect(birthYearOf("1990")).toBe(1990);
    expect(birthYearOf("19900315")).toBe(1990);
  });
});

describe("formatBirthDate", () => {
  it("formats full date with slashes", () => {
    expect(formatBirthDate("19900315")).toBe("1990/03/15");
  });
  it("formats year-only as-is", () => {
    expect(formatBirthDate("1990")).toBe("1990");
  });
  it("returns empty string for empty input", () => {
    expect(formatBirthDate("")).toBe("");
  });
});
