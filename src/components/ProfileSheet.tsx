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
import { AttentionScoreRing, Button, IconButton, ModalSurface } from "./ui";
import { APP_VERSION, FEEDBACK_URL } from "../lib/appMeta";

interface ProfileSheetProps {
  userEmail?: string | null;
  profile: ContributorProfile | null;
  observations: Observation[];
  lastSyncAt: string | null;
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
  observations,
  lastSyncAt,
  isAdmin,
  isPreview,
  onClose,
  onLinkDevice,
  onRecoveryExport,
  onSignOut,
}: ProfileSheetProps) {
  const pendingCount = observations.filter(
    (observation) => observation.status !== "SYNCED",
  ).length;
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
        <div>
          <span className="sheet-kicker">
            {isPreview ? "Preview" : "Account"}
          </span>
          <h2 id="profile-sheet-title">
            {isAdmin ? "Admin profile" : "Your profile"}
          </h2>
        </div>
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
                This 0–100 score summarizes quick verification questions and
                adjusts for random guessing. It never changes or removes a
                contribution.
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
                <span>Open fieldwork like an app</span>
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
                <span>What collect records and why</span>
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
              <span>Version and feedback</span>
            </span>
            <Icon name="chevron-down" size={15} />
          </summary>
          <div className="profile-about-content">
            <div className="profile-about-identity">
              <CollectBrand compact showMark={false} />
              <span>Version {APP_VERSION}</span>
            </div>
            <p>
              Offline-first field collection developed by{" "}
              <a
                href="https://gbrlpzz.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                gbrlpzz
              </a>
              .
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
            onClose();
            onSignOut();
          }}
        >
          {isPreview ? "Exit preview" : "Sign out"}
        </button>
      )}
    </ModalSurface>
  );
}
