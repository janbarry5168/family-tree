import type { Person, Gender } from "../types/person";
import { birthYearOf } from "./birthDate";

export function getChildren(personId: string, persons: Person[]): Person[] {
  return persons
    .filter((p) => p.father === personId || p.mother === personId)
    .sort((a, b) => a.birthOrder - b.birthOrder);
}

export function getSiblings(personId: string, persons: Person[]): Person[] {
  const person = persons.find((p) => p.id === personId);
  if (!person) return [];

  // Parent-based detection: at least one non-empty parent must match. Using
  // OR (not AND) covers two real-world cases: (1) older generations where
  // only one parent is in the tree — e.g., grandma's siblings where only
  // their shared father is recorded; (2) half-siblings, which Chinese kinship
  // still addresses as 兄/弟/姊/妹. Full-sibling pairs satisfy both conditions
  // and are still picked up.
  const parentBased = persons.filter((p) => {
    if (p.id === personId) return false;
    const fatherMatch = Boolean(person.father) && p.father === person.father;
    const motherMatch = Boolean(person.mother) && p.mother === person.mother;
    return fatherMatch || motherMatch;
  });

  // Explicit siblings (bidirectional): include p if either side declares
  // the relationship. Needed for older generations where parents aren't in
  // the tree, so strict parent-based detection would miss the link.
  const explicitIds = new Set<string>(person.siblings ?? []);
  for (const p of persons) {
    if ((p.siblings ?? []).includes(personId)) explicitIds.add(p.id);
  }
  explicitIds.delete(personId);

  // Merge, preserving parent-based entries first so their order (and the
  // birthOrder sort callers rely on) remains stable. Explicit-only entries
  // are appended in persons[] order.
  const seen = new Set(parentBased.map((p) => p.id));
  const explicit = persons.filter((p) => explicitIds.has(p.id) && !seen.has(p.id));
  return [...parentBased, ...explicit];
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

  // Spouse-symmetry: use the spouse's explicit gender first, then structural
  // inference. We can't call resolveGender on the spouse — it would recurse
  // back through spouse-symmetry and loop.
  if (person.spouse) {
    const spousePerson = persons.find((p) => p.id === person.spouse);
    const spouseGender: Gender =
      spousePerson?.gender ?? inferGender(person.spouse, persons);
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

// Collapse any `[parent, spouse]` pair in the path into a single
// `[other_parent]` edge. In a heteronormative model the spouse of a parent
// IS the other parent, so whenever BFS routes through a parent's spouse —
// at the start of the path (missing direct parent ref on focused), in the
// middle (missing grandparent/ancestor ref), anywhere — the detour maps
// back to the canonical short path. Scan repeatedly because collapsing one
// pair can expose a new adjacent `[parent, spouse]` that also collapses.
function normalizeSpouseBridge(
  edges: EdgeType[],
  personIds: string[]
): { edges: EdgeType[]; personIds: string[] } {
  const outEdges = [...edges];
  const outIds = [...personIds];
  let i = 0;
  while (i < outEdges.length - 1) {
    const a = outEdges[i];
    const b = outEdges[i + 1];
    if ((a === "father" || a === "mother") && b === "spouse") {
      const otherParent: EdgeType = a === "father" ? "mother" : "father";
      outEdges.splice(i, 2, otherParent);
      outIds.splice(i + 1, 1);
      // Step back one so the newly-adjacent pair (prev edge + otherParent)
      // is rechecked — but the opposite direction [spouse, parent] is NOT a
      // spouse-bridge, so stepping back never falsely collapses further.
      if (i > 0) i--;
    } else {
      i++;
    }
  }
  return { edges: outEdges, personIds: outIds };
}

export function getRelationshipLabel(
  focusedId: string,
  targetId: string,
  persons: Person[]
): RelationshipLabel {
  if (focusedId === targetId) return { en: "Self", zhTW: "自己" };

  const rawPath = findRelationshipPath(focusedId, targetId, persons);
  if (!rawPath) return { en: "Relative", zhTW: "親戚" };

  const { edges, personIds } = normalizeSpouseBridge(rawPath.edges, rawPath.personIds);
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

    // Cousins (parent's sibling's child)
    if ((edges[0] === "father" || edges[0] === "mother") && edges[1] === "sibling" && edges[2] === "child") {
      const uncleAuntGender = resolveGender(personIds[2], persons);
      const elder = isElderThan(targetId, focusedId, persons);

      // Paternal uncle's children → 堂; all others → 表
      const isTang = edges[0] === "father" && uncleAuntGender === "male";
      const prefix = isTang ? "堂" : "表";

      if (targetGender === "male") {
        return elder
          ? { en: "Cousin", zhTW: `${prefix}兄` }
          : { en: "Cousin", zhTW: `${prefix}弟` };
      }
      if (targetGender === "female") {
        return elder
          ? { en: "Cousin", zhTW: `${prefix}姊` }
          : { en: "Cousin", zhTW: `${prefix}妹` };
      }
      return { en: "Cousin", zhTW: `${prefix}親` };
    }

    // Grandparent's sibling (great-uncle / great-aunt).
    // Only the paternal grandfather line uses 伯公/叔公/姑婆; all other
    // grandparent lines (paternal grandma, maternal grandpa, maternal
    // grandma) collapse to 舅公/姨婆 in common usage.
    if ((edges[0] === "father" || edges[0] === "mother") &&
        (edges[1] === "father" || edges[1] === "mother") &&
        edges[2] === "sibling") {
      const isPaternalGrandpaLine = edges[0] === "father" && edges[1] === "father";

      if (isPaternalGrandpaLine) {
        if (targetGender === "male") {
          const grandparentId = personIds[2];
          const elder = isElderThan(targetId, grandparentId, persons);
          return elder ? { en: "Great-uncle", zhTW: "伯公" } : { en: "Great-uncle", zhTW: "叔公" };
        }
        if (targetGender === "female") return { en: "Great-aunt", zhTW: "姑婆" };
        return { en: "Great-uncle/aunt", zhTW: "伯叔姑婆" };
      }

      if (targetGender === "male") return { en: "Great-uncle", zhTW: "舅公" };
      if (targetGender === "female") return { en: "Great-aunt", zhTW: "姨婆" };
      return { en: "Great-uncle/aunt", zhTW: "舅姨婆" };
    }

    // Sibling's grandchild (great-nephew / great-niece).
    // Brother line → 姪孫/姪孫女; sister line → 外甥孫/外甥孫女.
    if (edges[0] === "sibling" && edges[1] === "child" && edges[2] === "child") {
      const siblingGender = resolveGender(personIds[1], persons);
      if (siblingGender === "male") {
        if (targetGender === "male") return { en: "Great-nephew", zhTW: "姪孫" };
        if (targetGender === "female") return { en: "Great-niece", zhTW: "姪孫女" };
        return { en: "Great-nephew/niece", zhTW: "姪孫" };
      }
      if (siblingGender === "female") {
        if (targetGender === "male") return { en: "Great-nephew", zhTW: "外甥孫" };
        if (targetGender === "female") return { en: "Great-niece", zhTW: "外甥孫女" };
        return { en: "Great-nephew/niece", zhTW: "外甥孫" };
      }
      return { en: "Great-nephew/niece", zhTW: "姪甥孫" };
    }

    // Nephew/Niece's spouse (sibling → child → spouse).
    // Brother's son's wife → 姪媳; brother's daughter's husband → 姪女婿.
    // Sister's son's wife → 外甥媳; sister's daughter's husband → 外甥女婿.
    if (edges[0] === "sibling" && edges[1] === "child" && edges[2] === "spouse") {
      const siblingGender = resolveGender(personIds[1], persons);
      const nieceNephewGender = resolveGender(personIds[2], persons);
      const viaSister = siblingGender === "female";
      const prefix = viaSister ? "外甥" : "姪";

      if (nieceNephewGender === "male") {
        return { en: "Niece-in-law", zhTW: `${prefix}媳` };
      }
      if (nieceNephewGender === "female") {
        return { en: "Nephew-in-law", zhTW: `${prefix}女婿` };
      }
      return { en: "Nephew/Niece-in-law", zhTW: `${prefix}媳婿` };
    }

    // Grandchild's spouse (child → child → spouse).
    // Via son → grandson's wife 孫媳 / granddaughter's husband 孫女婿.
    // Via daughter → 外孫媳 / 外孫女婿.
    if (edges[0] === "child" && edges[1] === "child" && edges[2] === "spouse") {
      const intermediateGender = resolveGender(personIds[1], persons);
      const grandchildGender = resolveGender(personIds[2], persons);
      const viaDaughter = intermediateGender === "female";
      const prefix = viaDaughter ? "外孫" : "孫";

      if (grandchildGender === "male") {
        return { en: "Granddaughter-in-law", zhTW: `${prefix}媳` };
      }
      if (grandchildGender === "female") {
        return { en: "Grandson-in-law", zhTW: `${prefix}女婿` };
      }
      return { en: "Grandchild-in-law", zhTW: `${prefix}媳婿` };
    }

    // Great-grandparents (3-hop ancestor)
    if ((edges[0] === "father" || edges[0] === "mother") &&
        (edges[1] === "father" || edges[1] === "mother") &&
        (edges[2] === "father" || edges[2] === "mother")) {
      if (edges[0] === "father") {
        // Paternal great-grandparent
        if (edges[1] === "father" && edges[2] === "father") return { en: "Great-grandfather", zhTW: "曾祖父" };
        if (edges[1] === "father" && edges[2] === "mother") return { en: "Great-grandmother", zhTW: "曾祖母" };
        // Other paternal combos (father,mother,father / father,mother,mother)
        if (targetGender === "male" || edges[2] === "father") return { en: "Great-grandfather", zhTW: "曾祖父" };
        return { en: "Great-grandmother", zhTW: "曾祖母" };
      } else {
        // Maternal great-grandparent
        if (targetGender === "male" || edges[2] === "father") return { en: "Great-grandfather", zhTW: "外曾祖父" };
        return { en: "Great-grandmother", zhTW: "外曾祖母" };
      }
    }

    // Great-grandchildren (child,child,child)
    if (edges[0] === "child" && edges[1] === "child" && edges[2] === "child") {
      const firstChildGender = resolveGender(personIds[1], persons);
      const viaDaughter = firstChildGender === "female";

      if (viaDaughter) {
        if (targetGender === "male") return { en: "Great-grandson", zhTW: "外曾孫" };
        if (targetGender === "female") return { en: "Great-granddaughter", zhTW: "外曾孫女" };
        return { en: "Great-grandchild", zhTW: "外曾孫" };
      }
      if (targetGender === "male") return { en: "Great-grandson", zhTW: "曾孫" };
      if (targetGender === "female") return { en: "Great-granddaughter", zhTW: "曾孫女" };
      return { en: "Great-grandchild", zhTW: "曾孫" };
    }
  }

  // Four-edge relationships (path length 4)
  if (edges.length === 4) {
    // Parent's cousin (parent → grandparent → grandparent's sibling → their child):
    // e.g. daughter viewing her father's 表弟 → 表叔.
    if ((edges[0] === "father" || edges[0] === "mother") &&
        (edges[1] === "father" || edges[1] === "mother") &&
        edges[2] === "sibling" &&
        edges[3] === "child") {
      const grandparentSiblingGender = resolveGender(personIds[3], persons);
      // 堂 prefix only when tracing through the paternal-male line at both hops
      // (child → father → father's father → his brother → his child). All other
      // routes — including mother's side — use 表. Matches common Mandarin usage.
      const isTang =
        edges[0] === "father" &&
        edges[1] === "father" &&
        grandparentSiblingGender === "male";
      const prefix = isTang ? "堂" : "表";

      const parentId = personIds[1];
      const elder = isElderThan(targetId, parentId, persons);

      if (edges[0] === "father") {
        // Paternal side — 伯 (elder) / 叔 (younger) / 姑 generation
        if (targetGender === "male") {
          return elder
            ? { en: "Uncle", zhTW: `${prefix}伯父` }
            : { en: "Uncle", zhTW: `${prefix}叔父` };
        }
        if (targetGender === "female") return { en: "Aunt", zhTW: `${prefix}姑` };
        return { en: "Uncle/Aunt", zhTW: `${prefix}伯叔姑` };
      } else {
        // Maternal side — 舅 / 姨 generation
        if (targetGender === "male") return { en: "Uncle", zhTW: `${prefix}舅` };
        if (targetGender === "female") return { en: "Aunt", zhTW: `${prefix}姨` };
        return { en: "Uncle/Aunt", zhTW: `${prefix}舅姨` };
      }
    }

    // Great-uncle / great-aunt's spouse (grandparent's sibling's spouse).
    // [parent, parent, sibling, spouse].
    // Paternal grandpa line (father,father): 伯公/叔公's wife → 伯婆/叔婆 (by age vs grandparent);
    // 姑婆's husband → 姑丈公. All other grandparent lines collapse to 舅婆 / 姨丈公.
    if ((edges[0] === "father" || edges[0] === "mother") &&
        (edges[1] === "father" || edges[1] === "mother") &&
        edges[2] === "sibling" &&
        edges[3] === "spouse") {
      const greatUncleAuntGender = resolveGender(personIds[3], persons);
      const isPaternalGrandpaLine = edges[0] === "father" && edges[1] === "father";

      if (isPaternalGrandpaLine) {
        if (greatUncleAuntGender === "male") {
          // Great-uncle's wife → 伯婆 (if great-uncle elder than grandpa) or 叔婆 (younger)
          const grandparentId = personIds[2];
          const greatUncleId = personIds[3];
          const elder = isElderThan(greatUncleId, grandparentId, persons);
          return elder ? { en: "Great-aunt", zhTW: "伯婆" } : { en: "Great-aunt", zhTW: "叔婆" };
        }
        if (greatUncleAuntGender === "female") {
          // Great-aunt's husband → 姑丈公
          return { en: "Great-uncle", zhTW: "姑丈公" };
        }
        return { en: "Great-uncle/aunt-in-law", zhTW: "姻親" };
      }

      // Other grandparent lines (paternal grandma, maternal grandpa, maternal grandma).
      if (greatUncleAuntGender === "male") {
        // Great-uncle's wife → 舅婆
        return { en: "Great-aunt", zhTW: "舅婆" };
      }
      if (greatUncleAuntGender === "female") {
        // Great-aunt's husband → 姨丈公
        return { en: "Great-uncle", zhTW: "姨丈公" };
      }
      return { en: "Great-uncle/aunt-in-law", zhTW: "姻親" };
    }

    // Cousin's spouse (parent → sibling → child → spouse).
    // Same 堂 / 表 classification as length-3 cousin: 堂 when paternal uncle's child.
    // Male cousin elder → 堂兄/表兄; his wife → 堂嫂/表嫂.
    // Male cousin younger → 堂弟/表弟; his wife → 堂弟媳/表弟媳.
    // Female cousin elder → 堂姊/表姊; her husband → 堂姊夫/表姊夫.
    // Female cousin younger → 堂妹/表妹; her husband → 堂妹夫/表妹夫.
    if ((edges[0] === "father" || edges[0] === "mother") &&
        edges[1] === "sibling" &&
        edges[2] === "child" &&
        edges[3] === "spouse") {
      const uncleAuntGender = resolveGender(personIds[2], persons);
      const cousinId = personIds[3];
      const cousinGender = resolveGender(cousinId, persons);
      const cousinElder = isElderThan(cousinId, focusedId, persons);

      // Paternal uncle's children → 堂; all others → 表
      const isTang = edges[0] === "father" && uncleAuntGender === "male";
      const prefix = isTang ? "堂" : "表";

      if (cousinGender === "male") {
        // Cousin's wife
        return cousinElder
          ? { en: "Cousin-in-law", zhTW: `${prefix}嫂` }
          : { en: "Cousin-in-law", zhTW: `${prefix}弟媳` };
      }
      if (cousinGender === "female") {
        // Cousin's husband
        return cousinElder
          ? { en: "Cousin-in-law", zhTW: `${prefix}姊夫` }
          : { en: "Cousin-in-law", zhTW: `${prefix}妹夫` };
      }
      return { en: "Cousin-in-law", zhTW: `${prefix}姻親` };
    }
  }

  // Fallback
  return { en: "Relative", zhTW: "親戚" };
}

// Determines if person `aId` is elder than person `bId`.
// Same-parent siblings: compared by birthOrder (lower = elder).
// Cross-family: compares birthDate — year first, then full YYYYMMDD if same year
// and both persons have a full 8-digit birthDate recorded.
export function isElderThan(aId: string, bId: string, persons: Person[]): boolean {
  const a = persons.find((p) => p.id === aId);
  const b = persons.find((p) => p.id === bId);
  if (!a || !b) return false;

  const sameParent =
    a.father && b.father && a.father === b.father &&
    a.mother && b.mother && a.mother === b.mother;
  if (sameParent) return a.birthOrder < b.birthOrder;

  const aYear = birthYearOf(a.birthDate);
  const bYear = birthYearOf(b.birthDate);
  if (aYear && bYear) {
    if (aYear !== bYear) return aYear < bYear;
    // Same year — need full YYYYMMDD on both to break the tie.
    if (a.birthDate.length === 8 && b.birthDate.length === 8) {
      return a.birthDate < b.birthDate;
    }
  }

  return false;
}
