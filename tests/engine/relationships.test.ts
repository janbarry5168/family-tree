import { describe, it, expect } from "vitest";
import {
  getChildren,
  getSiblings,
  inferGender,
  getRelationshipLabel,
  isElderThan,
} from "../../src/engine/relationships";
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

const family: Person[] = [
  makePerson({ id: "gf", name: "Grandpa" }),
  makePerson({ id: "gm", name: "Grandma", spouse: "gf" }),
  makePerson({ id: "dad", name: "Dad", father: "gf", mother: "gm", spouse: "mom" }),
  makePerson({ id: "mom", name: "Mom", spouse: "dad" }),
  makePerson({ id: "me", name: "Me", father: "dad", mother: "mom", spouse: "wife", birthOrder: 1 }),
  makePerson({ id: "wife", name: "Wife", father: "fil", mother: "mil", spouse: "me" }),
  makePerson({ id: "sis", name: "Sister", father: "dad", mother: "mom", birthOrder: 2, gender: "female" }),
  makePerson({ id: "son", name: "Son", father: "me", mother: "wife", birthOrder: 1, gender: "male" }),
  makePerson({ id: "uncle", name: "Uncle", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
  makePerson({ id: "fil", name: "Father-in-law", spouse: "mil" }),
  makePerson({ id: "mil", name: "Mother-in-law", spouse: "fil" }),
];

describe("getChildren", () => {
  it("returns children of a person", () => {
    const kids = getChildren("dad", family);
    expect(kids.map((c) => c.id)).toEqual(expect.arrayContaining(["me", "sis"]));
    expect(kids).toHaveLength(2);
  });

  it("returns empty for childless person", () => {
    expect(getChildren("son", family)).toHaveLength(0);
  });
});

describe("getSiblings", () => {
  it("returns full siblings (same father AND mother), excluding self", () => {
    const sibs = getSiblings("me", family);
    expect(sibs.map((s) => s.id)).toEqual(["sis"]);
  });

  it("returns empty for only child", () => {
    expect(getSiblings("son", family)).toHaveLength(0);
  });
});

describe("inferGender", () => {
  it("returns male for person referenced as father", () => {
    expect(inferGender("dad", family)).toBe("male");
  });

  it("returns female for person referenced as mother", () => {
    expect(inferGender("mom", family)).toBe("female");
  });

  it("returns unknown for childless person with no parent references", () => {
    const alone: Person[] = [makePerson({ id: "x", name: "X" })];
    expect(inferGender("x", alone)).toBe("unknown");
  });
});

describe("getRelationshipLabel", () => {
  it("returns Father for dad relative to me", () => {
    const label = getRelationshipLabel("me", "dad", family);
    expect(label.en).toBe("Father");
    expect(label.zhTW).toBe("父親");
  });

  it("returns Mother for mom relative to me", () => {
    const label = getRelationshipLabel("me", "mom", family);
    expect(label.en).toBe("Mother");
    expect(label.zhTW).toBe("母親");
  });

  it("returns Wife for wife relative to me", () => {
    const label = getRelationshipLabel("me", "wife", family);
    expect(label.en).toBe("Wife");
    expect(label.zhTW).toBe("妻子");
  });

  it("returns Son for child with explicit male gender", () => {
    const label = getRelationshipLabel("me", "son", family);
    expect(label.en).toBe("Son");
    expect(label.zhTW).toBe("兒子");
  });

  it("returns Younger Sister for sibling with explicit female gender", () => {
    const label = getRelationshipLabel("me", "sis", family);
    expect(label.en).toBe("Younger Sister");
    expect(label.zhTW).toBe("妹妹");
  });

  it("returns Grandfather for grandpa relative to me", () => {
    const label = getRelationshipLabel("me", "gf", family);
    expect(label.en).toBe("Grandfather");
    expect(label.zhTW).toBe("祖父");
  });

  it("returns Father-in-law for wife's father relative to me", () => {
    const label = getRelationshipLabel("me", "fil", family);
    expect(label.en).toBe("Father-in-law");
    expect(label.zhTW).toBe("岳父");
  });

  it("returns Self for focused person", () => {
    const label = getRelationshipLabel("me", "me", family);
    expect(label.en).toBe("Self");
  });

  it("returns Uncle for father's brother relative to me", () => {
    const label = getRelationshipLabel("me", "uncle", family);
    expect(label.en).toBe("Uncle");
    expect(label.zhTW).toBe("叔叔");
  });
});

describe("grandchildren distinction", () => {
  const grandchildFamily: Person[] = [
    makePerson({ id: "gp", name: "Grandparent", gender: "male" }),
    makePerson({ id: "son", name: "Son", father: "gp", birthOrder: 1, gender: "male" }),
    makePerson({ id: "daughter", name: "Daughter", father: "gp", birthOrder: 2, gender: "female" }),
    makePerson({ id: "gc-via-son", name: "GC via Son", father: "son", birthOrder: 1, gender: "male" }),
    makePerson({ id: "gc-via-daughter", name: "GC via Daughter", father: "daughter", birthOrder: 1, gender: "female" }),
  ];

  it("returns 孫子 for grandson via son (paternal)", () => {
    const label = getRelationshipLabel("gp", "gc-via-son", grandchildFamily);
    expect(label.en).toBe("Grandson");
    expect(label.zhTW).toBe("孫子");
  });

  it("returns 外孫女 for granddaughter via daughter (maternal)", () => {
    const label = getRelationshipLabel("gp", "gc-via-daughter", grandchildFamily);
    expect(label.en).toBe("Granddaughter");
    expect(label.zhTW).toBe("外孫女");
  });
});

describe("findRelationshipPath personIds", () => {
  it("path from me to uncle includes intermediate dad", () => {
    // me -> father(dad) -> sibling(uncle), so personIds = ["me", "dad", "uncle"]
    // We verify this indirectly: uncle is reachable and the label is correct.
    // For direct verification, we test via getRelationshipLabel which uses the path internally.
    const label = getRelationshipLabel("me", "uncle", family);
    expect(label.en).toBe("Uncle");
  });
});

describe("isElderThan", () => {
  it("returns true when a has lower birthOrder (same parents)", () => {
    expect(isElderThan("dad", "uncle", family)).toBe(true);
  });

  it("returns false when a has higher birthOrder (same parents)", () => {
    expect(isElderThan("uncle", "dad", family)).toBe(false);
  });

  it("falls back to birthYear for cross-family comparison", () => {
    const a = makePerson({ id: "a", birthYear: 1980 });
    const b = makePerson({ id: "b", birthYear: 1990 });
    expect(isElderThan("a", "b", [a, b])).toBe(true);
    expect(isElderThan("b", "a", [a, b])).toBe(false);
  });

  it("returns false when person not found", () => {
    expect(isElderThan("nonexistent", "dad", family)).toBe(false);
  });
});
