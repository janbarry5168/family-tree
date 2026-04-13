import { describe, it, expect } from "vitest";
import {
  getChildren,
  getSiblings,
  inferGender,
  getRelationshipLabel,
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
  makePerson({ id: "sis", name: "Sister", father: "dad", mother: "mom", birthOrder: 2 }),
  makePerson({ id: "son", name: "Son", father: "me", mother: "wife", birthOrder: 1 }),
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

  it("returns Child for childless person with unknown gender", () => {
    // "son" has no children and no spouse — gender cannot be inferred structurally
    const label = getRelationshipLabel("me", "son", family);
    expect(label.en).toBe("Child");
    expect(label.zhTW).toBe("孩子");
  });

  it("returns Sibling for sibling with unknown gender", () => {
    // "sis" has no children and no spouse — gender cannot be inferred structurally
    const label = getRelationshipLabel("me", "sis", family);
    expect(label.en).toBe("Sibling");
    expect(label.zhTW).toBe("兄弟姊妹");
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
});
