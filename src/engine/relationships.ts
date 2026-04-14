import type { Person, Gender } from "../types/person";

export function getChildren(personId: string, persons: Person[]): Person[] {
  return persons
    .filter((p) => p.father === personId || p.mother === personId)
    .sort((a, b) => a.birthOrder - b.birthOrder);
}

export function getSiblings(personId: string, persons: Person[]): Person[] {
  const person = persons.find((p) => p.id === personId);
  if (!person) return [];

  return persons.filter(
    (p) =>
      p.id !== personId &&
      ((person.father && p.father === person.father) || false) &&
      ((person.mother && p.mother === person.mother) || false)
  );
}

// Infers gender from structural relationships:
// - male if any person lists this person as their `father`
// - female if any person lists this person as their `mother`
// - unknown otherwise
export function inferGender(personId: string, persons: Person[]): Gender {
  if (persons.some((p) => p.father === personId)) return "male";
  if (persons.some((p) => p.mother === personId)) return "female";
  return "unknown";
}

// Resolves gender using a chain of signals:
// 1. Explicit `gender` field on the Person record (authoritative, takes precedence)
// 2. Structural inference via father/mother references (inferGender)
// 3. Spouse-symmetry: if the person's spouse has a known gender, the person is the opposite
//
// Note: leaf persons with no children, no explicit gender field, and no spouse whose
// gender is known will return "unknown". Callers should present a gender-neutral label
// in that case.
function resolveGender(personId: string, persons: Person[]): Gender {
  const person = persons.find((p) => p.id === personId);
  if (!person) return "unknown";

  // Explicit gender field takes precedence
  if (person.gender) return person.gender;

  // Structural inference
  const structural = inferGender(personId, persons);
  if (structural !== "unknown") return structural;

  // Spouse-symmetry
  if (person.spouse) {
    const spouseGender = inferGender(person.spouse, persons);
    if (spouseGender === "male") return "female";
    if (spouseGender === "female") return "male";
  }

  return "unknown";
}

interface RelationshipLabel {
  en: string;
  zhTW: string;
}

export type EdgeType = "father" | "mother" | "spouse" | "child" | "sibling";

interface RelationshipPath {
  edges: EdgeType[];
  personIds: string[];
}

function findRelationshipPath(
  fromId: string,
  toId: string,
  persons: Person[]
): RelationshipPath | null {
  if (fromId === toId) return { edges: [], personIds: [fromId] };

  const byId = new Map(persons.map((p) => [p.id, p]));
  const queue: Array<{ id: string; edges: EdgeType[]; personIds: string[] }> = [
    { id: fromId, edges: [], personIds: [fromId] },
  ];
  const visited = new Set<string>([fromId]);

  while (queue.length > 0) {
    const { id, edges, personIds } = queue.shift()!;
    const person = byId.get(id);
    if (!person) continue;

    const neighbors: Array<{ targetId: string; edge: EdgeType }> = [];

    if (person.father) neighbors.push({ targetId: person.father, edge: "father" });
    if (person.mother) neighbors.push({ targetId: person.mother, edge: "mother" });
    if (person.spouse) neighbors.push({ targetId: person.spouse, edge: "spouse" });

    const children = persons.filter((p) => p.father === id || p.mother === id);
    for (const child of children) {
      neighbors.push({ targetId: child.id, edge: "child" });
    }

    const siblings = getSiblings(id, persons);
    for (const sib of siblings) {
      neighbors.push({ targetId: sib.id, edge: "sibling" });
    }

    for (const { targetId, edge } of neighbors) {
      if (visited.has(targetId)) continue;
      const newEdges = [...edges, edge];
      const newPersonIds = [...personIds, targetId];
      if (targetId === toId) return { edges: newEdges, personIds: newPersonIds };
      visited.add(targetId);
      queue.push({ id: targetId, edges: newEdges, personIds: newPersonIds });
    }
  }

  return null;
}

