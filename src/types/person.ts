export interface Person {
  id: string;
  name: string;
  gender?: "male" | "female";
  father: string;
  mother: string;
  spouse: string;
  // Explicit sibling ids (bidirectional at query time). Optional on the type
  // for easier test construction; `normalizePerson` always produces an array.
  // Needed for older generations where parents aren't recorded but two people
  // are known to be siblings.
  siblings?: string[];
  birthOrder: number;
  birthDate: string;
  photo: string;
  root?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  persons: Person[];
}

export type NodeType = "focused" | "blood" | "spouse";

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  generation: number;
  nodeType: NodeType;
  degree: number;
}

export type Gender = "male" | "female" | "unknown";
