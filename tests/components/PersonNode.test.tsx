import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PersonNode from "../../src/components/PersonNode";
import type { LayoutNode, Person } from "../../src/types/person";

// Minimal i18n stub — PersonNode uses useTranslation().i18n.language only.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" } }),
}));

const makePerson = (overrides: Partial<Person> = {}): Person => ({
  id: "a",
  name: "Alice",
  father: "",
  mother: "",
  spouse: "",
  birthOrder: 1,
  birthDate: "1990",
  photo: "",
  ...overrides,
});

const makeNode = (overrides: Partial<LayoutNode> = {}): LayoutNode => ({
  id: "a",
  x: 100,
  y: 100,
  generation: 0,
  degree: 0,
  nodeType: "blood",
  ...overrides,
});

function renderNode(props: Partial<React.ComponentProps<typeof PersonNode>> = {}) {
  const person = props.person ?? makePerson();
  const node = props.node ?? makeNode();
  return render(
    <svg>
      <PersonNode
        node={node}
        person={person}
        focusedId="root"
        persons={[person]}
        isSelected={false}
        onSelect={() => {}}
        onFocus={() => {}}
        {...props}
      />
    </svg>
  );
}

describe("PersonNode — click model", () => {
  it("single click fires onSelect, not onFocus", async () => {
    const onSelect = vi.fn();
    const onFocus = vi.fn();
    const { container } = renderNode({ onSelect, onFocus });
    const group = container.querySelector("g[data-person-node]")!;
    await userEvent.click(group);
    expect(onSelect).toHaveBeenCalledWith("a");
    expect(onFocus).not.toHaveBeenCalled();
  });

  it("double click fires onFocus (and also onSelect twice — idempotent)", async () => {
    const onSelect = vi.fn();
    const onFocus = vi.fn();
    const { container } = renderNode({ onSelect, onFocus });
    const group = container.querySelector("g[data-person-node]")!;
    await userEvent.dblClick(group);
    expect(onFocus).toHaveBeenCalledWith("a");
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("does not render eye-icon toggle anywhere", () => {
    const { container } = renderNode();
    // Eye icon was identified by a <path d="M1 7 Q7 1 13 7 Q7 13 1 7" ...> in the old code.
    const eyePath = container.querySelector('path[d*="M1 7 Q7 1 13 7"]');
    expect(eyePath).toBeNull();
  });

  it("renders a selection ring when isSelected && nodeType !== focused", () => {
    const { container } = renderNode({ isSelected: true, node: makeNode({ nodeType: "blood" }) });
    expect(container.querySelector('rect[data-role="selection-ring"]')).not.toBeNull();
  });

  it("does NOT render selection ring when nodeType === focused (pulse already distinguishes)", () => {
    const { container } = renderNode({
      isSelected: true,
      node: makeNode({ nodeType: "focused" }),
    });
    expect(container.querySelector('rect[data-role="selection-ring"]')).toBeNull();
  });

  it("does NOT render selection ring when isSelected is false", () => {
    const { container } = renderNode({ isSelected: false });
    expect(container.querySelector('rect[data-role="selection-ring"]')).toBeNull();
  });
});
