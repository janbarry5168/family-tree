import { useTranslation } from "react-i18next";
import { useFamilyTree } from "../context/FamilyTreeContext";
import { getRelationshipLabel } from "../engine/relationships";

interface Props {
  selectedId: string | null;
}

export default function InfoPanel({ selectedId }: Props) {
  const { t, i18n } = useTranslation();
  const { state } = useFamilyTree();

  const person = selectedId ? state.persons.find((p) => p.id === selectedId) : null;
  if (!person) return null;

  const label = getRelationshipLabel(state.focusedPersonId, person.id, state.persons);
  const displayLabel = i18n.language === "zh-TW" ? label.zhTW : label.en;

  return (
    <div className="w-64 bg-[#1e293b] border-l border-slate-700 p-4 shrink-0">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">{t("info.title")}</h3>

      {person.photo && (
        <img src={person.photo} alt={person.name}
          className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-slate-600" />
      )}

      <p className="text-lg font-bold text-white mb-1">{person.name}</p>
      <p className="text-sm text-purple-400 mb-3">{displayLabel}</p>

      {person.birthYear > 0 && (
        <p className="text-xs text-slate-400">{t("info.birthYear")}: {person.birthYear}</p>
      )}
    </div>
  );
}
