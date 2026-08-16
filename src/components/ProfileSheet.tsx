import { useState } from "react";
import type { Observation } from "../types";
import type { ContributorProfile } from "../lib/consent";
import { canOfferIosInstall } from "../lib/platform";
import {
  formatCalendarDate,
  formatExactTime,
  formatRelativeTime,
} from "../lib/formatTime";
import { Icon } from "./Icon";
import { CollectBrand } from "./CollectBrand";
import {
  AttentionScoreRing,
  Button,
  ConfirmationDialog,
  IconButton,
  ModalSurface,
} from "./ui";
import { APP_VERSION, FEEDBACK_URL } from "../lib/appMeta";

interface ProfileSheetProps {
  userEmail?: string | null;
  profile: ContributorProfile | null;
  organizationName?: string | null;
  observations?: Observation[];
  lastSyncAt: string | null;
  storagePersistence?: "unknown" | "granted" | "not-granted";
  isAdmin: boolean;
  isPreview: boolean;
  onClose: () => void;
  onLinkDevice?: () => void;
  onRecoveryExport?: () => void;
  onSignOut?: () => void;
}

export function ProfileSheet({
  userEmail,
  profile,
  organizationName,
  observations = [],
  lastSyncAt,
  storagePersistence = "unknown",
  isAdmin,
  isPreview,
  onClose,
  onLinkDevice,
  onRecoveryExport,
  onSignOut,
}: ProfileSheetProps) {
  const profileOrganization = organizationName?.trim();
  const pendingCount = (observations ?? []).filter(
    (observation) => observation.status !== "SYNCED",
  ).length;
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const installAvailable = canOfferIosInstall();
  const exactSyncTime = formatExactTime(lastSyncAt);

  return (
    <ModalSurface
      onClose={onClose}
      labelledBy="profile-sheet-title"
      className="profile-sheet"
    >
      <div className="sheet-handle" />
      <div className="sheet-heading">
        <h2 id="profile-sheet-title">Profile</h2>
        <IconButton
          label="Close profile"
          icon="x"
          data-modal-autofocus
          onClick={onClose}
        />
      </div>

      <p className="profile-email">
        {isPreview
          ? "Preview session"
          : (userEmail ?? "Account email unavailable")}
      </p>
      {profileOrganization && (
        <p className="profile-organization">{profileOrganization}</p>
      )}

      {!isAdmin && (
        <>
          <div className="profile-metrics" aria-label="Contribution statistics">
            <div>
              <strong>
                {profile?.contributionCount ?? observations.length}
              </strong>
              <span>Contributions</span>
            </div>
            <div>
              <strong>{pendingCount}</strong>
              <span>Saved here</span>
            </div>
            <details className="profile-attention">
              <summary aria-label="Explain attention score">
                <AttentionScoreRing
                  score={profile?.attentionScore ?? null}
                  total={profile?.attentionChecksTotal ?? null}
                />
                <span>Attention</span>
                <Icon name="info" size={15} />
              </summary>
              <p>
                Attention score (0–100), chance-adjusted. A higher score means
                more attention checks were answered correctly.
              </p>
            </details>
          </div>

          <dl className="profile-status-list">
            <div>
              <dt>Last server receipt</dt>
              <dd title={exactSyncTime}>
                {lastSyncAt ? formatRelativeTime(lastSyncAt) : "Not yet"}
              </dd>
            </div>
            <div>
              <dt>Data consent</dt>
              <dd>
                {profile?.consentGrantedAt
                  ? formatCalendarDate(profile.consentGrantedAt)
                  : "Not recorded"}
              </dd>
            </div>
            <div>
              <dt>Storage protection</dt>
              <dd>
                {storagePersistence === "granted"
                  ? "Persistent"
                  : storagePersistence === "not-granted"
                    ? "Browser managed"
                    : "Unknown"}
              </dd>
            </div>
          </dl>
        </>
      )}

      <div className="profile-actions-list">
        {installAvailable && (
          <details className="profile-disclosure">
            <summary>
              <Icon name="plus" size={17} />
              <span>
                <strong>Add collect to Home Screen</strong>
              </span>
              <Icon name="chevron-down" size={15} />
            </summary>
            <ol>
              <li>Tap Safari’s Share button.</li>
              <li>Choose “Add to Home Screen”.</li>
              <li>Open the new collect icon and sign in with a device code.</li>
            </ol>
          </details>
        )}

        {onLinkDevice && (
          <button
            type="button"
            className="profile-action-row"
            onClick={() => {
              onClose();
              onLinkDevice();
            }}
          >
            <Icon name="users" size={17} />
            <span>
              <strong>Sign in another device</strong>
              <span>Create a one-time code</span>
            </span>
            <Icon name="chevron-right" size={15} />
          </button>
        )}

        {!isAdmin && (
          <details className="profile-disclosure profile-privacy">
            <summary>
              <Icon name="lock" size={17} />
              <span>
                <strong>Data and privacy</strong>
              </span>
              <Icon name="chevron-down" size={15} />
            </summary>
            <dl>
              <div>
                <dt>Your record</dt>
                <dd>Answers, chosen media, save time, and schema version.</dd>
              </div>
              <div>
                <dt>Background context</dt>
                <dd>
                  Location when permitted and device context used to verify and
                  recover fieldwork.
                </dd>
              </div>
              <div>
                <dt>Access</dt>
                <dd>Only this project and its authorized administrators.</dd>
              </div>
              <div>
                <dt>Transfer</dt>
                <dd>
                  Saved on this device first, then sent to the project server.
                </dd>
              </div>
              <div>
                <dt>After sign-out</dt>
                <dd>
                  Saved observations and media stay on this device; signing out
                  does not remove them. They sync after you sign back in here.
                </dd>
              </div>
            </dl>
            {onRecoveryExport && (
              <Button
                variant="secondary"
                icon="download"
                fullWidth
                onClick={onRecoveryExport}
              >
                Export local data copy
              </Button>
            )}
          </details>
        )}

        <details className="profile-disclosure profile-about">
          <summary>
            <Icon name="info" size={17} />
            <span>
              <strong>About collect</strong>
            </span>
            <Icon name="chevron-down" size={15} />
          </summary>
          <div className="profile-about-content">
            <div className="profile-about-identity">
              <CollectBrand compact showMark={false} />
              <span>Version {APP_VERSION}</span>
            </div>
            <p>
              Developed by{" "}
              <a
                href="https://gabrielepizzi.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Gabriele Pizzi
              </a>
              .
            </p>
            <p className="profile-about-legal">
              © 2026 Gabriele Pizzi ·{" "}
              <a
                href="https://github.com/gbrlpzz/collect/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
              >
                Apache-2.0
              </a>
            </p>
            <a
              className="button button-secondary button-full profile-feedback"
              href={FEEDBACK_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="send" size={17} />
              <span>Send feedback</span>
            </a>
          </div>
        </details>
      </div>

      {onSignOut && (
        <button
          type="button"
          className="profile-signout"
          onClick={() => {
            if (!isPreview && pendingCount > 0) {
              setConfirmingSignOut(true);
              return;
            }
            onClose();
            onSignOut();
          }}
        >
          {isPreview ? "Exit preview" : "Sign out"}
        </button>
      )}

      {confirmingSignOut && onSignOut && (
        <ConfirmationDialog
          title="Sign out with unsaved work?"
          message={`${pendingCount} ${
            pendingCount === 1 ? "observation is" : "observations are"
          } saved on this device but not yet synced. They stay here safely and will sync after you sign back in on this device.`}
          confirmLabel="Sign out"
          onConfirm={() => {
            setConfirmingSignOut(false);
            onClose();
            onSignOut();
          }}
          onCancel={() => setConfirmingSignOut(false)}
        />
      )}
    </ModalSurface>
  );
}
