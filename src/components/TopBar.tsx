import { useEffect, useRef, useState } from "react";
import type { AppMode, View } from "../types";
import { getMyProfile, type ContributorProfile } from "../lib/consent";
import { Icon } from "./Icon";
import { AttentionScoreRing } from "./ui";

interface TopBarProps {
  mode: AppMode;
  view: View;
  onNavigate: (view: View) => void;
  userEmail?: string | null;
  isPreview?: boolean;
  onLinkDevice?: () => void;
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
  onLinkDevice,
  onSignOut,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileInfoOpen, setProfileInfoOpen] = useState(false);
  const [profile, setProfile] = useState<ContributorProfile | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAdmin = mode === "admin";

  useEffect(() => {
    if (!userEmail || isAdmin) {
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
  }, [isAdmin, userEmail]);
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
            aria-haspopup="dialog"
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
              role="dialog"
              aria-label="Account profile"
            >
              <div className="account-menu-heading">
                {isPreview ? "Interface preview" : (userEmail ?? "Signed in")}
              </div>
              {profile && (
                <div className="account-profile" aria-label="Your profile">
                  <div className="account-profile-metrics">
                    <div className="account-metric">
                      <strong>{profile.contributionCount}</strong>
                      <span>Contributions</span>
                    </div>
                    <button
                      type="button"
                      className="account-metric account-metric-score"
                      aria-expanded={profileInfoOpen}
                      onClick={() => setProfileInfoOpen((open) => !open)}
                    >
                      <AttentionScoreRing
                        score={profile.attentionScore}
                        total={profile.attentionChecksTotal}
                      />
                      <span>
                        <strong>Attention</strong>
                        <span>
                          {profile.attentionChecksTotal
                            ? `${profile.attentionChecksTotal} checks`
                            : "No checks yet"}
                        </span>
                      </span>
                      <Icon name="info" size={16} />
                    </button>
                  </div>
                  {profileInfoOpen && (
                    <div className="account-score-explainer" role="status">
                      <strong>About this score</strong>
                      <p>
                        It summarizes the quick verification questions in your
                        observations and adjusts for random guessing. It never
                        changes or removes a contribution.
                      </p>
                    </div>
                  )}
                  <div className="account-consent-status">
                    <Icon name="shield" size={15} />
                    <span>
                      Data consent recorded
                      {profile.consentGrantedAt
                        ? ` · ${new Date(profile.consentGrantedAt).toLocaleDateString()}`
                        : ""}
                    </span>
                  </div>
                </div>
              )}
              {onLinkDevice && (
                <button
                  type="button"
                  className="account-menu-device-link"
                  onClick={() => {
                    onLinkDevice();
                    setMenuOpen(false);
                  }}
                >
                  <Icon name="users" size={17} />
                  <span>Sign in another device</span>
                  <Icon name="chevron-right" size={15} />
                </button>
              )}
              {onSignOut && (
                <button
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
