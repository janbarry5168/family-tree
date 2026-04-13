import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import "./index.css";
import App from "./App";
import { FamilyTreeProvider } from "./context/FamilyTreeContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FamilyTreeProvider>
      <App />
    </FamilyTreeProvider>
  </StrictMode>
);
