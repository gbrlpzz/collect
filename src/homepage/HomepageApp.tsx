import { useState } from "react";
import { FlowDemo } from "./FlowDemo";
import { PackageBrowser } from "./PackageBrowser";
import { PreviewForm } from "./PreviewForm";
import { AdminWalkthrough } from "./AdminWalkthrough";
import { AttentionDemo } from "./AttentionDemo";
import { ProvenanceCard } from "./ProvenanceCard";
import { Icon } from "../components/Icon";

const APP_URL = "https://collect-tawny.vercel.app";
const ADMIN_URL = `${APP_URL}/?role=admin`;
const GITHUB_URL = "https://github.com/gbrlpzz/collect";
const DOCS = (file: string) => `${GITHUB_URL}/blob/main/docs/${file}`;

const NAV = [
  { label: "1. Setup & Schema", href: "#admin" },
  { label: "2. Field Collection", href: "#collection" },
  { label: "3. Integrity & QA", href: "#integrity" },
  { label: "4. Data Package", href: "#data" },
  { label: "Comparison", href: "#comparison" },
  { label: "Deploy", href: "#preview" },
];

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
        </a>
        <nav className="hp-nav" aria-label="Sections">
          {NAV.map((item) => (
            <a className="hp-nav-link" href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hp-topbar-actions">
          <a
            className="hp-nav-link hp-nav-app-link"
            href={APP_URL}
            target="_blank"
            rel="noopener"
          >
            Contributor
          </a>
          <a
            className="hp-nav-link hp-nav-app-link"
            href={ADMIN_URL}
            target="_blank"
            rel="noopener"
          >
            Admin
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
          <span className="status-dot" aria-hidden="true" />
          <span>Field data collection · Offline-first PWA</span>
        </div>

        <h1 id="hero-title">
          Fieldwork without connectivity.
          <br />
          <span className="hp-hero-accent">Evidence without ambiguity.</span>
        </h1>

        <p className="hp-hero-lede">
          collect is an offline-first field application for scientific research
          and building assessments. It commits observations and uncompressed
          media to local storage before touching the network, verifies surveyor
          attention without biasing research variables, and exports
          publication-ready FAIR archives.
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
          <a className="text-button" href="#admin">
            Walk through the field workflow ↓
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
      desc: "Atomic IndexedDB transactions write structured values and raw binary photos to device storage before showing “Saved on this device”. No observation is discarded before an explicit server receipt.",
    },
    {
      title: "Immutable schema versions",
      desc: "Published question sets are permanent. Historical observations retain their original schema version; changes create a new version without corrupting past fieldwork records.",
    },
    {
      title: "Attention checks as provenance",
      desc: "Curated verification questions test surveyor alertness in the field. Question text never enters the schema and answers are stripped before commit, leaving only an untampered vigilance score.",
    },
    {
      title: "Single-use device linking",
      desc: "Field contributors pair iOS Safari or installed PWAs in seconds using 8-character single-use codes. No passwords, no App Store accounts, no credentials stored on field devices.",
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
      collect:
        "Atomic multi-store IndexedDB durable receipts committed before network handshake",
      others:
        "In-memory form drafts or fragile browser caches prone to tab eviction",
    },
    {
      feature: "Media preservation",
      collect:
        "100% original uncompressed media blobs with SHA-256 integrity hashes",
      others: "Aggressively downsampled lossy JPEGs compressed during capture",
    },
    {
      feature: "Surveyor attention QA",
      collect:
        "Built-in guess-adjusted checks; question & answer stripped before commit",
      others:
        "None, or manual survey questions that pollute and bias the research dataset",
    },
    {
      feature: "Device onboarding",
      collect:
        "Single-use 8-character link codes; 0 passwords, 0 App Store accounts",
      others:
        "App Store downloads, permanent passwords, or unprotected public survey links",
    },
    {
      feature: "Archival export format",
      collect:
        "Complete FAIR checkpoint ZIP (DataCite 4.4, GeoJSON, CSV, JSONL, media manifest)",
      others: "Single flat CSV or Excel spreadsheet export without provenance",
    },
    {
      feature: "Local account isolation",
      collect:
        "Strict account-scoped IndexedDB instances (collect-local-v1-<userId>)",
      others: "Shared browser storage risking cross-contributor survey leaks",
    },
    {
      feature: "License & hosting",
      collect:
        "100% Open Source (Apache-2.0), self-hostable on Supabase & Vercel",
      others:
        "Proprietary vendor lock-in or complex Java/XML server infrastructure",
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
            Office survey tools assume constant WiFi and throw away raw media.
            collect is purpose-built for hostile field conditions where data
            loss is unacceptable.
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

        {/* Step 1: Admin Operations & Schema */}
        <section
          className="hp-section hp-section-dark"
          id="admin"
          aria-labelledby="admin-title"
        >
          <div className="hp-section-inner">
            <div className="hp-flow-layout">
              <div className="hp-flow-copy">
                <div className="section-heading hp-admin-heading">
                  <p className="eyebrow">Step 1 · Setup & Fleet Pairing</p>
                  <h2 id="admin-title">
                    Define immutable schemas and pair field devices.
                  </h2>
                  <p>
                    Author versioned questions with typed rules. Generate
                    single-use 8-character pairing codes to onboard field phones
                    without passwords, monitor fleet readiness, and trigger
                    research checkpoints.
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
                        published survey creates Version 2 without corrupting
                        past observations.
                      </p>
                    </>
                  )}
                  {adminTab === "contributors" && (
                    <>
                      <h3>Passwordless device link</h3>
                      <p>
                        Field researchers enter an 8-character code once to pair
                        their phone’s IndexedDB storage. No passwords or app
                        store accounts.
                      </p>
                    </>
                  )}
                  {adminTab === "export" && (
                    <>
                      <h3>Verified sync readiness</h3>
                      <p>
                        Review received observations, monitor contributor
                        attention rings, and generate a self-contained research
                        archive.
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

        {/* Step 2: Real Field Collection inside iPhone Mockup */}
        <section
          className="hp-section hp-section-paper"
          id="collection"
          aria-labelledby="collection-title"
        >
          <div className="hp-section-inner">
            <div className="hp-flow-layout">
              <div className="hp-flow-copy">
                <div className="section-heading">
                  <p className="eyebrow">Step 2 · Field Collection</p>
                  <h2 id="collection-title">
                    One calm question at a time. Built for zero signal.
                  </h2>
                  <p>
                    The collector presents one question per screen with 52pt
                    touch targets for gloves and sunlight, native date pickers,
                    and raw photo capture. Atomic IndexedDB transactions
                    guarantee that no saved observation is lost.
                  </p>
                </div>
              </div>
              <div className="hp-flow-visual">
                <FlowDemo />
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
                Verify contributor attention without altering research payloads.
              </h2>
              <p>
                Cognitive attention checks test surveyor focus during long
                transects. The answer is stripped before database commit, and
                the guess-adjusted score is stored in observation provenance
                alongside automatic device environment telemetry.
              </p>
            </div>
            <div className="hp-integrity-grid">
              <div className="hp-integrity-card">
                <div className="hp-integrity-card-header">
                  <h3>Attention Verification QA</h3>
                  <p>
                    Question never stored in schema · Answer stripped before
                    commit
                  </p>
                </div>
                <AttentionDemo />
              </div>
              <div className="hp-integrity-card">
                <div className="hp-integrity-card-header">
                  <h3>Hardware & Environment Telemetry</h3>
                  <p>
                    Automatic telemetry capture · Never blocks local receipt
                  </p>
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
                Every checkpoint archive includes canonical JSONL, CSV, RFC 7946
                GeoJSON, DataCite 4.4 kernel metadata, machine-readable data
                dictionary, and byte-for-byte original media with SHA-256
                integrity hashes.
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

        {/* Request Access / Deploy */}
        <section
          className="hp-section"
          id="preview"
          aria-labelledby="preview-title"
        >
          <div className="hp-section-inner hp-preview-layout">
            <div className="hp-preview-copy">
              <p className="eyebrow">Deploy collect</p>
              <h2 id="preview-title">
                Provision an instance for your institution or expedition.
              </h2>
              <p>
                We provide managed research previews with custom schemas and
                team invitations, or you can self-host the open-source
                repository on your own cloud infrastructure.
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
              <a href="#admin">1. Setup & Schema</a>
              <a href="#collection">2. Field Collection</a>
              <a href="#integrity">3. Integrity & QA</a>
              <a href="#data">4. Data Package</a>
              <a href="#preview">Deploy instance</a>
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
