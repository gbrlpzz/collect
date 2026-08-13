import { useEffect, useState } from "react";
import type { AppMode, Observation, View } from "../types";
import { getMyProfile, type ContributorProfile } from "../lib/consent";
import { Icon } from "./Icon";
import { ProfileSheet } from "./ProfileSheet";

interface TopBarProps {
  mode: AppMode;
  view: View;
  onNavigate: (view: View) => void;
  userEmail?: string | null;
  isPreview?: boolean;
  observations?: Observation[];
  lastSyncAt?: string | null;
  onLinkDevice?: () => void;
  onRecoveryExport?: () => void;
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
  observations = [],
  lastSyncAt = null,
  onLinkDevice,
  onRecoveryExport,
  onSignOut,
}: TopBarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<ContributorProfile | null>(null);
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
  const surfaceLabel = isAdmin ? "Admin" : "Fieldwork";

  return (
    <>
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

          <div className="topbar-actions">
            <button
              className={`account-button ${profileOpen ? "account-button-open" : ""}`}
              aria-label={isPreview ? "Open preview profile" : "Open profile"}
              aria-expanded={profileOpen}
              aria-haspopup="dialog"
              onClick={() => setProfileOpen(true)}
            >
              <Icon name="person" size={20} />
            </button>
          </div>
        </div>
      </header>
      {profileOpen && (
        <ProfileSheet
          profile={profile}
          observations={observations}
          lastSyncAt={lastSyncAt}
          isAdmin={isAdmin}
          isPreview={isPreview}
          onClose={() => setProfileOpen(false)}
          onLinkDevice={onLinkDevice}
          onRecoveryExport={onRecoveryExport}
          onSignOut={onSignOut}
        />
      )}
    </>
  );
}
