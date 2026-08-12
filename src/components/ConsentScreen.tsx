interface ConsentScreenProps {
  text: string;
  version: number;
  busy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * One-time collection consent shown at first sign-in. Replaces a separate
 * paper consent form: acceptance is stored on the contributor profile with
 * the statement version and timestamp, and the server refuses submissions
 * without it.
 */
export function ConsentScreen({ text, version, busy, onAccept, onDecline }: ConsentScreenProps) {
  return (
    <main className="auth-page">
      <div className="auth-mark">collect<span>.</span></div>
      <section className="auth-card consent-card" aria-labelledby="consent-title">
        <span className="sheet-kicker">Collection consent</span>
        <h1 id="consent-title">Before you collect.</h1>
        <p className="consent-lede">Your observations become research evidence. Read how they are recorded.</p>
        <div className="consent-text" tabIndex={0}>{text}</div>
        <p className="consent-version">Consent statement v{version} · accepted on your contributor profile</p>
        <button className="button button-primary button-full" onClick={onAccept} disabled={busy}>
          {busy ? "Saving…" : "Accept and continue"}
        </button>
        <button className="text-button consent-decline" onClick={onDecline} disabled={busy}>
          Decline and sign out
        </button>
      </section>
    </main>
  );
}
