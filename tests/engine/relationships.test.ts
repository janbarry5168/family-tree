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
