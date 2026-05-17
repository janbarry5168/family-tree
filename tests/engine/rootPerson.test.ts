import { describe, expect, it } from "vitest";
import { selectInitialFocusId } from "../../src/engine/rootPerson";
import type { Person } from "../../src/types/person";

const makePerson = (overrides: Partial<Person> = {}): Person => ({
  id: "1",
  name: "Test",
  father: "",
  mother: "",
  spouse: "",
  birthOrder: 1,
  birthDate: "",
  photo: "",
  ...overrides,
});

describe("selectInitialFocusId", () => {
  it("chooses the first person marked root", () => {
    const persons = [
      makePerson({ id: "first" }),
      makePerson({ id: "root", root: true }),
      makePerson({ id: "other-root", root: true }),
    ];

    expect(selectInitialFocusId(persons)).toBe("root");
  });

  it("falls back to the first record when no root is marked", () => {
    expect(selectInitialFocusId([makePerson({ id: "first" })])).toBe("first");
  });

  it("returns an empty string for an empty list", () => {
    expect(selectInitialFocusId([])).toBe("");
  });
});
