import { useFamilyTree } from "./context/FamilyTreeContext";
import LandingPage from "./components/LandingPage";

export default function App() {
  const { state } = useFamilyTree();

  if (state.view === "landing") {
    return <LandingPage />;
  }

  // TreeView placeholder — implemented in Task 10
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex items-center justify-center">
      <p>Tree view — {state.persons.length} persons loaded</p>
    </div>
  );
}
