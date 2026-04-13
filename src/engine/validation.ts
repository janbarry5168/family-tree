import type { Person, ValidationResult } from "../types/person";

const REQUIRED_FIELDS: (keyof Person)[] = ["id", "name", "birthOrder"];

function normalizePerson(raw: Record<string, unknown>): Person {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    father: String(raw.father ?? ""),
    mother: String(raw.mother ?? ""),
    spouse: String(raw.spouse ?? ""),
    birthOrder: Number(raw.birthOrder ?? 0),
    birthYear: Number(raw.birthYear ?? 0),
    photo: String(raw.photo ?? ""),
  };
}

function checkRequiredFields(raw: Record<string, unknown>[], errors: string[]): boolean {
  let valid = true;
  for (let i = 0; i < raw.length; i++) {
    for (const field of REQUIRED_FIELDS) {
      if (raw[i][field] === undefined || raw[i][field] === null || raw[i][field] === "") {
        if (field === "birthOrder" && raw[i][field] === 0) continue;
        errors.push(`Person at index ${i}: missing required field "${field}"`);
        valid = false;
      }
    }
  }
  return valid;
}

function checkUniqueIds(raw: Record<string, unknown>[], errors: string[]): boolean {
  const ids = raw.map((p) => String(p.id));
  const seen = new Set<string>();
  let valid = true;
  for (const id of ids) {
    if (seen.has(id)) {
      errors.push(`Duplicate id: "${id}"`);
      valid = false;
    }
    seen.add(id);
  }
  return valid;
}

function checkCircularReferences(persons: Person[], errors: string[]): boolean {
  const byId = new Map(persons.map((p) => [p.id, p]));
  let valid = true;

  for (const person of persons) {
    for (const parentField of ["father", "mother"] as const) {
      const visited = new Set<string>();
      let current: string | undefined = person.id;
      while (current) {
        if (visited.has(current)) {
          errors.push(`Circular reference detected in ${parentField} chain involving "${person.id}"`);
          valid = false;
          break;
        }
        visited.add(current);
        const p = byId.get(current);
        current = p?.[parentField] || undefined;
      }
    }
  }
  return valid;
}

function checkWarnings(persons: Person[]): string[] {
  const warnings: string[] = [];
  const idSet = new Set(persons.map((p) => p.id));
  const byId = new Map(persons.map((p) => [p.id, p]));

  for (const person of persons) {
    // Broken references (non-blocking: a person may be added later)
    for (const field of ["father", "mother", "spouse"] as const) {
      if (person[field] && !idSet.has(person[field])) {
        warnings.push(
          `"${person.name}" (${person.id}): ${field} references non-existent id "${person[field]}"`
        );
      }
    }

    // Spouse reciprocity — one-way link is a data quality issue, not invalid
    if (person.spouse && idSet.has(person.spouse)) {
      const other = byId.get(person.spouse)!;
      if (other.spouse !== person.id) {
        warnings.push(
          `Non-mutual spouse: "${person.name}" (${person.id}) → "${other.name}" (${other.id}), but not reciprocated`
        );
      }
    }
  }

  // Duplicate birthOrder within a sibling group (same father+mother key)
  const siblingGroups = new Map<string, Person[]>();
  for (const person of persons) {
    const key = [person.father, person.mother].filter(Boolean).sort().join("|");
    if (!key) continue;
    if (!siblingGroups.has(key)) siblingGroups.set(key, []);
    siblingGroups.get(key)!.push(person);
  }
  for (const siblings of siblingGroups.values()) {
    const orders = siblings.map((s) => s.birthOrder);
    const unique = new Set(orders);
    if (unique.size < orders.length) {
      const names = siblings.map((s) => `"${s.name}"`).join(", ");
      warnings.push(`Duplicate birthOrder among siblings: ${names}`);
    }
  }

  return warnings;
}

export function validateFamilyData(jsonString: string): ValidationResult {
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { valid: false, errors: ["Invalid JSON: check syntax"], warnings: [], persons: [] };
  }

  if (!Array.isArray(parsed)) {
    return { valid: false, errors: ["Data must be an array of person objects"], warnings: [], persons: [] };
  }

  const raw = parsed as Record<string, unknown>[];
  const fieldsOk = checkRequiredFields(raw, errors);
  const idsOk = checkUniqueIds(raw, errors);

  if (!fieldsOk || !idsOk) {
    return { valid: false, errors, warnings: [], persons: [] };
  }

  const persons = raw.map(normalizePerson);
  const noCircles = checkCircularReferences(persons, errors);

  if (!noCircles) {
    return { valid: false, errors, warnings: [], persons: [] };
  }

  const warnings = checkWarnings(persons);
  return { valid: true, errors: [], warnings, persons };
}
