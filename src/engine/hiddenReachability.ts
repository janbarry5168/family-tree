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

/**
 * Find articulation points in the reachable subgraph from focusedId.
 * An articulation point is a node whose removal would disconnect at least
 * one other node from focusedId. focusedId itself is never returned.
 *
 * Walls: persons in hiddenToggles are treated as leaves — the DFS visits
 * them but does not traverse through them. As a consequence, a toggled-off
 * person is typically NOT returned (their subtree is already walled off).
 * The UI handles the "keep the button on a collapsed anchor" case by
 * unioning this set with hiddenToggles.
 *
 * Implementation: iterative Tarjan on the undirected graph induced by
 * spouse/parent/child/siblings edges. O(V + E).
 */
export function computeArticulationPoints(
  persons: Person[],
  focusedId: string,
  hiddenToggles: ReadonlySet<string>,
): Set<string> {
  const byId = new Map(persons.map((p) => [p.id, p]));
  if (!byId.has(focusedId)) return new Set();

  const childrenIndex = buildChildrenIndex(persons);

  const edgesOf = (id: string): string[] => {
    if (hiddenToggles.has(id) && id !== focusedId) return [];
    const p = byId.get(id);
    if (!p) return [];
    return Array.from(new Set(neighborsOf(p, childrenIndex, byId)));
  };

  const disc = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const articulation = new Set<string>();
  let timer = 0;

  type Frame = { id: string; iter: Iterator<string> };
  const stack: Frame[] = [];
  const rootChildren = new Map<string, number>();

  const visit = (id: string, par: string | null) => {
    disc.set(id, timer);
    low.set(id, timer);
    timer += 1;
    parent.set(id, par);
    stack.push({ id, iter: edgesOf(id)[Symbol.iterator]() });
    if (par === null) rootChildren.set(id, 0);
  };

  visit(focusedId, null);

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const next = frame.iter.next();

    if (next.done) {
      stack.pop();
      const par = parent.get(frame.id);
      if (par !== null && par !== undefined) {
        low.set(par, Math.min(low.get(par)!, low.get(frame.id)!));
        if (par !== focusedId && low.get(frame.id)! >= disc.get(par)!) {
          articulation.add(par);
        }
      }
      continue;
    }

    const nbr = next.value;
    if (!disc.has(nbr)) {
      if (frame.id === focusedId) {
        rootChildren.set(focusedId, (rootChildren.get(focusedId) ?? 0) + 1);
      }
      visit(nbr, frame.id);
    } else if (nbr !== parent.get(frame.id)) {
      low.set(frame.id, Math.min(low.get(frame.id)!, disc.get(nbr)!));
    }
  }

  return articulation;
}
