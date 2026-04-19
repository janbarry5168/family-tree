import { describe, it, expect } from "vitest";
import { reducer, initialState } from "../../src/context/FamilyTreeContext";
import type { FamilyTreeState } from "../../src/context/FamilyTreeContext";
import type { Person } from "../../src/types/person";

const makePerson = (overrides: Partial<Person> = {}): Person => ({
  id: "1",
  name: "Test",
  father: "",
  mother: "",
  spouse: "",
  birthOrder: 1,
  birthDate: "1990",
  photo: "",
  ...overrides,
});

const stateWith = (patch: Partial<FamilyTreeState>): FamilyTreeState => ({
  ...initialState,
  ...patch,
});

describe("FamilyTree reducer — selection vs focus", () => {
  it("SET_SELECTED updates selectedPersonId only, leaves focusedPersonId untouched", () => {
    const start = stateWith({ focusedPersonId: "a", selectedPersonId: "a" });
    const next = reducer(start, { type: "SET_SELECTED", id: "b" });
    expect(next.focusedPersonId).toBe("a");
    expect(next.selectedPersonId).toBe("b");
  });

  it("SET_FOCUSED updates both focusedPersonId and selectedPersonId", () => {
    const start = stateWith({ focusedPersonId: "a", selectedPersonId: "b" });
    const next = reducer(start, { type: "SET_FOCUSED", id: "c" });
    expect(next.focusedPersonId).toBe("c");
    expect(next.selectedPersonId).toBe("c");
  });

  it("LOAD_DATA seeds selectedPersonId = focusedId", () => {
    const next = reducer(initialState, {
      type: "LOAD_DATA",
      persons: [makePerson({ id: "root" })],
      focusedId: "root",
    });
    expect(next.focusedPersonId).toBe("root");
    expect(next.selectedPersonId).toBe("root");
    expect(next.view).toBe("tree");
  });

  it("DELETE_PERSON: when deleted id is the selected one, fallback to newFocused", () => {
    const persons = [
      makePerson({ id: "a" }),
      makePerson({ id: "b" }),
      makePerson({ id: "c" }),
    ];
    const start = stateWith({ persons, focusedPersonId: "a", selectedPersonId: "b" });
    const next = reducer(start, { type: "DELETE_PERSON", id: "b" });
    expect(next.persons.map((p) => p.id)).toEqual(["a", "c"]);
    expect(next.focusedPersonId).toBe("a");
    expect(next.selectedPersonId).toBe("a");
  });

  it("DELETE_PERSON: when deleted id is the focused one, newFocused = first remaining; selected follows if it was also deleted", () => {
    const persons = [makePerson({ id: "a" }), makePerson({ id: "b" })];
    const start = stateWith({ persons, focusedPersonId: "a", selectedPersonId: "a" });
    const next = reducer(start, { type: "DELETE_PERSON", id: "a" });
    expect(next.focusedPersonId).toBe("b");
    expect(next.selectedPersonId).toBe("b");
  });

  it("DELETE_PERSON: when deleted id is neither focused nor selected, both stay", () => {
    const persons = [
      makePerson({ id: "a" }),
      makePerson({ id: "b" }),
      makePerson({ id: "c" }),
    ];
    const start = stateWith({ persons, focusedPersonId: "a", selectedPersonId: "b" });
    const next = reducer(start, { type: "DELETE_PERSON", id: "c" });
    expect(next.focusedPersonId).toBe("a");
    expect(next.selectedPersonId).toBe("b");
  });
});
