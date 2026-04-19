import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useFamilyTree } from "../context/FamilyTreeContext";
import PersonForm from "./PersonForm";
import { birthYearOf } from "../engine/birthDate";
import type { Person } from "../types/person";

export default function EditorPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { state, dispatch } = useFamilyTree();
  const [selectedId, setSelectedId] = useState<string | null>(state.focusedPersonId || null);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? state.persons.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : state.persons;

  const selectedPerson = selectedId ? state.persons.find((p) => p.id === selectedId) : null;

  const addPerson = () => {
    const newId = String(Math.max(0, ...state.persons.map((p) => Number(p.id) || 0)) + 1);
    const person: Person = {
      id: newId, name: "", father: "", mother: "", spouse: "",
      birthOrder: 1, birthDate: "", photo: "",
    };
    dispatch({ type: "ADD_PERSON", person });
    setSelectedId(newId);
  };

  return (
    <div className="w-96 bg-[#1e293b] border-l border-slate-700 absolute right-0 top-0 bottom-0 flex flex-col z-10">
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("editor.title")}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-lg leading-none">&times;</button>
      </div>

      <div className="p-3 border-b border-slate-700">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t("toolbar.search")}
          className="w-full px-2 py-1.5 text-xs rounded bg-slate-800 border border-slate-600 text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => setSelectedId(p.id)}
              className={`w-full text-left px-3 py-2 text-xs rounded mb-1 transition-colors ${
                selectedId === p.id
                  ? "bg-purple-900/40 text-purple-300 border border-purple-700"
                  : "text-slate-300 hover:bg-slate-700"
              }`}>
              {p.name || <span className="text-slate-500 italic">Unnamed</span>}
              {p.birthDate && <span className="ml-2 text-slate-500">({birthYearOf(p.birthDate)})</span>}
            </button>
          ))}
        </div>
      </div>

      {selectedPerson && (
        <div className="p-3 border-t border-slate-700 overflow-y-auto max-h-[50%]">
          <PersonForm person={selectedPerson} onClose={() => setSelectedId(null)} />
        </div>
      )}

      <div className="p-3 border-t border-slate-700">
        <button onClick={addPerson}
          className="w-full px-3 py-2 text-xs rounded bg-purple-600 hover:bg-purple-700 text-white transition-colors">
          {t("editor.addPerson")}
        </button>
      </div>
    </div>
  );
}
