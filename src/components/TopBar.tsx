import { useState } from "react";
import type { AppMode, View } from "../types";
import { Icon } from "./Icon";

interface TopBarProps {
  mode: AppMode;
  view: View;
  onModeChange: (mode: AppMode) => void;
  onNavigate: (view: View) => void;
  userEmail?: string | null;
  isPreview?: boolean;
  onSignOut?: () => void;
}

export function TopBar({ mode, view, onModeChange, onNavigate, userEmail, isPreview = false, onSignOut }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = mode === "admin";
  const accountLabel = isPreview ? "Preview" : userEmail ?? "Account";
  return (
    <header className={`topbar topbar-${view}`}>
      <div className="topbar-inner">
        <button className="wordmark" onClick={() => onNavigate(isAdmin ? "admin" : "home")} aria-label="collect home">
          collect<span className="wordmark-dot">.</span>
        </button>

        <div className="topbar-actions">
          <button className={`account-button ${menuOpen ? "account-button-open" : ""}`} aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => setMenuOpen((open) => !open)}>
            <span>{accountLabel}</span>
            <Icon name="chevron-down" size={14} />
          </button>
          {menuOpen && (
            <div className="account-menu" role="menu">
              <div className="account-menu-heading">{isPreview ? "Interface preview" : userEmail ?? "Signed in"}</div>
              <button role="menuitem" className={!isAdmin ? "account-menu-selected" : ""} onClick={() => { onModeChange("contributor"); setMenuOpen(false); }}>Fieldwork</button>
              <button role="menuitem" className={isAdmin ? "account-menu-selected" : ""} onClick={() => { onModeChange("admin"); setMenuOpen(false); }}>Admin</button>
              {onSignOut && <button role="menuitem" className="account-menu-signout" onClick={() => { onSignOut(); setMenuOpen(false); }}>{isPreview ? "Exit preview" : "Sign out"}</button>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