export function getRelationshipLabel(
  focusedId: string,
  targetId: string,
  persons: Person[]
): RelationshipLabel {
  if (focusedId === targetId) return { en: "Self", zhTW: "自己" };

  const path = findRelationshipPath(focusedId, targetId, persons);
  if (!path) return { en: "Relative", zhTW: "親戚" };

  const { edges, personIds } = path;
  const targetGender = resolveGender(targetId, persons);
  const focusedPerson = persons.find((p) => p.id === focusedId)!;
  const targetPerson = persons.find((p) => p.id === targetId)!;

  // Direct relationships (path length 1)
  if (edges.length === 1) {
    if (edges[0] === "father") return { en: "Father", zhTW: "父親" };
    if (edges[0] === "mother") return { en: "Mother", zhTW: "母親" };
    if (edges[0] === "spouse") {
      if (targetGender === "female") return { en: "Wife", zhTW: "妻子" };
      if (targetGender === "male") return { en: "Husband", zhTW: "丈夫" };
      return { en: "Spouse", zhTW: "配偶" };
    }
    if (edges[0] === "child") {
      if (targetGender === "male") return { en: "Son", zhTW: "兒子" };
      if (targetGender === "female") return { en: "Daughter", zhTW: "女兒" };
      return { en: "Child", zhTW: "孩子" };
    }
    if (edges[0] === "sibling") {
      const isElder = targetPerson.birthOrder < focusedPerson.birthOrder;
      if (targetGender === "male") {
        return isElder ? { en: "Elder Brother", zhTW: "哥哥" } : { en: "Younger Brother", zhTW: "弟弟" };
      }
      if (targetGender === "female") {
        return isElder ? { en: "Elder Sister", zhTW: "姊姊" } : { en: "Younger Sister", zhTW: "妹妹" };
      }
      return { en: "Sibling", zhTW: "兄弟姊妹" };
    }
  }

  // Two-edge relationships (path length 2)
  if (edges.length === 2) {
    // Grandparents
    if (edges[0] === "father" && edges[1] === "father") return { en: "Grandfather", zhTW: "祖父" };
    if (edges[0] === "father" && edges[1] === "mother") return { en: "Grandmother", zhTW: "祖母" };
    if (edges[0] === "mother" && edges[1] === "father") return { en: "Grandfather", zhTW: "外祖父" };
    if (edges[0] === "mother" && edges[1] === "mother") return { en: "Grandmother", zhTW: "外祖母" };

    // Grandchildren — paternal (via son) vs maternal (via daughter)
    if (edges[0] === "child" && edges[1] === "child") {
      const intermediateGender = resolveGender(personIds[1], persons);
      const viaDaughter = intermediateGender === "female";

      if (viaDaughter) {
        if (targetGender === "male") return { en: "Grandson", zhTW: "外孫" };
        if (targetGender === "female") return { en: "Granddaughter", zhTW: "外孫女" };
        return { en: "Grandchild", zhTW: "外孫" };
      }
      if (targetGender === "male") return { en: "Grandson", zhTW: "孫子" };
      if (targetGender === "female") return { en: "Granddaughter", zhTW: "孫女" };
      return { en: "Grandchild", zhTW: "孫" };
    }

    // Child's spouse
    if (edges[0] === "child" && edges[1] === "spouse") {
      const childGender = resolveGender(personIds[1], persons);
      if (childGender === "male") return { en: "Daughter-in-law", zhTW: "媳婦" };
      if (childGender === "female") return { en: "Son-in-law", zhTW: "女婿" };
      return { en: "Child-in-law", zhTW: "媳婿" };
    }

    // In-laws (spouse's parents)
    if (edges[0] === "spouse" && edges[1] === "father") {
      const focusedGender = resolveGender(focusedId, persons);
      if (focusedGender === "male") return { en: "Father-in-law", zhTW: "岳父" };
      return { en: "Father-in-law", zhTW: "公公" };
    }
    if (edges[0] === "spouse" && edges[1] === "mother") {
      const focusedGender = resolveGender(focusedId, persons);
      if (focusedGender === "male") return { en: "Mother-in-law", zhTW: "岳母" };
      return { en: "Mother-in-law", zhTW: "婆婆" };
    }

    // Uncle/Aunt (parent's sibling)
    if ((edges[0] === "father" || edges[0] === "mother") && edges[1] === "sibling") {
      if (edges[0] === "father") {
        // Paternal uncle/aunt
        if (targetGender === "male") {
          const elder = isElderThan(targetId, personIds[1], persons);
          return elder ? { en: "Uncle", zhTW: "伯父" } : { en: "Uncle", zhTW: "叔叔" };
        }
        if (targetGender === "female") return { en: "Aunt", zhTW: "姑姑" };
        return { en: "Uncle/Aunt", zhTW: "伯叔姑" };
      } else {
        // Maternal uncle/aunt
        if (targetGender === "male") return { en: "Uncle", zhTW: "舅舅" };
        if (targetGender === "female") return { en: "Aunt", zhTW: "阿姨" };
        return { en: "Uncle/Aunt", zhTW: "舅姨" };
      }
    }

    // Sibling's spouse
    if (edges[0] === "sibling" && edges[1] === "spouse") {
      const siblingGender = resolveGender(personIds[1], persons);
      const siblingIsElder = isElderThan(personIds[1], focusedId, persons);

      if (siblingGender === "male") {
        return siblingIsElder
          ? { en: "Sister-in-law", zhTW: "嫂嫂" }
          : { en: "Sister-in-law", zhTW: "弟媳" };
      }
      if (siblingGender === "female") {
        return siblingIsElder
          ? { en: "Brother-in-law", zhTW: "姊夫" }
          : { en: "Brother-in-law", zhTW: "妹夫" };
      }
      return { en: "Sibling-in-law", zhTW: "姻親" };
    }

    // Nephew/Niece (sibling's child) — brother vs sister
    if (edges[0] === "sibling" && edges[1] === "child") {
      const siblingGender = resolveGender(personIds[1], persons);
      if (siblingGender === "male") {
        // Brother's child
        if (targetGender === "male") return { en: "Nephew", zhTW: "姪子" };
        if (targetGender === "female") return { en: "Niece", zhTW: "姪女" };
        return { en: "Nephew/Niece", zhTW: "姪" };
      }
      if (siblingGender === "female") {
        // Sister's child
        if (targetGender === "male") return { en: "Nephew", zhTW: "外甥" };
        if (targetGender === "female") return { en: "Niece", zhTW: "外甥女" };
        return { en: "Nephew/Niece", zhTW: "外甥" };
      }
      return { en: "Nephew/Niece", zhTW: "姪甥" };
    }

    // Spouse's sibling — full matrix by focused/target gender + elder/younger
    if (edges[0] === "spouse" && edges[1] === "sibling") {
      const focusedGender = resolveGender(focusedId, persons);
      const elder = isElderThan(targetId, personIds[1], persons);

      if (focusedGender === "male") {
        // Wife's siblings
        if (targetGender === "male") {
          return elder ? { en: "Brother-in-law", zhTW: "大舅子" } : { en: "Brother-in-law", zhTW: "小舅子" };
        }
        if (targetGender === "female") {
          return elder ? { en: "Sister-in-law", zhTW: "大姨子" } : { en: "Sister-in-law", zhTW: "小姨子" };
        }
      }
      if (focusedGender === "female") {
        // Husband's siblings
        if (targetGender === "male") {
          return elder ? { en: "Brother-in-law", zhTW: "大伯" } : { en: "Brother-in-law", zhTW: "小叔" };
        }
        if (targetGender === "female") {
          return elder ? { en: "Sister-in-law", zhTW: "大姑" } : { en: "Sister-in-law", zhTW: "小姑" };
        }
      }
      return { en: "Sibling-in-law", zhTW: "姻親" };
    }
  }

  // Three-edge relationships (path length 3)
  if (edges.length === 3) {
    // Uncle/Aunt's spouse (parent's sibling's spouse)
    if ((edges[0] === "father" || edges[0] === "mother") && edges[1] === "sibling" && edges[2] === "spouse") {
      const uncleAuntGender = resolveGender(personIds[2], persons);

      if (edges[0] === "father") {
        // Paternal uncle/aunt's spouse
        if (uncleAuntGender === "male") {
          const elder = isElderThan(personIds[2], personIds[1], persons);
          return elder ? { en: "Aunt", zhTW: "伯母" } : { en: "Aunt", zhTW: "嬸嬸" };
        }
        if (uncleAuntGender === "female") return { en: "Uncle", zhTW: "姑丈" };
      } else {
        // Maternal uncle/aunt's spouse
        if (uncleAuntGender === "male") return { en: "Aunt", zhTW: "舅媽" };
        if (uncleAuntGender === "female") return { en: "Uncle", zhTW: "姨丈" };
      }
      return { en: "In-law", zhTW: "姻親" };
    }

    // 妯娌/連襟 (spouse's sibling's spouse)
    if (edges[0] === "spouse" && edges[1] === "sibling" && edges[2] === "spouse") {
      const focusedGender = resolveGender(focusedId, persons);
      if (focusedGender === "female" && targetGender === "female") return { en: "Sister-in-law", zhTW: "妯娌" };
      if (focusedGender === "male" && targetGender === "male") return { en: "Brother-in-law", zhTW: "連襟" };
      return { en: "In-law", zhTW: "姻親" };
    }
  }

  // Fallback
  return { en: "Relative", zhTW: "親戚" };
}

// Determines if person `aId` is elder than person `bId`.
// Same-parent siblings: compared by birthOrder (lower = elder).
// Cross-family: falls back to birthYear (lower = elder).
export function isElderThan(aId: string, bId: string, persons: Person[]): boolean {
  const a = persons.find((p) => p.id === aId);
  const b = persons.find((p) => p.id === bId);
  if (!a || !b) return false;

  const sameParent =
    a.father && b.father && a.father === b.father &&
    a.mother && b.mother && a.mother === b.mother;
  if (sameParent) return a.birthOrder < b.birthOrder;

  if (a.birthYear && b.birthYear) return a.birthYear < b.birthYear;

  return false;
}
