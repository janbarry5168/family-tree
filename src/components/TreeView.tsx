import { useState } from "react";
import { useFamilyTree } from "../context/FamilyTreeContext";
import TreeCanvas from "./TreeCanvas";
import Toolbar from "./Toolbar";
import InfoPanel from "./InfoPanel";
import EditorPanel from "./EditorPanel";

export default function TreeView() {
  const { state } = useFamilyTree();
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-[#0f172a] text-slate-200">
      <Toolbar onEditClick={() => setEditorOpen(!editorOpen)} />
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1">
          <TreeCanvas />
        </div>
        <InfoPanel selectedId={state.focusedPersonId} />
        {editorOpen && <EditorPanel onClose={() => setEditorOpen(false)} />}
      </div>
    </div>
  );
}
