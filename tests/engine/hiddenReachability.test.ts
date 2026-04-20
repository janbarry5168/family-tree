import { describe, it, expect } from "vitest";
import { computeHiddenIds } from "../../src/engine/hiddenReachability";
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

describe("computeHiddenIds", () => {
  it("returns empty set when hiddenToggles is empty", () => {
    const persons = [
      makePerson({ id: "me", spouse: "wife" }),
      makePerson({ id: "wife", spouse: "me" }),
    ];
    expect(computeHiddenIds(persons, "me", new Set()).size).toBe(0);
  });

  it("hides spouse's parents and siblings; keeps shared children", () => {
    const persons = [
      makePerson({ id: "me", spouse: "wife" }),
      makePerson({ id: "wife", spouse: "me", father: "wdad", mother: "wmom" }),
      makePerson({ id: "wdad", spouse: "wmom" }),
      makePerson({ id: "wmom", spouse: "wdad" }),
      makePerson({ id: "wsib", father: "wdad", mother: "wmom" }),
      makePerson({ id: "kid", father: "me", mother: "wife" }),
    ];
    const hidden = computeHiddenIds(persons, "me", new Set(["wife"]));
    expect(hidden.has("wdad")).toBe(true);
    expect(hidden.has("wmom")).toBe(true);
    expect(hidden.has("wsib")).toBe(true);
    expect(hidden.has("kid")).toBe(false);
    expect(hidden.has("wife")).toBe(false);
    expect(hidden.has("me")).toBe(false);
  });

  it("hides sibling's spouse and descendants when sibling toggled", () => {
    const persons = [
      makePerson({ id: "me", father: "dad", mother: "mom" }),
      makePerson({ id: "sib", father: "dad", mother: "mom", spouse: "sibw" }),
      makePerson({ id: "sibw", spouse: "sib" }),
      makePerson({ id: "niece", father: "sib", mother: "sibw" }),
      makePerson({ id: "dad", spouse: "mom" }),
      makePerson({ id: "mom", spouse: "dad" }),
    ];
    const hidden = computeHiddenIds(persons, "me", new Set(["sib"]));
    expect(hidden.has("sibw")).toBe(true);
    expect(hidden.has("niece")).toBe(true);
    expect(hidden.has("sib")).toBe(false);
    expect(hidden.has("dad")).toBe(false);
  });

  it("half-sibling sharing only the toggled parent is hidden", () => {
    const persons = [
      makePerson({ id: "me", father: "dad", mother: "mom" }),
      makePerson({ id: "half", father: "dad", mother: "stepmom" }),
      makePerson({ id: "dad", spouse: "mom" }),
      makePerson({ id: "mom", spouse: "dad" }),
      makePerson({ id: "stepmom" }),
    ];
    const hidden = computeHiddenIds(persons, "me", new Set(["dad"]));
    expect(hidden.has("half")).toBe(true);
    expect(hidden.has("stepmom")).toBe(true);
    expect(hidden.has("dad")).toBe(false);
    expect(hidden.has("mom")).toBe(false);
  });

  it("non-articulation toggle yields empty hidden set", () => {
    const persons = [
      makePerson({ id: "me", spouse: "wife" }),
      makePerson({ id: "wife", spouse: "me" }),
    ];
    const hidden = computeHiddenIds(persons, "me", new Set(["wife"]));
    expect(hidden.size).toBe(0);
  });

  it("focused person in hiddenToggles is ignored (full expansion)", () => {
    const persons = [
      makePerson({ id: "me", spouse: "wife" }),
      makePerson({ id: "wife", spouse: "me", father: "wdad" }),
      makePerson({ id: "wdad" }),
    ];
    const hidden = computeHiddenIds(persons, "me", new Set(["me"]));
    expect(hidden.size).toBe(0);
  });

  it("explicit siblings[] edge is respected as a wall", () => {
    const persons = [
      makePerson({ id: "me", siblings: ["sib"] }),
      makePerson({ id: "sib", siblings: ["me"] }),
      makePerson({ id: "niece", father: "sib" }),
    ];
    const hidden = computeHiddenIds(persons, "me", new Set(["sib"]));
    expect(hidden.has("niece")).toBe(true);
  });

  it("ignores empty-string edge values", () => {
    const persons = [
      makePerson({ id: "me", father: "", mother: "", spouse: "" }),
    ];
    expect(computeHiddenIds(persons, "me", new Set()).size).toBe(0);
  });
});
