import { describe, it, expect } from "vitest";
import { computeLayout } from "../../src/engine/layout";
import type { Person } from "../../src/types/person";

const makePerson = (overrides: Partial<Person> = {}): Person => ({
  id: "1",
  name: "Test",
  father: "",
  mother: "",
  spouse: "",
  birthOrder: 1,
  birthYear: 1990,
  photo: "",
  ...overrides,
});

describe("computeLayout", () => {
  it("places a single focused person at origin", () => {
    const persons = [makePerson({ id: "me" })];
    const degrees = new Map([["me", 0]]);
    const nodes = computeLayout(persons, "me", degrees, 2);

    const me = nodes.find((n) => n.id === "me")!;
    expect(me.x).toBe(0);
    expect(me.y).toBe(0);
    expect(me.generation).toBe(0);
    expect(me.nodeType).toBe("focused");
  });

  it("places spouse on same generation, offset to the right", () => {
    const persons = [
      makePerson({ id: "me", spouse: "wife" }),
      makePerson({ id: "wife", name: "Wife", spouse: "me" }),
    ];
    const degrees = new Map([["me", 0], ["wife", 0]]);
    const nodes = computeLayout(persons, "me", degrees, 2);

    const me = nodes.find((n) => n.id === "me")!;
    const wife = nodes.find((n) => n.id === "wife")!;
    expect(wife.generation).toBe(me.generation);
    expect(wife.x).toBeGreaterThan(me.x);
    expect(wife.nodeType).toBe("spouse");
  });

  it("places parents one generation above", () => {
    const persons = [
      makePerson({ id: "me", father: "dad", mother: "mom" }),
      makePerson({ id: "dad", name: "Dad", spouse: "mom" }),
      makePerson({ id: "mom", name: "Mom", spouse: "dad" }),
    ];
    const degrees = new Map([["me", 0], ["dad", 1], ["mom", 1]]);
    const nodes = computeLayout(persons, "me", degrees, 2);

    const me = nodes.find((n) => n.id === "me")!;
    const dad = nodes.find((n) => n.id === "dad")!;
    expect(dad.generation).toBe(me.generation - 1);
    expect(dad.y).toBeLessThan(me.y);
  });

  it("places children one generation below", () => {
    const persons = [
      makePerson({ id: "me" }),
      makePerson({ id: "kid", name: "Kid", father: "me", birthOrder: 1 }),
    ];
    const degrees = new Map([["me", 0], ["kid", 1]]);
    const nodes = computeLayout(persons, "me", degrees, 2);

    const me = nodes.find((n) => n.id === "me")!;
    const kid = nodes.find((n) => n.id === "kid")!;
    expect(kid.generation).toBe(me.generation + 1);
    expect(kid.y).toBeGreaterThan(me.y);
  });

  it("sorts siblings by birthOrder left to right", () => {
    const persons = [
      makePerson({ id: "dad", name: "Dad" }),
      makePerson({ id: "mom", name: "Mom" }),
      makePerson({ id: "a", name: "A", father: "dad", mother: "mom", birthOrder: 1 }),
      makePerson({ id: "b", name: "B", father: "dad", mother: "mom", birthOrder: 2 }),
      makePerson({ id: "c", name: "C", father: "dad", mother: "mom", birthOrder: 3 }),
    ];
    const degrees = new Map([["dad", 1], ["mom", 1], ["a", 0], ["b", 1], ["c", 1]]);
    const nodes = computeLayout(persons, "a", degrees, 2);

    const a = nodes.find((n) => n.id === "a")!;
    const b = nodes.find((n) => n.id === "b")!;
    const c = nodes.find((n) => n.id === "c")!;
    expect(a.x).toBeLessThan(b.x);
    expect(b.x).toBeLessThan(c.x);
  });

  it("marks ghost nodes one degree beyond filter", () => {
    const persons = [
      makePerson({ id: "me", father: "dad" }),
      makePerson({ id: "dad", name: "Dad", father: "gf" }),
      makePerson({ id: "gf", name: "GF" }),
    ];
    const degrees = new Map([["me", 0], ["dad", 1], ["gf", 2]]);
    const nodes = computeLayout(persons, "me", degrees, 1);

    const gf = nodes.find((n) => n.id === "gf");
    expect(gf?.nodeType).toBe("ghost");
  });

  it("excludes persons beyond ghost boundary (degree > filter+1)", () => {
    const persons = [
      makePerson({ id: "me", father: "dad" }),
      makePerson({ id: "dad", name: "Dad", father: "gf" }),
      makePerson({ id: "gf", name: "GF", father: "ggf" }),
      makePerson({ id: "ggf", name: "GGF" }),
    ];
    const degrees = new Map([["me", 0], ["dad", 1], ["gf", 2], ["ggf", 3]]);
    const nodes = computeLayout(persons, "me", degrees, 1);

    expect(nodes.find((n) => n.id === "ggf")).toBeUndefined();
  });
});
