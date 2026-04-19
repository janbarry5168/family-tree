import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ConnectionLines from "../../src/components/ConnectionLines";
import type { LayoutNode, Person } from "../../src/types/person";

const makePerson = (overrides: Partial<Person> = {}): Person => ({
  id: "x",
  name: "X",
  father: "",
  mother: "",
  spouse: "",
  birthOrder: 1,
  birthYear: 1990,
  photo: "",
  ...overrides,
});

// Scene: two couples in gen 0, two children each in gen 1.
//   couple A: dadA (x=-400) + momA (x=-300) → kids at x=-400, -300
//   couple B: dadB (x= 200) + momB (x= 300) → kids at x= 200,  300
// Both couples share the same childTopY, so the stagger should split them.
function buildScene() {
  const persons: Person[] = [
    makePerson({ id: "dadA", spouse: "momA" }),
    makePerson({ id: "momA", spouse: "dadA" }),
    makePerson({ id: "kidA1", father: "dadA", mother: "momA" }),
    makePerson({ id: "kidA2", father: "dadA", mother: "momA" }),
    makePerson({ id: "dadB", spouse: "momB" }),
    makePerson({ id: "momB", spouse: "dadB" }),
    makePerson({ id: "kidB1", father: "dadB", mother: "momB" }),
    makePerson({ id: "kidB2", father: "dadB", mother: "momB" }),
  ];
  const nodes: LayoutNode[] = [
    { id: "dadA", x: -400, y: 0, generation: 0, degree: 1, nodeType: "blood" },
    { id: "momA", x: -300, y: 0, generation: 0, degree: 0, nodeType: "spouse" },
    { id: "dadB", x:  200, y: 0, generation: 0, degree: 1, nodeType: "blood" },
    { id: "momB", x:  300, y: 0, generation: 0, degree: 0, nodeType: "spouse" },
    { id: "kidA1", x: -400, y: 200, generation: 1, degree: 1, nodeType: "blood" },
    { id: "kidA2", x: -300, y: 200, generation: 1, degree: 1, nodeType: "blood" },
    { id: "kidB1", x:  200, y: 200, generation: 1, degree: 1, nodeType: "blood" },
    { id: "kidB2", x:  300, y: 200, generation: 1, degree: 1, nodeType: "blood" },
  ];
  const personById = new Map(persons.map((p) => [p.id, p]));
  return { nodes, personById };
}

describe("ConnectionLines — sibling disambiguation", () => {
  it("adjacent couples in the same generation get different palette colors", () => {
    const { nodes, personById } = buildScene();
    const { container } = render(
      <svg>
        <ConnectionLines layoutNodes={nodes} personById={personById} />
      </svg>
    );
    const trunks = container.querySelectorAll('line[data-role="trunk"]');
    expect(trunks.length).toBe(2);
    const strokeA = trunks[0].getAttribute("stroke");
    const strokeB = trunks[1].getAttribute("stroke");
    expect(strokeA).not.toBe(strokeB);
    const PALETTE = ["#3b82f6", "#22d3ee", "#10b981", "#ec4899"];
    expect(PALETTE).toContain(strokeA);
    expect(PALETTE).toContain(strokeB);
  });

  it("adjacent couples' branch bars are staggered by 16px (2 * SIBLING_STAGGER)", () => {
    const { nodes, personById } = buildScene();
    const { container } = render(
      <svg>
        <ConnectionLines layoutNodes={nodes} personById={personById} />
      </svg>
    );
    const branches = container.querySelectorAll('line[data-role="branch"]');
    expect(branches.length).toBe(2);
    const y1A = Number(branches[0].getAttribute("y1"));
    const y1B = Number(branches[1].getAttribute("y1"));
    expect(Math.abs(y1A - y1B)).toBe(16);
  });

  it("spouse bar is unchanged (still gold dashed)", () => {
    const { nodes, personById } = buildScene();
    const { container } = render(
      <svg>
        <ConnectionLines layoutNodes={nodes} personById={personById} />
      </svg>
    );
    const spouseLines = Array.from(container.querySelectorAll("line")).filter(
      (l) => l.getAttribute("stroke") === "#f59e0b"
    );
    expect(spouseLines.length).toBeGreaterThan(0);
    for (const l of spouseLines) {
      expect(l.getAttribute("stroke-dasharray")).toBe("6 4");
    }
  });
});
