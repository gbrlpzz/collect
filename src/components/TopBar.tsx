import { useEffect, useRef, useState } from "react";
import type { AppMode, View } from "../types";
import { getMyProfile, type ContributorProfile } from "../lib/consent";
import { formatAttentionScore } from "../lib/attention";
import { Icon } from "./Icon";

interface TopBarProps {
  mode: AppMode;
  view: View;
  onNavigate: (view: View) => void;
  userEmail?: string | null;
  isPreview?: boolean;
  onSignOut?: () => void;
}

/** Admin and fieldwork are separate app surfaces, selected by the installed
 * app / entry URL rather than a workspace switcher in the collection UI. */
export function TopBar({
  mode,
  view,
  onNavigate,
  userEmail,
  isPreview = false,
  onSignOut,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<ContributorProfile | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAdmin = mode === "admin";

  useEffect(() => {
    if (!userEmail) {
      setProfile(null);
      return;
    }
    let active = true;
    void getMyProfile()
      .then((value) => {
        if (active) setProfile(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [userEmail]);
  const accountLabel = isPreview ? "Preview" : (userEmail ?? "Account");
  const surfaceLabel = isAdmin ? "Admin" : "Fieldwork";

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      )
        setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePress);
    };
  }, [menuOpen]);

  return (
    <header
      className={`topbar topbar-${view} topbar-${mode}`}
      data-surface={mode}
    >
      <div className="topbar-inner">
        <div className="topbar-brand">
          <button
            className="wordmark"
            onClick={() => onNavigate(isAdmin ? "admin" : "home")}
            aria-label={`collect ${surfaceLabel.toLowerCase()} home`}
          >
            collect<span className="wordmark-dot">.</span>
          </button>
          <span className="surface-label">{surfaceLabel}</span>
        </div>

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
            <div
              className="account-menu"
              id="account-menu"
              role="menu"
              aria-label="Account"
            >
              <div className="account-menu-heading">
                {isPreview ? "Interface preview" : (userEmail ?? "Signed in")}
              </div>
              {profile && (
                <div className="account-menu-profile">
                  <strong>
                    {formatAttentionScore(
                      profile.attentionScore,
                      profile.attentionChecksTotal,
                    ) ?? "No attention checks yet"}
                  </strong>
                  <span>
                    Adjusted for random guessing · 0 = blind-guessing level
                  </span>
                </div>
              )}
              {onSignOut && (
                <button
                  role="menuitem"
                  className="account-menu-signout"
                  onClick={() => {
                    onSignOut();
                    setMenuOpen(false);
                  }}
                >
                  {isPreview ? "Exit preview" : "Sign out"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
