import { useState } from "react";
import { FlowDemo } from "./FlowDemo";
import { PackageBrowser } from "./PackageBrowser";
import { PreviewForm } from "./PreviewForm";
import { AdminWalkthrough } from "./AdminWalkthrough";
import { AttentionDemo } from "./AttentionDemo";
import { ProvenanceCard } from "./ProvenanceCard";
import { Icon } from "../components/Icon";

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
          Offline-first field data collection. Saves observations and
          uncompressed photos to device storage before touching the network,
          syncing automatically when connected.
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
  const items = [
    {
      title: "Durable local receipts",
      desc: "Form data and raw photos commit to IndexedDB before any network attempt. Observations are never lost.",
    },
    {
      title: "Immutable schemas",
      desc: "Published forms are locked. Historical observations always keep their original schema version without drift.",
    },
    {
      title: "Attention QA",
      desc: "Unannounced checks verify surveyor focus. Answers are stripped before commit to keep research variables clean.",
    },
    {
      title: "Single-use device links",
      desc: "Pair field devices with 8-character codes. Zero passwords, zero App Store accounts, zero stored credentials.",
    },
  ];

  return (
    <section className="hp-diff-section" aria-label="Core differentiation">
      <div className="hp-diff-inner">
        <div className="hp-diff-grid">
          {items.map((item) => (
            <div className="hp-diff-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  const comparisonRows = [
    {
      feature: "Storage on device",
      collect: "Atomic IndexedDB receipts committed before network handshake",
      others: "Fragile in-memory drafts or browser caches prone to tab loss",
    },
    {
      feature: "Media preservation",
      collect:
        "Original uncompressed media blobs with SHA-256 integrity hashes",
      others: "Aggressively compressed lossy JPEGs downsampled in-browser",
    },
    {
      feature: "Surveyor attention QA",
      collect:
        "Built-in guess-adjusted checks; answers stripped before database commit",
      others: "None, or manual survey fields that pollute the research payload",
    },
    {
      feature: "Device onboarding",
      collect:
        "Single-use 8-character link codes; 0 passwords, 0 store accounts",
      others: "App store downloads, permanent credentials, or public links",
    },
    {
      feature: "Archival export",
      collect:
        "Complete FAIR checkpoint ZIP (DataCite 4.4, GeoJSON, CSV, JSONL, media)",
      others: "Single flat CSV or spreadsheet export without provenance",
    },
    {
      feature: "Account isolation",
      collect: "Strict account-scoped IndexedDB databases per user",
      others: "Shared browser storage risking cross-contributor leaks",
    },
    {
      feature: "License & hosting",
      collect:
        "100% Open Source (Apache-2.0), self-hostable on Supabase & Vercel",
      others: "Proprietary vendor lock-in or complex legacy servers",
    },
  ];

  return (
    <section
      className="hp-section hp-section-paper"
      id="comparison"
      aria-labelledby="comp-title"
    >
      <div className="hp-section-inner">
        <div className="section-heading">
          <p className="eyebrow">Architecture Comparison</p>
          <h2 id="comp-title">
            How collect differs from generic form builders.
          </h2>
          <p>
            Office survey tools assume continuous connectivity and discard raw
            media. collect is purpose-built for field conditions where data loss
            is unacceptable.
          </p>
        </div>

        <div className="hp-comparison-table-wrapper">
          <table className="hp-comparison-table">
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col" className="hp-col-collect">
                  <span className="hp-badge-collect">collect</span>
                </th>
                <th scope="col">
                  Generic Form Builders (Kobo, ODK, Google Forms)
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature}>
                  <td className="hp-table-feature">
                    <strong>{row.feature}</strong>
                  </td>
                  <td className="hp-table-collect">
                    <span className="hp-table-check">
                      <Icon name="check" size={14} />
                    </span>
                    <span>{row.collect}</span>
                  </td>
                  <td className="hp-table-others">
                    <span>{row.others}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  <p className="eyebrow">Step 2 · Fleet Setup & Schema</p>
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

        {/* Value Differentiation & Comparison Matrix */}
        <ComparisonSection />

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
              <a href="#admin">2. Fleet Setup & Schema</a>
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
