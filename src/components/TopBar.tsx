import { useEffect, useRef, useState } from "react";
import type { AppMode, View } from "../types";
import { Icon } from "./Icon";

interface TopBarProps {
  mode: AppMode;
  view: View;
  onModeChange: (mode: AppMode) => void;
  onNavigate: (view: View) => void;
  canAdmin?: boolean;
  userEmail?: string | null;
  isPreview?: boolean;
  onSignOut?: () => void;
}

export function TopBar({ mode, view, onModeChange, onNavigate, canAdmin = true, userEmail, isPreview = false, onSignOut }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAdmin = mode === "admin";
  const accountLabel = isPreview ? "Preview" : userEmail ?? "Account";

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePress);
    };
  }, [menuOpen]);

  const chooseMode = (nextMode: AppMode) => {
    onModeChange(nextMode);
    setMenuOpen(false);
  };

  return (
    <header className={`topbar topbar-${view}`}>
      <div className="topbar-inner">
        <button className="wordmark" onClick={() => onNavigate(isAdmin ? "admin" : "home")} aria-label="collect home">
          collect<span className="wordmark-dot">.</span>
        </button>

        <div className="topbar-actions" ref={menuRef}>
          <button
            className={`account-button ${menuOpen ? "account-button-open" : ""}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="account-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span>{accountLabel}</span>
            <Icon name="chevron-down" size={14} />
          </button>
          {menuOpen && (
            <div className="account-menu" id="account-menu" role="menu" aria-label="Account and workspace">
              <div className="account-menu-heading">{isPreview ? "Interface preview" : userEmail ?? "Signed in"}</div>
              <button role="menuitem" aria-current={!isAdmin ? "page" : undefined} className={!isAdmin ? "account-menu-selected" : ""} onClick={() => chooseMode("contributor")}>Fieldwork</button>
              {canAdmin && <button role="menuitem" aria-current={isAdmin ? "page" : undefined} className={isAdmin ? "account-menu-selected" : ""} onClick={() => chooseMode("admin")}>Admin</button>}
              {onSignOut && <button role="menuitem" className="account-menu-signout" onClick={() => { onSignOut(); setMenuOpen(false); }}>{isPreview ? "Exit preview" : "Sign out"}</button>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
