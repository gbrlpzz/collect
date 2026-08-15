import { useEffect, useState } from "react";
import type { ContributorReadiness } from "../lib/adminBackend";
import { loadContributorProfileDetails } from "../lib/adminBackend";
import { formatExactTime, formatRelativeTime } from "../lib/formatTime";
import { Icon } from "./Icon";
import { AttentionScoreRing, IconButton, ModalSurface } from "./ui";

interface ContributorProfileSheetProps {
  projectId: string;
  row: ContributorReadiness;
  onClose: () => void;
}

/**
 * Administrator view of one contributor's research record: consent status,
 * devices, submissions, and attention verification history. Everything is
 * read through the administrator's own RLS privileges — no service role.
 */
export function ContributorProfileSheet({
  projectId,
  row,
  onClose,
}: ContributorProfileSheetProps) {
  const [details, setDetails] = useState<Awaited<
    ReturnType<typeof loadContributorProfileDetails>
  > | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setDetails(null);
    setFailed(false);
    void loadContributorProfileDetails(projectId, row.id)
      .then((value) => {
        if (active) setDetails(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [projectId, row.id]);

  const submissions = details?.submissions ?? [];
  const complete = submissions.filter(
    (item) => item.status === "COMPLETE",
  ).length;
  const received = submissions.filter(
    (item) => item.status === "RECEIVED",
  ).length;
  const conflict = submissions.filter(
    (item) => item.status === "CONFLICT",
  ).length;
  const devices = details?.devices ?? [];
  const initialSeen: string | null = null;
  const latestSeen = devices.length
    ? devices.reduce<string | null>(
        (latest, device) =>
          device.lastSeenAt && (!latest || device.lastSeenAt > latest)
            ? device.lastSeenAt
            : latest,
        initialSeen,
      )
    : null;

  return (
    <ModalSurface
      onClose={onClose}
      labelledBy="contributor-profile-title"
      className="profile-sheet contributor-profile-sheet"
    >
      <div className="sheet-handle" />
      <div className="sheet-heading">
        <h2 id="contributor-profile-title">Contributor</h2>
        <IconButton
          label="Close contributor profile"
          icon="x"
          data-modal-autofocus
          onClick={onClose}
        />
      </div>

      <p className="profile-email">{row.email}</p>

      {row.invitedOnly ? (
        <div className="empty-list-state">
          <strong>Invitation pending</strong>
          <span>
            This person has not opened the invitation yet. Resend the invitation
            from the roster if needed.
          </span>
        </div>
      ) : (
        <>
          <section className="profile-section" aria-label="Consent">
            <div className="profile-metrics">
              <div>
                <span>Consent</span>
                <strong>
                  {row.consentGranted ? "Granted" : "Not granted"}
                </strong>
              </div>
              <div>
                <span>Attention</span>
                {row.attentionChecksTotal ? (
                  <AttentionScoreRing
                    score={row.attentionScore}
                    total={row.attentionChecksTotal}
                    size={38}
                  />
                ) : (
                  <strong>—</strong>
                )}
              </div>
            </div>
          </section>

          <section className="profile-section" aria-label="Devices">
            <h3>Devices</h3>
            <div className="profile-status-list">
              <div>
                <span>Known devices</span>
                <strong>{devices.length || "—"}</strong>
              </div>
              <div>
                <span>Last seen</span>
                <strong title={latestSeen ? formatExactTime(latestSeen) : ""}>
                  {latestSeen ? formatRelativeTime(latestSeen) : "—"}
                </strong>
              </div>
              <div>
                <span>Pending work</span>
                <strong>
                  {devices.reduce((sum, d) => sum + d.pending, 0)}
                </strong>
              </div>
            </div>
          </section>

          <section className="profile-section" aria-label="Submissions">
            <h3>Submissions</h3>
            <div className="profile-status-list">
              <div>
                <span>Finalized</span>
                <strong>{complete}</strong>
              </div>
              <div>
                <span>Received</span>
                <strong>{received}</strong>
              </div>
              <div>
                <span>Conflicts</span>
                <strong>{conflict}</strong>
              </div>
            </div>
          </section>

          {(details?.attention.length ?? 0) > 0 && (
            <section className="profile-section" aria-label="Attention history">
              <h3>Attention checks</h3>
              <div className="profile-attention-list">
                {(details?.attention ?? []).map((item, index) => (
                  <div
                    key={`${item.checkKey}-${index}`}
                    className="attention-row"
                  >
                    <span className="attention-row-copy">
                      <strong>{item.checkKey}</strong>
                      <span title={formatExactTime(item.createdAt)}>
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </span>
                    <span
                      className={
                        item.passed === false || item.correct === false
                          ? "attention-outcome attention-outcome-failed"
                          : "attention-outcome"
                      }
                    >
                      {item.passed === false || item.correct === false
                        ? "Failed"
                        : item.passed || item.correct
                          ? "Passed"
                          : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {failed && (
            <p className="background-status" role="status">
              <Icon name="info" size={15} /> Profile details are temporarily
              unavailable.
            </p>
          )}
        </>
      )}
    </ModalSurface>
  );
}
