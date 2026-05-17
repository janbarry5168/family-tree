import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useFamilyTree, useSavedSession } from "../context/FamilyTreeContext";
import { validateFamilyData } from "../engine/validation";
import { selectInitialFocusId } from "../engine/rootPerson";
import LanguageToggle from "./LanguageToggle";

export default function LandingPage() {
  const { t } = useTranslation();
  const { dispatch } = useFamilyTree();
  const { hasSaved, restore, discard } = useSavedSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDemo = async () => {
    const resp = await fetch(`${import.meta.env.BASE_URL}demo-data.json`);
    const text = await resp.text();
    const result = validateFamilyData(text);
    if (result.valid) {
      dispatch({
        type: "LOAD_DATA",
        persons: result.persons,
        focusedId: selectInitialFocusId(result.persons),
        warnings: result.warnings,
      });
    }
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
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-slate-200 px-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white">
        {t("app.title")}
      </h1>
      <p className="text-lg text-slate-400 mb-10">{t("app.tagline")}</p>

      {hasSaved && (
        <div className="mb-8 p-4 rounded-lg bg-slate-800 border border-slate-600 text-center">
          <p className="mb-3">{t("session.restorePrompt")}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={restore}
              className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white transition-colors"
            >
              {t("session.restore")}
            </button>
            <button
              onClick={discard}
              className="px-4 py-2 rounded bg-slate-600 hover:bg-slate-500 text-white transition-colors"
            >
              {t("session.discard")}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-8">
        <button
          onClick={loadDemo}
          className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
        >
          {t("landing.tryDemo")}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold border border-slate-500 transition-colors"
        >
          {t("landing.uploadData")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      <p className="text-sm text-slate-500 max-w-md text-center">
        {t("landing.instructions")}
      </p>
    </div>
  );
}
