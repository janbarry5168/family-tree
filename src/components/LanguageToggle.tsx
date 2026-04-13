import { useTranslation } from "react-i18next";

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const toggle = () => {
    i18n.changeLanguage(isEn ? "zh-TW" : "en");
  };

  return (
    <button
      onClick={toggle}
      className="px-3 py-1.5 text-sm rounded border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
    >
      {isEn ? "繁中" : "EN"}
    </button>
  );
}
