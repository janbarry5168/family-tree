import { useFamilyTree } from "./context/FamilyTreeContext";
import LandingPage from "./components/LandingPage";
import TreeView from "./components/TreeView";

export default function App() {
  const { state } = useFamilyTree();

  if (state.view === "landing") {
    return <LandingPage />;
  }

  return <TreeView />;
}
