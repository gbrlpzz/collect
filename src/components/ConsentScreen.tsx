import { useState } from "react";
import { CollectBrand } from "./CollectBrand";
import { Icon } from "./Icon";
import { Button, InfoDisclosure } from "./ui";

interface ConsentScreenProps {
  text: string;
  version: number;
  busy?: boolean;
  onAccept: () => void | Promise<void>;
  onDecline: () => void;
}

/**
 * One-time collection consent shown at first sign-in. Replaces a separate
 * paper consent form: acceptance is stored on the contributor profile with
 * the statement version and timestamp, and the server refuses submissions
 * without it.
 */
export function ConsentScreen({
  text,
  version,
  busy,
  onAccept,
  onDecline,
}: ConsentScreenProps) {
  const [accepting, setAccepting] = useState(false);
  const saving = Boolean(busy || accepting);
  const blocks = text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const numberedIndexes = blocks.flatMap((block, index) =>
    /^\d+\.\s/.test(block) ? [index] : [],
  );
  const firstItem = numberedIndexes.at(0) ?? -1;
  const lastItem = numberedIndexes.at(-1) ?? -1;
  const introduction = firstItem < 0 ? blocks : blocks.slice(0, firstItem);
  const items =
    firstItem < 0
      ? []
      : blocks
          .slice(firstItem, lastItem + 1)
          .map((block) => block.replace(/^\d+\.\s*/, ""));
  const conclusion = lastItem < 0 ? [] : blocks.slice(lastItem + 1);

  return (
    <main className="auth-page consent-page">
      <div className="auth-mark">
        <CollectBrand />
      </div>
      <section
        className="auth-card consent-card"
        aria-labelledby="consent-title"
      >
        <span className="sheet-kicker">Consent statement v{version}</span>
        <h1 id="consent-title">Review data collection</h1>
        <p className="consent-lede">
          Before contributing, review the small amount of data collect needs to
          preserve and verify your fieldwork.
        </p>
        <dl className="consent-summary" aria-label="Privacy summary">
          <div>
            <dt>What is recorded</dt>
            <dd>Your answers, chosen media, time, and collection context.</dd>
          </div>
          <div>
            <dt>Why it is recorded</dt>
            <dd>To preserve, verify, and recover the assigned fieldwork.</dd>
          </div>
          <div>
            <dt>Who can access it</dt>
            <dd>The project and its authorized administrators.</dd>
          </div>
          <div>
            <dt>When it is sent</dt>
            <dd>After it has first been saved safely on this device.</dd>
          </div>
        </dl>
        <details className="consent-full-statement">
          <summary>
            <span>Read the full consent statement</span>
            <Icon name="chevron-down" size={16} />
          </summary>
          <section
            className="consent-statement"
            aria-labelledby="agreement-title"
          >
            <h2 id="agreement-title">Full statement</h2>
            {introduction.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {items.length > 0 && (
              <ol>
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            )}
            {conclusion.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        </details>
        <InfoDisclosure
          className="consent-record-disclosure"
          title="How your agreement is recorded"
          icon="shield"
        >
          <p>
            Accepting records this statement version and the time on your
            contributor profile.
          </p>
        </InfoDisclosure>
        <Button
          variant="primary"
          fullWidth
          onClick={() => {
            setAccepting(true);
            void Promise.resolve(onAccept()).finally(() => setAccepting(false));
          }}
          disabled={saving}
          busy={saving}
        >
          {saving ? "Saving…" : "Agree and continue"}
        </Button>
        <button
          className="text-button consent-decline"
          onClick={onDecline}
          disabled={saving}
        >
          Decline and sign out
        </button>
      </section>
    </main>
  );
}
