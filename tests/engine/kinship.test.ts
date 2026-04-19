import { describe, it, expect } from "vitest";
import { computeKinshipDegrees } from "../../src/engine/kinship";
import type { Person } from "../../src/types/person";

const makePerson = (overrides: Partial<Person> = {}): Person => ({
  id: "1",
  name: "Test",
  father: "",
  mother: "",
  spouse: "",
  birthOrder: 1,
  birthDate: "1990",
  photo: "",
  ...overrides,
});

describe("computeKinshipDegrees", () => {
  it("returns degree 0 for the focused person", () => {
    const persons = [makePerson({ id: "me" })];
    const degrees = computeKinshipDegrees(persons, "me");
    expect(degrees.get("me")).toBe(0);
  });

  it("returns degree 0 for spouse (spouse=0 rule)", () => {
    const persons = [
      makePerson({ id: "me", spouse: "wife" }),
      makePerson({ id: "wife", name: "Wife", spouse: "me" }),
    ];
    const degrees = computeKinshipDegrees(persons, "me");
    expect(degrees.get("wife")).toBe(0);
  });

  it("returns degree 1 for parent", () => {
    const persons = [
      makePerson({ id: "me", father: "dad" }),
      makePerson({ id: "dad", name: "Dad" }),
    ];
    const degrees = computeKinshipDegrees(persons, "me");
    expect(degrees.get("dad")).toBe(1);
  });

  it("returns degree 1 for child", () => {
    const persons = [
      makePerson({ id: "me" }),
      makePerson({ id: "kid", name: "Kid", father: "me" }),
    ];
    const degrees = computeKinshipDegrees(persons, "me");
    expect(degrees.get("kid")).toBe(1);
  });

  it("returns degree 1 for sibling", () => {
    const persons = [
      makePerson({ id: "me", father: "dad", mother: "mom", birthOrder: 1 }),
      makePerson({ id: "bro", name: "Bro", father: "dad", mother: "mom", birthOrder: 2 }),
      makePerson({ id: "dad", name: "Dad" }),
      makePerson({ id: "mom", name: "Mom" }),
    ];
    const degrees = computeKinshipDegrees(persons, "me");
    expect(degrees.get("bro")).toBe(1);
  });

  it("spouse's parent is degree 1 (spouse=0, then parent=1)", () => {
    const persons = [
      makePerson({ id: "me", spouse: "wife" }),
      makePerson({ id: "wife", name: "Wife", spouse: "me", father: "fil" }),
      makePerson({ id: "fil", name: "FIL" }),
    ];
    const degrees = computeKinshipDegrees(persons, "me");
    expect(degrees.get("fil")).toBe(1);
  });

  it("returns degree 2 for grandparent", () => {
    const persons = [
      makePerson({ id: "me", father: "dad" }),
      makePerson({ id: "dad", name: "Dad", father: "gf" }),
      makePerson({ id: "gf", name: "GF" }),
    ];
    const degrees = computeKinshipDegrees(persons, "me");
    expect(degrees.get("gf")).toBe(2);
  });

  it("handles disconnected persons (not reachable)", () => {
    const persons = [
      makePerson({ id: "me" }),
      makePerson({ id: "stranger", name: "Stranger" }),
    ];
    const degrees = computeKinshipDegrees(persons, "me");
    expect(degrees.has("stranger")).toBe(false);
  });

  it("finds shortest path (sibling=1, not parent+child=2)", () => {
    const persons = [
      makePerson({ id: "me", father: "dad", mother: "mom", birthOrder: 1 }),
      makePerson({ id: "sis", name: "Sis", father: "dad", mother: "mom", birthOrder: 2 }),
      makePerson({ id: "dad", name: "Dad" }),
      makePerson({ id: "mom", name: "Mom" }),
    ];
    const degrees = computeKinshipDegrees(persons, "me");
    expect(degrees.get("sis")).toBe(1);
  });
});
