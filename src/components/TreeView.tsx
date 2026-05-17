import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFamilyTree } from "../context/FamilyTreeContext";
import TreeCanvas from "./TreeCanvas";
import Toolbar from "./Toolbar";
import InfoPanel from "./InfoPanel";
import EditorPanel from "./EditorPanel";
import { computeKinshipDegrees } from "../engine/kinship";

export default function TreeView() {
  const { state } = useFamilyTree();
  const [editorOpen, setEditorOpen] = useState(false);
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);
  const { t } = useTranslation();

  const degrees = useMemo(
    () => computeKinshipDegrees(state.persons, state.focusedPersonId),
    [state.persons, state.focusedPersonId]
  );
  const disconnectedCount = state.persons.length - degrees.size;

  useEffect(() => {
    if (state.selectedPersonId) {
      setInfoPanelOpen(true);
    }
  }, [state.selectedPersonId]);

  return (
    <div className="h-screen flex flex-col bg-[#0f172a] text-slate-200">
      <Toolbar onEditClick={() => setEditorOpen(!editorOpen)} />
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative">
          <TreeCanvas />
          {disconnectedCount > 0 && (
            <div className="absolute bottom-4 left-4 px-3 py-2 bg-slate-800/90 rounded text-xs text-slate-400 border border-slate-700">
              {t("tree.disconnectedNotice", { count: disconnectedCount })}
            </div>
          )}
          {!infoPanelOpen && state.selectedPersonId && (
            <button
              type="button"
              onClick={() => setInfoPanelOpen(true)}
              className="absolute right-4 top-4 rounded border border-slate-600 bg-slate-800/90 px-3 py-2 text-xs text-slate-200 shadow-lg hover:bg-slate-700"
            >
              {t("info.open")}
            </button>
          )}
        </div>
        {infoPanelOpen && (
          <InfoPanel
            selectedId={state.selectedPersonId}
            onClose={() => setInfoPanelOpen(false)}
          />
        )}
        {editorOpen && <EditorPanel onClose={() => setEditorOpen(false)} />}
      </div>
    </div>
  );
}
