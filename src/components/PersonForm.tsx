import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFamilyTree } from "../context/FamilyTreeContext";
import { isValidBirthDate } from "../engine/birthDate";
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

  const update = (
    field: keyof Person,
    value: string | number | string[] | undefined
  ) => {
    if (value === undefined) {
      const { [field]: _, ...rest } = form;
      const updated = rest as Person;
      setForm(updated);
      dispatch({ type: "UPDATE_PERSON", person: updated });
    } else {
      const updated = { ...form, [field]: value };
      setForm(updated);
      dispatch({ type: "UPDATE_PERSON", person: updated });
    }
  };

  const currentSiblings: string[] = form.siblings ?? [];

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
          <label className="block text-xs text-slate-400 mb-1">{t("editor.birthDate")}</label>
          <input
            type="text"
            inputMode="numeric"
            value={form.birthDate}
            onChange={(e) => update("birthDate", e.target.value)}
            placeholder="YYYYMMDD or YYYY"
            className={`w-full px-2 py-1.5 text-sm rounded bg-slate-800 border text-slate-200 focus:outline-none ${
              isValidBirthDate(form.birthDate)
                ? "border-slate-600 focus:border-purple-500"
                : "border-red-500 focus:border-red-400"
            }`}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">{t("editor.birthOrder")}</label>
          <input type="number" min={1} value={form.birthOrder} onChange={(e) => update("birthOrder", Number(e.target.value) || 1)}
            className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-600 text-slate-200 focus:border-purple-500 focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">{t("editor.gender")}</label>
        <select value={form.gender ?? ""} onChange={(e) => update("gender", e.target.value === "" ? undefined : e.target.value)}
          className="w-full px-2 py-1.5 text-sm rounded bg-slate-800 border border-slate-600 text-slate-200 focus:border-purple-500 focus:outline-none">
          <option value="">{t("editor.genderUnspecified")}</option>
          <option value="male">{t("editor.genderMale")}</option>
          <option value="female">{t("editor.genderFemale")}</option>
        </select>
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
        <label className="block text-xs text-slate-400 mb-1">{t("editor.siblings")}</label>
        <div className="max-h-32 overflow-y-auto border border-slate-600 rounded bg-slate-800 p-2 space-y-1">
          {personOptions.length === 0 ? (
            <span className="text-xs text-slate-500">{t("editor.none")}</span>
          ) : (
            personOptions.map((p) => {
              const checked = currentSiblings.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer hover:bg-slate-700 px-1 py-0.5 rounded"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...currentSiblings, p.id]
                        : currentSiblings.filter((s) => s !== p.id);
                      update("siblings", next);
                    }}
                    className="rounded"
                  />
                  <span>
                    {p.name || <span className="italic text-slate-500">Unnamed</span>}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>

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
