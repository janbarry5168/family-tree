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
// in that case. The Person data model should be extended with an explicit `gender` field
// to eliminate this gap.
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

type EdgeType = "father" | "mother" | "spouse" | "child" | "sibling";

function findRelationshipPath(
  fromId: string,
  toId: string,
  persons: Person[]
): EdgeType[] | null {
  if (fromId === toId) return [];

  const byId = new Map(persons.map((p) => [p.id, p]));
  const queue: Array<{ id: string; path: EdgeType[] }> = [{ id: fromId, path: [] }];
  const visited = new Set<string>([fromId]);

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
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
      const newPath = [...path, edge];
      if (targetId === toId) return newPath;
      visited.add(targetId);
      queue.push({ id: targetId, path: newPath });
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

  const targetGender = resolveGender(targetId, persons);
  const focusedPerson = persons.find((p) => p.id === focusedId)!;
  const targetPerson = persons.find((p) => p.id === targetId)!;
  const key = path.join(",");

  // Direct relationships
  if (key === "father") return { en: "Father", zhTW: "父親" };
  if (key === "mother") return { en: "Mother", zhTW: "母親" };
  if (key === "spouse") {
    if (targetGender === "female") return { en: "Wife", zhTW: "妻子" };
    if (targetGender === "male") return { en: "Husband", zhTW: "丈夫" };
    return { en: "Spouse", zhTW: "配偶" };
  }
  if (key === "child") {
    if (targetGender === "male") return { en: "Son", zhTW: "兒子" };
    if (targetGender === "female") return { en: "Daughter", zhTW: "女兒" };
    return { en: "Child", zhTW: "孩子" };
  }
  if (key === "sibling") {
    const isElder = targetPerson.birthOrder < focusedPerson.birthOrder;
    if (targetGender === "male") {
      return isElder ? { en: "Elder Brother", zhTW: "哥哥" } : { en: "Younger Brother", zhTW: "弟弟" };
    }
    if (targetGender === "female") {
      return isElder ? { en: "Elder Sister", zhTW: "姊姊" } : { en: "Younger Sister", zhTW: "妹妹" };
    }
    return { en: "Sibling", zhTW: "兄弟姊妹" };
  }

  // Grandparents
  if (key === "father,father") return { en: "Grandfather", zhTW: "祖父" };
  if (key === "father,mother") return { en: "Grandmother", zhTW: "祖母" };
  if (key === "mother,father") return { en: "Grandfather", zhTW: "外祖父" };
  if (key === "mother,mother") return { en: "Grandmother", zhTW: "外祖母" };

  // Grandchildren
  if (key === "child,child") {
    if (targetGender === "male") return { en: "Grandson", zhTW: "孫子" };
    if (targetGender === "female") return { en: "Granddaughter", zhTW: "孫女" };
    return { en: "Grandchild", zhTW: "孫" };
  }

  // In-laws (spouse's parents)
  if (key === "spouse,father") {
    if (inferGender(focusedId, persons) === "male") return { en: "Father-in-law", zhTW: "岳父" };
    return { en: "Father-in-law", zhTW: "公公" };
  }
  if (key === "spouse,mother") {
    if (inferGender(focusedId, persons) === "male") return { en: "Mother-in-law", zhTW: "岳母" };
    return { en: "Mother-in-law", zhTW: "婆婆" };
  }

  // Uncle/Aunt (parent's sibling)
  if (path.length === 2 && (path[0] === "father" || path[0] === "mother") && path[1] === "sibling") {
    if (targetGender === "male") return { en: "Uncle", zhTW: "叔叔" };
    if (targetGender === "female") return { en: "Aunt", zhTW: "姑姑" };
    return { en: "Uncle/Aunt", zhTW: "叔伯姑姨" };
  }

  // Nephew/Niece (sibling's child)
  if (path.length === 2 && path[0] === "sibling" && path[1] === "child") {
    if (targetGender === "male") return { en: "Nephew", zhTW: "姪子" };
    if (targetGender === "female") return { en: "Niece", zhTW: "姪女" };
    return { en: "Nephew/Niece", zhTW: "姪" };
  }

  // Spouse's sibling
  if (key === "spouse,sibling") {
    if (targetGender === "male") return { en: "Brother-in-law", zhTW: "大舅" };
    if (targetGender === "female") return { en: "Sister-in-law", zhTW: "大姑" };
    return { en: "Sibling-in-law", zhTW: "姻親" };
  }

  // Fallback
  return { en: "Relative", zhTW: "親戚" };
}
