import { useState } from "react";
import { FlowDemo } from "./FlowDemo";
import { PackageBrowser } from "./PackageBrowser";
import { PreviewForm } from "./PreviewForm";
import { AdminWalkthrough } from "./AdminWalkthrough";
import { AttentionDemo } from "./AttentionDemo";
import { ProvenanceCard } from "./ProvenanceCard";
import { Icon, type IconName } from "../components/Icon";

const GITHUB_URL = "https://github.com/gbrlpzz/collect";
const DOCS = (file: string) => `${GITHUB_URL}/blob/main/docs/${file}`;

function TopBar() {
  return (
    <header className="hp-topbar">
      <div className="hp-topbar-inner">
        <a className="hp-brand" href="#top" aria-label="collect home">
          <img
            className="hp-logo"
            src="/icon.svg"
            alt=""
            width={22}
            height={22}
          />
          <span className="wordmark">
            collect<span className="wordmark-dot">.</span>
          </span>
          <span className="hp-brand-tag">Research Preview</span>
        </a>

        <nav className="hp-nav" aria-label="Sections">
          <a className="hp-nav-link" href="#collection">
            Collector
          </a>
          <a className="hp-nav-link" href="#sync">
            Sync
          </a>
          <a className="hp-nav-link" href="#admin">
            Setup
          </a>
          <a className="hp-nav-link" href="#integrity">
            Integrity
          </a>
          <a className="hp-nav-link" href="#data">
            Dataset
          </a>
        </nav>

        <div className="hp-topbar-actions">
          <a
            className="hp-nav-github"
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
          >
            <Icon name="github" size={18} />
            <span className="hp-github-text">GitHub</span>
          </a>
          <a className="button button-primary button-small" href="#preview">
            Request access
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero({ onEmailSubmit }: { onEmailSubmit: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError("Enter a valid institutional email.");
      return;
    }
    onEmailSubmit(email.trim());
  };

  return (
    <section className="hp-hero" id="top" aria-labelledby="hero-title">
      <div className="hp-hero-inner">
        <div className="hp-hero-badge">
          <span>Open Source Research Preview · Apache-2.0</span>
        </div>

        <h1 id="hero-title">
          Field data collection that never loses a record.
        </h1>

        <p className="hp-hero-lede">
          Offline-first field data collection for research and operational
          fieldwork. Observations and original media commit to device storage
          before touching the network, then sync automatically.
        </p>

        <form className="hp-capture" onSubmit={submit} noValidate>
          <input
            className="field-input hp-capture-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            required
            maxLength={320}
            placeholder="you@institution.org"
            aria-label="Institutional email"
          />
          <button className="button button-primary" type="submit">
            Request access
          </button>
        </form>

        {error && (
          <p className="hp-capture-error" role="alert">
            {error}
          </p>
        )}

        <div className="hp-hero-actions">
          <a className="text-button" href="#collection">
            Test live collection sandbox ↓
          </a>
        </div>
      </div>
    </section>
  );
}

function DifferentiationSummary() {
  const items: Array<{
    icon: IconName;
    title: string;
    claim: string;
    proof: string;
    href: string;
    cta: string;
  }> = [
    {
      icon: "shield",
      title: "Never loses a record",
      claim:
        "Observations and original files commit to device storage before any network attempt; a record is only ever marked synced once the server issues its durable receipt.",
      proof: "commit before network · receipt-gated SYNCED",
      href: "#sync",
      cta: "See the sync pipeline",
    },
    {
      icon: "camera",
      title: "Original media preserved",
      claim:
        "Photos and audio keep their original files, hashed with SHA-256, never recompressed or downsampled in the collection path.",
      proof: "uncompressed originals · SHA-256",
      href: "#collection",
      cta: "See the media step",
    },
    {
      icon: "check",
      title: "Research integrity built in",
      claim:
        "Attention checks are stripped before commit and published schemas are immutable, so finalized evidence stays clean and reproducible.",
      proof: "stripped before commit · immutable versions",
      href: "#integrity",
      cta: "Inspect the payload",
    },
    {
      icon: "archive",
      title: "FAIR archives, ready to deposit",
      claim:
        "Checkpoint exports package JSONL, CSV, GeoJSON, DataCite 4.4 metadata, and original media into one self-contained ZIP.",
      proof: "DataCite 4.4 · GeoJSON · JSONL",
      href: "#data",
      cta: "Open the dataset",
    },
  ];

  const stats = [
    { value: "3-stage", label: "background sync" },
    { value: "SHA-256", label: "media integrity hashes" },
    { value: "8-char", label: "single-use device codes" },
    { value: "Apache-2.0", label: "open source · self-hostable" },
  ];

  return (
    <section className="hp-diff-section" aria-label="Core strengths">
      <div className="hp-diff-inner">
        <div className="hp-diff-heading">
          <p className="eyebrow">The difference</p>
          <h2>Built for data you can defend.</h2>
          <p>
            collect is an offline-first PWA for structured fieldwork. Four
            guarantees set it apart — and each is demonstrated live on this
            page.
          </p>
        </div>

        <div className="hp-diff-grid">
          {items.map((item) => (
            <a className="hp-diff-card" href={item.href} key={item.title}>
              <span className="hp-diff-icon" aria-hidden="true">
                <Icon name={item.icon} size={18} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.claim}</p>
              <span className="hp-diff-proof">{item.proof}</span>
              <span className="hp-diff-cta">
                {item.cta}
                <Icon name="arrow-right" size={14} />
              </span>
            </a>
          ))}
        </div>

        <div className="hp-diff-stats">
          {stats.map((stat) => (
            <div className="hp-diff-stat" key={stat.value}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomepageApp() {
  const [draftEmail, setDraftEmail] = useState("");
  const [adminTab, setAdminTab] = useState<"setup" | "contributors" | "export">(
    "setup",
  );

  const captureEmail = (email: string) => {
    setDraftEmail(email);
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("preview")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <div className="hp-shell">
      <TopBar />
      <main id="main">
        <Hero onEmailSubmit={captureEmail} />
        <DifferentiationSummary />

        {/* Step 1: Real Field Collection inside iPhone Mockup */}
        <section
          className="hp-section hp-section-paper"
          id="collection"
          aria-labelledby="collection-title"
        >
          <div className="hp-section-inner">
            <FlowDemo />
          </div>
        </section>

        {/* Sync Architecture */}
        <section className="hp-section" id="sync" aria-labelledby="sync-title">
          <div className="hp-section-inner">
            <div className="hp-flow-layout">
              <div className="hp-flow-copy">
                <div className="section-heading">
                  <p className="eyebrow">Synchronization Architecture</p>
                  <h2 id="sync-title">
                    A three-stage pipeline that ends in a server receipt.
                  </h2>
                  <p>
                    Sync is treated as a data path, not an afterthought: nothing
                    is uploaded before it exists on device, and nothing is
                    marked sent before the server says so.
                  </p>
                </div>

                <ul className="hp-sync-principles">
                  <li>
                    <strong>Commit first.</strong> Payload, media, and outbox
                    operations write to IndexedDB before any network attempt.
                  </li>
                  <li>
                    <strong>Resumable media.</strong> Original files upload over
                    tus; a flaky link continues where it stopped instead of
                    restarting.
                  </li>
                  <li>
                    <strong>Receipt-gated status.</strong> <code>SYNCED</code>{" "}
                    is written only when the server finalizes the submission —
                    never on request start or upload completion.
                  </li>
                  <li>
                    <strong>Server is the source of truth.</strong> Reachability
                    is never guessed from <code>navigator.onLine</code>, and
                    installed-PWA storage stays isolated until the server
                    mediates.
                  </li>
                </ul>
              </div>

              <div className="hp-flow-visual">
                <div className="hp-sync-pipeline" aria-label="Sync stages">
                  <div className="hp-sync-stage">
                    <span className="hp-sync-stage-index">1</span>
                    <div>
                      <strong>Metadata</strong>
                      <p>
                        Structured payload and submission receipt op commit to
                        the local outbox.
                      </p>
                    </div>
                  </div>
                  <div className="hp-sync-stage">
                    <span className="hp-sync-stage-index">2</span>
                    <div>
                      <strong>Media</strong>
                      <p>
                        Original files upload as resumable tus transfers with
                        integrity hashes.
                      </p>
                    </div>
                  </div>
                  <div className="hp-sync-stage">
                    <span className="hp-sync-stage-index">3</span>
                    <div>
                      <strong>Finalization</strong>
                      <p>
                        The server writes a durable receipt; only then does the
                        local record become <code>SYNCED</code>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Admin Operations & Schema (Dark Mobile Mockup) */}
        <section
          className="hp-section hp-section-admin"
          id="admin"
          aria-labelledby="admin-title"
        >
          <div className="hp-section-inner">
            <div className="hp-flow-layout">
              <div className="hp-flow-copy">
                <div className="section-heading">
                  <p className="eyebrow">Step 2 · Setup & Schema</p>
                  <h2 id="admin-title">
                    Define immutable schemas and pair field devices.
                  </h2>
                  <p>
                    Author versioned surveys, generate single-use 8-character
                    pairing codes, and trigger publication checkpoints.
                  </p>
                </div>

                <div className="hp-admin-tab-selector">
                  <button
                    type="button"
                    className={`hp-admin-step-btn ${adminTab === "setup" ? "active" : ""}`}
                    onClick={() => setAdminTab("setup")}
                  >
                    1. Form Schema
                  </button>
                  <button
                    type="button"
                    className={`hp-admin-step-btn ${adminTab === "contributors" ? "active" : ""}`}
                    onClick={() => setAdminTab("contributors")}
                  >
                    2. Device Pairing
                  </button>
                  <button
                    type="button"
                    className={`hp-admin-step-btn ${adminTab === "export" ? "active" : ""}`}
                    onClick={() => setAdminTab("export")}
                  >
                    3. Checkpoint Export
                  </button>
                </div>

                <div className="hp-story" aria-live="polite">
                  <span className="hp-story-kicker">Administrator Console</span>
                  {adminTab === "setup" && (
                    <>
                      <h3>Immutable question schema</h3>
                      <p>
                        Field definitions are locked on publish. Modifying a
                        survey creates a new version without altering past
                        observations.
                      </p>
                    </>
                  )}
                  {adminTab === "contributors" && (
                    <>
                      <h3>Passwordless device link</h3>
                      <p>
                        Field researchers enter an 8-character code once to pair
                        their phone’s storage without passwords or accounts.
                      </p>
                    </>
                  )}
                  {adminTab === "export" && (
                    <>
                      <h3>Verified sync readiness</h3>
                      <p>
                        Review received observations, monitor contributor
                        attention, and export self-contained research archives.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="hp-flow-visual">
                <AdminWalkthrough
                  initialTab={adminTab}
                  onTabChange={setAdminTab}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: Integrity & Provenance */}
        <section
          className="hp-section"
          id="integrity"
          aria-labelledby="integrity-title"
        >
          <div className="hp-section-inner">
            <div className="section-heading">
              <p className="eyebrow">Step 3 · Provenance & Quality</p>
              <h2 id="integrity-title">
                Verify surveyor focus and context without research bias.
              </h2>
              <p>
                Unannounced checks test surveyor focus during long transects.
                Answers are stripped before commit, recording only a
                guess-adjusted reliability score alongside ambient hardware
                telemetry.
              </p>
            </div>
            <div className="hp-integrity-grid">
              <div className="hp-integrity-card">
                <div className="hp-integrity-card-header">
                  <h3>Cognitive Attention QA</h3>
                  <p>
                    Question never stored in schema · Answer stripped before
                    commit
                  </p>
                </div>
                <AttentionDemo />
              </div>
              <div className="hp-integrity-card">
                <div className="hp-integrity-card-header">
                  <h3>Ambient Environment Telemetry</h3>
                  <p>Automatic hardware context · Never blocks local receipt</p>
                </div>
                <ProvenanceCard />
              </div>
            </div>
          </div>
        </section>

        {/* Step 4: FAIR Checkpoint Dataset Explorer */}
        <section
          className="hp-section hp-section-paper"
          id="data"
          aria-labelledby="data-title"
        >
          <div className="hp-section-inner">
            <div className="section-heading">
              <p className="eyebrow">Step 4 · Archival & Publication</p>
              <h2 id="data-title">
                Self-contained research archives ready for repository deposit.
              </h2>
              <p>
                Checkpoint archives include canonical JSONL, CSV, RFC 7946
                GeoJSON, DataCite 4.4 kernel metadata, and original media with
                SHA-256 hashes.
              </p>
            </div>
            <PackageBrowser />
            <p className="hp-section-note">
              Live checkpoint inspection from <code>docs/demo-dataset</code>.
              Specified in{" "}
              <a href={DOCS("export-format.md")} target="_blank" rel="noopener">
                docs/export-format.md
              </a>
              .
            </p>
          </div>
        </section>

        {/* Request Access / Pilot Form */}
        <section
          className="hp-section"
          id="preview"
          aria-labelledby="preview-title"
        >
          <div className="hp-section-inner hp-preview-layout">
            <div className="hp-preview-copy">
              <p className="eyebrow">Research Preview & Feedback</p>
              <h2 id="preview-title">
                Explore a pilot for your fieldwork or expedition.
              </h2>
              <p>
                We are testing collect with academic researchers and field
                teams. Request preview access to test custom schemas, or clone
                and self-host the open-source repository directly.
              </p>
            </div>
            <div className="hp-preview-card">
              <PreviewForm initialEmail={draftEmail} />
            </div>
          </div>
        </section>
      </main>

      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <div className="hp-footer-brand">
            <a className="hp-brand" href="#top" aria-label="collect home">
              <img
                className="hp-logo"
                src="/icon.svg"
                alt=""
                width={22}
                height={22}
              />
              <span className="wordmark">
                collect<span className="wordmark-dot">.</span>
              </span>
            </a>
            <p>
              Infrastructure for trustworthy field evidence. Open source under
              Apache-2.0.
            </p>
          </div>
          <nav className="hp-footer-links" aria-label="Footer">
            <div>
              <span className="hp-footer-heading">Lifecycle</span>
              <a href="#collection">1. Field Collection</a>
              <a href="#sync">Sync architecture</a>
              <a href="#admin">2. Setup & Schema</a>
              <a href="#integrity">3. Integrity & QA</a>
              <a href="#data">4. Data Package</a>
              <a href="#preview">Request access</a>
            </div>
            <div>
              <span className="hp-footer-heading">Documentation</span>
              <a href={GITHUB_URL} target="_blank" rel="noopener">
                GitHub repository
              </a>
              <a href={DOCS("export-format.md")} target="_blank" rel="noopener">
                Export format spec
              </a>
              <a href={DOCS("architecture.md")} target="_blank" rel="noopener">
                Architecture guide
              </a>
              <a href={DOCS("design.md")} target="_blank" rel="noopener">
                Design baseline
              </a>
            </div>
          </nav>
          <p className="hp-footer-legal">© 2026 Gabriele Pizzi · Apache-2.0</p>
        </div>
      </footer>
    </div>
  );
}
