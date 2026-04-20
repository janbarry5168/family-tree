import type { Person } from "../types/person";

function buildChildrenIndex(persons: Person[]): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  for (const p of persons) {
    for (const parentId of [p.father, p.mother]) {
      if (parentId) {
        if (!idx.has(parentId)) idx.set(parentId, []);
        idx.get(parentId)!.push(p.id);
      }
    }
  }
  return idx;
}

function neighborsOf(
  person: Person,
  childrenIndex: Map<string, string[]>,
  byId: Map<string, Person>,
): string[] {
  const out: string[] = [];
  const push = (id: string | undefined) => {
    if (id && byId.has(id)) out.push(id);
  };
  push(person.spouse);
  push(person.father);
  push(person.mother);
  for (const c of childrenIndex.get(person.id) ?? []) push(c);
  for (const s of person.siblings ?? []) push(s);
  return out;
}

/**
 * BFS from focusedId over spouse/parent/child/siblings edges. A person in
 * `hiddenToggles` is reached as a leaf — we visit them but do NOT enqueue
 * their neighbors. Any person unreached at the end is returned as "hidden."
 *
 * `focusedId` ∈ hiddenToggles is ignored (focused always expands fully).
 */
export function computeHiddenIds(
  persons: Person[],
  focusedId: string,
  hiddenToggles: ReadonlySet<string>,
): Set<string> {
  const byId = new Map(persons.map((p) => [p.id, p]));
  if (!byId.has(focusedId)) return new Set();

  const childrenIndex = buildChildrenIndex(persons);
  const reached = new Set<string>([focusedId]);
  const queue: string[] = [focusedId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (hiddenToggles.has(id) && id !== focusedId) continue;

    const person = byId.get(id);
    if (!person) continue;

    for (const nid of neighborsOf(person, childrenIndex, byId)) {
      if (reached.has(nid)) continue;
      reached.add(nid);
      queue.push(nid);
    }
  }

  const hidden = new Set<string>();
  for (const p of persons) {
    if (!reached.has(p.id)) hidden.add(p.id);
  }
  return hidden;
}
