import type { AppMode, View } from "../types";
import { Icon } from "./Icon";
import { Avatar, StatusBadge } from "./Primitives";

interface TopBarProps {
  mode: AppMode;
  view: View;
  onModeChange: (mode: AppMode) => void;
  onNavigate: (view: View) => void;
  isRemote?: boolean;
}

export function TopBar({ mode, view, onModeChange, onNavigate, isRemote = false }: TopBarProps) {
  const isAdmin = mode === "admin";
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button className="wordmark" onClick={() => onNavigate(isAdmin ? "admin" : "home")} aria-label="collect home">
          collect<span className="wordmark-dot">.</span>
        </button>

        <div className="role-switch" aria-label="Choose workspace surface">
          <button className={!isAdmin ? "role-active" : ""} onClick={() => onModeChange("contributor")}>
            Fieldwork
          </button>
          <button className={isAdmin ? "role-active" : ""} onClick={() => onModeChange("admin")}>
            Admin
          </button>
        </div>

        <div className="topbar-actions">
          <StatusBadge tone="soft">
            <span className="desktop-only">{isRemote ? "Secure workspace · " : "Local demo · "}</span>offline ready
          </StatusBadge>
          <button className="user-menu" aria-label="Open profile menu">
            <Avatar initials="GP" />
            <Icon name="chevron-down" size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
