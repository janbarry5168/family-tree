import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFamilyTree } from "../context/FamilyTreeContext";

export default function SearchBox() {
  const { t } = useTranslation();
  const { state, dispatch } = useFamilyTree();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const results = query.trim()
    ? state.persons.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectPerson = (id: string) => {
    dispatch({ type: "SET_FOCUSED", id });
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={t("toolbar.search")}
        className="w-40 px-2 py-1 text-xs rounded bg-slate-800 border border-slate-600 text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul className="absolute top-full left-0 mt-1 w-56 bg-slate-800 border border-slate-600 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
          {results.map((p) => (
            <li key={p.id} onClick={() => selectPerson(p.id)}
              className="px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer">
              {p.name}
              {p.birthYear > 0 && <span className="ml-2 text-slate-500">({p.birthYear})</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
