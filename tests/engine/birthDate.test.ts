import { describe, it, expect } from "vitest";
import { isValidBirthDate, birthYearOf, formatBirthDate } from "../../src/engine/birthDate";

describe("isValidBirthDate", () => {
  it("accepts empty string", () => {
    expect(isValidBirthDate("")).toBe(true);
  });
  it("accepts 4/6/8 digit formats", () => {
    expect(isValidBirthDate("1990")).toBe(true);
    expect(isValidBirthDate("199003")).toBe(true);
    expect(isValidBirthDate("19900315")).toBe(true);
  });
  it("rejects other formats", () => {
    expect(isValidBirthDate("199")).toBe(false);
    expect(isValidBirthDate("19900")).toBe(false);
    expect(isValidBirthDate("1990031")).toBe(false);
    expect(isValidBirthDate("199003150")).toBe(false);
    expect(isValidBirthDate("1990-03-15")).toBe(false);
    expect(isValidBirthDate("abcd")).toBe(false);
  });
});

describe("birthYearOf", () => {
  it("returns 0 for empty or too-short values", () => {
    expect(birthYearOf("")).toBe(0);
    expect(birthYearOf("123")).toBe(0);
  });
  it("extracts year from partial and full dates", () => {
    expect(birthYearOf("1990")).toBe(1990);
    expect(birthYearOf("199003")).toBe(1990);
    expect(birthYearOf("19900315")).toBe(1990);
  });
});

describe("formatBirthDate", () => {
  it("formats full date with dashes", () => {
    expect(formatBirthDate("19900315")).toBe("1990-03-15");
  });
  it("formats year + month with one dash", () => {
    expect(formatBirthDate("199003")).toBe("1990-03");
  });
  it("formats year-only as-is", () => {
    expect(formatBirthDate("1990")).toBe("1990");
  });
  it("returns empty string for empty input", () => {
    expect(formatBirthDate("")).toBe("");
  });
});
