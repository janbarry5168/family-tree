import type { Person, LayoutNode, NodeType } from "../types/person";

const NODE_WIDTH = 160;
const NODE_HEIGHT = 100;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 80;
const SPOUSE_GAP = 20;

const GENERATION_HEIGHT = NODE_HEIGHT + VERTICAL_GAP;

type Side = "left" | "center" | "right";

/**
 * Assign each person a "side" relative to the focused person:
 *   - center: focused, focused's spouse, and all of their shared descendants
 *             (plus the descendants' spouses so couples stay adjacent)
 *   - left:   focused's own relatives — parents, siblings, grandparents, uncles,
 *             aunts, cousins, and everything reachable through them
 *   - right:  spouse's relatives, symmetric to the left side
 *
 * Implementation: pre-anchor both parents of focused as "left" and both parents
 * of spouse as "right", then BFS out from each anchor without crossing into
 * already-assigned (center or other-side) nodes.
 */
function computeSides(
  focusedId: string,
  byId: Map<string, Person>,
  persons: Person[],
  childrenOf: Map<string, string[]>,
): Map<string, Side> {
  const sides = new Map<string, Side>();
  const focused = byId.get(focusedId);
  if (!focused) return sides;

  const markCenter = (id: string) => {
    if (byId.has(id) && !sides.has(id)) sides.set(id, "center");
  };

  markCenter(focusedId);
  if (focused.spouse) markCenter(focused.spouse);

  // Shared descendants of focused + spouse → center; spouses of descendants too
  const descRoots = [focusedId];
  if (focused.spouse && byId.has(focused.spouse)) descRoots.push(focused.spouse);
  const descQueue = [...descRoots];
  const descVisited = new Set<string>(descRoots);
  while (descQueue.length) {
    const id = descQueue.shift()!;
    const p = byId.get(id);
    if (p?.spouse && byId.has(p.spouse)) markCenter(p.spouse);
    for (const childId of childrenOf.get(id) ?? []) {
      if (descVisited.has(childId)) continue;
      descVisited.add(childId);
      markCenter(childId);
      descQueue.push(childId);
    }
  }

  // Pre-assign anchors. Two cases:
  //   - Focused has a spouse → both of my parents go left (my side), both of
  //     spouse's parents go right (spouse's side).
  //   - Focused has no spouse → fall back to the classical paternal/maternal
  //     split: father and his relatives left, mother and hers right. This
  //     keeps the tree from squashing everything onto one side.
  const assignSide = (id: string, side: Side) => {
    if (!byId.has(id)) return;
    if (!sides.has(id)) sides.set(id, side);
  };
  const spousePerson =
    focused.spouse && byId.has(focused.spouse) ? byId.get(focused.spouse) : undefined;
  const hasSpouse = !!spousePerson;

  if (hasSpouse) {
    if (focused.father) assignSide(focused.father, "left");
    if (focused.mother) assignSide(focused.mother, "left");
    if (spousePerson?.father) assignSide(spousePerson.father, "right");
    if (spousePerson?.mother) assignSide(spousePerson.mother, "right");
  } else {
    if (focused.father) assignSide(focused.father, "left");
    if (focused.mother) assignSide(focused.mother, "right");
  }

  const propagate = (rootId: string, side: Side) => {
    if (!byId.has(rootId)) return;
    const queue = [rootId];
    const visited = new Set<string>([rootId]);
    while (queue.length) {
      const id = queue.shift()!;
      if (sides.get(id) !== side) continue; // don't flow through center or the other side
      const p = byId.get(id);
      if (!p) continue;
      const neighbors = [
        p.spouse,
        p.father,
        p.mother,
        ...(childrenOf.get(id) ?? []),
      ];
      for (const nid of neighbors) {
        if (!nid || visited.has(nid) || !byId.has(nid)) continue;
        visited.add(nid);
        if (!sides.has(nid)) sides.set(nid, side);
        queue.push(nid);
      }
    }
  };

  if (hasSpouse) {
    if (focused.father) propagate(focused.father, "left");
    if (focused.mother) propagate(focused.mother, "left");
    if (spousePerson?.father) propagate(spousePerson.father, "right");
    if (spousePerson?.mother) propagate(spousePerson.mother, "right");
  } else {
    if (focused.father) propagate(focused.father, "left");
    if (focused.mother) propagate(focused.mother, "right");
  }

  // Everyone still unassigned falls back to the RIGHT side. These are typically
  // distant in-laws reached only through a center-descendant's spouse chain
  // (e.g. your son's wife's grandparents). If we left them as center, they'd
  // land between focused and their own generation's real kin, pushing direct
  // parents to the edge. Right-side + degree ASC pushes them past real in-laws.
  for (const p of persons) {
    if (byId.has(p.id) && !sides.has(p.id)) sides.set(p.id, "right");
  }

  return sides;
}

