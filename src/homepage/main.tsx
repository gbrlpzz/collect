import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HomepageApp } from "./HomepageApp";
import { LenisRoot } from "./LenisRoot";
import "../styles.css";
import "./homepage.css";

// The homepage is a second Vite entry in the same bundle as the app. It
// imports the real components, fixtures, and style layers, so any change to
// the app's frontend shows up here automatically. It deliberately never
// imports src/main.tsx (no service worker) or any Supabase client: nothing
// on this page records anything anywhere except the preview-request form.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LenisRoot>
      <HomepageApp />
    </LenisRoot>
  </StrictMode>,
);
