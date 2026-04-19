import { useTranslation } from "react-i18next";
import { useFamilyTree } from "../context/FamilyTreeContext";
import { getRelationshipLabel } from "../engine/relationships";
import { formatBirthDate } from "../engine/birthDate";
import type { Person } from "../types/person";

interface Props {
  selectedId: string | null;
}

export default function InfoPanel({ selectedId }: Props) {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useFamilyTree();

  const person = selectedId ? state.persons.find((p) => p.id === selectedId) : null;
  if (!person) return null;

  const label = getRelationshipLabel(state.focusedPersonId, person.id, state.persons);
  const displayLabel = i18n.language === "zh-TW" ? label.zhTW : label.en;

  const byId = (id: string): Person | undefined =>
    id ? state.persons.find((p) => p.id === id) : undefined;

  const children = state.persons.filter(
    (p) => p.father === person.id || p.mother === person.id
  );

  const renderLink = (id: string) => {
    const target = byId(id);
    if (!target) {
      return <span className="text-slate-500">{t("info.none")}</span>;
    }
    return (
      <button
        type="button"
        onClick={() => dispatch({ type: "SET_SELECTED", id: target.id })}
        className="text-sky-400 hover:text-sky-300 hover:underline text-left"
      >
        {target.name}
      </button>
    );
  };

  return (
    <div className="w-64 bg-[#1e293b] border-l border-slate-700 p-4 shrink-0 overflow-y-auto">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">{t("info.title")}</h3>

      {person.photo && (
        <img src={person.photo} alt={person.name}
          className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-slate-600" />
      )}

      <p className="text-lg font-bold text-white mb-1">{person.name}</p>
      <p className="text-sm text-purple-400 mb-3">{displayLabel}</p>

      <dl className="text-xs text-slate-300 space-y-1.5">
        <div className="flex gap-2">
          <dt className="w-14 text-slate-500">{t("info.birthDate")}:</dt>
          <dd className="flex-1">
            {person.birthDate
              ? formatBirthDate(person.birthDate)
              : <span className="text-slate-500">{t("info.none")}</span>}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 text-slate-500">{t("info.father")}:</dt>
          <dd className="flex-1">{renderLink(person.father)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 text-slate-500">{t("info.mother")}:</dt>
          <dd className="flex-1">{renderLink(person.mother)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 text-slate-500">{t("info.spouse")}:</dt>
          <dd className="flex-1">{renderLink(person.spouse)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 text-slate-500">{t("info.children")}:</dt>
          <dd className="flex-1">
            {children.length === 0 ? (
              <span className="text-slate-500">{t("info.none")}</span>
            ) : (
              <div className="flex flex-col gap-1">
                {children.map((c) => (
                  <div key={c.id}>{renderLink(c.id)}</div>
                ))}
              </div>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
