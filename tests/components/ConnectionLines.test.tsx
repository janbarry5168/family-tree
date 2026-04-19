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
  birthDate: "1990",
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

  it("adjacent couples' branch bars are staggered by SIBLING_STAGGER px", () => {
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
    // N=2: offsets ±0.5 * stagger → 8px apart.
    expect(Math.abs(y1A - y1B)).toBe(8);
  });

  it("3+ couples in same generation get distinct Y levels (no overlap)", () => {
    // Three couples in gen 0, each with one child in gen 1.
    const persons: Person[] = [
      makePerson({ id: "d1", spouse: "m1" }),
      makePerson({ id: "m1", spouse: "d1" }),
      makePerson({ id: "k1", father: "d1", mother: "m1" }),
      makePerson({ id: "d2", spouse: "m2" }),
      makePerson({ id: "m2", spouse: "d2" }),
      makePerson({ id: "k2", father: "d2", mother: "m2" }),
      makePerson({ id: "d3", spouse: "m3" }),
      makePerson({ id: "m3", spouse: "d3" }),
      makePerson({ id: "k3", father: "d3", mother: "m3" }),
    ];
    const nodes: LayoutNode[] = [
      { id: "d1", x: -300, y: 0, generation: 0, degree: 1, nodeType: "blood" },
      { id: "m1", x: -200, y: 0, generation: 0, degree: 0, nodeType: "spouse" },
      { id: "d2", x:    0, y: 0, generation: 0, degree: 1, nodeType: "blood" },
      { id: "m2", x:  100, y: 0, generation: 0, degree: 0, nodeType: "spouse" },
      { id: "d3", x:  300, y: 0, generation: 0, degree: 1, nodeType: "blood" },
      { id: "m3", x:  400, y: 0, generation: 0, degree: 0, nodeType: "spouse" },
      { id: "k1", x: -250, y: 200, generation: 1, degree: 1, nodeType: "blood" },
      { id: "k2", x:   50, y: 200, generation: 1, degree: 1, nodeType: "blood" },
      { id: "k3", x:  350, y: 200, generation: 1, degree: 1, nodeType: "blood" },
    ];
    const personById = new Map(persons.map((p) => [p.id, p]));

    const { container } = render(
      <svg>
        <ConnectionLines layoutNodes={nodes} personById={personById} />
      </svg>
    );

    const branches = container.querySelectorAll('line[data-role="branch"]');
    expect(branches.length).toBe(3);
    const ys = Array.from(branches).map((b) => Number(b.getAttribute("y1")));
    expect(new Set(ys).size).toBe(3);
    // Offsets for N=3: -1, 0, +1 times stagger(8) → three Y values 8px apart.
    const sorted = [...ys].sort((a, b) => a - b);
    expect(sorted[1] - sorted[0]).toBe(8);
    expect(sorted[2] - sorted[1]).toBe(8);
  });

  it("single-child couple: branch bar spans from coupleX to child.x (connector is not broken)", () => {
    const persons: Person[] = [
      makePerson({ id: "dadX", spouse: "momX" }),
      makePerson({ id: "momX", spouse: "dadX" }),
      makePerson({ id: "kidX", father: "dadX", mother: "momX" }),
    ];
    // Parents at x=-50 and x=+50 → coupleX = 0. Child offset at x=+50 (matches mom's column).
    const nodes: LayoutNode[] = [
      { id: "dadX", x: -50, y: 0, generation: 0, degree: 1, nodeType: "blood" },
      { id: "momX", x:  50, y: 0, generation: 0, degree: 0, nodeType: "spouse" },
      { id: "kidX", x:  50, y: 200, generation: 1, degree: 1, nodeType: "blood" },
    ];
    const personById = new Map(persons.map((p) => [p.id, p]));

    const { container } = render(
      <svg>
        <ConnectionLines layoutNodes={nodes} personById={personById} />
      </svg>
    );

    const branches = container.querySelectorAll('line[data-role="branch"]');
    expect(branches.length).toBe(1);
    const x1 = Number(branches[0].getAttribute("x1"));
    const x2 = Number(branches[0].getAttribute("x2"));
    // coupleX = 0, child.x = 50 → branch spans [0, 50]
    expect(Math.min(x1, x2)).toBe(0);
    expect(Math.max(x1, x2)).toBe(50);
  });

  it("spouse bar uses purple dashed stroke", () => {
    const { nodes, personById } = buildScene();
    const { container } = render(
      <svg>
        <ConnectionLines layoutNodes={nodes} personById={personById} />
      </svg>
    );
    const spouseLines = Array.from(container.querySelectorAll("line")).filter(
      (l) => l.getAttribute("stroke") === "#a78bfa"
    );
    expect(spouseLines.length).toBeGreaterThan(0);
    for (const l of spouseLines) {
      expect(l.getAttribute("stroke-dasharray")).toBe("6 4");
    }
  });
});
