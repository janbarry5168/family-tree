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

  for (const node of layoutNodes) {
    const person = personById.get(node.id);
    if (!person) continue;

    // Spouse connection (dashed gold) — only draw from smaller id to avoid duplicates
    if (person.spouse && nodeMap.has(person.spouse) && person.id < person.spouse) {
      const spouseNode = nodeMap.get(person.spouse)!;
      lines.push(
        <line key={`spouse-${person.id}-${person.spouse}`}
          x1={node.x} y1={node.y} x2={spouseNode.x} y2={spouseNode.y}
          stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.7} />
      );
    }

    // Parent-child connections (solid blue) — draw from child to each parent
    for (const parentField of ["father", "mother"] as const) {
      const parentId = person[parentField];
      if (parentId && nodeMap.has(parentId)) {
        const parentNode = nodeMap.get(parentId)!;
        const midY = (parentNode.y + node.y) / 2;
        lines.push(
          <path key={`parent-${parentField}-${person.id}`}
            d={`M ${parentNode.x} ${parentNode.y + 36} L ${parentNode.x} ${midY} L ${node.x} ${midY} L ${node.x} ${node.y - 36}`}
            fill="none" stroke="#3b82f6" strokeWidth={1.5} opacity={0.6} />
        );
      }
    }
  }

  return <g className="connection-lines">{lines}</g>;
}
