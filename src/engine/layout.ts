import type { Person, LayoutNode, NodeType } from "../types/person";

const NODE_WIDTH = 160;
const NODE_HEIGHT = 100;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 80;
const SPOUSE_GAP = 20;

const SLOT_WIDTH = NODE_WIDTH + HORIZONTAL_GAP;
const GENERATION_HEIGHT = NODE_HEIGHT + VERTICAL_GAP;

/**
 * Computes a 2-D layout for the visible family tree around a focused person.
 *
 * Algorithm:
 *  1. Filter to persons with degree <= maxDegree (visible) + degree === maxDegree+1 (ghost boundary).
 *  2. BFS-assign a generation number to every visible person:
 *       - spouse  → same generation
 *       - parent  → generation - 1
 *       - child   → generation + 1
 *       - sibling → same generation  (derived from shared parent, not a direct BFS edge here)
 *  3. Within each generation, collect sibling groups (shared father+mother) and sort by birthOrder.
 *     Spouse pairs are kept adjacent.
 *  4. Assign x positions left-to-right per generation, then shift so the focused person lands at x=0.
 *  5. y = generation * GENERATION_HEIGHT (focused person's generation is 0 → y=0).
 */
export function computeLayout(
  persons: Person[],
  focusedId: string,
  degrees: Map<string, number>,
  maxDegree: number
): LayoutNode[] {
  // Step 1: partition persons into visible and ghost sets
  const visibleIds = new Set<string>();
  const ghostIds = new Set<string>();

  for (const [id, deg] of degrees) {
    if (deg <= maxDegree) {
      visibleIds.add(id);
    } else if (deg === maxDegree + 1) {
      ghostIds.add(id);
    }
    // degree > maxDegree + 1 → excluded entirely
  }

  const includedIds = new Set([...visibleIds, ...ghostIds]);
  const included = persons.filter((p) => includedIds.has(p.id));
  const byId = new Map(included.map((p) => [p.id, p]));

  // Step 2: BFS from focused person to assign generations
  // Spouse = same gen (0-cost), parent = gen-1, child = gen+1
  const genMap = new Map<string, number>();
  genMap.set(focusedId, 0);

  // Use a queue; process visible nodes only for generation assignment
  // (ghosts inherit their generation from their visible parent/child)
  const queue: string[] = [focusedId];

  // Pre-compute children index
  const childrenOf = new Map<string, string[]>();
  for (const p of included) {
    for (const parentId of [p.father, p.mother]) {
      if (parentId && byId.has(parentId)) {
        if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
        childrenOf.get(parentId)!.push(p.id);
      }
    }
  }

  const visited = new Set<string>([focusedId]);

  while (queue.length > 0) {
    const id = queue.shift()!;
    const gen = genMap.get(id)!;
    const person = byId.get(id);
    if (!person) continue;

    const enqueue = (targetId: string, targetGen: number) => {
      if (!byId.has(targetId)) return;
      if (!visited.has(targetId)) {
        visited.add(targetId);
        genMap.set(targetId, targetGen);
        queue.push(targetId);
      }
    };

    // Spouse → same generation
    if (person.spouse) enqueue(person.spouse, gen);

    // Parents → gen - 1
    if (person.father) enqueue(person.father, gen - 1);
    if (person.mother) enqueue(person.mother, gen - 1);

    // Children → gen + 1
    for (const childId of childrenOf.get(id) ?? []) {
      enqueue(childId, gen + 1);
    }
  }

  // Assign default generation for any included person not yet reached via BFS
  // (e.g. ghosts whose parent was not in the BFS queue)
  for (const p of included) {
    if (!genMap.has(p.id)) {
      // Infer from their visible relative
      const parentGen =
        (p.father && genMap.has(p.father) ? genMap.get(p.father)! : undefined) ??
        (p.mother && genMap.has(p.mother) ? genMap.get(p.mother)! : undefined);
      if (parentGen !== undefined) {
        genMap.set(p.id, parentGen - 1);
      } else {
        const childrenList = childrenOf.get(p.id) ?? [];
        const childGen = childrenList.map((c) => genMap.get(c)).find((g) => g !== undefined);
        if (childGen !== undefined) {
          genMap.set(p.id, childGen + 1);
        } else {
          genMap.set(p.id, 0);
        }
      }
    }
  }

  // Step 3: Group persons by generation, then order within generation
  // Strategy: build an ordered list of "units" per generation.
  // A unit is either a single person or a spouse pair [person, spouse].
  // Within a generation, sibling groups are sorted by birthOrder, then each sibling's
  // own spouse is placed immediately to their right.

  const generationSet = new Set(genMap.values());
  const sortedGenerations = [...generationSet].sort((a, b) => a - b);

  // For each generation, produce an ordered array of IDs
  const generationOrder = new Map<number, string[]>();

  for (const gen of sortedGenerations) {
    const personsInGen = included.filter((p) => genMap.get(p.id) === gen);

    // Identify spouse pairs — track which IDs have been placed
    const placed = new Set<string>();
    const orderedUnits: string[][] = []; // each unit is 1 or 2 ids

    // Build sibling groups (share same father+mother) and sort by birthOrder
    // Non-sibling persons (no shared parent context) are treated as standalone units
    const siblingGroupMap = new Map<string, Person[]>(); // key = "father|mother"
    const noSiblingGroup: Person[] = [];

    for (const p of personsInGen) {
      if (p.father && p.mother) {
        const key = `${p.father}|${p.mother}`;
        if (!siblingGroupMap.has(key)) siblingGroupMap.set(key, []);
        siblingGroupMap.get(key)!.push(p);
      } else {
        noSiblingGroup.push(p);
      }
    }

    // Sort each sibling group by birthOrder
    for (const group of siblingGroupMap.values()) {
      group.sort((a, b) => a.birthOrder - b.birthOrder);
    }

    // Determine sibling group order: use the focused person's group first if present,
    // then others. For stable ordering use first member's birthOrder across groups.
    const allGroups: Person[][] = [];

    // Check if focused person is in this generation
    const focusedInGen = personsInGen.find((p) => p.id === focusedId);

    if (focusedInGen && focusedInGen.father && focusedInGen.mother) {
      const focusKey = `${focusedInGen.father}|${focusedInGen.mother}`;
      const focusGroup = siblingGroupMap.get(focusKey);
      if (focusGroup) allGroups.push(focusGroup);
      for (const [k, g] of siblingGroupMap) {
        if (k !== focusKey) allGroups.push(g);
      }
    } else {
      for (const g of siblingGroupMap.values()) allGroups.push(g);
    }

    // Build units from each group, adding spouse immediately after each person
    const buildUnits = (groupPersons: Person[]) => {
      for (const p of groupPersons) {
        if (placed.has(p.id)) continue;
        placed.add(p.id);

        const spouseId = p.spouse;
        if (spouseId && !placed.has(spouseId) && byId.has(spouseId) && genMap.get(spouseId) === gen) {
          placed.add(spouseId);
          orderedUnits.push([p.id, spouseId]);
        } else {
          orderedUnits.push([p.id]);
        }
      }
    };

    for (const group of allGroups) buildUnits(group);

    // Handle persons with no sibling group (noSiblingGroup)
    // If focused is here and has a spouse, put focused first
    const focusedNoSib = noSiblingGroup.find((p) => p.id === focusedId);
    if (focusedNoSib) {
      // Move focused to front of noSiblingGroup
      const rest = noSiblingGroup.filter((p) => p.id !== focusedId);
      buildUnits([focusedNoSib, ...rest]);
    } else {
      buildUnits(noSiblingGroup);
    }

    // Flatten units to ordered ID list
    generationOrder.set(gen, orderedUnits.flat());
  }

  // Step 4: Assign x positions
  // Each person gets a slot. Spouse pairs have SPOUSE_GAP between them, HORIZONTAL_GAP elsewhere.
  // After assigning positions, shift the whole layout so focusedId lands at x=0.

  const xMap = new Map<string, number>();

  for (const gen of sortedGenerations) {
    const order = generationOrder.get(gen)!;
    if (order.length === 0) continue;

    // Lay out left to right with SLOT_WIDTH per person, except spouse pairs use SPOUSE_GAP
    // We need to know which pairs are spouses for gap calculation.
    // Re-derive spouse adjacency from the ordered list.

    // Compute cumulative x offsets
    let cursor = 0;
    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      xMap.set(id, cursor);

      // Determine gap to next person
      const nextId = order[i + 1];
      if (nextId !== undefined) {
        const person = byId.get(id);
        const isSpousePair = person?.spouse === nextId;
        const gap = isSpousePair ? NODE_WIDTH + SPOUSE_GAP : NODE_WIDTH + HORIZONTAL_GAP;
        cursor += gap;
      }
    }
  }

  // Shift so focusedId is at x=0
  const focusedX = xMap.get(focusedId) ?? 0;
  for (const [id, x] of xMap) {
    xMap.set(id, x - focusedX);
  }

  // Step 5: Assign nodeType and build LayoutNode[]
  const focusedPerson = byId.get(focusedId);
  const focusedSpouseId = focusedPerson?.spouse ?? "";

  const nodes: LayoutNode[] = [];

  for (const p of included) {
    const gen = genMap.get(p.id) ?? 0;
    const x = xMap.get(p.id) ?? 0;
    const y = gen * GENERATION_HEIGHT;
    const degree = degrees.get(p.id) ?? 0;

    let nodeType: NodeType;
    if (p.id === focusedId) {
      nodeType = "focused";
    } else if (ghostIds.has(p.id)) {
      nodeType = "ghost";
    } else if (p.id === focusedSpouseId) {
      nodeType = "spouse";
    } else {
      nodeType = "blood";
    }

    nodes.push({ id: p.id, x, y, generation: gen, nodeType, degree });
  }

  return nodes;
}
