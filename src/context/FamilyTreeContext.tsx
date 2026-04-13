// src/context/FamilyTreeContext.tsx
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
  type Dispatch,
} from "react";
import type { Person } from "../types/person";

const STORAGE_KEY = "family-tree-data";
const AUTO_SAVE_INTERVAL = 30_000;

interface FamilyTreeState {
  persons: Person[];
  focusedPersonId: string;
  degreeFilter: number;
  view: "landing" | "tree";
  warnings: string[];
}

type Action =
  | { type: "LOAD_DATA"; persons: Person[]; focusedId: string; warnings?: string[] }
  | { type: "SET_FOCUSED"; id: string }
  | { type: "SET_DEGREE"; degree: number }
  | { type: "ADD_PERSON"; person: Person }
  | { type: "UPDATE_PERSON"; person: Person }
  | { type: "DELETE_PERSON"; id: string }
  | { type: "SET_VIEW"; view: "landing" | "tree" }
  | { type: "REPLACE_ALL"; persons: Person[] };

function reducer(state: FamilyTreeState, action: Action): FamilyTreeState {
  switch (action.type) {
    case "LOAD_DATA":
      return {
        ...state,
        persons: action.persons,
        focusedPersonId: action.focusedId,
        warnings: action.warnings ?? [],
        view: "tree",
      };
    case "SET_FOCUSED":
      return { ...state, focusedPersonId: action.id };
    case "SET_DEGREE":
      return { ...state, degreeFilter: action.degree };
    case "ADD_PERSON":
      return { ...state, persons: [...state.persons, action.person] };
    case "UPDATE_PERSON":
      return {
        ...state,
        persons: state.persons.map((p) =>
          p.id === action.person.id ? action.person : p
        ),
      };
    case "DELETE_PERSON": {
      const cleanedPersons = state.persons
        .filter((p) => p.id !== action.id)
        .map((p) => ({
          ...p,
          father: p.father === action.id ? "" : p.father,
          mother: p.mother === action.id ? "" : p.mother,
          spouse: p.spouse === action.id ? "" : p.spouse,
        }));
      const newFocused =
        state.focusedPersonId === action.id
          ? cleanedPersons[0]?.id ?? ""
          : state.focusedPersonId;
      return { ...state, persons: cleanedPersons, focusedPersonId: newFocused };
    }
    case "SET_VIEW":
      return { ...state, view: action.view };
    case "REPLACE_ALL":
      return { ...state, persons: action.persons };
    default:
      return state;
  }
}

const initialState: FamilyTreeState = {
  persons: [],
  focusedPersonId: "",
  degreeFilter: 2,
  view: "landing",
  warnings: [],
};

const FamilyTreeContext = createContext<{
  state: FamilyTreeState;
  dispatch: Dispatch<Action>;
}>({ state: initialState, dispatch: () => {} });

export function FamilyTreeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    if (state.persons.length === 0) return;
    const interval = setInterval(() => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          persons: state.persons,
          focusedPersonId: state.focusedPersonId,
          degreeFilter: state.degreeFilter,
        })
      );
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [state.persons, state.focusedPersonId, state.degreeFilter]);

  return (
    <FamilyTreeContext.Provider value={{ state, dispatch }}>
      {children}
    </FamilyTreeContext.Provider>
  );
}

export function useFamilyTree() {
  return useContext(FamilyTreeContext);
}

export function useSavedSession(): {
  hasSaved: boolean;
  restore: () => void;
  discard: () => void;
} {
  const { dispatch } = useFamilyTree();
  const saved = localStorage.getItem(STORAGE_KEY);

  const restore = useCallback(() => {
    if (!saved) return;
    const data = JSON.parse(saved);
    dispatch({
      type: "LOAD_DATA",
      persons: data.persons,
      focusedId: data.focusedPersonId,
    });
  }, [saved, dispatch]);

  const discard = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { hasSaved: !!saved, restore, discard };
}

export { STORAGE_KEY };
export type { FamilyTreeState, Action };
