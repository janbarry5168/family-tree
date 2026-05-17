import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TreeView from "../../src/components/TreeView";
import type { Person } from "../../src/types/person";
import type { FamilyTreeState } from "../../src/context/FamilyTreeContext";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
    i18n: { language: "en" },
  }),
}));

const ctx: { state: FamilyTreeState; dispatch: ReturnType<typeof vi.fn> } = {
  state: {
    persons: [],
    focusedPersonId: "",
    selectedPersonId: "",
    degreeFilter: 2,
    view: "tree",
    warnings: [],
    hiddenPersonIds: [],
  },
  dispatch: vi.fn(),
};

vi.mock("../../src/context/FamilyTreeContext", () => ({
  useFamilyTree: () => ctx,
}));

vi.mock("../../src/components/TreeCanvas", () => ({
  default: () => <div data-testid="tree-canvas" />,
}));

vi.mock("../../src/components/Toolbar", () => ({
  default: ({ onEditClick }: { onEditClick: () => void }) => (
    <button type="button" onClick={onEditClick}>
      toolbar.editData
    </button>
  ),
}));

vi.mock("../../src/components/EditorPanel", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <button type="button" onClick={onClose}>
      editor.close
    </button>
  ),
}));

const makePerson = (overrides: Partial<Person> = {}): Person => ({
  id: "me",
  name: "Me",
  father: "",
  mother: "",
  spouse: "",
  birthOrder: 1,
  birthDate: "1990",
  photo: "",
  ...overrides,
});

beforeEach(() => {
  ctx.state = {
    persons: [makePerson()],
    focusedPersonId: "me",
    selectedPersonId: "me",
    degreeFilter: 2,
    view: "tree",
    warnings: [],
    hiddenPersonIds: [],
  };
  ctx.dispatch = vi.fn();
});

describe("TreeView info panel", () => {
  it("closes and reopens the selected person's details", async () => {
    render(<TreeView />);

    expect(screen.getByText("Me")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "info.close" }));
    expect(screen.queryByText("Me")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "info.open" }));
    expect(screen.getByText("Me")).toBeInTheDocument();
  });
});
