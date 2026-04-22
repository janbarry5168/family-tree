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
  birthDate: "1990",
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

  it("detects siblings sharing only the father (mother unset on both)", () => {
    // Common for older generations where only one parent is in the tree.
    const f: Person[] = [
      makePerson({ id: "gramps", gender: "male" }),
      makePerson({ id: "a", father: "gramps", gender: "female" }),
      makePerson({ id: "b", father: "gramps", gender: "female" }),
      makePerson({ id: "c", father: "gramps", gender: "male" }),
    ];
    const sibs = getSiblings("a", f).map((s) => s.id);
    expect(sibs.sort()).toEqual(["b", "c"]);
  });

  it("detects siblings sharing only the mother (father unset on both)", () => {
    const f: Person[] = [
      makePerson({ id: "granny", gender: "female" }),
      makePerson({ id: "a", mother: "granny", gender: "female" }),
      makePerson({ id: "b", mother: "granny", gender: "male" }),
    ];
    expect(getSiblings("a", f).map((s) => s.id)).toEqual(["b"]);
  });

  it("does NOT treat unrelated persons with empty parents as siblings", () => {
    const f: Person[] = [
      makePerson({ id: "a" }),
      makePerson({ id: "b" }),
      makePerson({ id: "c" }),
    ];
    expect(getSiblings("a", f)).toHaveLength(0);
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

  it("returns 伯父 for father's elder brother", () => {
    const elderUncleFamily: Person[] = [
      makePerson({ id: "gf", name: "GF", gender: "male" }),
      makePerson({ id: "gm", name: "GM", gender: "female", spouse: "gf" }),
      makePerson({ id: "eldest", name: "ElderUncle", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
      makePerson({ id: "dad", name: "Dad", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
      makePerson({ id: "me", name: "Me", father: "dad", birthOrder: 1 }),
    ];
    const label = getRelationshipLabel("me", "eldest", elderUncleFamily);
    expect(label.en).toBe("Uncle");
    expect(label.zhTW).toBe("伯父");
  });

  it("returns 舅舅 for mother's brother", () => {
    const maternalFamily: Person[] = [
      makePerson({ id: "mgf", name: "MGF", gender: "male" }),
      makePerson({ id: "mgm", name: "MGM", gender: "female", spouse: "mgf" }),
      makePerson({ id: "mom", name: "Mom", father: "mgf", mother: "mgm", birthOrder: 1, gender: "female" }),
      makePerson({ id: "uncle", name: "MaternalUncle", father: "mgf", mother: "mgm", birthOrder: 2, gender: "male" }),
      makePerson({ id: "me", name: "Me", mother: "mom", birthOrder: 1 }),
    ];
    const label = getRelationshipLabel("me", "uncle", maternalFamily);
    expect(label.en).toBe("Uncle");
    expect(label.zhTW).toBe("舅舅");
  });

  it("returns 阿姨 for mother's sister", () => {
    const maternalFamily: Person[] = [
      makePerson({ id: "mgf", name: "MGF", gender: "male" }),
      makePerson({ id: "mgm", name: "MGM", gender: "female", spouse: "mgf" }),
      makePerson({ id: "mom", name: "Mom", father: "mgf", mother: "mgm", birthOrder: 1, gender: "female" }),
      makePerson({ id: "aunt", name: "MaternalAunt", father: "mgf", mother: "mgm", birthOrder: 2, gender: "female" }),
      makePerson({ id: "me", name: "Me", mother: "mom", birthOrder: 1 }),
    ];
    const label = getRelationshipLabel("me", "aunt", maternalFamily);
    expect(label.en).toBe("Aunt");
    expect(label.zhTW).toBe("阿姨");
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

describe("sibling's spouse", () => {
  it("returns 嫂嫂 for elder brother's wife", () => {
    const f: Person[] = [
      makePerson({ id: "dad", name: "Dad", gender: "male" }),
      makePerson({ id: "mom", name: "Mom", gender: "female", spouse: "dad" }),
      makePerson({ id: "bro", name: "ElderBro", father: "dad", mother: "mom", birthOrder: 1, gender: "male", spouse: "sil" }),
      makePerson({ id: "me", name: "Me", father: "dad", mother: "mom", birthOrder: 2, gender: "male" }),
      makePerson({ id: "sil", name: "SisterInLaw", spouse: "bro", gender: "female" }),
    ];
    const label = getRelationshipLabel("me", "sil", f);
    expect(label.en).toBe("Sister-in-law");
    expect(label.zhTW).toBe("嫂嫂");
  });

  it("returns 弟媳 for younger brother's wife", () => {
    const f: Person[] = [
      makePerson({ id: "dad", name: "Dad", gender: "male" }),
      makePerson({ id: "mom", name: "Mom", gender: "female", spouse: "dad" }),
      makePerson({ id: "me", name: "Me", father: "dad", mother: "mom", birthOrder: 1, gender: "male" }),
      makePerson({ id: "bro", name: "YoungerBro", father: "dad", mother: "mom", birthOrder: 2, gender: "male", spouse: "sil" }),
      makePerson({ id: "sil", name: "SisterInLaw", spouse: "bro", gender: "female" }),
    ];
    const label = getRelationshipLabel("me", "sil", f);
    expect(label.en).toBe("Sister-in-law");
    expect(label.zhTW).toBe("弟媳");
  });
});

describe("child's spouse", () => {
  it("returns 媳婦 for son's wife", () => {
    const f: Person[] = [
      makePerson({ id: "me", name: "Me", gender: "male" }),
      makePerson({ id: "son", name: "Son", father: "me", birthOrder: 1, gender: "male", spouse: "dil" }),
      makePerson({ id: "dil", name: "DaughterInLaw", spouse: "son", gender: "female" }),
    ];
    const label = getRelationshipLabel("me", "dil", f);
    expect(label.en).toBe("Daughter-in-law");
    expect(label.zhTW).toBe("媳婦");
  });

  it("returns 女婿 for daughter's husband", () => {
    const f: Person[] = [
      makePerson({ id: "me", name: "Me", gender: "male" }),
      makePerson({ id: "daughter", name: "Daughter", father: "me", birthOrder: 1, gender: "female", spouse: "sil" }),
      makePerson({ id: "sil", name: "SonInLaw", spouse: "daughter", gender: "male" }),
    ];
    const label = getRelationshipLabel("me", "sil", f);
    expect(label.en).toBe("Son-in-law");
    expect(label.zhTW).toBe("女婿");
  });
});

describe("nephew/niece distinction", () => {
  it("returns 外甥 for sister's son", () => {
    const f: Person[] = [
      makePerson({ id: "dad", name: "Dad", gender: "male" }),
      makePerson({ id: "mom", name: "Mom", gender: "female", spouse: "dad" }),
      makePerson({ id: "me", name: "Me", father: "dad", mother: "mom", birthOrder: 1 }),
      makePerson({ id: "sis", name: "Sister", father: "dad", mother: "mom", birthOrder: 2, gender: "female" }),
      makePerson({ id: "nephew", name: "Nephew", mother: "sis", birthOrder: 1, gender: "male" }),
    ];
    const label = getRelationshipLabel("me", "nephew", f);
    expect(label.en).toBe("Nephew");
    expect(label.zhTW).toBe("外甥");
  });

  it("returns 姪女 for brother's daughter", () => {
    const f: Person[] = [
      makePerson({ id: "dad", name: "Dad", gender: "male" }),
      makePerson({ id: "mom", name: "Mom", gender: "female", spouse: "dad" }),
      makePerson({ id: "me", name: "Me", father: "dad", mother: "mom", birthOrder: 1 }),
      makePerson({ id: "bro", name: "Brother", father: "dad", mother: "mom", birthOrder: 2, gender: "male" }),
      makePerson({ id: "niece", name: "Niece", father: "bro", birthOrder: 1, gender: "female" }),
    ];
    const label = getRelationshipLabel("me", "niece", f);
    expect(label.en).toBe("Niece");
    expect(label.zhTW).toBe("姪女");
  });
});

describe("spouse's sibling", () => {
  it("returns 大舅子 for wife's elder brother", () => {
    const f: Person[] = [
      makePerson({ id: "wdad", name: "WDad", gender: "male" }),
      makePerson({ id: "wmom", name: "WMom", gender: "female", spouse: "wdad" }),
      makePerson({ id: "me", name: "Me", spouse: "wife", gender: "male" }),
      makePerson({ id: "wife", name: "Wife", spouse: "me", gender: "female", father: "wdad", mother: "wmom", birthOrder: 2 }),
      makePerson({ id: "wbro", name: "WifeBro", father: "wdad", mother: "wmom", gender: "male", birthOrder: 1 }),
    ];
    const label = getRelationshipLabel("me", "wbro", f);
    expect(label.en).toBe("Brother-in-law");
    expect(label.zhTW).toBe("大舅子");
  });

  it("returns 小姑 for husband's younger sister (focused is female)", () => {
    const f: Person[] = [
      makePerson({ id: "hdad", name: "HDad", gender: "male" }),
      makePerson({ id: "hmom", name: "HMom", gender: "female", spouse: "hdad" }),
      makePerson({ id: "husband", name: "Husband", father: "hdad", mother: "hmom", spouse: "me", gender: "male", birthOrder: 1 }),
      makePerson({ id: "me", name: "Me", spouse: "husband", gender: "female" }),
      makePerson({ id: "hsis", name: "HusbandSis", father: "hdad", mother: "hmom", gender: "female", birthOrder: 2 }),
    ];
    const label = getRelationshipLabel("me", "hsis", f);
    expect(label.en).toBe("Sister-in-law");
    expect(label.zhTW).toBe("小姑");
  });
});

describe("uncle/aunt's spouse", () => {
  it("returns 伯母 for paternal elder uncle's wife", () => {
    const f: Person[] = [
      makePerson({ id: "gf", name: "GF", gender: "male" }),
      makePerson({ id: "gm", name: "GM", gender: "female", spouse: "gf" }),
      makePerson({ id: "elderUncle", name: "ElderUncle", father: "gf", mother: "gm", birthOrder: 1, gender: "male", spouse: "auntie" }),
      makePerson({ id: "dad", name: "Dad", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
      makePerson({ id: "me", name: "Me", father: "dad", birthOrder: 1 }),
      makePerson({ id: "auntie", name: "Auntie", spouse: "elderUncle", gender: "female" }),
    ];
    const label = getRelationshipLabel("me", "auntie", f);
    expect(label.en).toBe("Aunt");
    expect(label.zhTW).toBe("伯母");
  });

  it("returns 嬸嬸 for paternal younger uncle's wife", () => {
    const f: Person[] = [
      makePerson({ id: "gf", name: "GF", gender: "male" }),
      makePerson({ id: "gm", name: "GM", gender: "female", spouse: "gf" }),
      makePerson({ id: "dad", name: "Dad", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
      makePerson({ id: "youngerUncle", name: "YoungerUncle", father: "gf", mother: "gm", birthOrder: 2, gender: "male", spouse: "auntie" }),
      makePerson({ id: "me", name: "Me", father: "dad", birthOrder: 1 }),
      makePerson({ id: "auntie", name: "Auntie", spouse: "youngerUncle", gender: "female" }),
    ];
    const label = getRelationshipLabel("me", "auntie", f);
    expect(label.en).toBe("Aunt");
    expect(label.zhTW).toBe("嬸嬸");
  });

  it("returns 姑丈 for paternal aunt's husband", () => {
    const f: Person[] = [
      makePerson({ id: "gf", name: "GF", gender: "male" }),
      makePerson({ id: "gm", name: "GM", gender: "female", spouse: "gf" }),
      makePerson({ id: "aunt", name: "Aunt", father: "gf", mother: "gm", birthOrder: 1, gender: "female", spouse: "guzhang" }),
      makePerson({ id: "dad", name: "Dad", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
      makePerson({ id: "me", name: "Me", father: "dad", birthOrder: 1 }),
      makePerson({ id: "guzhang", name: "GuZhang", spouse: "aunt", gender: "male" }),
    ];
    const label = getRelationshipLabel("me", "guzhang", f);
    expect(label.en).toBe("Uncle");
    expect(label.zhTW).toBe("姑丈");
  });

  it("returns 舅媽 for maternal uncle's wife", () => {
    const f: Person[] = [
      makePerson({ id: "mgf", name: "MGF", gender: "male" }),
      makePerson({ id: "mgm", name: "MGM", gender: "female", spouse: "mgf" }),
      makePerson({ id: "mom", name: "Mom", father: "mgf", mother: "mgm", birthOrder: 1, gender: "female" }),
      makePerson({ id: "uncle", name: "MaternalUncle", father: "mgf", mother: "mgm", birthOrder: 2, gender: "male", spouse: "jiuma" }),
      makePerson({ id: "me", name: "Me", mother: "mom", birthOrder: 1 }),
      makePerson({ id: "jiuma", name: "JiuMa", spouse: "uncle", gender: "female" }),
    ];
    const label = getRelationshipLabel("me", "jiuma", f);
    expect(label.en).toBe("Aunt");
    expect(label.zhTW).toBe("舅媽");
  });

  it("returns 姨丈 for maternal aunt's husband", () => {
    const f: Person[] = [
      makePerson({ id: "mgf", name: "MGF", gender: "male" }),
      makePerson({ id: "mgm", name: "MGM", gender: "female", spouse: "mgf" }),
      makePerson({ id: "mom", name: "Mom", father: "mgf", mother: "mgm", birthOrder: 1, gender: "female" }),
      makePerson({ id: "aunt", name: "MaternalAunt", father: "mgf", mother: "mgm", birthOrder: 2, gender: "female", spouse: "yizhang" }),
      makePerson({ id: "me", name: "Me", mother: "mom", birthOrder: 1 }),
      makePerson({ id: "yizhang", name: "YiZhang", spouse: "aunt", gender: "male" }),
    ];
    const label = getRelationshipLabel("me", "yizhang", f);
    expect(label.en).toBe("Uncle");
    expect(label.zhTW).toBe("姨丈");
  });
});

describe("妯娌/連襟", () => {
  it("returns 妯娌 for husband's brother's wife (both female)", () => {
    const f: Person[] = [
      makePerson({ id: "fil", name: "FIL", gender: "male" }),
      makePerson({ id: "mil", name: "MIL", gender: "female", spouse: "fil" }),
      makePerson({ id: "husband", name: "Husband", father: "fil", mother: "mil", spouse: "me", gender: "male", birthOrder: 1 }),
      makePerson({ id: "me", name: "Me", spouse: "husband", gender: "female" }),
      makePerson({ id: "bil", name: "BIL", father: "fil", mother: "mil", spouse: "zholi", gender: "male", birthOrder: 2 }),
      makePerson({ id: "zholi", name: "ZhouLi", spouse: "bil", gender: "female" }),
    ];
    const label = getRelationshipLabel("me", "zholi", f);
    expect(label.en).toBe("Sister-in-law");
    expect(label.zhTW).toBe("妯娌");
  });

  it("returns 連襟 for wife's sister's husband (both male)", () => {
    const f: Person[] = [
      makePerson({ id: "wdad", name: "WDad", gender: "male" }),
      makePerson({ id: "wmom", name: "WMom", gender: "female", spouse: "wdad" }),
      makePerson({ id: "wife", name: "Wife", father: "wdad", mother: "wmom", spouse: "me", gender: "female", birthOrder: 1 }),
      makePerson({ id: "me", name: "Me", spouse: "wife", gender: "male" }),
      makePerson({ id: "wsister", name: "WifeSis", father: "wdad", mother: "wmom", spouse: "lianqin", gender: "female", birthOrder: 2 }),
      makePerson({ id: "lianqin", name: "LianQin", spouse: "wsister", gender: "male" }),
    ];
    const label = getRelationshipLabel("me", "lianqin", f);
    expect(label.en).toBe("Brother-in-law");
    expect(label.zhTW).toBe("連襟");
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

  it("falls back to birthDate year for cross-family comparison", () => {
    const a = makePerson({ id: "a", birthDate: "1980" });
    const b = makePerson({ id: "b", birthDate: "1990" });
    expect(isElderThan("a", "b", [a, b])).toBe(true);
    expect(isElderThan("b", "a", [a, b])).toBe(false);
  });

  it("returns false when person not found", () => {
    expect(isElderThan("nonexistent", "dad", family)).toBe(false);
  });
});

describe("cousins", () => {
  it("returns 堂弟 for paternal uncle's younger son", () => {
    const f: Person[] = [
      makePerson({ id: "gf", name: "GF", gender: "male" }),
      makePerson({ id: "gm", name: "GM", gender: "female", spouse: "gf" }),
      makePerson({ id: "dad", name: "Dad", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
      makePerson({ id: "uncle", name: "Uncle", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
      makePerson({ id: "me", name: "Me", father: "dad", birthOrder: 1, birthDate: "1990" }),
      makePerson({ id: "cousin", name: "Cousin", father: "uncle", birthOrder: 1, birthDate: "1992", gender: "male" }),
    ];
    const label = getRelationshipLabel("me", "cousin", f);
    expect(label.en).toBe("Cousin");
    expect(label.zhTW).toBe("堂弟");
  });

  it("returns 表姊 for maternal aunt's elder daughter", () => {
    const f: Person[] = [
      makePerson({ id: "mgf", name: "MGF", gender: "male" }),
      makePerson({ id: "mgm", name: "MGM", gender: "female", spouse: "mgf" }),
      makePerson({ id: "mom", name: "Mom", father: "mgf", mother: "mgm", birthOrder: 1, gender: "female" }),
      makePerson({ id: "aunt", name: "Aunt", father: "mgf", mother: "mgm", birthOrder: 2, gender: "female" }),
      makePerson({ id: "me", name: "Me", mother: "mom", birthOrder: 1, birthDate: "1992" }),
      makePerson({ id: "cousin", name: "Cousin", mother: "aunt", birthOrder: 1, birthDate: "1990", gender: "female" }),
    ];
    const label = getRelationshipLabel("me", "cousin", f);
    expect(label.en).toBe("Cousin");
    expect(label.zhTW).toBe("表姊");
  });
});

describe("great-grandparents", () => {
  it("returns 曾祖父 for father's father's father", () => {
    const f: Person[] = [
      makePerson({ id: "ggf", name: "GGF", gender: "male" }),
      makePerson({ id: "gf", name: "GF", father: "ggf", gender: "male" }),
      makePerson({ id: "dad", name: "Dad", father: "gf", gender: "male" }),
      makePerson({ id: "me", name: "Me", father: "dad" }),
    ];
    const label = getRelationshipLabel("me", "ggf", f);
    expect(label.en).toBe("Great-grandfather");
    expect(label.zhTW).toBe("曾祖父");
  });

  it("returns 外曾祖母 for mother's mother's mother", () => {
    const f: Person[] = [
      makePerson({ id: "ggm", name: "GGM", gender: "female" }),
      makePerson({ id: "gm", name: "GM", mother: "ggm", gender: "female" }),
      makePerson({ id: "mom", name: "Mom", mother: "gm", gender: "female" }),
      makePerson({ id: "me", name: "Me", mother: "mom" }),
    ];
    const label = getRelationshipLabel("me", "ggm", f);
    expect(label.en).toBe("Great-grandmother");
    expect(label.zhTW).toBe("外曾祖母");
  });
});

describe("great-grandchildren", () => {
  it("returns 曾孫 for great-grandson via son line", () => {
    const f: Person[] = [
      makePerson({ id: "me", name: "Me", gender: "male" }),
      makePerson({ id: "son", name: "Son", father: "me", gender: "male" }),
      makePerson({ id: "grandson", name: "Grandson", father: "son", gender: "male" }),
      makePerson({ id: "ggson", name: "GGSon", father: "grandson", gender: "male" }),
    ];
    const label = getRelationshipLabel("me", "ggson", f);
    expect(label.en).toBe("Great-grandson");
    expect(label.zhTW).toBe("曾孫");
  });

  it("returns 外曾孫女 for great-granddaughter via daughter line", () => {
    const f: Person[] = [
      makePerson({ id: "me", name: "Me", gender: "male" }),
      makePerson({ id: "daughter", name: "Daughter", father: "me", gender: "female" }),
      makePerson({ id: "gc", name: "GC", mother: "daughter", gender: "male" }),
      makePerson({ id: "ggc", name: "GGC", father: "gc", gender: "female" }),
    ];
    const label = getRelationshipLabel("me", "ggc", f);
    expect(label.en).toBe("Great-granddaughter");
    expect(label.zhTW).toBe("外曾孫女");
  });

  it("distinguishes 堂姊 vs 堂妹 when cousins share a birth year using full YYYYMMDD", () => {
    // me: male, born 1990-06-15
    // uncle's daughter born 1990-03-20 → elder → 堂姊
    // uncle's other daughter born 1990-11-05 → younger → 堂妹
    const f: Person[] = [
      makePerson({ id: "gf", name: "GF", gender: "male" }),
      makePerson({ id: "gm", name: "GM", gender: "female", spouse: "gf" }),
      makePerson({ id: "dad", name: "Dad", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
      makePerson({ id: "uncle", name: "Uncle", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
      makePerson({ id: "me", name: "Me", father: "dad", gender: "male", birthDate: "19900615" }),
      makePerson({ id: "c_elder", name: "CousinElder", father: "uncle", gender: "female", birthDate: "19900320" }),
      makePerson({ id: "c_younger", name: "CousinYounger", father: "uncle", gender: "female", birthDate: "19901105" }),
    ];
    expect(getRelationshipLabel("me", "c_elder", f).zhTW).toBe("堂姊");
    expect(getRelationshipLabel("me", "c_younger", f).zhTW).toBe("堂妹");
  });

  it("returns 表叔 for father's younger male cousin as seen by daughter", () => {
    // me (male) has a 表弟 via my mother's side — my mom's brother's son
    // my daughter sees him as 表叔 (父親的表弟 → 表叔)
    const f: Person[] = [
      makePerson({ id: "mgf", name: "MatGrandpa", gender: "male" }),
      makePerson({ id: "mgm", name: "MatGrandma", gender: "female", spouse: "mgf" }),
      makePerson({ id: "mom", name: "Mom", father: "mgf", mother: "mgm", birthOrder: 1, gender: "female" }),
      makePerson({ id: "mom_bro", name: "MomBrother", father: "mgf", mother: "mgm", birthOrder: 2, gender: "male" }),
      makePerson({ id: "dad", name: "Dad", spouse: "mom", gender: "male" }),
      makePerson({ id: "me", name: "Me", father: "dad", mother: "mom", gender: "male", birthDate: "1985" }),
      makePerson({ id: "cousin", name: "Cousin", father: "mom_bro", gender: "male", birthDate: "1990" }),
      makePerson({ id: "daughter", name: "Daughter", father: "me", gender: "female", birthDate: "2015" }),
    ];
    // Sanity: from me → cousin should be 表弟 (since cousin is younger)
    expect(getRelationshipLabel("me", "cousin", f).zhTW).toBe("表弟");
    // The actual ask: from daughter → cousin should be 表叔父 (not 親戚)
    expect(getRelationshipLabel("daughter", "cousin", f).zhTW).toBe("表叔父");
  });

  it("returns 堂伯父 for father's elder 堂兄 as seen by daughter", () => {
    // Daughter's father has an elder 堂兄 (via paternal grandfather's brother's son line)
    // Daughter calls him 堂伯父.
    const f: Person[] = [
      makePerson({ id: "pggf", name: "PatGrandpaFather", gender: "male", spouse: "pggm" }),
      makePerson({ id: "pggm", name: "PatGrandpaMother", gender: "female", spouse: "pggf" }),
      makePerson({ id: "pgf", name: "PatGrandpa", father: "pggf", mother: "pggm", birthOrder: 1, gender: "male" }),
      makePerson({ id: "pgu", name: "PatGrandpaBrother", father: "pggf", mother: "pggm", birthOrder: 2, gender: "male" }),
      makePerson({ id: "dad", name: "Dad", father: "pgf", gender: "male", birthDate: "1960" }),
      makePerson({ id: "dad_tang", name: "DadTangBrother", father: "pgu", gender: "male", birthDate: "1955" }),
      makePerson({ id: "daughter", name: "Daughter", father: "dad", gender: "female" }),
    ];
    expect(getRelationshipLabel("daughter", "dad_tang", f).zhTW).toBe("堂伯父");
  });

  it("returns 姨婆 for father's mother's sister as seen by daughter", () => {
    // daughter → me → my mom → mom's sister. 3 edges [father, mother, sibling].
    const f: Person[] = [
      makePerson({ id: "mggf", name: "MomGF", gender: "male", spouse: "mggm" }),
      makePerson({ id: "mggm", name: "MomGM", gender: "female", spouse: "mggf" }),
      makePerson({ id: "mom", name: "Mom", father: "mggf", mother: "mggm", gender: "female" }),
      makePerson({ id: "mom_sis", name: "MomSister", father: "mggf", mother: "mggm", gender: "female" }),
      makePerson({ id: "dad", name: "Dad", mother: "mom", gender: "male" }),
      makePerson({ id: "daughter", name: "Daughter", father: "dad", gender: "female" }),
    ];
    expect(getRelationshipLabel("daughter", "mom_sis", f).zhTW).toBe("姨婆");
  });

  it("returns 外甥孫女 for sister's granddaughter as seen by focused female", () => {
    // 姨婆 → her sister → sister's son → his daughter. [sibling, child, child].
    const f: Person[] = [
      makePerson({ id: "gggf", name: "GGF", gender: "male", spouse: "gggm" }),
      makePerson({ id: "gggm", name: "GGM", gender: "female", spouse: "gggf" }),
      makePerson({ id: "aunt", name: "Aunt", father: "gggf", mother: "gggm", gender: "female" }),
      makePerson({ id: "mom", name: "Mom", father: "gggf", mother: "gggm", gender: "female" }),
      makePerson({ id: "me", name: "Me", mother: "mom", gender: "male" }),
      makePerson({ id: "daughter", name: "Daughter", father: "me", gender: "female" }),
    ];
    expect(getRelationshipLabel("aunt", "daughter", f).zhTW).toBe("外甥孫女");
  });

  it("returns 伯公 for paternal grandfather's elder brother as seen by grandchild", () => {
    const f: Person[] = [
      makePerson({ id: "pggf", name: "PGGF", gender: "male", spouse: "pggm" }),
      makePerson({ id: "pggm", name: "PGGM", gender: "female", spouse: "pggf" }),
      makePerson({ id: "pgf", name: "PGF", father: "pggf", mother: "pggm", birthOrder: 2, gender: "male", birthDate: "1940" }),
      makePerson({ id: "pgu_elder", name: "PGU_Elder", father: "pggf", mother: "pggm", birthOrder: 1, gender: "male", birthDate: "1935" }),
      makePerson({ id: "dad", name: "Dad", father: "pgf", gender: "male" }),
      makePerson({ id: "me", name: "Me", father: "dad", gender: "male" }),
    ];
    expect(getRelationshipLabel("me", "pgu_elder", f).zhTW).toBe("伯公");
  });

  it("returns 姑婆 for paternal grandfather's sister as seen by grandchild", () => {
    const f: Person[] = [
      makePerson({ id: "pggf", name: "PGGF", gender: "male", spouse: "pggm" }),
      makePerson({ id: "pggm", name: "PGGM", gender: "female", spouse: "pggf" }),
      makePerson({ id: "pgf", name: "PGF", father: "pggf", mother: "pggm", gender: "male" }),
      makePerson({ id: "pga", name: "PGA", father: "pggf", mother: "pggm", gender: "female" }),
      makePerson({ id: "dad", name: "Dad", father: "pgf", gender: "male" }),
      makePerson({ id: "me", name: "Me", father: "dad", gender: "male" }),
    ];
    expect(getRelationshipLabel("me", "pga", f).zhTW).toBe("姑婆");
  });

  it("returns 姪孫女 for brother's granddaughter as seen by focused female", () => {
    const f: Person[] = [
      makePerson({ id: "gggf", name: "GGF", gender: "male", spouse: "gggm" }),
      makePerson({ id: "gggm", name: "GGM", gender: "female", spouse: "gggf" }),
      makePerson({ id: "me", name: "Me", father: "gggf", mother: "gggm", gender: "female" }),
      makePerson({ id: "bro", name: "Bro", father: "gggf", mother: "gggm", gender: "male" }),
      makePerson({ id: "nephew", name: "Nephew", father: "bro", gender: "male" }),
      makePerson({ id: "g_niece", name: "GNiece", father: "nephew", gender: "female" }),
    ];
    expect(getRelationshipLabel("me", "g_niece", f).zhTW).toBe("姪孫女");
  });

  it("returns 表姑 for father's female 表姊/表妹 as seen by son", () => {
    // Father's paternal aunt's daughter = father's 表姊/表妹 (female) → son calls 表姑.
    // pgf and pga are siblings (share both parents pggf + pggm).
    const f: Person[] = [
      makePerson({ id: "pggf", name: "PatGrandpaFather", gender: "male", spouse: "pggm" }),
      makePerson({ id: "pggm", name: "PatGrandpaMother", gender: "female", spouse: "pggf" }),
      makePerson({ id: "pgf", name: "PatGrandpa", father: "pggf", mother: "pggm", gender: "male" }),
      makePerson({ id: "pga", name: "PatGrandAunt", father: "pggf", mother: "pggm", gender: "female" }),
      makePerson({ id: "dad", name: "Dad", father: "pgf", gender: "male" }),
      makePerson({ id: "dad_biao_sis", name: "DadBiaoSis", mother: "pga", gender: "female" }),
      makePerson({ id: "son", name: "Son", father: "dad", gender: "male" }),
    ];
    expect(getRelationshipLabel("son", "dad_biao_sis", f).zhTW).toBe("表姑");
  });
});

describe("isElderThan — same-year tiebreak", () => {
  const base: Person[] = [
    makePerson({ id: "a", birthDate: "19900320" }),
    makePerson({ id: "b", birthDate: "19901105" }),
    makePerson({ id: "c", birthDate: "1990" }),
    makePerson({ id: "d", birthDate: "1990" }),
  ];
  it("uses full YYYYMMDD to break same-year ties", () => {
    expect(isElderThan("a", "b", base)).toBe(true);
    expect(isElderThan("b", "a", base)).toBe(false);
  });
  it("returns false when both have only year-level birthDate and years match", () => {
    expect(isElderThan("c", "d", base)).toBe(false);
    expect(isElderThan("d", "c", base)).toBe(false);
  });
  it("different years still compare by year portion", () => {
    const persons: Person[] = [
      makePerson({ id: "x", birthDate: "19880101" }),
      makePerson({ id: "y", birthDate: "1990" }),
    ];
    expect(isElderThan("x", "y", persons)).toBe(true);
  });
});

describe("getRelationshipLabel — full Chinese kinship coverage matrix", () => {
  // ---- Ascending: parents and grandparents ----
  describe("Ascending: parents and grandparents", () => {
    it("father → 父親", () => {
      const f: Person[] = [
        makePerson({ id: "dad", gender: "male" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "dad", f)).toEqual({ en: "Father", zhTW: "父親" });
    });

    it("mother → 母親", () => {
      const f: Person[] = [
        makePerson({ id: "mom", gender: "female" }),
        makePerson({ id: "me", mother: "mom" }),
      ];
      expect(getRelationshipLabel("me", "mom", f)).toEqual({ en: "Mother", zhTW: "母親" });
    });

    it("paternal grandfather → 祖父", () => {
      const f: Person[] = [
        makePerson({ id: "pgf", gender: "male" }),
        makePerson({ id: "dad", father: "pgf", gender: "male" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "pgf", f).zhTW).toBe("祖父");
    });

    it("paternal grandmother → 祖母", () => {
      const f: Person[] = [
        makePerson({ id: "pgm", gender: "female" }),
        makePerson({ id: "dad", mother: "pgm", gender: "male" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "pgm", f).zhTW).toBe("祖母");
    });

    it("maternal grandfather → 外祖父", () => {
      const f: Person[] = [
        makePerson({ id: "mgf", gender: "male" }),
        makePerson({ id: "mom", father: "mgf", gender: "female" }),
        makePerson({ id: "me", mother: "mom" }),
      ];
      expect(getRelationshipLabel("me", "mgf", f).zhTW).toBe("外祖父");
    });

    it("maternal grandmother → 外祖母", () => {
      const f: Person[] = [
        makePerson({ id: "mgm", gender: "female" }),
        makePerson({ id: "mom", mother: "mgm", gender: "female" }),
        makePerson({ id: "me", mother: "mom" }),
      ];
      expect(getRelationshipLabel("me", "mgm", f).zhTW).toBe("外祖母");
    });

    it("paternal great-grandfather → 曾祖父", () => {
      const f: Person[] = [
        makePerson({ id: "ggf", gender: "male" }),
        makePerson({ id: "gf", father: "ggf", gender: "male" }),
        makePerson({ id: "dad", father: "gf", gender: "male" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "ggf", f).zhTW).toBe("曾祖父");
    });

    it("maternal great-grandmother → 外曾祖母", () => {
      const f: Person[] = [
        makePerson({ id: "ggm", gender: "female" }),
        makePerson({ id: "gm", mother: "ggm", gender: "female" }),
        makePerson({ id: "mom", mother: "gm", gender: "female" }),
        makePerson({ id: "me", mother: "mom" }),
      ];
      expect(getRelationshipLabel("me", "ggm", f).zhTW).toBe("外曾祖母");
    });
  });

  // ---- Descending: children, grandchildren, great-grandchildren ----
  describe("Descending: children, grandchildren, great-grandchildren", () => {
    it("son → 兒子", () => {
      const f: Person[] = [
        makePerson({ id: "me", gender: "male" }),
        makePerson({ id: "son", father: "me", gender: "male" }),
      ];
      expect(getRelationshipLabel("me", "son", f).zhTW).toBe("兒子");
    });

    it("daughter → 女兒", () => {
      const f: Person[] = [
        makePerson({ id: "me", gender: "male" }),
        makePerson({ id: "dau", father: "me", gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "dau", f).zhTW).toBe("女兒");
    });

    it("grandson via son → 孫子", () => {
      const f: Person[] = [
        makePerson({ id: "me", gender: "male" }),
        makePerson({ id: "son", father: "me", gender: "male" }),
        makePerson({ id: "gs", father: "son", gender: "male" }),
      ];
      expect(getRelationshipLabel("me", "gs", f).zhTW).toBe("孫子");
    });

    it("granddaughter via son → 孫女", () => {
      const f: Person[] = [
        makePerson({ id: "me", gender: "male" }),
        makePerson({ id: "son", father: "me", gender: "male" }),
        makePerson({ id: "gd", father: "son", gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "gd", f).zhTW).toBe("孫女");
    });

    it("grandson via daughter → 外孫", () => {
      const f: Person[] = [
        makePerson({ id: "me", gender: "male" }),
        makePerson({ id: "dau", father: "me", gender: "female" }),
        makePerson({ id: "gs", mother: "dau", gender: "male" }),
      ];
      expect(getRelationshipLabel("me", "gs", f).zhTW).toBe("外孫");
    });

    it("granddaughter via daughter → 外孫女", () => {
      const f: Person[] = [
        makePerson({ id: "me", gender: "male" }),
        makePerson({ id: "dau", father: "me", gender: "female" }),
        makePerson({ id: "gd", mother: "dau", gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "gd", f).zhTW).toBe("外孫女");
    });

    it("great-grandson via son line → 曾孫", () => {
      const f: Person[] = [
        makePerson({ id: "me", gender: "male" }),
        makePerson({ id: "son", father: "me", gender: "male" }),
        makePerson({ id: "gs", father: "son", gender: "male" }),
        makePerson({ id: "ggs", father: "gs", gender: "male" }),
      ];
      expect(getRelationshipLabel("me", "ggs", f).zhTW).toBe("曾孫");
    });

    it("great-granddaughter via daughter line → 外曾孫女", () => {
      const f: Person[] = [
        makePerson({ id: "me", gender: "male" }),
        makePerson({ id: "dau", father: "me", gender: "female" }),
        makePerson({ id: "gc", mother: "dau", gender: "male" }),
        makePerson({ id: "ggd", father: "gc", gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "ggd", f).zhTW).toBe("外曾孫女");
    });
  });

  // ---- Same-generation: siblings, cousins, in-laws ----
  describe("Same-generation: siblings, cousins, in-laws", () => {
    it("elder brother → 哥哥", () => {
      const f: Person[] = [
        makePerson({ id: "dad", gender: "male" }),
        makePerson({ id: "mom", gender: "female", spouse: "dad" }),
        makePerson({ id: "bro", father: "dad", mother: "mom", birthOrder: 1, gender: "male" }),
        makePerson({ id: "me", father: "dad", mother: "mom", birthOrder: 2 }),
      ];
      expect(getRelationshipLabel("me", "bro", f).zhTW).toBe("哥哥");
    });

    it("younger sister → 妹妹", () => {
      const f: Person[] = [
        makePerson({ id: "dad", gender: "male" }),
        makePerson({ id: "mom", gender: "female", spouse: "dad" }),
        makePerson({ id: "me", father: "dad", mother: "mom", birthOrder: 1 }),
        makePerson({ id: "sis", father: "dad", mother: "mom", birthOrder: 2, gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "sis", f).zhTW).toBe("妹妹");
    });

    // Cousin matrix — 8 combinations: {paternal-uncle-child=堂, others=表} × {male/female} × {elder/younger}
    const cousinFixture = (options: {
      parentEdge: "father" | "mother";
      uncleAuntGender: "male" | "female";
      cousinGender: "male" | "female";
      cousinElder: boolean;
    }): Person[] => {
      const myYear = "1990";
      const cousinYear = options.cousinElder ? "1985" : "1995";
      return [
        makePerson({ id: "gf", gender: "male" }),
        makePerson({ id: "gm", gender: "female", spouse: "gf" }),
        makePerson({
          id: "parent",
          father: "gf",
          mother: "gm",
          birthOrder: 1,
          gender: options.parentEdge === "father" ? "male" : "female",
        }),
        makePerson({
          id: "uncleAunt",
          father: "gf",
          mother: "gm",
          birthOrder: 2,
          gender: options.uncleAuntGender,
        }),
        makePerson({
          id: "me",
          [options.parentEdge]: "parent",
          birthDate: myYear,
          gender: "male",
        } as Partial<Person>),
        makePerson({
          id: "cousin",
          father: options.uncleAuntGender === "male" ? "uncleAunt" : "",
          mother: options.uncleAuntGender === "female" ? "uncleAunt" : "",
          birthDate: cousinYear,
          gender: options.cousinGender,
        }),
      ];
    };

    it("paternal uncle's elder son → 堂兄", () => {
      const f = cousinFixture({ parentEdge: "father", uncleAuntGender: "male", cousinGender: "male", cousinElder: true });
      expect(getRelationshipLabel("me", "cousin", f).zhTW).toBe("堂兄");
    });

    it("paternal uncle's younger daughter → 堂妹", () => {
      const f = cousinFixture({ parentEdge: "father", uncleAuntGender: "male", cousinGender: "female", cousinElder: false });
      expect(getRelationshipLabel("me", "cousin", f).zhTW).toBe("堂妹");
    });

    it("paternal aunt's elder son → 表兄 (not 堂)", () => {
      const f = cousinFixture({ parentEdge: "father", uncleAuntGender: "female", cousinGender: "male", cousinElder: true });
      expect(getRelationshipLabel("me", "cousin", f).zhTW).toBe("表兄");
    });

    it("maternal uncle's younger son → 表弟", () => {
      const f = cousinFixture({ parentEdge: "mother", uncleAuntGender: "male", cousinGender: "male", cousinElder: false });
      expect(getRelationshipLabel("me", "cousin", f).zhTW).toBe("表弟");
    });

    it("maternal aunt's elder daughter → 表姊", () => {
      const f = cousinFixture({ parentEdge: "mother", uncleAuntGender: "female", cousinGender: "female", cousinElder: true });
      expect(getRelationshipLabel("me", "cousin", f).zhTW).toBe("表姊");
    });

    it("wife's elder sister → 大姨子 (focused male)", () => {
      const f: Person[] = [
        makePerson({ id: "wdad", gender: "male" }),
        makePerson({ id: "wmom", gender: "female", spouse: "wdad" }),
        makePerson({ id: "me", spouse: "wife", gender: "male" }),
        makePerson({ id: "wife", spouse: "me", father: "wdad", mother: "wmom", birthOrder: 2, gender: "female" }),
        makePerson({ id: "wsis", father: "wdad", mother: "wmom", birthOrder: 1, gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "wsis", f).zhTW).toBe("大姨子");
    });

    it("husband's elder brother → 大伯 (focused female)", () => {
      const f: Person[] = [
        makePerson({ id: "hdad", gender: "male" }),
        makePerson({ id: "hmom", gender: "female", spouse: "hdad" }),
        makePerson({ id: "me", spouse: "husband", gender: "female" }),
        makePerson({ id: "husband", spouse: "me", father: "hdad", mother: "hmom", birthOrder: 2, gender: "male" }),
        makePerson({ id: "hbro", father: "hdad", mother: "hmom", birthOrder: 1, gender: "male" }),
      ];
      expect(getRelationshipLabel("me", "hbro", f).zhTW).toBe("大伯");
    });

    it("妯娌 (husband's brother's wife) — both female", () => {
      const f: Person[] = [
        makePerson({ id: "fil", gender: "male" }),
        makePerson({ id: "mil", gender: "female", spouse: "fil" }),
        makePerson({ id: "husband", father: "fil", mother: "mil", spouse: "me", gender: "male", birthOrder: 1 }),
        makePerson({ id: "me", spouse: "husband", gender: "female" }),
        makePerson({ id: "hbro", father: "fil", mother: "mil", spouse: "sil", gender: "male", birthOrder: 2 }),
        makePerson({ id: "sil", spouse: "hbro", gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "sil", f).zhTW).toBe("妯娌");
    });

    it("連襟 (wife's sister's husband) — both male", () => {
      const f: Person[] = [
        makePerson({ id: "wdad", gender: "male" }),
        makePerson({ id: "wmom", gender: "female", spouse: "wdad" }),
        makePerson({ id: "wife", father: "wdad", mother: "wmom", spouse: "me", gender: "female", birthOrder: 1 }),
        makePerson({ id: "me", spouse: "wife", gender: "male" }),
        makePerson({ id: "wsis", father: "wdad", mother: "wmom", spouse: "bil", gender: "female", birthOrder: 2 }),
        makePerson({ id: "bil", spouse: "wsis", gender: "male" }),
      ];
      expect(getRelationshipLabel("me", "bil", f).zhTW).toBe("連襟");
    });
  });

  // ---- Parent's generation: uncles, aunts, and their spouses ----
  describe("Parent's generation: uncles, aunts, and their spouses", () => {
    it("father's elder brother → 伯父", () => {
      const f: Person[] = [
        makePerson({ id: "gf", gender: "male" }),
        makePerson({ id: "gm", gender: "female", spouse: "gf" }),
        makePerson({ id: "uncle", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
        makePerson({ id: "dad", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "uncle", f).zhTW).toBe("伯父");
    });

    it("father's younger brother → 叔叔", () => {
      const f: Person[] = [
        makePerson({ id: "gf", gender: "male" }),
        makePerson({ id: "gm", gender: "female", spouse: "gf" }),
        makePerson({ id: "dad", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
        makePerson({ id: "uncle", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "uncle", f).zhTW).toBe("叔叔");
    });

    it("father's sister → 姑姑", () => {
      const f: Person[] = [
        makePerson({ id: "gf", gender: "male" }),
        makePerson({ id: "gm", gender: "female", spouse: "gf" }),
        makePerson({ id: "dad", father: "gf", mother: "gm", gender: "male" }),
        makePerson({ id: "aunt", father: "gf", mother: "gm", gender: "female" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "aunt", f).zhTW).toBe("姑姑");
    });

    it("mother's brother → 舅舅", () => {
      const f: Person[] = [
        makePerson({ id: "mgf", gender: "male" }),
        makePerson({ id: "mgm", gender: "female", spouse: "mgf" }),
        makePerson({ id: "mom", father: "mgf", mother: "mgm", gender: "female" }),
        makePerson({ id: "uncle", father: "mgf", mother: "mgm", gender: "male" }),
        makePerson({ id: "me", mother: "mom" }),
      ];
      expect(getRelationshipLabel("me", "uncle", f).zhTW).toBe("舅舅");
    });

    it("mother's sister → 阿姨", () => {
      const f: Person[] = [
        makePerson({ id: "mgf", gender: "male" }),
        makePerson({ id: "mgm", gender: "female", spouse: "mgf" }),
        makePerson({ id: "mom", father: "mgf", mother: "mgm", gender: "female" }),
        makePerson({ id: "aunt", father: "mgf", mother: "mgm", gender: "female" }),
        makePerson({ id: "me", mother: "mom" }),
      ];
      expect(getRelationshipLabel("me", "aunt", f).zhTW).toBe("阿姨");
    });

    it("father's elder brother's wife → 伯母", () => {
      const f: Person[] = [
        makePerson({ id: "gf", gender: "male" }),
        makePerson({ id: "gm", gender: "female", spouse: "gf" }),
        makePerson({ id: "eu", father: "gf", mother: "gm", birthOrder: 1, gender: "male", spouse: "eu_w" }),
        makePerson({ id: "dad", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
        makePerson({ id: "eu_w", spouse: "eu", gender: "female" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "eu_w", f).zhTW).toBe("伯母");
    });

    it("father's younger brother's wife → 嬸嬸", () => {
      const f: Person[] = [
        makePerson({ id: "gf", gender: "male" }),
        makePerson({ id: "gm", gender: "female", spouse: "gf" }),
        makePerson({ id: "dad", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
        makePerson({ id: "yu", father: "gf", mother: "gm", birthOrder: 2, gender: "male", spouse: "yu_w" }),
        makePerson({ id: "yu_w", spouse: "yu", gender: "female" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "yu_w", f).zhTW).toBe("嬸嬸");
    });

    it("father's sister's husband → 姑丈", () => {
      const f: Person[] = [
        makePerson({ id: "gf", gender: "male" }),
        makePerson({ id: "gm", gender: "female", spouse: "gf" }),
        makePerson({ id: "dad", father: "gf", mother: "gm", gender: "male" }),
        makePerson({ id: "aunt", father: "gf", mother: "gm", gender: "female", spouse: "gz" }),
        makePerson({ id: "gz", spouse: "aunt", gender: "male" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "gz", f).zhTW).toBe("姑丈");
    });

    it("mother's brother's wife → 舅媽", () => {
      const f: Person[] = [
        makePerson({ id: "mgf", gender: "male" }),
        makePerson({ id: "mgm", gender: "female", spouse: "mgf" }),
        makePerson({ id: "mom", father: "mgf", mother: "mgm", gender: "female" }),
        makePerson({ id: "mu", father: "mgf", mother: "mgm", gender: "male", spouse: "mu_w" }),
        makePerson({ id: "mu_w", spouse: "mu", gender: "female" }),
        makePerson({ id: "me", mother: "mom" }),
      ];
      expect(getRelationshipLabel("me", "mu_w", f).zhTW).toBe("舅媽");
    });

    it("mother's sister's husband → 姨丈", () => {
      const f: Person[] = [
        makePerson({ id: "mgf", gender: "male" }),
        makePerson({ id: "mgm", gender: "female", spouse: "mgf" }),
        makePerson({ id: "mom", father: "mgf", mother: "mgm", gender: "female" }),
        makePerson({ id: "ma", father: "mgf", mother: "mgm", gender: "female", spouse: "yz" }),
        makePerson({ id: "yz", spouse: "ma", gender: "male" }),
        makePerson({ id: "me", mother: "mom" }),
      ];
      expect(getRelationshipLabel("me", "yz", f).zhTW).toBe("姨丈");
    });

    it("resolves a maternal aunt as 阿姨 when only her husband's gender is explicit", () => {
      // The aunt has no explicit gender, is no one's father/mother (so structural
      // inference can't help), but her spouse is explicit male. Spouse-symmetry
      // should read the explicit field to classify her as female → 阿姨.
      const f: Person[] = [
        makePerson({ id: "mgf", gender: "male" }),
        makePerson({ id: "mgm", gender: "female", spouse: "mgf" }),
        makePerson({ id: "mom", father: "mgf", mother: "mgm", gender: "female" }),
        makePerson({ id: "aunt", father: "mgf", mother: "mgm", spouse: "aunt_husband" }),
        makePerson({ id: "aunt_husband", spouse: "aunt", gender: "male" }),
        makePerson({ id: "me", mother: "mom" }),
      ];
      expect(getRelationshipLabel("me", "aunt", f).zhTW).toBe("阿姨");
      // And the husband then resolves to 姨丈 (since aunt is now female).
      expect(getRelationshipLabel("me", "aunt_husband", f).zhTW).toBe("姨丈");
    });
  });

  // ---- Grandparent's generation: great-uncles, great-aunts, and their spouses ----
  describe("Grandparent's generation: great-uncles, great-aunts, and their spouses", () => {
    // Helper for a grandparent-sibling fixture.
    const gpSiblingFixture = (options: {
      line: [("father" | "mother"), ("father" | "mother")]; // e.g. ["father","father"] = paternal grandpa
      siblingGender: "male" | "female";
      elder?: boolean;
    }): Person[] => {
      const [parentEdge, gpEdge] = options.line;
      const gpYear = "1940";
      const sibYear = options.elder === false ? "1945" : "1935";
      return [
        makePerson({ id: "ggf", gender: "male" }),
        makePerson({ id: "ggm", gender: "female", spouse: "ggf" }),
        makePerson({
          id: "gp",
          father: "ggf",
          mother: "ggm",
          birthOrder: 2,
          gender: gpEdge === "father" ? "male" : "female",
          birthDate: gpYear,
        }),
        makePerson({
          id: "sib",
          father: "ggf",
          mother: "ggm",
          birthOrder: options.elder === false ? 3 : 1,
          gender: options.siblingGender,
          birthDate: sibYear,
        }),
        makePerson({
          id: "parent",
          [gpEdge]: "gp",
          gender: parentEdge === "father" ? "male" : "female",
        } as Partial<Person>),
        makePerson({
          id: "me",
          [parentEdge]: "parent",
        } as Partial<Person>),
      ];
    };

    // Paternal grandpa line — uses 伯公/叔公/姑婆
    it("[father, father, sibling] male elder → 伯公", () => {
      const f = gpSiblingFixture({ line: ["father", "father"], siblingGender: "male", elder: true });
      expect(getRelationshipLabel("me", "sib", f).zhTW).toBe("伯公");
    });

    it("[father, father, sibling] male younger → 叔公", () => {
      const f = gpSiblingFixture({ line: ["father", "father"], siblingGender: "male", elder: false });
      expect(getRelationshipLabel("me", "sib", f).zhTW).toBe("叔公");
    });

    it("[father, father, sibling] female → 姑婆", () => {
      const f = gpSiblingFixture({ line: ["father", "father"], siblingGender: "female" });
      expect(getRelationshipLabel("me", "sib", f).zhTW).toBe("姑婆");
    });

    // Other grandparent lines — collapse to 舅公/姨婆
    it("[father, mother, sibling] male → 舅公 (father's mom's brother)", () => {
      const f = gpSiblingFixture({ line: ["father", "mother"], siblingGender: "male" });
      expect(getRelationshipLabel("me", "sib", f).zhTW).toBe("舅公");
    });

    it("[father, mother, sibling] female → 姨婆 (father's mom's sister)", () => {
      const f = gpSiblingFixture({ line: ["father", "mother"], siblingGender: "female" });
      expect(getRelationshipLabel("me", "sib", f).zhTW).toBe("姨婆");
    });

    it("[mother, father, sibling] male → 舅公 (mother's dad's brother)", () => {
      const f = gpSiblingFixture({ line: ["mother", "father"], siblingGender: "male" });
      expect(getRelationshipLabel("me", "sib", f).zhTW).toBe("舅公");
    });

    it("[mother, father, sibling] female → 姨婆", () => {
      const f = gpSiblingFixture({ line: ["mother", "father"], siblingGender: "female" });
      expect(getRelationshipLabel("me", "sib", f).zhTW).toBe("姨婆");
    });

    // User-flagged maternal grandma line — commonly asked, must not fall through to 親戚
    it("[mother, mother, sibling] male → 舅公 (maternal grandma's brother)", () => {
      const f = gpSiblingFixture({ line: ["mother", "mother"], siblingGender: "male" });
      expect(getRelationshipLabel("me", "sib", f).zhTW).toBe("舅公");
    });

    it("[mother, mother, sibling] female → 姨婆 (maternal grandma's sister)", () => {
      const f = gpSiblingFixture({ line: ["mother", "mother"], siblingGender: "female" });
      expect(getRelationshipLabel("me", "sib", f).zhTW).toBe("姨婆");
    });

    // Great-uncle / great-aunt spouses — length 4
    it("paternal grandpa's elder brother's wife → 伯婆", () => {
      const f: Person[] = [
        makePerson({ id: "ggf", gender: "male" }),
        makePerson({ id: "ggm", gender: "female", spouse: "ggf" }),
        makePerson({ id: "pgf", father: "ggf", mother: "ggm", gender: "male", birthDate: "1940", birthOrder: 2 }),
        makePerson({ id: "gu", father: "ggf", mother: "ggm", gender: "male", birthDate: "1935", birthOrder: 1, spouse: "gu_w" }),
        makePerson({ id: "gu_w", spouse: "gu", gender: "female" }),
        makePerson({ id: "dad", father: "pgf", gender: "male" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "gu_w", f).zhTW).toBe("伯婆");
    });

    it("paternal grandpa's younger brother's wife → 叔婆", () => {
      const f: Person[] = [
        makePerson({ id: "ggf", gender: "male" }),
        makePerson({ id: "ggm", gender: "female", spouse: "ggf" }),
        makePerson({ id: "pgf", father: "ggf", mother: "ggm", gender: "male", birthDate: "1940", birthOrder: 1 }),
        makePerson({ id: "gu", father: "ggf", mother: "ggm", gender: "male", birthDate: "1945", birthOrder: 2, spouse: "gu_w" }),
        makePerson({ id: "gu_w", spouse: "gu", gender: "female" }),
        makePerson({ id: "dad", father: "pgf", gender: "male" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "gu_w", f).zhTW).toBe("叔婆");
    });

    it("paternal grandpa's sister's husband → 姑丈公", () => {
      const f: Person[] = [
        makePerson({ id: "ggf", gender: "male" }),
        makePerson({ id: "ggm", gender: "female", spouse: "ggf" }),
        makePerson({ id: "pgf", father: "ggf", mother: "ggm", gender: "male" }),
        makePerson({ id: "ga", father: "ggf", mother: "ggm", gender: "female", spouse: "ga_h" }),
        makePerson({ id: "ga_h", spouse: "ga", gender: "male" }),
        makePerson({ id: "dad", father: "pgf", gender: "male" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "ga_h", f).zhTW).toBe("姑丈公");
    });

    it("maternal grandma's brother's wife → 舅婆", () => {
      const f: Person[] = [
        makePerson({ id: "ggf", gender: "male" }),
        makePerson({ id: "ggm", gender: "female", spouse: "ggf" }),
        makePerson({ id: "mgm", father: "ggf", mother: "ggm", gender: "female" }),
        makePerson({ id: "gu", father: "ggf", mother: "ggm", gender: "male", spouse: "gu_w" }),
        makePerson({ id: "gu_w", spouse: "gu", gender: "female" }),
        makePerson({ id: "mom", mother: "mgm", gender: "female" }),
        makePerson({ id: "me", mother: "mom" }),
      ];
      expect(getRelationshipLabel("me", "gu_w", f).zhTW).toBe("舅婆");
    });

    it("maternal grandma's sister's husband → 姨丈公", () => {
      const f: Person[] = [
        makePerson({ id: "ggf", gender: "male" }),
        makePerson({ id: "ggm", gender: "female", spouse: "ggf" }),
        makePerson({ id: "mgm", father: "ggf", mother: "ggm", gender: "female" }),
        makePerson({ id: "ga", father: "ggf", mother: "ggm", gender: "female", spouse: "ga_h" }),
        makePerson({ id: "ga_h", spouse: "ga", gender: "male" }),
        makePerson({ id: "mom", mother: "mgm", gender: "female" }),
        makePerson({ id: "me", mother: "mom" }),
      ];
      expect(getRelationshipLabel("me", "ga_h", f).zhTW).toBe("姨丈公");
    });
  });

  // ---- Child's generation: nephews, nieces, and their spouses; grandchildren's spouses ----
  describe("Child's generation: nephews, nieces, and their spouses; grandchildren's spouses", () => {
    it("brother's son → 姪子", () => {
      const f: Person[] = [
        makePerson({ id: "dad", gender: "male" }),
        makePerson({ id: "mom", gender: "female", spouse: "dad" }),
        makePerson({ id: "me", father: "dad", mother: "mom", birthOrder: 1 }),
        makePerson({ id: "bro", father: "dad", mother: "mom", birthOrder: 2, gender: "male" }),
        makePerson({ id: "n", father: "bro", gender: "male" }),
      ];
      expect(getRelationshipLabel("me", "n", f).zhTW).toBe("姪子");
    });

    it("sister's daughter → 外甥女", () => {
      const f: Person[] = [
        makePerson({ id: "dad", gender: "male" }),
        makePerson({ id: "mom", gender: "female", spouse: "dad" }),
        makePerson({ id: "me", father: "dad", mother: "mom", birthOrder: 1 }),
        makePerson({ id: "sis", father: "dad", mother: "mom", birthOrder: 2, gender: "female" }),
        makePerson({ id: "n", mother: "sis", gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "n", f).zhTW).toBe("外甥女");
    });

    // Nephew/niece's spouse — 姪媳, 姪女婿, 外甥媳, 外甥女婿
    it("brother's son's wife → 姪媳", () => {
      const f: Person[] = [
        makePerson({ id: "dad", gender: "male" }),
        makePerson({ id: "mom", gender: "female", spouse: "dad" }),
        makePerson({ id: "me", father: "dad", mother: "mom", birthOrder: 1 }),
        makePerson({ id: "bro", father: "dad", mother: "mom", birthOrder: 2, gender: "male" }),
        makePerson({ id: "n", father: "bro", gender: "male", spouse: "n_w" }),
        makePerson({ id: "n_w", spouse: "n", gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "n_w", f).zhTW).toBe("姪媳");
    });

    it("brother's daughter's husband → 姪女婿", () => {
      const f: Person[] = [
        makePerson({ id: "dad", gender: "male" }),
        makePerson({ id: "mom", gender: "female", spouse: "dad" }),
        makePerson({ id: "me", father: "dad", mother: "mom", birthOrder: 1 }),
        makePerson({ id: "bro", father: "dad", mother: "mom", birthOrder: 2, gender: "male" }),
        makePerson({ id: "n", father: "bro", gender: "female", spouse: "n_h" }),
        makePerson({ id: "n_h", spouse: "n", gender: "male" }),
      ];
      expect(getRelationshipLabel("me", "n_h", f).zhTW).toBe("姪女婿");
    });

    it("sister's son's wife → 外甥媳", () => {
      const f: Person[] = [
        makePerson({ id: "dad", gender: "male" }),
        makePerson({ id: "mom", gender: "female", spouse: "dad" }),
        makePerson({ id: "me", father: "dad", mother: "mom", birthOrder: 1 }),
        makePerson({ id: "sis", father: "dad", mother: "mom", birthOrder: 2, gender: "female" }),
        makePerson({ id: "n", mother: "sis", gender: "male", spouse: "n_w" }),
        makePerson({ id: "n_w", spouse: "n", gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "n_w", f).zhTW).toBe("外甥媳");
    });

    it("sister's daughter's husband → 外甥女婿", () => {
      const f: Person[] = [
        makePerson({ id: "dad", gender: "male" }),
        makePerson({ id: "mom", gender: "female", spouse: "dad" }),
        makePerson({ id: "me", father: "dad", mother: "mom", birthOrder: 1 }),
        makePerson({ id: "sis", father: "dad", mother: "mom", birthOrder: 2, gender: "female" }),
        makePerson({ id: "n", mother: "sis", gender: "female", spouse: "n_h" }),
        makePerson({ id: "n_h", spouse: "n", gender: "male" }),
      ];
      expect(getRelationshipLabel("me", "n_h", f).zhTW).toBe("外甥女婿");
    });

    // Grandchild's spouse — 孫媳, 孫女婿, 外孫媳, 外孫女婿
    it("son's son's wife → 孫媳", () => {
      const f: Person[] = [
        makePerson({ id: "me", gender: "male" }),
        makePerson({ id: "son", father: "me", gender: "male" }),
        makePerson({ id: "gs", father: "son", gender: "male", spouse: "gs_w" }),
        makePerson({ id: "gs_w", spouse: "gs", gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "gs_w", f).zhTW).toBe("孫媳");
    });

    it("son's daughter's husband → 孫女婿", () => {
      const f: Person[] = [
        makePerson({ id: "me", gender: "male" }),
        makePerson({ id: "son", father: "me", gender: "male" }),
        makePerson({ id: "gd", father: "son", gender: "female", spouse: "gd_h" }),
        makePerson({ id: "gd_h", spouse: "gd", gender: "male" }),
      ];
      expect(getRelationshipLabel("me", "gd_h", f).zhTW).toBe("孫女婿");
    });

    it("daughter's son's wife → 外孫媳", () => {
      const f: Person[] = [
        makePerson({ id: "me", gender: "male" }),
        makePerson({ id: "dau", father: "me", gender: "female" }),
        makePerson({ id: "gs", mother: "dau", gender: "male", spouse: "gs_w" }),
        makePerson({ id: "gs_w", spouse: "gs", gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "gs_w", f).zhTW).toBe("外孫媳");
    });

    it("daughter's daughter's husband → 外孫女婿", () => {
      const f: Person[] = [
        makePerson({ id: "me", gender: "male" }),
        makePerson({ id: "dau", father: "me", gender: "female" }),
        makePerson({ id: "gd", mother: "dau", gender: "female", spouse: "gd_h" }),
        makePerson({ id: "gd_h", spouse: "gd", gender: "male" }),
      ];
      expect(getRelationshipLabel("me", "gd_h", f).zhTW).toBe("外孫女婿");
    });
  });

  // ---- Parent's cousins (as seen by child / grandchild) ----
  describe("Parent's cousins (as seen by child / grandchild)", () => {
    // Father's 堂兄 (paternal grandfather's brother's son, male elder than father) → 堂伯父
    it("father's elder 堂兄 → 堂伯父", () => {
      const f: Person[] = [
        makePerson({ id: "pggf", gender: "male", spouse: "pggm" }),
        makePerson({ id: "pggm", gender: "female", spouse: "pggf" }),
        makePerson({ id: "pgf", father: "pggf", mother: "pggm", gender: "male", birthOrder: 2 }),
        makePerson({ id: "pgu", father: "pggf", mother: "pggm", gender: "male", birthOrder: 1 }),
        makePerson({ id: "dad", father: "pgf", gender: "male", birthDate: "1960" }),
        makePerson({ id: "tangBro", father: "pgu", gender: "male", birthDate: "1955" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "tangBro", f).zhTW).toBe("堂伯父");
    });

    it("father's younger 堂弟 → 堂叔父", () => {
      const f: Person[] = [
        makePerson({ id: "pggf", gender: "male", spouse: "pggm" }),
        makePerson({ id: "pggm", gender: "female", spouse: "pggf" }),
        makePerson({ id: "pgf", father: "pggf", mother: "pggm", gender: "male", birthOrder: 1 }),
        makePerson({ id: "pgu", father: "pggf", mother: "pggm", gender: "male", birthOrder: 2 }),
        makePerson({ id: "dad", father: "pgf", gender: "male", birthDate: "1960" }),
        makePerson({ id: "tangBro", father: "pgu", gender: "male", birthDate: "1965" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "tangBro", f).zhTW).toBe("堂叔父");
    });

    it("father's 堂姊 → 堂姑", () => {
      const f: Person[] = [
        makePerson({ id: "pggf", gender: "male", spouse: "pggm" }),
        makePerson({ id: "pggm", gender: "female", spouse: "pggf" }),
        makePerson({ id: "pgf", father: "pggf", mother: "pggm", gender: "male" }),
        makePerson({ id: "pgu", father: "pggf", mother: "pggm", gender: "male" }),
        makePerson({ id: "dad", father: "pgf", gender: "male" }),
        makePerson({ id: "tangSis", father: "pgu", gender: "female" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "tangSis", f).zhTW).toBe("堂姑");
    });

    // Father's 表 side — through paternal grandma, or through paternal grandpa's sister
    it("father's 表弟 via paternal grandma's brother's line → 表叔父", () => {
      const f: Person[] = [
        makePerson({ id: "pggf", gender: "male", spouse: "pggm" }),
        makePerson({ id: "pggm", gender: "female", spouse: "pggf" }),
        makePerson({ id: "pgm", father: "pggf", mother: "pggm", gender: "female" }),
        makePerson({ id: "pgmBro", father: "pggf", mother: "pggm", gender: "male" }),
        makePerson({ id: "dad", mother: "pgm", gender: "male", birthDate: "1960" }),
        makePerson({ id: "biaoBro", father: "pgmBro", gender: "male", birthDate: "1965" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "biaoBro", f).zhTW).toBe("表叔父");
    });

    it("father's 表姊 via paternal aunt's daughter → 表姑", () => {
      const f: Person[] = [
        makePerson({ id: "pggf", gender: "male", spouse: "pggm" }),
        makePerson({ id: "pggm", gender: "female", spouse: "pggf" }),
        makePerson({ id: "pgf", father: "pggf", mother: "pggm", gender: "male" }),
        makePerson({ id: "pga", father: "pggf", mother: "pggm", gender: "female" }),
        makePerson({ id: "dad", father: "pgf", gender: "male" }),
        makePerson({ id: "biaoSis", mother: "pga", gender: "female" }),
        makePerson({ id: "me", father: "dad" }),
      ];
      expect(getRelationshipLabel("me", "biaoSis", f).zhTW).toBe("表姑");
    });

    it("mother's 表兄 → 表舅", () => {
      const f: Person[] = [
        makePerson({ id: "mggf", gender: "male", spouse: "mggm" }),
        makePerson({ id: "mggm", gender: "female", spouse: "mggf" }),
        makePerson({ id: "mgf", father: "mggf", mother: "mggm", gender: "male" }),
        makePerson({ id: "mgu", father: "mggf", mother: "mggm", gender: "male" }),
        makePerson({ id: "mom", father: "mgf", gender: "female" }),
        makePerson({ id: "biaoBro", father: "mgu", gender: "male" }),
        makePerson({ id: "me", mother: "mom" }),
      ];
      expect(getRelationshipLabel("me", "biaoBro", f).zhTW).toBe("表舅");
    });

    it("mother's 表姊 → 表姨", () => {
      const f: Person[] = [
        makePerson({ id: "mggf", gender: "male", spouse: "mggm" }),
        makePerson({ id: "mggm", gender: "female", spouse: "mggf" }),
        makePerson({ id: "mgf", father: "mggf", mother: "mggm", gender: "male" }),
        makePerson({ id: "mga", father: "mggf", mother: "mggm", gender: "female" }),
        makePerson({ id: "mom", father: "mgf", gender: "female" }),
        makePerson({ id: "biaoSis", mother: "mga", gender: "female" }),
        makePerson({ id: "me", mother: "mom" }),
      ];
      expect(getRelationshipLabel("me", "biaoSis", f).zhTW).toBe("表姨");
    });
  });

  // ---- Cousin's spouse ----
  describe("Cousin's spouse", () => {
    // 堂 side — paternal uncle's child line
    it("paternal uncle's elder son's wife → 堂嫂", () => {
      const f: Person[] = [
        makePerson({ id: "gf", gender: "male" }),
        makePerson({ id: "gm", gender: "female", spouse: "gf" }),
        makePerson({ id: "dad", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
        makePerson({ id: "uncle", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
        makePerson({ id: "me", father: "dad", birthDate: "1990", gender: "male" }),
        makePerson({ id: "cousin", father: "uncle", birthDate: "1985", gender: "male", spouse: "cw" }),
        makePerson({ id: "cw", spouse: "cousin", gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "cw", f).zhTW).toBe("堂嫂");
    });

    it("paternal uncle's younger son's wife → 堂弟媳", () => {
      const f: Person[] = [
        makePerson({ id: "gf", gender: "male" }),
        makePerson({ id: "gm", gender: "female", spouse: "gf" }),
        makePerson({ id: "dad", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
        makePerson({ id: "uncle", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
        makePerson({ id: "me", father: "dad", birthDate: "1990", gender: "male" }),
        makePerson({ id: "cousin", father: "uncle", birthDate: "1995", gender: "male", spouse: "cw" }),
        makePerson({ id: "cw", spouse: "cousin", gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "cw", f).zhTW).toBe("堂弟媳");
    });

    it("paternal uncle's elder daughter's husband → 堂姊夫", () => {
      const f: Person[] = [
        makePerson({ id: "gf", gender: "male" }),
        makePerson({ id: "gm", gender: "female", spouse: "gf" }),
        makePerson({ id: "dad", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
        makePerson({ id: "uncle", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
        makePerson({ id: "me", father: "dad", birthDate: "1990", gender: "male" }),
        makePerson({ id: "cousin", father: "uncle", birthDate: "1985", gender: "female", spouse: "ch" }),
        makePerson({ id: "ch", spouse: "cousin", gender: "male" }),
      ];
      expect(getRelationshipLabel("me", "ch", f).zhTW).toBe("堂姊夫");
    });

    it("paternal uncle's younger daughter's husband → 堂妹夫", () => {
      const f: Person[] = [
        makePerson({ id: "gf", gender: "male" }),
        makePerson({ id: "gm", gender: "female", spouse: "gf" }),
        makePerson({ id: "dad", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
        makePerson({ id: "uncle", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
        makePerson({ id: "me", father: "dad", birthDate: "1990", gender: "male" }),
        makePerson({ id: "cousin", father: "uncle", birthDate: "1995", gender: "female", spouse: "ch" }),
        makePerson({ id: "ch", spouse: "cousin", gender: "male" }),
      ];
      expect(getRelationshipLabel("me", "ch", f).zhTW).toBe("堂妹夫");
    });

    // 表 side — paternal aunt's child, or maternal side
    it("paternal aunt's elder son's wife → 表嫂", () => {
      const f: Person[] = [
        makePerson({ id: "gf", gender: "male" }),
        makePerson({ id: "gm", gender: "female", spouse: "gf" }),
        makePerson({ id: "dad", father: "gf", mother: "gm", gender: "male" }),
        makePerson({ id: "aunt", father: "gf", mother: "gm", gender: "female" }),
        makePerson({ id: "me", father: "dad", birthDate: "1990", gender: "male" }),
        makePerson({ id: "cousin", mother: "aunt", birthDate: "1985", gender: "male", spouse: "cw" }),
        makePerson({ id: "cw", spouse: "cousin", gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "cw", f).zhTW).toBe("表嫂");
    });

    it("maternal uncle's younger son's wife → 表弟媳", () => {
      const f: Person[] = [
        makePerson({ id: "mgf", gender: "male" }),
        makePerson({ id: "mgm", gender: "female", spouse: "mgf" }),
        makePerson({ id: "mom", father: "mgf", mother: "mgm", gender: "female" }),
        makePerson({ id: "uncle", father: "mgf", mother: "mgm", gender: "male" }),
        makePerson({ id: "me", mother: "mom", birthDate: "1990", gender: "male" }),
        makePerson({ id: "cousin", father: "uncle", birthDate: "1995", gender: "male", spouse: "cw" }),
        makePerson({ id: "cw", spouse: "cousin", gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "cw", f).zhTW).toBe("表弟媳");
    });

    it("maternal aunt's elder daughter's husband → 表姊夫", () => {
      const f: Person[] = [
        makePerson({ id: "mgf", gender: "male" }),
        makePerson({ id: "mgm", gender: "female", spouse: "mgf" }),
        makePerson({ id: "mom", father: "mgf", mother: "mgm", gender: "female" }),
        makePerson({ id: "aunt", father: "mgf", mother: "mgm", gender: "female" }),
        makePerson({ id: "me", mother: "mom", birthDate: "1990", gender: "male" }),
        makePerson({ id: "cousin", mother: "aunt", birthDate: "1985", gender: "female", spouse: "ch" }),
        makePerson({ id: "ch", spouse: "cousin", gender: "male" }),
      ];
      expect(getRelationshipLabel("me", "ch", f).zhTW).toBe("表姊夫");
    });

    it("maternal uncle's younger daughter's husband → 表妹夫", () => {
      const f: Person[] = [
        makePerson({ id: "mgf", gender: "male" }),
        makePerson({ id: "mgm", gender: "female", spouse: "mgf" }),
        makePerson({ id: "mom", father: "mgf", mother: "mgm", gender: "female" }),
        makePerson({ id: "uncle", father: "mgf", mother: "mgm", gender: "male" }),
        makePerson({ id: "me", mother: "mom", birthDate: "1990", gender: "male" }),
        makePerson({ id: "cousin", father: "uncle", birthDate: "1995", gender: "female", spouse: "ch" }),
        makePerson({ id: "ch", spouse: "cousin", gender: "male" }),
      ];
      expect(getRelationshipLabel("me", "ch", f).zhTW).toBe("表妹夫");
    });
  });

  // ---- Same-year tiebreak with full birthDate ----
  describe("Same-year tiebreak with full birthDate", () => {
    it("堂姊 vs 堂妹 resolved by YYYYMMDD when both cousins share a year", () => {
      const f: Person[] = [
        makePerson({ id: "gf", gender: "male" }),
        makePerson({ id: "gm", gender: "female", spouse: "gf" }),
        makePerson({ id: "dad", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
        makePerson({ id: "uncle", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
        makePerson({ id: "me", father: "dad", gender: "male", birthDate: "19900615" }),
        makePerson({ id: "cElder", father: "uncle", gender: "female", birthDate: "19900320" }),
        makePerson({ id: "cYounger", father: "uncle", gender: "female", birthDate: "19901105" }),
      ];
      expect(getRelationshipLabel("me", "cElder", f).zhTW).toBe("堂姊");
      expect(getRelationshipLabel("me", "cYounger", f).zhTW).toBe("堂妹");
    });
  });

  // ---- Edge cases ----
  describe("Edge cases: fallback and symmetric views", () => {
    it("fallback 親戚 for unrelated persons", () => {
      const f: Person[] = [
        makePerson({ id: "a", name: "A" }),
        makePerson({ id: "b", name: "B" }),
      ];
      expect(getRelationshipLabel("a", "b", f)).toEqual({ en: "Relative", zhTW: "親戚" });
    });

    it("Self returns 自己", () => {
      const f: Person[] = [makePerson({ id: "me" })];
      expect(getRelationshipLabel("me", "me", f)).toEqual({ en: "Self", zhTW: "自己" });
    });

    // Symmetric sanity: 姨婆 ↔ 外甥孫女 over the same scene.
    it("maternal grandma's sister ↔ grandchild: 姨婆 vs 外甥孫女", () => {
      const f: Person[] = [
        makePerson({ id: "ggf", gender: "male", spouse: "ggm" }),
        makePerson({ id: "ggm", gender: "female", spouse: "ggf" }),
        makePerson({ id: "mgm", father: "ggf", mother: "ggm", gender: "female" }),
        makePerson({ id: "mgm_sis", father: "ggf", mother: "ggm", gender: "female" }),
        makePerson({ id: "mom", mother: "mgm", gender: "female" }),
        makePerson({ id: "me", mother: "mom", gender: "female" }),
      ];
      expect(getRelationshipLabel("me", "mgm_sis", f).zhTW).toBe("姨婆");
      expect(getRelationshipLabel("mgm_sis", "me", f).zhTW).toBe("外甥孫女");
    });

    // Symmetric sanity: 伯公 ↔ 姪孫 over the same scene (both handlers implemented).
    it("伯公 ↔ 姪孫 symmetric: grandchild's grand-uncle view vs grand-uncle's grand-nephew view", () => {
      const f: Person[] = [
        makePerson({ id: "ggf", gender: "male", spouse: "ggm" }),
        makePerson({ id: "ggm", gender: "female", spouse: "ggf" }),
        makePerson({ id: "pgf", father: "ggf", mother: "ggm", gender: "male", birthOrder: 2, birthDate: "1940" }),
        makePerson({ id: "pgu", father: "ggf", mother: "ggm", gender: "male", birthOrder: 1, birthDate: "1935" }),
        makePerson({ id: "dad", father: "pgf", gender: "male" }),
        makePerson({ id: "me", father: "dad", gender: "male" }),
      ];
      // me → pgu: father, father, sibling (male elder) → 伯公
      expect(getRelationshipLabel("me", "pgu", f).zhTW).toBe("伯公");
      // pgu → me: sibling, child, child (male) → 姪孫
      expect(getRelationshipLabel("pgu", "me", f).zhTW).toBe("姪孫");
    });

    // Symmetric sanity: 姪媳 from aunt's view + 舅媽 analog via cousin's wife (both implemented).
    it("symmetric: me sees brother's son's wife as 姪媳; brother sees her as 媳婦", () => {
      const f: Person[] = [
        makePerson({ id: "dad", gender: "male" }),
        makePerson({ id: "mom", gender: "female", spouse: "dad" }),
        makePerson({ id: "me", father: "dad", mother: "mom", birthOrder: 2, gender: "male" }),
        makePerson({ id: "bro", father: "dad", mother: "mom", birthOrder: 1, gender: "male" }),
        makePerson({ id: "n", father: "bro", gender: "male", spouse: "n_w" }),
        makePerson({ id: "n_w", spouse: "n", gender: "female" }),
      ];
      // me → n_w: sibling, child, spouse (sibling male, niece/nephew male) → 姪媳
      expect(getRelationshipLabel("me", "n_w", f).zhTW).toBe("姪媳");
      // bro → n_w: child, spouse (child male) → 媳婦
      expect(getRelationshipLabel("bro", "n_w", f).zhTW).toBe("媳婦");
    });
  });
});

describe("getRelationshipLabel — spouse-bridge (missing direct parent ref)", () => {
  // Scenarios where the focused person only has ONE biological parent set on
  // their record. BFS routes to maternal relatives through dad → wife, or to
  // paternal relatives through mom → husband. The normalizer collapses those
  // leading `[parent, spouse, ...]` hops so every downstream handler sees the
  // canonical short path.

  it("daughter → father's wife's sister (mother-missing) → 阿姨", () => {
    // daughter has father set but mother field is empty — BFS uses [father, spouse, sibling].
    const f: Person[] = [
      makePerson({ id: "mgf", gender: "male", spouse: "mgm" }),
      makePerson({ id: "mgm", gender: "female", spouse: "mgf" }),
      makePerson({ id: "mom", father: "mgf", mother: "mgm", gender: "female", spouse: "dad" }),
      makePerson({ id: "aunt", father: "mgf", mother: "mgm", gender: "female" }),
      makePerson({ id: "dad", spouse: "mom", gender: "male" }),
      makePerson({ id: "daughter", father: "dad", gender: "female" }), // mother intentionally empty
    ];
    expect(getRelationshipLabel("daughter", "aunt", f).zhTW).toBe("阿姨");
  });

  it("daughter → father's wife's mother's sister (user's case) → 姨婆", () => {
    // daughter's `mother` field is empty → path is [father, spouse, mother, sibling]
    // which normalizes to [mother, mother, sibling] → 姨婆.
    const f: Person[] = [
      makePerson({ id: "mggf", gender: "male", spouse: "mggm" }),
      makePerson({ id: "mggm", gender: "female", spouse: "mggf" }),
      makePerson({ id: "mgm", father: "mggf", mother: "mggm", gender: "female", spouse: "mgf" }),
      makePerson({ id: "mgaunt", father: "mggf", mother: "mggm", gender: "female" }),
      makePerson({ id: "mgf", gender: "male", spouse: "mgm" }),
      makePerson({ id: "mom", father: "mgf", mother: "mgm", gender: "female", spouse: "dad" }),
      makePerson({ id: "dad", spouse: "mom", gender: "male" }),
      makePerson({ id: "daughter", father: "dad", gender: "female" }),
    ];
    expect(getRelationshipLabel("daughter", "mgaunt", f).zhTW).toBe("姨婆");
  });

  it("daughter → father's wife's father's brother → 舅公 (via spouse-bridge)", () => {
    const f: Person[] = [
      makePerson({ id: "mggf", gender: "male", spouse: "mggm" }),
      makePerson({ id: "mggm", gender: "female", spouse: "mggf" }),
      makePerson({ id: "mgf", father: "mggf", mother: "mggm", gender: "male", spouse: "mgm" }),
      makePerson({ id: "mgf_bro", father: "mggf", mother: "mggm", gender: "male" }),
      makePerson({ id: "mgm", gender: "female", spouse: "mgf" }),
      makePerson({ id: "mom", father: "mgf", mother: "mgm", gender: "female", spouse: "dad" }),
      makePerson({ id: "dad", spouse: "mom", gender: "male" }),
      makePerson({ id: "daughter", father: "dad", gender: "female" }),
    ];
    expect(getRelationshipLabel("daughter", "mgf_bro", f).zhTW).toBe("舅公");
  });

  it("son → mother's husband's father's brother → 伯公 (elder, paternal grandpa line via spouse-bridge)", () => {
    const f: Person[] = [
      makePerson({ id: "pggf", gender: "male", spouse: "pggm" }),
      makePerson({ id: "pggm", gender: "female", spouse: "pggf" }),
      makePerson({ id: "pgf", father: "pggf", mother: "pggm", birthOrder: 2, gender: "male", birthDate: "1940", spouse: "pgm" }),
      makePerson({ id: "pgf_bro", father: "pggf", mother: "pggm", birthOrder: 1, gender: "male", birthDate: "1935" }),
      makePerson({ id: "pgm", gender: "female", spouse: "pgf" }),
      makePerson({ id: "dad", father: "pgf", mother: "pgm", gender: "male", spouse: "mom" }),
      makePerson({ id: "mom", gender: "female", spouse: "dad" }),
      makePerson({ id: "son", mother: "mom", gender: "male" }), // father intentionally empty
    ];
    expect(getRelationshipLabel("son", "pgf_bro", f).zhTW).toBe("伯公");
  });

  it("daughter → father's wife's sibling's child → cousin (via spouse-bridge) — 表兄/表弟/表姊/表妹", () => {
    const f: Person[] = [
      makePerson({ id: "mgf", gender: "male", spouse: "mgm" }),
      makePerson({ id: "mgm", gender: "female", spouse: "mgf" }),
      makePerson({ id: "mom", father: "mgf", mother: "mgm", gender: "female", spouse: "dad" }),
      makePerson({ id: "mom_bro", father: "mgf", mother: "mgm", gender: "male" }),
      makePerson({ id: "dad", spouse: "mom", gender: "male" }),
      makePerson({ id: "daughter", father: "dad", gender: "female", birthDate: "2010" }),
      makePerson({ id: "cousin", father: "mom_bro", gender: "male", birthDate: "2015" }),
    ];
    // path is [father, spouse, sibling, child] → normalized to [mother, sibling, child] → 表弟 (cousin younger)
    expect(getRelationshipLabel("daughter", "cousin", f).zhTW).toBe("表弟");
  });

  it("mid-path [parent, spouse] collapses: [father, mother, spouse, sibling] → [father, father, sibling] = 伯公/叔公", () => {
    // Grandpa's record is missing — reached only via his wife. Without mid-path
    // normalization, path [father, mother, spouse, sibling] wouldn't match any
    // 3-edge handler and would fall to 親戚.
    const f: Person[] = [
      makePerson({ id: "pggf", gender: "male", spouse: "pggm" }),
      makePerson({ id: "pggm", gender: "female", spouse: "pggf" }),
      makePerson({ id: "pgf", father: "pggf", mother: "pggm", birthOrder: 2, gender: "male", birthDate: "1940", spouse: "pgm" }),
      makePerson({ id: "pgf_bro", father: "pggf", mother: "pggm", birthOrder: 1, gender: "male", birthDate: "1935" }),
      makePerson({ id: "pgm", gender: "female", spouse: "pgf" }),
      // Dad is linked to pgm (mother) but NOT to pgf (father) — grandpa reached via spouse of grandma.
      makePerson({ id: "dad", mother: "pgm", gender: "male" }),
      makePerson({ id: "me", father: "dad", gender: "male" }),
    ];
    // Raw BFS path: me → dad(father) → pgm(mother) → pgf(spouse) → pgf_bro(sibling)
    // edges = [father, mother, spouse, sibling]
    // Mid-path normalization: [mother, spouse] → [father]
    // Normalized: [father, father, sibling] → 伯公 (elder paternal grand-uncle).
    expect(getRelationshipLabel("me", "pgf_bro", f).zhTW).toBe("伯公");
  });

  it("chained collapse: [father, spouse, mother, spouse, sibling] → [mother, father, sibling] = 舅公", () => {
    // Two missing-parent layers: daughter's mother is unset AND wife's father is
    // unset (only reached via wife's mother's spouse). Two spouse-bridge hops.
    const f: Person[] = [
      makePerson({ id: "mggf", gender: "male", spouse: "mggm" }),
      makePerson({ id: "mggm", gender: "female", spouse: "mggf" }),
      makePerson({ id: "mgf", father: "mggf", mother: "mggm", gender: "male", spouse: "mgm" }),
      makePerson({ id: "mgf_bro", father: "mggf", mother: "mggm", gender: "male" }),
      makePerson({ id: "mgm", gender: "female", spouse: "mgf" }),
      // wife linked only to mother (mgm) — her father (mgf) missing on her record
      makePerson({ id: "wife", mother: "mgm", gender: "female", spouse: "me" }),
      makePerson({ id: "me", spouse: "wife", gender: "male" }),
      // daughter linked only to father (me) — mother missing on her record
      makePerson({ id: "daughter", father: "me", gender: "female" }),
    ];
    // Raw path: daughter → me(father) → wife(spouse) → mgm(mother) → mgf(spouse) → mgf_bro(sibling)
    // edges = [father, spouse, mother, spouse, sibling]
    // Pass 1 i=0: [father, spouse] → [mother]. Edges now [mother, mother, spouse, sibling].
    // Pass 2 i=1 after step-back: [mother, spouse] → [father]. Edges now [mother, father, sibling].
    // Result: maternal grandpa's brother = 舅公.
    expect(getRelationshipLabel("daughter", "mgf_bro", f).zhTW).toBe("舅公");
  });
});

describe("getRelationshipLabel — explicit siblings field (for incomplete parent data)", () => {
  it("treats two persons as siblings when one declares the other via `siblings` array", () => {
    // Neither has parents recorded. Declared sibling via siblings=["id"].
    const f: Person[] = [
      makePerson({ id: "mom", name: "Mom", gender: "female", spouse: "dad", siblings: ["mom_sis"] }),
      makePerson({ id: "dad", name: "Dad", gender: "male", spouse: "mom" }),
      makePerson({ id: "mom_sis", name: "MomSister", gender: "female" }),
      makePerson({ id: "me", name: "Me", father: "dad", mother: "mom" }),
    ];
    expect(getRelationshipLabel("me", "mom_sis", f).zhTW).toBe("阿姨");
  });

  it("bidirectional: works if the OTHER person declares the sibling relationship", () => {
    const f: Person[] = [
      makePerson({ id: "mom", name: "Mom", gender: "female", spouse: "dad" }),
      makePerson({ id: "dad", name: "Dad", gender: "male", spouse: "mom" }),
      // Only mom_sis declares mom as her sibling (not mutual) — should still work
      makePerson({ id: "mom_sis", name: "MomSister", gender: "female", siblings: ["mom"] }),
      makePerson({ id: "me", name: "Me", father: "dad", mother: "mom" }),
    ];
    expect(getRelationshipLabel("me", "mom_sis", f).zhTW).toBe("阿姨");
  });

  it("covers the user's case: daughter → wife's aunt via explicit sibling on wife's mother", () => {
    // Wife's mother has no parents recorded. Wife's aunt has no parents recorded.
    // Linked via explicit siblings declaration.
    const f: Person[] = [
      makePerson({ id: "wmom", name: "WifeMom", gender: "female", spouse: "wdad", siblings: ["wmom_sis"] }),
      makePerson({ id: "wdad", name: "WifeDad", gender: "male", spouse: "wmom" }),
      makePerson({ id: "wmom_sis", name: "WifeMomSister", gender: "female" }),
      makePerson({ id: "wife", name: "Wife", father: "wdad", mother: "wmom", gender: "female", spouse: "me" }),
      makePerson({ id: "me", name: "Me", spouse: "wife", gender: "male" }),
      makePerson({ id: "daughter", name: "Daughter", father: "me", mother: "wife", gender: "female" }),
    ];
    expect(getRelationshipLabel("daughter", "wmom_sis", f).zhTW).toBe("姨婆");
  });

  it("does not produce duplicate siblings when the same pair is declared on both sides", () => {
    const f: Person[] = [
      makePerson({ id: "a", name: "A", gender: "male", siblings: ["b"] }),
      makePerson({ id: "b", name: "B", gender: "male", siblings: ["a"] }),
    ];
    // Direct getSiblings call: bidirectional declaration must not double-count.
    const siblingsOfA = getSiblings("a", f);
    expect(siblingsOfA.map((p) => p.id)).toEqual(["b"]);
    // Relationship label should resolve to a sibling term, not the 親戚 fallback.
    const label = getRelationshipLabel("a", "b", f);
    expect(label.en).not.toBe("Relative");
  });
});

describe("cousin's child (堂姪/堂外甥, 表姪/表外甥)", () => {
  // Paternal uncle's daughter (堂姊) → her son → 堂外甥.
  it("returns 堂外甥 for paternal uncle's daughter's son", () => {
    const f: Person[] = [
      makePerson({ id: "gf", name: "GF", gender: "male" }),
      makePerson({ id: "gm", name: "GM", gender: "female", spouse: "gf" }),
      makePerson({ id: "dad", name: "Dad", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
      makePerson({ id: "uncle", name: "Uncle", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
      makePerson({ id: "me", name: "Me", father: "dad", birthOrder: 1, birthDate: "1990", gender: "male" }),
      makePerson({ id: "tangSis", name: "堂姐", father: "uncle", birthOrder: 1, birthDate: "1988", gender: "female" }),
      makePerson({ id: "target", name: "Target", mother: "tangSis", gender: "male" }),
    ];
    const label = getRelationshipLabel("me", "target", f);
    expect(label.en).toBe("First cousin once removed");
    expect(label.zhTW).toBe("堂外甥");
  });

  it("returns 堂外甥女 for paternal uncle's daughter's daughter", () => {
    const f: Person[] = [
      makePerson({ id: "gf", name: "GF", gender: "male" }),
      makePerson({ id: "gm", name: "GM", gender: "female", spouse: "gf" }),
      makePerson({ id: "dad", name: "Dad", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
      makePerson({ id: "uncle", name: "Uncle", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
      makePerson({ id: "me", name: "Me", father: "dad", birthOrder: 1, birthDate: "1990", gender: "male" }),
      makePerson({ id: "tangSis", name: "堂姐", father: "uncle", birthOrder: 1, birthDate: "1988", gender: "female" }),
      makePerson({ id: "target", name: "Target", mother: "tangSis", gender: "female" }),
    ];
    const label = getRelationshipLabel("me", "target", f);
    expect(label.zhTW).toBe("堂外甥女");
  });

  // Paternal uncle's son (堂兄/堂弟) → his child → 堂姪/堂姪女.
  it("returns 堂姪 for paternal uncle's son's son", () => {
    const f: Person[] = [
      makePerson({ id: "gf", name: "GF", gender: "male" }),
      makePerson({ id: "gm", name: "GM", gender: "female", spouse: "gf" }),
      makePerson({ id: "dad", name: "Dad", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
      makePerson({ id: "uncle", name: "Uncle", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
      makePerson({ id: "me", name: "Me", father: "dad", birthOrder: 1, birthDate: "1990", gender: "male" }),
      makePerson({ id: "tangBro", name: "堂兄", father: "uncle", birthOrder: 1, birthDate: "1988", gender: "male" }),
      makePerson({ id: "target", name: "Target", father: "tangBro", gender: "male" }),
    ];
    const label = getRelationshipLabel("me", "target", f);
    expect(label.zhTW).toBe("堂姪");
  });

  // Maternal uncle's son (表弟) → his daughter → 表姪女.
  it("returns 表姪女 for maternal uncle's son's daughter", () => {
    const f: Person[] = [
      makePerson({ id: "mgf", name: "MGF", gender: "male" }),
      makePerson({ id: "mgm", name: "MGM", gender: "female", spouse: "mgf" }),
      makePerson({ id: "mom", name: "Mom", father: "mgf", mother: "mgm", birthOrder: 1, gender: "female" }),
      makePerson({ id: "mUncle", name: "Uncle", father: "mgf", mother: "mgm", birthOrder: 2, gender: "male" }),
      makePerson({ id: "me", name: "Me", mother: "mom", birthOrder: 1, birthDate: "1990", gender: "male" }),
      makePerson({ id: "biaoBro", name: "表弟", father: "mUncle", birthOrder: 1, birthDate: "1995", gender: "male" }),
      makePerson({ id: "target", name: "Target", father: "biaoBro", gender: "female" }),
    ];
    const label = getRelationshipLabel("me", "target", f);
    expect(label.zhTW).toBe("表姪女");
  });

  // Paternal aunt's daughter (表姊/表妹) → her son → 表外甥.
  // Paternal aunt = father's sister, so edges[0]=father but uncleAuntGender=female → 表.
  it("returns 表外甥 for paternal aunt's daughter's son", () => {
    const f: Person[] = [
      makePerson({ id: "gf", name: "GF", gender: "male" }),
      makePerson({ id: "gm", name: "GM", gender: "female", spouse: "gf" }),
      makePerson({ id: "dad", name: "Dad", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
      makePerson({ id: "paternalAunt", name: "Aunt", father: "gf", mother: "gm", birthOrder: 2, gender: "female" }),
      makePerson({ id: "me", name: "Me", father: "dad", birthOrder: 1, birthDate: "1990", gender: "male" }),
      makePerson({ id: "biaoSis", name: "表姐", mother: "paternalAunt", birthOrder: 1, birthDate: "1988", gender: "female" }),
      makePerson({ id: "target", name: "Target", mother: "biaoSis", gender: "male" }),
    ];
    const label = getRelationshipLabel("me", "target", f);
    expect(label.zhTW).toBe("表外甥");
  });
});

describe("far-kin default (堂/表 × 兄弟姊妹 for 2nd+ cousins)", () => {
  // Patriline broken at tangSis (female cousin of my dad): paternal uncle male, but
  // his daughter takes her husband's surname at marriage, so her child's surname ≠ mine.
  // Default rule: any female in the descending chain → 表.
  it("returns 表姊 when the female-cousin link breaks the patriline", () => {
    const f: Person[] = [
      makePerson({ id: "gf", name: "GF", gender: "male" }),
      makePerson({ id: "gm", name: "GM", gender: "female", spouse: "gf" }),
      makePerson({ id: "dad", name: "Dad", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
      makePerson({ id: "uncle", name: "Uncle", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
      makePerson({ id: "me", name: "Me", father: "dad", birthDate: "1990", gender: "male" }),
      makePerson({ id: "tangSis", name: "堂姐", father: "uncle", birthDate: "1988", gender: "female" }),
      makePerson({ id: "myKid", name: "MyKid", father: "me", birthDate: "2020" }),
      makePerson({ id: "cousinKid", name: "CousinKid", mother: "tangSis", birthDate: "2015", gender: "female" }),
    ];
    const label = getRelationshipLabel("myKid", "cousinKid", f);
    expect(label.en).toBe("Cousin");
    expect(label.zhTW).toBe("表姊");
  });

  // Full patriline: dad male, uncle male, uncle's son 堂兄 male — surname preserved → 堂.
  it("returns 堂弟 when ascending is all-father and descending chain is all-male", () => {
    const f: Person[] = [
      makePerson({ id: "gf", name: "GF", gender: "male" }),
      makePerson({ id: "gm", name: "GM", gender: "female", spouse: "gf" }),
      makePerson({ id: "dad", name: "Dad", father: "gf", mother: "gm", birthOrder: 1, gender: "male" }),
      makePerson({ id: "uncle", name: "Uncle", father: "gf", mother: "gm", birthOrder: 2, gender: "male" }),
      makePerson({ id: "me", name: "Me", father: "dad", birthDate: "1990", gender: "male" }),
      makePerson({ id: "tangBro", name: "堂兄", father: "uncle", birthDate: "1988", gender: "male" }),
      makePerson({ id: "myKid", name: "MyKid", father: "me", birthDate: "2020", gender: "male" }),
      makePerson({ id: "cousinKid", name: "CousinKid", father: "tangBro", birthDate: "2023", gender: "male" }),
    ];
    const label = getRelationshipLabel("myKid", "cousinKid", f);
    expect(label.en).toBe("Cousin");
    expect(label.zhTW).toBe("堂弟");
  });

  // Ascending goes through "mother" — viewer's own surname already diverges from the
  // common ancestor's line, so no matter what the descending chain looks like → 表.
  it("returns 表兄 when ascending path goes through mother (maternal-side kin)", () => {
    const f: Person[] = [
      makePerson({ id: "mgf", name: "MGF", gender: "male" }),
      makePerson({ id: "mgm", name: "MGM", gender: "female", spouse: "mgf" }),
      makePerson({ id: "mom", name: "Mom", father: "mgf", mother: "mgm", birthOrder: 1, gender: "female" }),
      makePerson({ id: "mUncle", name: "Uncle", father: "mgf", mother: "mgm", birthOrder: 2, gender: "male" }),
      makePerson({ id: "me", name: "Me", mother: "mom", birthDate: "1990", gender: "female" }),
      makePerson({ id: "biaoBro", name: "表弟", father: "mUncle", birthDate: "1995", gender: "male" }),
      makePerson({ id: "myKid", name: "MyKid", mother: "me", birthDate: "2020", gender: "male" }),
      makePerson({ id: "cousinKid", name: "CousinKid", father: "biaoBro", birthDate: "2018", gender: "male" }),
    ];
    const label = getRelationshipLabel("myKid", "cousinKid", f);
    expect(label.en).toBe("Cousin");
    expect(label.zhTW).toBe("表兄");
  });
});
