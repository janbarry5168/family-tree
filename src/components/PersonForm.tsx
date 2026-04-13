import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFamilyTree } from "../context/FamilyTreeContext";
import type { Person } from "../types/person";

interface Props {
  person: Person;
  onClose: () => void;
}

export default function PersonForm({ person, onClose }: Props) {
  const { t } = useTranslation();
  const { state, dispatch } = useFamilyTree();
  const [form, setForm] = useState<Person>(person);

  useEffect(() => {
    setForm(person);
  }, [person]);

  const update = (field: keyof Person, value: string | number) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    dispatch({ type: "UPDATE_PERSON", person: updated });
  };

  const handleDelete = () => {
    if (window.confirm(t("editor.confirmDelete"))) {
      dispatch({ type: "DELETE_PERSON", id: person.id });
      onClose();
    }
  };

  const personOptions = state.persons.filter((p) => p.id !== person.id);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-slate-400 mb-1">{t("editor.name")}</label>
        <input value={form.name} onChange={(e) => update("name", e.target.value)}
          className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-600 text-slate-200 focus:border-purple-500 focus:outline-none" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">{t("editor.birthYear")}</label>
          <input type="number" value={form.birthYear || ""} onChange={(e) => update("birthYear", Number(e.target.value) || 0)}
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-600 text-slate-200 focus:border-purple-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">{t("editor.birthOrder")}</label>
          <input type="number" min={1} value={form.birthOrder} onChange={(e) => update("birthOrder", Number(e.target.value) || 1)}
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-600 text-slate-200 focus:border-purple-500 focus:outline-none" />
        </div>
      </div>

      {(["father", "mother", "spouse"] as const).map((field) => (
        <div key={field}>
          <label className="block text-xs text-slate-400 mb-1">{t(`editor.${field}`)}</label>
          <select value={form[field]} onChange={(e) => update(field, e.target.value)}
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-600 text-slate-200 focus:border-purple-500 focus:outline-none">
            <option value="">{t("editor.none")}</option>
            {personOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      ))}

      <div>
        <label className="block text-xs text-slate-400 mb-1">{t("editor.photo")}</label>
        <input value={form.photo} onChange={(e) => update("photo", e.target.value)}
          placeholder="URL or data:image/..."
          className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-600 text-slate-200 placeholder-slate-600 focus:border-purple-500 focus:outline-none" />
      </div>

      <button onClick={handleDelete}
        className="w-full mt-2 px-3 py-1.5 text-xs rounded bg-red-900/50 text-red-400 hover:bg-red-900/80 transition-colors">
        {t("editor.deletePerson")}
      </button>
    </div>
  );
}
