import type { ReactElement } from "react";
import type { LayoutNode, Person } from "../types/person";

interface Props {
  layoutNodes: LayoutNode[];
  persons: Person[];
  personById: Map<string, Person>;
}

export default function ConnectionLines({ layoutNodes, persons: _persons, personById }: Props) {
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
  const coupleGroups = new Map<string, { parentNodes: LayoutNode[]; children: LayoutNode[] }>();

  for (const node of layoutNodes) {
    const person = personById.get(node.id);
    if (!person) continue;

    const fatherId = person.father;
    const motherId = person.mother;
    if (!fatherId && !motherId) continue;

    const fatherNode = fatherId ? nodeMap.get(fatherId) : undefined;
    const motherNode = motherId ? nodeMap.get(motherId) : undefined;
    if (!fatherNode && !motherNode) continue;

    // Stable key for this parent couple
    const key = [fatherId || "", motherId || ""].sort().join("|");

    if (!coupleGroups.has(key)) {
      const parentNodes: LayoutNode[] = [];
      if (fatherNode) parentNodes.push(fatherNode);
      if (motherNode) parentNodes.push(motherNode);
      coupleGroups.set(key, { parentNodes, children: [] });
    }
    coupleGroups.get(key)!.children.push(node);
  }

  // 3. Draw couple hub for each group
  for (const [key, group] of coupleGroups) {
    const { parentNodes, children } = group;
    if (children.length === 0) continue;

    // Couple midpoint X
    const coupleX = parentNodes.reduce((sum, n) => sum + n.x, 0) / parentNodes.length;

    // Parent bottom Y (all parents in same generation)
    const parentBottomY = parentNodes[0].y + 36;

    // Child top Y (all children in same generation have same y)
    const childTopY = children[0].y - 36;

    // Branch Y (midpoint between parent bottom and child top)
    const midY = (parentBottomY + childTopY) / 2;

    // Trunk: couple midpoint down to branch level
    lines.push(
      <line key={`trunk-${key}`}
        x1={coupleX} y1={parentBottomY} x2={coupleX} y2={midY}
        stroke="#3b82f6" strokeWidth={1.5} opacity={0.6} />
    );

    // Sort children by X for branch bar
    const sortedChildren = [...children].sort((a, b) => a.x - b.x);

    if (sortedChildren.length > 1) {
      // Branch bar: horizontal line spanning all children
      lines.push(
        <line key={`branch-${key}`}
          x1={sortedChildren[0].x} y1={midY}
          x2={sortedChildren[sortedChildren.length - 1].x} y2={midY}
          stroke="#3b82f6" strokeWidth={1.5} opacity={0.6} />
      );
    }

    // Child drops: vertical line from branch level to each child
    for (const child of sortedChildren) {
      lines.push(
        <line key={`drop-${child.id}`}
          x1={child.x} y1={midY} x2={child.x} y2={childTopY}
          stroke="#3b82f6" strokeWidth={1.5} opacity={0.6} />
      );
    }
  }

  return <g className="connection-lines">{lines}</g>;
}
