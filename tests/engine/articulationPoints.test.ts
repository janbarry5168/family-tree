import { describe, it, expect } from "vitest";
import { computeArticulationPoints } from "../../src/engine/hiddenReachability";
import type { Person } from "../../src/types/person";

const makePerson = (overrides: Partial<Person> = {}): Person => ({
  id: "1",
  name: "Test",
  father: "",
  mother: "",
  spouse: "",
  siblings: [],
  birthOrder: 1,
  birthDate: "1990",
  photo: "",
  ...overrides,
});

describe("computeArticulationPoints", () => {
  it("focused is never in the articulation set", () => {
    const persons = [
      makePerson({ id: "me", spouse: "wife" }),
      makePerson({ id: "wife", spouse: "me", father: "wdad" }),
      makePerson({ id: "wdad" }),
    ];
    const arts = computeArticulationPoints(persons, "me", new Set());
    expect(arts.has("me")).toBe(false);
  });

  it("spouse is articulation when she has her own relatives", () => {
    const persons = [
      makePerson({ id: "me", spouse: "wife" }),
      makePerson({ id: "wife", spouse: "me", father: "wdad" }),
      makePerson({ id: "wdad" }),
    ];
    const arts = computeArticulationPoints(persons, "me", new Set());
    expect(arts.has("wife")).toBe(true);
  });

  it("leaf spouse (no relatives of her own) is NOT articulation", () => {
    const persons = [
      makePerson({ id: "me", spouse: "wife" }),
      makePerson({ id: "wife", spouse: "me" }),
    ];
    const arts = computeArticulationPoints(persons, "me", new Set());
    expect(arts.has("wife")).toBe(false);
  });

  it("already-toggled spouse is NOT in articulation set (walls hide her subtree)", () => {
    const persons = [
      makePerson({ id: "me", spouse: "wife" }),
      makePerson({ id: "wife", spouse: "me", father: "wdad" }),
      makePerson({ id: "wdad" }),
    ];
    const arts = computeArticulationPoints(persons, "me", new Set(["wife"]));
    expect(arts.has("wife")).toBe(false);
  });

  it("parent with siblings upstream is articulation", () => {
    const persons = [
      makePerson({ id: "me", father: "dad" }),
      makePerson({ id: "dad", father: "gpa" }),
      makePerson({ id: "gpa" }),
    ];
    const arts = computeArticulationPoints(persons, "me", new Set());
    expect(arts.has("dad")).toBe(true);
  });

  it("parent with no upstream relatives is NOT articulation", () => {
    const persons = [
      makePerson({ id: "me", father: "dad" }),
      makePerson({ id: "dad" }),
    ];
    const arts = computeArticulationPoints(persons, "me", new Set());
    expect(arts.has("dad")).toBe(false);
  });

  it("person outside the reachable subgraph is NOT articulation", () => {
    const persons = [
      makePerson({ id: "me" }),
      makePerson({ id: "stranger" }),
    ];
    const arts = computeArticulationPoints(persons, "me", new Set());
    expect(arts.has("stranger")).toBe(false);
  });
});
