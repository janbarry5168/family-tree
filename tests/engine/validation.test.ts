import { describe, it, expect } from "vitest";
import { validateFamilyData } from "../../src/engine/validation";

const validPerson = (overrides: Record<string, unknown> = {}) => ({
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

describe("validateFamilyData", () => {
  describe("JSON parsing", () => {
    it("rejects invalid JSON string", () => {
      const result = validateFamilyData("not json");
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Invalid JSON");
    });

    it("rejects non-array JSON", () => {
      const result = validateFamilyData(JSON.stringify({ id: "1" }));
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("must be an array");
    });

    it("accepts valid JSON array", () => {
      const result = validateFamilyData(JSON.stringify([validPerson()]));
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("required fields", () => {
    it("rejects person missing id", () => {
      const person = validPerson();
      delete (person as Record<string, unknown>).id;
      const result = validateFamilyData(JSON.stringify([person]));
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("id");
    });

    it("rejects person missing name", () => {
      const person = validPerson();
      delete (person as Record<string, unknown>).name;
      const result = validateFamilyData(JSON.stringify([person]));
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("name");
    });

    it("rejects person missing birthOrder", () => {
      const person = validPerson();
      delete (person as Record<string, unknown>).birthOrder;
      const result = validateFamilyData(JSON.stringify([person]));
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("birthOrder");
    });
  });

  describe("unique IDs", () => {
    it("rejects duplicate IDs", () => {
      const persons = [validPerson({ id: "1" }), validPerson({ id: "1", name: "Dup" })];
      const result = validateFamilyData(JSON.stringify(persons));
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Duplicate");
    });
  });

  describe("circular references", () => {
    it("rejects A father of B, B father of A", () => {
      const persons = [
        validPerson({ id: "1", father: "2" }),
        validPerson({ id: "2", name: "B", father: "1" }),
      ];
      const result = validateFamilyData(JSON.stringify(persons));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.toLowerCase().includes("circular"))).toBe(true);
    });

    it("rejects indirect cycle in father chain", () => {
      const persons = [
        validPerson({ id: "1", father: "2" }),
        validPerson({ id: "2", name: "B", father: "3" }),
        validPerson({ id: "3", name: "C", father: "1" }),
      ];
      const result = validateFamilyData(JSON.stringify(persons));
      expect(result.valid).toBe(false);
    });
  });

  describe("warnings (non-blocking)", () => {
    it("warns on broken father reference", () => {
      const persons = [validPerson({ id: "1", father: "999" })];
      const result = validateFamilyData(JSON.stringify(persons));
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w: string) => w.includes("999"))).toBe(true);
    });

    it("warns on non-mutual spouse", () => {
      const persons = [
        validPerson({ id: "1", spouse: "2" }),
        validPerson({ id: "2", name: "B", spouse: "" }),
      ];
      const result = validateFamilyData(JSON.stringify(persons));
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w: string) => w.toLowerCase().includes("spouse"))).toBe(true);
    });

    it("warns on duplicate birthOrder among siblings", () => {
      const persons = [
        validPerson({ id: "p", name: "Parent" }),
        validPerson({ id: "1", name: "A", father: "p", birthOrder: 1 }),
        validPerson({ id: "2", name: "B", father: "p", birthOrder: 1 }),
      ];
      const result = validateFamilyData(JSON.stringify(persons));
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w: string) => w.includes("birthOrder"))).toBe(true);
    });
  });

  describe("defaults for optional fields", () => {
    it("defaults missing optional fields to empty/zero", () => {
      const minimal = { id: "1", name: "Min", birthOrder: 1 };
      const result = validateFamilyData(JSON.stringify([minimal]));
      expect(result.valid).toBe(true);
      expect(result.persons[0].father).toBe("");
      expect(result.persons[0].mother).toBe("");
      expect(result.persons[0].spouse).toBe("");
      expect(result.persons[0].birthDate).toBe("");
      expect(result.persons[0].photo).toBe("");
      expect(result.persons[0].root).toBeUndefined();
    });

    it("preserves a boolean root marker", () => {
      const result = validateFamilyData(JSON.stringify([
        validPerson({ id: "1", root: false }),
        validPerson({ id: "2", root: true }),
      ]));

      expect(result.valid).toBe(true);
      expect(result.persons[0].root).toBe(false);
      expect(result.persons[1].root).toBe(true);
    });
  });

  describe("legacy birthYear migration", () => {
    it("normalizePerson migrates legacy birthYear (number) to birthDate (string)", () => {
      const json = JSON.stringify([{ id: "1", name: "A", birthOrder: 1, birthYear: 1985 }]);
      const result = validateFamilyData(json);
      expect(result.valid).toBe(true);
      expect(result.persons[0].birthDate).toBe("1985");
    });

    it("normalizePerson preserves birthDate when both birthDate and birthYear are present", () => {
      const json = JSON.stringify([
        { id: "1", name: "A", birthOrder: 1, birthDate: "19850315", birthYear: 1985 },
      ]);
      const result = validateFamilyData(json);
      expect(result.valid).toBe(true);
      expect(result.persons[0].birthDate).toBe("19850315");
    });

    it("normalizePerson sets empty birthDate when birthYear is 0 or missing", () => {
      const json = JSON.stringify([
        { id: "1", name: "A", birthOrder: 1, birthYear: 0 },
        { id: "2", name: "B", birthOrder: 1 },
      ]);
      const result = validateFamilyData(json);
      expect(result.valid).toBe(true);
      expect(result.persons[0].birthDate).toBe("");
      expect(result.persons[1].birthDate).toBe("");
    });
  });
});
