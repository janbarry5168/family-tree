import type { Person } from "../types/person";

export function selectInitialFocusId(persons: Person[]): string {
  return persons.find((person) => person.root === true)?.id ?? persons[0]?.id ?? "";
}
