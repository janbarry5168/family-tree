import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useFamilyTree } from "../context/FamilyTreeContext";
import { validateFamilyData } from "../engine/validation";
import { selectInitialFocusId } from "../engine/rootPerson";
import LanguageToggle from "./LanguageToggle";
import SearchBox from "./SearchBox";

export default function Toolbar({ onEditClick }: { onEditClick: () => void }) {
  const { state, dispatch } = useFamilyTree();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state.persons, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "family-tree.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const result = validateFamilyData(text);
      if (result.valid) {
        dispatch({
          type: "LOAD_DATA",
          persons: result.persons,
          focusedId: selectInitialFocusId(result.persons),
          warnings: result.warnings,
        });
      } else {
        alert(result.errors.join("\n"));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="h-12 px-4 flex items-center gap-3 bg-[#1e293b] border-b border-slate-700 shrink-0">
      <span className="font-semibold text-sm text-white mr-2">{t("app.title")}</span>

      <div className="flex items-center gap-1.5">
        <label className="text-xs text-slate-400">{t("toolbar.degree")}</label>
        <input type="range" min={1} max={6} value={state.degreeFilter}
          onChange={(e) => dispatch({ type: "SET_DEGREE", degree: Number(e.target.value) })}
          className="w-20 accent-purple-500" />
        <span className="text-xs text-slate-300 w-3 text-center">{state.degreeFilter}</span>
      </div>

      <SearchBox />

      <div className="ml-auto flex items-center gap-2">
        <button onClick={onEditClick}
          className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 transition-colors">
          {t("toolbar.editData")}
        </button>
        <button onClick={exportJson}
          className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 transition-colors">
          {t("toolbar.exportJson")}
        </button>
        <button onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 transition-colors">
          {t("toolbar.uploadNew")}
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleUpload} className="hidden" />
        <LanguageToggle />
      </div>
    </div>
  );
}
