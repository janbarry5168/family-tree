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
  selectedPersonId: string;
  degreeFilter: number;
  view: "landing" | "tree";
  warnings: string[];
  hiddenPersonIds: string[];
}

type Action =
  | { type: "LOAD_DATA"; persons: Person[]; focusedId: string; warnings?: string[]; hiddenPersonIds?: string[] }
  | { type: "SET_FOCUSED"; id: string }
  | { type: "SET_SELECTED"; id: string }
  | { type: "SET_DEGREE"; degree: number }
  | { type: "ADD_PERSON"; person: Person }
  | { type: "UPDATE_PERSON"; person: Person }
  | { type: "DELETE_PERSON"; id: string }
  | { type: "SET_VIEW"; view: "landing" | "tree" }
  | { type: "REPLACE_ALL"; persons: Person[] }
  | { type: "TOGGLE_PERSON_HIDDEN"; id: string };

function reducer(state: FamilyTreeState, action: Action): FamilyTreeState {
  switch (action.type) {
    case "LOAD_DATA":
      return {
        ...state,
        persons: action.persons,
        focusedPersonId: action.focusedId,
        selectedPersonId: action.focusedId,
        warnings: action.warnings ?? [],
        view: "tree",
        hiddenPersonIds: action.hiddenPersonIds ?? [],
      };
    case "SET_FOCUSED":
      return { ...state, focusedPersonId: action.id, selectedPersonId: action.id };
    case "SET_SELECTED":
      return { ...state, selectedPersonId: action.id };
    case "SET_DEGREE":
      return { ...state, degreeFilter: action.degree };
    case "ADD_PERSON":
      return { ...state, persons: [...state.persons, action.person] };
    case "UPDATE_PERSON": {
      const updated = action.person;
      const prev = state.persons.find((p) => p.id === updated.id);
      const prevSpouse = prev?.spouse ?? "";
      const newSpouse = updated.spouse;

      let persons = state.persons.map((p) => (p.id === updated.id ? updated : p));

      if (prevSpouse !== newSpouse) {
        // Old partner no longer points back at us
        if (prevSpouse) {
          persons = persons.map((p) =>
            p.id === prevSpouse && p.spouse === updated.id ? { ...p, spouse: "" } : p
          );
        }
        if (newSpouse) {
          // If the new spouse was already paired with someone else, break that link
          const newSpouseBefore = state.persons.find((p) => p.id === newSpouse);
          const newSpousePrevPartner = newSpouseBefore?.spouse ?? "";
          if (newSpousePrevPartner && newSpousePrevPartner !== updated.id) {
            persons = persons.map((p) =>
              p.id === newSpousePrevPartner && p.spouse === newSpouse
                ? { ...p, spouse: "" }
                : p
            );
          }
          persons = persons.map((p) =>
            p.id === newSpouse ? { ...p, spouse: updated.id } : p
          );
        }
      }

      return { ...state, persons };
    }
    case "DELETE_PERSON": {
      const cleanedPersons = state.persons
        .filter((p) => p.id !== action.id)
        .map((p) => ({
          ...p,
          father: p.father === action.id ? "" : p.father,
          mother: p.mother === action.id ? "" : p.mother,
          spouse: p.spouse === action.id ? "" : p.spouse,
          siblings: p.siblings ? p.siblings.filter((s) => s !== action.id) : p.siblings,
        }));
      const newFocused =
        state.focusedPersonId === action.id
          ? cleanedPersons[0]?.id ?? ""
          : state.focusedPersonId;
      const newSelected =
        state.selectedPersonId === action.id ? newFocused : state.selectedPersonId;
      return {
        ...state,
        persons: cleanedPersons,
        focusedPersonId: newFocused,
        selectedPersonId: newSelected,
        hiddenPersonIds: state.hiddenPersonIds.filter((id) => id !== action.id),
      };
    }
    case "SET_VIEW":
      return { ...state, view: action.view };
    case "REPLACE_ALL":
      return { ...state, persons: action.persons };
    case "TOGGLE_PERSON_HIDDEN": {
      const has = state.hiddenPersonIds.includes(action.id);
      return {
        ...state,
        hiddenPersonIds: has
          ? state.hiddenPersonIds.filter((id) => id !== action.id)
          : [...state.hiddenPersonIds, action.id],
      };
    }
    default:
      return state;
  }
}

const initialState: FamilyTreeState = {
  persons: [],
  focusedPersonId: "",
  selectedPersonId: "",
  degreeFilter: 2,
  view: "landing",
  warnings: [],
  hiddenPersonIds: [],
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
          hiddenPersonIds: state.hiddenPersonIds,
        })
      );
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [state.persons, state.focusedPersonId, state.degreeFilter, state.hiddenPersonIds]);

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
      hiddenPersonIds: Array.isArray(data.hiddenPersonIds) ? data.hiddenPersonIds : [],
    });
  }, [saved, dispatch]);

  const discard = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { hasSaved: !!saved, restore, discard };
}

export { STORAGE_KEY, reducer, initialState };
export type { FamilyTreeState, Action };
