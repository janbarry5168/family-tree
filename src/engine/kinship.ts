import type { Person } from "../types/person";

/**
 * BFS from the focused person. Edge costs:
 * - spouse = 0
 * - parent/child/sibling = 1
 * Returns a Map of personId → kinship degree.
 * Unreachable persons are not in the map.
 */
export function computeKinshipDegrees(
  persons: Person[],
  focusedId: string
): Map<string, number> {
  const byId = new Map(persons.map((p) => [p.id, p]));
  const degrees = new Map<string, number>();

  // 0-1 BFS using deque: 0-cost edges go to front, 1-cost to back
  const deque: Array<{ id: string; cost: number }> = [{ id: focusedId, cost: 0 }];
  degrees.set(focusedId, 0);

  // Pre-compute sibling groups: key = "father|mother" → person ids
  const siblingIndex = new Map<string, string[]>();
  for (const p of persons) {
    if (p.father && p.mother) {
      const key = `${p.father}|${p.mother}`;
      if (!siblingIndex.has(key)) siblingIndex.set(key, []);
      siblingIndex.get(key)!.push(p.id);
    }
  }

  // Pre-compute children index: parentId → child ids
  const childrenIndex = new Map<string, string[]>();
  for (const p of persons) {
    for (const parentId of [p.father, p.mother]) {
      if (parentId) {
        if (!childrenIndex.has(parentId)) childrenIndex.set(parentId, []);
        childrenIndex.get(parentId)!.push(p.id);
      }
    }
  }

  while (deque.length > 0) {
    const { id, cost } = deque.shift()!;
    if (cost > (degrees.get(id) ?? Infinity)) continue;

    const person = byId.get(id);
    if (!person) continue;

    const enqueue = (targetId: string, edgeCost: number) => {
      const newCost = cost + edgeCost;
      if (!degrees.has(targetId) || newCost < degrees.get(targetId)!) {
        degrees.set(targetId, newCost);
        if (edgeCost === 0) {
          deque.unshift({ id: targetId, cost: newCost });
        } else {
          deque.push({ id: targetId, cost: newCost });
        }
      }
    };

    // Spouse: cost 0
    if (person.spouse && byId.has(person.spouse)) {
      enqueue(person.spouse, 0);
    }

    // Parents: cost 1
    if (person.father && byId.has(person.father)) enqueue(person.father, 1);
    if (person.mother && byId.has(person.mother)) enqueue(person.mother, 1);

    // Children: cost 1
    const children = childrenIndex.get(id) ?? [];
    for (const childId of children) {
      enqueue(childId, 1);
    }

    // Siblings (same father AND mother): cost 1
    if (person.father && person.mother) {
      const key = `${person.father}|${person.mother}`;
      const sibs = siblingIndex.get(key) ?? [];
      for (const sibId of sibs) {
        if (sibId !== id) enqueue(sibId, 1);
      }
    }
  }

  return degrees;
}