/**
 * Computes a 2-D layout for the visible family tree around a focused person.
 *
 * Algorithm:
 *  0. Drop hidden persons (hiddenIds) before any other processing.
 *  1. Filter to persons with degree <= maxDegree (visible).
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
  allPersons: Person[],
  focusedId: string,
  degrees: Map<string, number>,
  maxDegree: number,
  hiddenIds: ReadonlySet<string>,
): LayoutNode[] {
  // Step 0: drop hidden persons entirely — they must not appear in the layout.
  const persons = allPersons.filter((p) => !hiddenIds.has(p.id));

  // Step 1: partition persons into the visible set
  const visibleIds = new Set<string>();

  for (const [id, deg] of degrees) {
    if (deg <= maxDegree) {
      visibleIds.add(id);
    }
    // degree > maxDegree → excluded entirely
  }

  const includedIds = visibleIds;
  const included = persons.filter((p) => includedIds.has(p.id));
  const byId = new Map(included.map((p) => [p.id, p]));

  // Step 2: BFS from focused person to assign generations
  // Spouse = same gen (0-cost), parent = gen-1, child = gen+1
  const genMap = new Map<string, number>();
  genMap.set(focusedId, 0);

  // Use a queue; process visible nodes for generation assignment.
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

  // Assign default generation for any included person not yet reached via BFS.
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

  // Step 4: Assign x positions. Each generation is split into three blocks by
  // the side tagging from computeSides(): left (paternal line), center (focused,
  // spouse, siblings, descendants), right (maternal line). Within a block we lay
  // out left-to-right just like before — spouse pairs with SPOUSE_GAP, others
  // with HORIZONTAL_GAP. The three blocks are then positioned so the center
  // block is anchored at x=0 (with focused itself at x=0 on its own generation).

  const sides = computeSides(focusedId, byId, included, childrenOf);

  // Lay a group of ids out starting at cursor=0 and return { xs, lastCenter }
  // where xs maps id → relative center x, and lastCenter is the rightmost x.
  const layGroup = (ids: string[]) => {
    const xs = new Map<string, number>();
    let cursor = 0;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      xs.set(id, cursor);
      const nextId = ids[i + 1];
      if (nextId !== undefined) {
        const person = byId.get(id);
        const isSpousePair = person?.spouse === nextId;
        cursor += isSpousePair ? NODE_WIDTH + SPOUSE_GAP : NODE_WIDTH + HORIZONTAL_GAP;
      }
    }
    return { xs, lastCenter: cursor };
  };

  const SLOT_STEP = NODE_WIDTH + HORIZONTAL_GAP;
  const xMap = new Map<string, number>();

  for (const gen of sortedGenerations) {
    const order = generationOrder.get(gen)!;
    if (order.length === 0) continue;

    const leftIds: string[] = [];
    const centerIds: string[] = [];
    const rightIds: string[] = [];
    for (const id of order) {
      const side = sides.get(id) ?? "center";
      if (side === "left") leftIds.push(id);
      else if (side === "right") rightIds.push(id);
      else centerIds.push(id);
    }

    // Order each side block by kinship degree so direct kin sit closer to the
    // center column. Spouses share their partner's degree (spouse edge costs 0
    // in kinship BFS), so a stable sort keeps spouse pairs adjacent.
    //   left  → DESC (further kin leftmost, direct parents/siblings rightmost)
    //   right → ASC  (closer kin leftmost, further kin rightmost)
    const sortBySide = (ids: string[], side: "left" | "right"): string[] => {
      const indexed = ids.map((id, i) => ({
        id,
        i,
        deg: degrees.get(id) ?? Number.MAX_SAFE_INTEGER,
      }));
      indexed.sort((a, b) =>
        side === "left" ? b.deg - a.deg || a.i - b.i : a.deg - b.deg || a.i - b.i
      );
      return indexed.map((x) => x.id);
    };

    const leftSorted = sortBySide(leftIds, "left");
    const rightSorted = sortBySide(rightIds, "right");

    const centerGroup = layGroup(centerIds);
    const leftGroup = layGroup(leftSorted);
    const rightGroup = layGroup(rightSorted);

    // Determine how to anchor the center block
    let centerOffset = 0;
    if (centerIds.includes(focusedId)) {
      centerOffset = -(centerGroup.xs.get(focusedId) ?? 0);
    } else if (centerIds.length > 0) {
      centerOffset = -centerGroup.lastCenter / 2;
    }

    for (const [id, x] of centerGroup.xs) xMap.set(id, x + centerOffset);

    const hasCenter = centerIds.length > 0;
    const centerLeftX = hasCenter ? centerOffset : 0;
    const centerRightX = hasCenter ? centerGroup.lastCenter + centerOffset : 0;

    // Right block: first slot to the right of the center block (or of x=0 if
    // the center is empty, leaving a half-slot gap on each side).
    if (rightIds.length > 0) {
      const rightStart = hasCenter ? centerRightX + SLOT_STEP : SLOT_STEP / 2;
      for (const [id, x] of rightGroup.xs) xMap.set(id, x + rightStart);
    }

    // Left block: rightmost slot sits to the left of the center block.
    if (leftIds.length > 0) {
      const leftEnd = hasCenter ? centerLeftX - SLOT_STEP : -SLOT_STEP / 2;
      const leftOffset = leftEnd - leftGroup.lastCenter;
      for (const [id, x] of leftGroup.xs) xMap.set(id, x + leftOffset);
    }
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
    } else if (p.id === focusedSpouseId) {
      nodeType = "spouse";
    } else {
      nodeType = "blood";
    }

    nodes.push({ id: p.id, x, y, generation: gen, nodeType, degree });
  }

  return nodes;
}
