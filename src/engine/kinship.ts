import type { Person } from "../types/person";

/**
 * Computes kinship degree from the focused person using Taiwan civil-law 親等
 * counting (Civil Code §§ 968, 970):
 *
 *   - Self, spouse: 0 — affinity mirrors the partner's blood-degree, so the
 *     spouse edge costs 0 and every in-law's degree equals the blood-kin's
 *     degree to their own spouse.
 *   - Direct lineal (parent/child): 1 per generation.
 *   - Collateral (siblings, aunts/uncles, cousins, nieces/nephews): counted
 *     by going up to the nearest common ancestor and back down. Siblings are
 *     therefore degree 2 (me → parent → sibling), not 1 — full siblings and
 *     half siblings alike.
 *
 * The `Person.siblings` array exists for older generations where the shared
 * parents aren't in the tree. Those links represent an implicit common parent,
 * so they contribute a cost-2 edge (mirroring the me → implied-parent →
 * sibling path that 親等 counts).
 *
 * Implementation is Dijkstra because edge costs are {0, 1, 2}. Scale is
 * bounded to ~hundreds of persons per tree, so a linear-scan min extraction
 * is fine; the result is memoized by the caller.
 *
 * Unreachable persons are not in the returned map.
 */
export function computeKinshipDegrees(
  persons: Person[],
  focusedId: string
): Map<string, number> {
  const byId = new Map(persons.map((p) => [p.id, p]));
  const degrees = new Map<string, number>();
  if (!byId.has(focusedId)) return degrees;
  degrees.set(focusedId, 0);

  // parentId → child ids
  const childrenIndex = new Map<string, string[]>();
  for (const p of persons) {
    for (const parentId of [p.father, p.mother]) {
      if (parentId) {
        if (!childrenIndex.has(parentId)) childrenIndex.set(parentId, []);
        childrenIndex.get(parentId)!.push(p.id);
      }
    }
  }

  // Bidirectional explicit-sibling index. `Person.siblings` is used when the
  // shared parents aren't in the tree (older generations), so we normalize it
  // to a mutual adjacency to avoid relying on both sides declaring the link.
  const explicitSiblings = new Map<string, Set<string>>();
  const linkSib = (a: string, b: string) => {
    if (!explicitSiblings.has(a)) explicitSiblings.set(a, new Set());
    explicitSiblings.get(a)!.add(b);
  };
  for (const p of persons) {
    for (const sibId of p.siblings ?? []) {
      if (!sibId || sibId === p.id) continue;
      linkSib(p.id, sibId);
      linkSib(sibId, p.id);
    }
  }

  const pq: Array<{ id: string; cost: number }> = [{ id: focusedId, cost: 0 }];

  while (pq.length > 0) {
    // Linear-scan min — O(n²) total, acceptable at this scale.
    let minIdx = 0;
    for (let i = 1; i < pq.length; i++) {
      if (pq[i].cost < pq[minIdx].cost) minIdx = i;
    }
    const { id, cost } = pq.splice(minIdx, 1)[0];
    if (cost > (degrees.get(id) ?? Infinity)) continue;

    const person = byId.get(id);
    if (!person) continue;

    const relax = (targetId: string, edgeCost: number) => {
      if (!byId.has(targetId)) return;
      const newCost = cost + edgeCost;
      if (!degrees.has(targetId) || newCost < degrees.get(targetId)!) {
        degrees.set(targetId, newCost);
        pq.push({ id: targetId, cost: newCost });
      }
    };

    if (person.spouse) relax(person.spouse, 0);
    if (person.father) relax(person.father, 1);
    if (person.mother) relax(person.mother, 1);

    const children = childrenIndex.get(id) ?? [];
    for (const childId of children) relax(childId, 1);

    // Explicit-sibling shortcut represents me → implied-parent → sibling.
    // Half / full siblings whose parents ARE in the tree are already reached
    // via the parent+child path at the same cost, so this branch only helps
    // when the shared parent is missing.
    const explicit = explicitSiblings.get(id);
    if (explicit) {
      for (const sibId of explicit) relax(sibId, 2);
    }
  }

  return degrees;
}
