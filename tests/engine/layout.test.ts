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
  birthDate: "1990",
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

  it("sorts siblings by birthOrder within the left block (older further out)", () => {
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
    // Focused a stays at x=0. Siblings b and c are on my side (left).
    expect(a.x).toBe(0);
    expect(b.x).toBeLessThan(0);
    expect(c.x).toBeLessThan(0);
    // Older sibling (b, birthOrder 2) ends up further out than younger (c).
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

  describe("me-left / spouse-right split", () => {
    const find = (nodes: ReturnType<typeof computeLayout>, id: string) =>
      nodes.find((n) => n.id === id)!;

    it("anchors focused at x=0 with spouse adjacent on the right", () => {
      const persons = [
        makePerson({ id: "me", spouse: "wife" }),
        makePerson({ id: "wife", name: "Wife", spouse: "me" }),
      ];
      const degrees = new Map([["me", 0], ["wife", 0]]);
      const nodes = computeLayout(persons, "me", degrees, 2);
      expect(find(nodes, "me").x).toBe(0);
      expect(find(nodes, "wife").x).toBeGreaterThan(0);
    });

    it("places both of my parents on the left side when I have a spouse", () => {
      const persons = [
        makePerson({ id: "me", father: "dad", mother: "mom", spouse: "wife" }),
        makePerson({ id: "wife", name: "Wife", spouse: "me" }),
        makePerson({ id: "dad", name: "Dad", spouse: "mom" }),
        makePerson({ id: "mom", name: "Mom", spouse: "dad" }),
      ];
      const degrees = new Map([["me", 0], ["wife", 0], ["dad", 1], ["mom", 1]]);
      const nodes = computeLayout(persons, "me", degrees, 2);
      expect(find(nodes, "dad").x).toBeLessThan(0);
      expect(find(nodes, "mom").x).toBeLessThan(0);
    });

    it("falls back to paternal-left / maternal-right when focused has no spouse", () => {
      const persons = [
        makePerson({ id: "me", father: "dad", mother: "mom" }),
        makePerson({ id: "dad", name: "Dad", spouse: "mom" }),
        makePerson({ id: "mom", name: "Mom", spouse: "dad" }),
      ];
      const degrees = new Map([["me", 0], ["dad", 1], ["mom", 1]]);
      const nodes = computeLayout(persons, "me", degrees, 2);
      expect(find(nodes, "dad").x).toBeLessThan(0);
      expect(find(nodes, "mom").x).toBeGreaterThan(0);
    });

    it("places both of spouse's parents on the right side", () => {
      const persons = [
        makePerson({ id: "me", spouse: "wife" }),
        makePerson({ id: "wife", name: "Wife", father: "wf", mother: "wm", spouse: "me" }),
        makePerson({ id: "wf", name: "WF", spouse: "wm" }),
        makePerson({ id: "wm", name: "WM", spouse: "wf" }),
      ];
      const degrees = new Map([["me", 0], ["wife", 0], ["wf", 1], ["wm", 1]]);
      const nodes = computeLayout(persons, "me", degrees, 2);
      expect(find(nodes, "wf").x).toBeGreaterThan(0);
      expect(find(nodes, "wm").x).toBeGreaterThan(0);
    });

    it("places my sibling on the left side", () => {
      const persons = [
        makePerson({ id: "me", father: "dad", mother: "mom", birthOrder: 1 }),
        makePerson({ id: "sib", name: "Sib", father: "dad", mother: "mom", birthOrder: 2 }),
        makePerson({ id: "dad", name: "Dad", spouse: "mom" }),
        makePerson({ id: "mom", name: "Mom", spouse: "dad" }),
      ];
      const degrees = new Map([["me", 0], ["sib", 1], ["dad", 1], ["mom", 1]]);
      const nodes = computeLayout(persons, "me", degrees, 2);
      expect(find(nodes, "sib").x).toBeLessThan(0);
    });

    it("places all of my extended family on the left and spouse's on the right", () => {
      const persons = [
        makePerson({ id: "me", father: "dad", mother: "mom", spouse: "wife" }),
        makePerson({ id: "wife", name: "Wife", father: "wf", mother: "wm", spouse: "me" }),
        makePerson({ id: "dad", name: "Dad", father: "pgf", spouse: "mom", birthOrder: 1 }),
        makePerson({ id: "mom", name: "Mom", father: "mgf", spouse: "dad", birthOrder: 1 }),
        makePerson({ id: "puncle", name: "PUncle", father: "pgf", birthOrder: 2 }),
        makePerson({ id: "muncle", name: "MUncle", father: "mgf", birthOrder: 2 }),
        makePerson({ id: "pgf", name: "PGF" }),
        makePerson({ id: "mgf", name: "MGF" }),
        makePerson({ id: "wf", name: "WF", father: "wpgf", spouse: "wm", birthOrder: 1 }),
        makePerson({ id: "wm", name: "WM", spouse: "wf", birthOrder: 1 }),
        makePerson({ id: "wpgf", name: "WPGF" }),
        makePerson({ id: "wuncle", name: "WUncle", father: "wpgf", birthOrder: 2 }),
      ];
      const degrees = new Map([
        ["me", 0], ["wife", 0],
        ["dad", 1], ["mom", 1], ["wf", 1], ["wm", 1],
        ["puncle", 2], ["muncle", 2], ["pgf", 2], ["mgf", 2],
        ["wuncle", 2], ["wpgf", 2],
      ]);
      const nodes = computeLayout(persons, "me", degrees, 3);

      // My side (left)
      expect(find(nodes, "dad").x).toBeLessThan(0);
      expect(find(nodes, "mom").x).toBeLessThan(0);
      expect(find(nodes, "puncle").x).toBeLessThan(0);
      expect(find(nodes, "muncle").x).toBeLessThan(0);
      expect(find(nodes, "pgf").x).toBeLessThan(0);
      expect(find(nodes, "mgf").x).toBeLessThan(0);
      // Spouse side (right)
      expect(find(nodes, "wf").x).toBeGreaterThan(0);
      expect(find(nodes, "wm").x).toBeGreaterThan(0);
      expect(find(nodes, "wuncle").x).toBeGreaterThan(0);
      expect(find(nodes, "wpgf").x).toBeGreaterThan(0);
    });

    it("centers an only child directly below focused", () => {
      const persons = [
        makePerson({ id: "me" }),
        makePerson({ id: "kid", name: "Kid", father: "me", birthOrder: 1 }),
      ];
      const degrees = new Map([["me", 0], ["kid", 1]]);
      const nodes = computeLayout(persons, "me", degrees, 2);
      expect(find(nodes, "kid").x).toBe(0);
    });

    it("places direct parents nearer to focused than aunts/uncles within the left block", () => {
      const persons = [
        // Spouse present → my relatives (dad, mom, mom's sister, maternal grandparents) all left.
        makePerson({ id: "me", father: "dad", mother: "mom", spouse: "sp" }),
        makePerson({ id: "sp", name: "Sp", spouse: "me" }),
        makePerson({ id: "dad", name: "Dad", spouse: "mom" }),
        makePerson({ id: "mom", name: "Mom", father: "mgf", mother: "mgm", spouse: "dad", birthOrder: 1 }),
        makePerson({ id: "aunt", name: "Aunt", father: "mgf", mother: "mgm", birthOrder: 2 }),
        makePerson({ id: "mgf", name: "MGF", spouse: "mgm" }),
        makePerson({ id: "mgm", name: "MGM", spouse: "mgf" }),
      ];
      const degrees = new Map([
        ["me", 0], ["sp", 0], ["dad", 1], ["mom", 1], ["aunt", 2], ["mgf", 2], ["mgm", 2],
      ]);
      const nodes = computeLayout(persons, "me", degrees, 3);

      // mom (deg 1, direct parent) should sit closer to focused (larger x, nearer to 0)
      // than aunt (deg 2). Both are on the left side (negative x).
      expect(find(nodes, "mom").x).toBeLessThan(0);
      expect(find(nodes, "aunt").x).toBeLessThan(0);
      expect(find(nodes, "mom").x).toBeGreaterThan(find(nodes, "aunt").x);
    });

    it("pushes descendant-chain in-laws past spouse's real parents, not between my parents and focused", () => {
      // Focused's son's wife's grandparent is reachable only through a chain of
      // center descendants (son → daughter-in-law → her parent → her grandparent).
      // Previously that grandparent fell back to "center" at their generation and
      // squeezed between my parents and spouse's parents. Now it goes to the far
      // right, past the real in-laws.
      const persons = [
        makePerson({ id: "me", father: "dad", mother: "mom", spouse: "sp" }),
        makePerson({ id: "sp", name: "Sp", father: "spf", mother: "spm", spouse: "me" }),
        makePerson({ id: "dad", name: "Dad", spouse: "mom" }),
        makePerson({ id: "mom", name: "Mom", spouse: "dad" }),
        makePerson({ id: "spf", name: "Spf", spouse: "spm" }),
        makePerson({ id: "spm", name: "Spm", spouse: "spf" }),
        makePerson({ id: "son", name: "Son", father: "me", mother: "sp", spouse: "dil" }),
        makePerson({ id: "dil", name: "Dil", father: "dilf", mother: "dilm", spouse: "son" }),
        makePerson({ id: "dilf", name: "DilF", father: "dilgf", spouse: "dilm" }),
        makePerson({ id: "dilm", name: "DilM", spouse: "dilf" }),
        makePerson({ id: "dilgf", name: "DilGF" }),
      ];
      const degrees = new Map([
        ["me", 0], ["sp", 0],
        ["dad", 1], ["mom", 1], ["spf", 1], ["spm", 1],
        ["son", 1], ["dil", 1],
        ["dilf", 3], ["dilm", 3], ["dilgf", 4],
      ]);
      const nodes = computeLayout(persons, "me", degrees, 4);

      // At gen -1: dad/mom left, spf/spm right (both deg 1), dilgf distant in-law.
      // dilgf must be pushed past spf/spm — not sitting between my parents and
      // focused's x=0.
      expect(find(nodes, "dilgf").x).toBeGreaterThan(find(nodes, "spm").x);
      // And my parents remain on the left, closer to focused than their extreme
      // leftmost (i.e. still the rightmost of the left block).
      expect(find(nodes, "mom").x).toBeLessThan(0);
      expect(find(nodes, "dad").x).toBeLessThan(find(nodes, "mom").x);
    });

    it("places spouse's direct parents nearer to focused than spouse's aunts within the right block", () => {
      const persons = [
        makePerson({ id: "me", spouse: "wife" }),
        makePerson({ id: "wife", name: "Wife", father: "wf", mother: "wm", spouse: "me" }),
        makePerson({ id: "wf", name: "WF", spouse: "wm" }),
        makePerson({ id: "wm", name: "WM", father: "wmgf", mother: "wmgm", spouse: "wf", birthOrder: 1 }),
        makePerson({ id: "waunt", name: "WAunt", father: "wmgf", mother: "wmgm", birthOrder: 2 }),
        makePerson({ id: "wmgf", name: "WMGF", spouse: "wmgm" }),
        makePerson({ id: "wmgm", name: "WMGM", spouse: "wmgf" }),
      ];
      const degrees = new Map([
        ["me", 0], ["wife", 0], ["wf", 1], ["wm", 1],
        ["waunt", 2], ["wmgf", 2], ["wmgm", 2],
      ]);
      const nodes = computeLayout(persons, "me", degrees, 3);

      // wm (deg 1) should sit closer to focused (smaller x) than waunt (deg 2).
      expect(find(nodes, "wm").x).toBeGreaterThan(0);
      expect(find(nodes, "waunt").x).toBeGreaterThan(0);
      expect(find(nodes, "wm").x).toBeLessThan(find(nodes, "waunt").x);
    });
  });
});
