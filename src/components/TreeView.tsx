import { useState, useMemo } from "react";
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
  const { t } = useTranslation();

  const degrees = useMemo(
    () => computeKinshipDegrees(state.persons, state.focusedPersonId),
    [state.persons, state.focusedPersonId]
  );
  const disconnectedCount = state.persons.length - degrees.size;

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
        </div>
        <InfoPanel selectedId={state.selectedPersonId} />
        {editorOpen && <EditorPanel onClose={() => setEditorOpen(false)} />}
      </div>
    </div>
  );
}
