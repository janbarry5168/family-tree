import { useFamilyTree } from "../context/FamilyTreeContext";
import { useTranslation } from "react-i18next";
import LanguageToggle from "./LanguageToggle";

export default function Toolbar({ onEditClick }: { onEditClick: () => void }) {
  const { state, dispatch } = useFamilyTree();
  const { t } = useTranslation();

  return (
    <div className="h-12 px-4 flex items-center gap-4 bg-[#1e293b] border-b border-slate-700 shrink-0">
      <span className="font-semibold text-sm text-white">{t("app.title")}</span>
      <div className="flex items-center gap-2 ml-auto">
        <label className="text-xs text-slate-400">{t("toolbar.degree")}</label>
        <input
          type="range"
          min={1}
          max={6}
          value={state.degreeFilter}
          onChange={(e) =>
            dispatch({ type: "SET_DEGREE", degree: Number(e.target.value) })
          }
          className="w-24 accent-purple-500"
        />
        <span className="text-xs w-4 text-center text-slate-300">{state.degreeFilter}</span>
        <button
          onClick={onEditClick}
          className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 transition-colors"
        >
          {t("toolbar.editData")}
        </button>
        <LanguageToggle />
      </div>
    </div>
  );
}
