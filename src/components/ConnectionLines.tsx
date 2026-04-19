import type { ReactElement } from "react";
import type { LayoutNode, Person } from "../types/person";

const COUPLE_PALETTE = ["#3b82f6", "#22d3ee", "#10b981", "#ec4899"];
const SIBLING_STAGGER = 8;

interface Props {
  layoutNodes: LayoutNode[];
  personById: Map<string, Person>;
}

interface CoupleGroup {
  key: string;
  parentNodes: LayoutNode[];
  children: LayoutNode[];
  coupleX: number;
  childTopY: number;
}

export default function ConnectionLines({ layoutNodes, personById }: Props) {
  const nodeMap = new Map(layoutNodes.map((n) => [n.id, n]));
  const lines: ReactElement[] = [];

  // 1. Spouse bars (dashed gold) — only draw from smaller id to avoid duplicates
  for (const node of layoutNodes) {
    const person = personById.get(node.id);
    if (!person) continue;

    if (person.spouse && nodeMap.has(person.spouse) && person.id < person.spouse) {
      const spouseNode = nodeMap.get(person.spouse)!;
      lines.push(
        <line key={`spouse-${person.id}-${person.spouse}`}
          x1={node.x} y1={node.y} x2={spouseNode.x} y2={spouseNode.y}
          stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.7} />
      );
    }
  }

  // 2. Group children by parent couple
  const coupleMap = new Map<string, CoupleGroup>();

  for (const node of layoutNodes) {
    const person = personById.get(node.id);
    if (!person) continue;

    const fatherId = person.father;
    const motherId = person.mother;
    if (!fatherId && !motherId) continue;

    const fatherNode = fatherId ? nodeMap.get(fatherId) : undefined;
    const motherNode = motherId ? nodeMap.get(motherId) : undefined;
    if (!fatherNode && !motherNode) continue;

    const key = [fatherId || "", motherId || ""].sort().join("|");

    if (!coupleMap.has(key)) {
      const parentNodes: LayoutNode[] = [];
      if (fatherNode) parentNodes.push(fatherNode);
      if (motherNode) parentNodes.push(motherNode);
      const coupleX = parentNodes.reduce((sum, n) => sum + n.x, 0) / parentNodes.length;
      coupleMap.set(key, {
        key,
        parentNodes,
        children: [],
        coupleX,
        childTopY: node.y - 36,
      });
    }
    const group = coupleMap.get(key)!;
    group.children.push(node);
  }

  // 3. Within each generation (same childTopY), sort couples by coupleX and
  //    assign palette color + stagger direction by sorted index.
  const byGen = new Map<number, CoupleGroup[]>();
  for (const g of coupleMap.values()) {
    if (g.children.length === 0) continue;
    const genKey = g.children[0].generation;
    const bucket = byGen.get(genKey) ?? [];
    bucket.push(g);
    byGen.set(genKey, bucket);
  }

  for (const bucket of byGen.values()) {
    bucket.sort((a, b) => a.coupleX - b.coupleX);

    bucket.forEach((group, idx) => {
      const color = COUPLE_PALETTE[idx % COUPLE_PALETTE.length];
      const staggerDir = idx % 2 === 0 ? -1 : +1;

      const parentBottomY = group.parentNodes[0].y + 36;
      const midY = (parentBottomY + group.childTopY) / 2;
      const effectiveMidY = midY + staggerDir * SIBLING_STAGGER;

      // Trunk: couple midpoint down to branch level
      lines.push(
        <line key={`trunk-${group.key}`} data-role="trunk"
          x1={group.coupleX} y1={parentBottomY}
          x2={group.coupleX} y2={effectiveMidY}
          stroke={color} strokeWidth={1.5} opacity={0.75} />
      );

      const sortedChildren = [...group.children].sort((a, b) => a.x - b.x);

      const leftmostX = sortedChildren[0].x;
      const rightmostX = sortedChildren[sortedChildren.length - 1].x;
      const branchLeftX = Math.min(group.coupleX, leftmostX);
      const branchRightX = Math.max(group.coupleX, rightmostX);

      // Branch bar: horizontal line spanning from couple midpoint out to all
      // children. Guarantees the trunk endpoint is on the bar for any x offset.
      lines.push(
        <line key={`branch-${group.key}`} data-role="branch"
          x1={branchLeftX} y1={effectiveMidY}
          x2={branchRightX} y2={effectiveMidY}
          stroke={color} strokeWidth={1.5} opacity={0.75} />
      );

      for (const child of sortedChildren) {
        lines.push(
          <line key={`drop-${child.id}`} data-role="drop"
            x1={child.x} y1={effectiveMidY}
            x2={child.x} y2={group.childTopY}
            stroke={color} strokeWidth={1.5} opacity={0.75} />
        );
      }
    });
  }

  return <g className="connection-lines">{lines}</g>;
}
