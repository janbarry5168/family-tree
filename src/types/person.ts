export interface Person {
  id: string;
  name: string;
  gender?: "male" | "female";
  father: string;
  mother: string;
  spouse: string;
  birthOrder: number;
  birthYear: number;
  photo: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  persons: Person[];
}

export type NodeType = "focused" | "blood" | "spouse" | "ghost";

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  generation: number;
  nodeType: NodeType;
  degree: number;
}

export type Gender = "male" | "female" | "unknown";
