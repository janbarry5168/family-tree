import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InfoPanel from "../../src/components/InfoPanel";
import type { Person } from "../../src/types/person";
import type { FamilyTreeState } from "../../src/context/FamilyTreeContext";

// i18n stub — returns the key as the label
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: "en" },
  }),
}));

// Context stub — swap `state` and `dispatch` per-test via a mutable holder.
const ctx: { state: FamilyTreeState; dispatch: ReturnType<typeof vi.fn> } = {
  state: {
    persons: [],
    focusedPersonId: "",
    selectedPersonId: "",
    degreeFilter: 2,
    view: "tree",
    warnings: [],
  },
  dispatch: vi.fn(),
};
vi.mock("../../src/context/FamilyTreeContext", () => ({
  useFamilyTree: () => ctx,
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
    persons: [],
    focusedPersonId: "",
    selectedPersonId: "",
    degreeFilter: 2,
    view: "tree",
    warnings: [],
  };
  ctx.dispatch = vi.fn();
});

describe("InfoPanel — enriched details", () => {
  it("renders null when selectedId is empty", () => {
    ctx.state.persons = [makePerson()];
    ctx.state.focusedPersonId = "me";
    const { container } = render(<InfoPanel selectedId="" />);
    expect(container.querySelector("div")).toBeNull();
  });

  it("shows father, mother, spouse, children names as clickable buttons", () => {
    ctx.state.persons = [
      makePerson({ id: "me", name: "Me", father: "dad", mother: "mom", spouse: "wife" }),
      makePerson({ id: "dad", name: "Dad" }),
      makePerson({ id: "mom", name: "Mom" }),
      makePerson({ id: "wife", name: "Wife", spouse: "me" }),
      makePerson({ id: "kid1", name: "Kid1", father: "me", mother: "wife" }),
      makePerson({ id: "kid2", name: "Kid2", father: "me", mother: "wife" }),
    ];
    ctx.state.focusedPersonId = "me";
    render(<InfoPanel selectedId="me" />);
    expect(screen.getByRole("button", { name: "Dad" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mom" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wife" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kid1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kid2" })).toBeInTheDocument();
  });

  it("clicking a relative's name dispatches SET_SELECTED with that id", async () => {
    ctx.state.persons = [
      makePerson({ id: "me", name: "Me", spouse: "wife" }),
      makePerson({ id: "wife", name: "Wife", spouse: "me" }),
    ];
    ctx.state.focusedPersonId = "me";
    render(<InfoPanel selectedId="me" />);
    await userEvent.click(screen.getByRole("button", { name: "Wife" }));
    expect(ctx.dispatch).toHaveBeenCalledWith({ type: "SET_SELECTED", id: "wife" });
  });

  it("shows i18n 'none' placeholder for empty father / mother / spouse / children slots", () => {
    ctx.state.persons = [makePerson({ id: "me", name: "Me" })];
    ctx.state.focusedPersonId = "me";
    render(<InfoPanel selectedId="me" />);
    // One 'info.none' per empty slot: father, mother, spouse, children → 4 total
    const nones = screen.getAllByText("info.none");
    expect(nones.length).toBe(4);
  });
});
