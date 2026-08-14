import { useState } from "react";
import { FlowDemo } from "./FlowDemo";
import { SyncDemo } from "./SyncDemo";
import { PackageBrowser } from "./PackageBrowser";
import { PreviewForm } from "./PreviewForm";
import { AdminWalkthrough } from "./AdminWalkthrough";
import { AttentionDemo } from "./AttentionDemo";
import { ProvenanceCard } from "./ProvenanceCard";
import { Icon, type IconName } from "../components/Icon";
import { CollectBrand } from "../components/CollectBrand";

const GITHUB_URL = "https://github.com/gbrlpzz/collect";
const DOCS = (file: string) => `${GITHUB_URL}/blob/main/docs/${file}`;

function TopBar() {
  return (
    <header className="hp-topbar">
      <div className="hp-topbar-inner">
        <a className="hp-brand" href="#top" aria-label="collect home">
          <CollectBrand compact />
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
        <h1 id="hero-title">
          Field data collection that never loses a record.
        </h1>

        <p className="hp-hero-lede">
          An offline-first platform for scientific fieldwork and expeditions.
          Structured observations and raw media commit to device storage before
          touching the network, syncing automatically upon durable server
          receipt.
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
            placeholder="you@institution.edu"
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

        <div className="hp-hero-meta">
          <span>Open source · Apache-2.0</span>
          <span className="hp-hero-dot">·</span>
          <span>Self-hostable</span>
          <span className="hp-hero-dot">·</span>
          <a className="hp-hero-jump" href="#collection">
            Test live collector ↓
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
    doc: string;
  }> = [
    {
      icon: "shield",
      title: "Local-first durability",
      claim:
        "Observations and media commit to IndexedDB before any network attempt, updating to synced only upon server confirmation.",
      proof: "commit before network · verified receipt",
      href: "#sync",
      cta: "Inspect sync pipeline",
      doc: "background-automation.md",
    },
    {
      icon: "camera",
      title: "Unmodified media originals",
      claim:
        "Photos and audio retain capture quality with SHA-256 checksums, with no collection-path recompression.",
      proof: "raw originals · SHA-256 checksums",
      href: "#collection",
      cta: "View media capture",
      doc: "dataset-standards.md",
    },
    {
      icon: "check",
      title: "Isolated attention checks",
      claim:
        "Periodic checks evaluate contributor focus in memory, stripping questions and answers before database commit.",
      proof: "in-memory checks · isolated payloads",
      href: "#integrity",
      cta: "Test attention check",
      doc: "attention-qa.md",
    },
    {
      icon: "archive",
      title: "FAIR export archives",
      claim:
        "Checkpoint exports package canonical JSONL, CSV, RFC 7946 GeoJSON, DataCite 4.4 metadata, and raw media into a single archive.",
      proof: "DataCite 4.4 · GeoJSON · JSONL",
      href: "#data",
      cta: "Browse export package",
      doc: "export-format.md",
    },
  ];

  const stats = [
    { value: "3-stage", label: "verified sync pipeline" },
    { value: "SHA-256", label: "media integrity checksums" },
    { value: "8-character", label: "passwordless device codes" },
    { value: "Apache-2.0", label: "open source · self-hostable" },
  ];

  return (
    <section className="hp-diff-section" aria-label="Core guarantees">
      <div className="hp-diff-inner">
        <div className="hp-diff-heading">
          <p className="eyebrow">Guarantees</p>
          <h2>Built for defensible field evidence.</h2>
          <p>
            An offline-first platform engineered for hostile connectivity,
            verifiable provenance, and direct archive deposit.
          </p>
        </div>

        <div className="hp-diff-grid">
          {items.map((item) => (
            <div className="hp-diff-card" key={item.title}>
              <span className="hp-diff-icon" aria-hidden="true">
                <Icon name={item.icon} size={18} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.claim}</p>
              <span className="hp-diff-proof">{item.proof}</span>
              <a className="hp-diff-cta" href={item.href}>
                {item.cta}
                <Icon name="arrow-right" size={14} />
              </a>
              <span className="hp-diff-doc">
                <a
                  href={DOCS(item.doc)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  docs/{item.doc}
                </a>
              </span>
            </div>
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

/** A small per-section pointer to the relevant technical documentation. */
function DocLink({ file, label }: { file: string; label?: string }) {
  return (
    <p className="hp-doc-link">
      <a href={DOCS(file)} target="_blank" rel="noopener">
        {label ?? "Technical documentation"}
        <Icon name="arrow-right" size={13} />
      </a>
    </p>
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

        {/* Real Field Collection inside iPhone Mockup */}
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
            <SyncDemo />
          </div>
        </section>

        {/* Admin Operations & Schema (Dark Mobile Mockup) */}
        <section
          className="hp-section hp-section-admin"
          id="admin"
          aria-labelledby="admin-title"
        >
          <div className="hp-section-inner">
            <div className="hp-flow-layout">
              <div className="hp-flow-copy">
                <div className="section-heading">
                  <p className="eyebrow">Setup & Administration</p>
                  <h2 id="admin-title">
                    Immutable schemas and instant device pairing.
                  </h2>
                  <p>
                    Publish version-locked schemas, issue single-use pairing
                    codes, and monitor contributor sync status in real time.
                  </p>
                  <DocLink file="flows.md" label="Administrator workflow doc" />
                  <DocLink file="spec.md" label="Product & schema spec" />
                </div>

                <div className="hp-admin-tab-selector">
                  <button
                    type="button"
                    className={`hp-admin-step-btn ${adminTab === "setup" ? "active" : ""}`}
                    onClick={() => setAdminTab("setup")}
                  >
                    Form Schema
                  </button>
                  <button
                    type="button"
                    className={`hp-admin-step-btn ${adminTab === "contributors" ? "active" : ""}`}
                    onClick={() => setAdminTab("contributors")}
                  >
                    Device Pairing
                  </button>
                  <button
                    type="button"
                    className={`hp-admin-step-btn ${adminTab === "export" ? "active" : ""}`}
                    onClick={() => setAdminTab("export")}
                  >
                    Checkpoint Export
                  </button>
                </div>

                <div className="hp-story" aria-live="polite">
                  <span className="hp-story-kicker">Administrator Console</span>
                  {adminTab === "setup" && (
                    <>
                      <h3>Immutable schema versioning</h3>
                      <p>
                        Published field definitions are locked. Schema updates
                        create a new version without altering historical
                        observations.
                      </p>
                    </>
                  )}
                  {adminTab === "contributors" && (
                    <>
                      <h3>Passwordless device pairing</h3>
                      <p>
                        Field teams enter a single-use 8-character code to link
                        device storage without managing accounts or passwords.
                      </p>
                    </>
                  )}
                  {adminTab === "export" && (
                    <>
                      <h3>Team readiness & export</h3>
                      <p>
                        Monitor incoming observations, track contributor
                        attention metrics, and export self-contained research
                        archives.
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

        {/* Integrity & Privacy */}
        <section
          className="hp-section"
          id="integrity"
          aria-labelledby="integrity-title"
        >
          <div className="hp-section-inner">
            <div className="section-heading">
              <p className="eyebrow">Data Integrity & Privacy</p>
              <h2 id="integrity-title">
                Verifiable attention scoring and strict privacy boundaries.
              </h2>
              <p>
                Interleaved instruction checks evaluate surveyor focus in
                memory, stripping questions and answers before storage.
                Submissions remain account-isolated with zero AI alterations.
              </p>
              <DocLink file="attention-qa.md" label="Attention QA doc" />
              <DocLink file="privacy.md" label="Privacy & data handling doc" />
            </div>

            <div className="hp-integrity-grid">
              <div className="hp-integrity-card">
                <div className="hp-integrity-card-header">
                  <h3>Attention Verification</h3>
                  <p>Evaluated in memory · Stripped prior to database commit</p>
                </div>
                <AttentionDemo />
              </div>
              <div className="hp-integrity-card">
                <div className="hp-integrity-card-header">
                  <h3>Device Telemetry & Provenance</h3>
                  <p>Non-identifying context · Never blocks local commit</p>
                </div>
                <ProvenanceCard />
              </div>
            </div>

            {/* Privacy & Storage Boundaries from docs/privacy.md */}
            <div
              className="hp-fact-grid"
              style={{ "--fact-cols": 4 } as React.CSSProperties}
            >
              <div className="hp-fact-card">
                <div className="hp-fact-header">
                  <Icon name="lock" size={16} />
                  <strong>Account-Scoped Ledger</strong>
                </div>
                <p>
                  IndexedDB storage is strictly scoped per authenticated user (
                  <code>collect-local-v1-userId</code>), preventing data leakage
                  across accounts.
                </p>
              </div>

              <div className="hp-fact-card">
                <div className="hp-fact-header">
                  <Icon name="shield" size={16} />
                  <strong>Server-Enforced Consent</strong>
                </div>
                <p>
                  The sync backend strictly rejects submissions from accounts
                  without active, unrevoked participant consent.
                </p>
              </div>

              <div className="hp-fact-card">
                <div className="hp-fact-header">
                  <Icon name="file" size={16} />
                  <strong>Verbatim Provenance</strong>
                </div>
                <p>
                  Field inputs and media blobs are recorded verbatim as entered,
                  with zero AI transformation or lossy preprocessing.
                </p>
              </div>

              <div className="hp-fact-card">
                <div className="hp-fact-header">
                  <Icon name="download" size={16} />
                  <strong>Local Recovery Archive</strong>
                </div>
                <p>
                  Unsynced observations can be exported directly from device
                  storage to a self-contained ZIP archive at any time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAIR Checkpoint Dataset Explorer */}
        <section
          className="hp-section hp-section-paper"
          id="data"
          aria-labelledby="data-title"
        >
          <div className="hp-section-inner">
            <div className="section-heading">
              <p className="eyebrow">Archival & Export</p>
              <h2 id="data-title">
                Self-contained research archives for repository deposit.
              </h2>
              <p>
                Export packages bundle canonical JSONL, CSV, RFC 7946 GeoJSON,
                DataCite 4.4 metadata, and unmodified media with SHA-256
                checksums into a single verifiable archive.
              </p>
              <DocLink file="export-format.md" label="Export format doc" />
              <DocLink
                file="dataset-standards.md"
                label="FAIR dataset standards doc"
              />
            </div>
            <PackageBrowser />
            <p className="hp-section-note">
              Inspecting reference checkpoint package from{" "}
              <code>docs/demo-dataset</code>, conforming to{" "}
              <a href={DOCS("export-format.md")} target="_blank" rel="noopener">
                docs/export-format.md
              </a>
              .
            </p>

            {/* FAIR Compliance Principles from docs/dataset-standards.md */}
            <div
              className="hp-fact-grid"
              style={{ "--fact-cols": 3 } as React.CSSProperties}
            >
              <div className="hp-fact-card">
                <div className="hp-fact-header">
                  <Icon name="archive" size={16} />
                  <strong>Findable (DataCite 4.4)</strong>
                </div>
                <p>
                  Native <code>datacite.json</code> metadata kernel with DOI
                  identifiers, organizational creators, and license declarations
                  for repository deposit (Zenodo / Figshare).
                </p>
              </div>

              <div className="hp-fact-card">
                <div className="hp-fact-header">
                  <Icon name="sliders" size={16} />
                  <strong>Interoperable (RFC 7946 & JSONL)</strong>
                </div>
                <p>
                  Canonical JSONL stream, flat CSV tables, RFC 7946 GeoJSON
                  spatial features, and machine-readable{" "}
                  <code>data-dictionary.json</code> with semantic URIs.
                </p>
              </div>

              <div className="hp-fact-card">
                <div className="hp-fact-header">
                  <Icon name="camera" size={16} />
                  <strong>Reusable (Byte-for-Byte)</strong>
                </div>
                <p>
                  Self-contained ZIP archives containing uncompressed original
                  media files, schema version histories, and SHA-256 integrity
                  manifests.
                </p>
              </div>
            </div>
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
              <p className="eyebrow">Research Preview</p>
              <h2 id="preview-title">
                Request preview access for your fieldwork.
              </h2>
              <p>
                We are onboarding research teams and field campaigns. Request
                access to run custom schemas, or clone the repository to
                self-host.
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
              <CollectBrand compact />
            </a>
            <p>
              Infrastructure for trustworthy field evidence. Open source under
              Apache-2.0.
            </p>
          </div>
          <nav className="hp-footer-links" aria-label="Footer">
            <div>
              <span className="hp-footer-heading">Sections</span>
              <a href="#collection">Field collection</a>
              <a href="#sync">Sync pipeline</a>
              <a href="#admin">Setup & administration</a>
              <a href="#integrity">Data integrity</a>
              <a href="#data">Archival & export</a>
              <a href="#preview">Request access</a>
              <a href="/" target="_blank" rel="noopener noreferrer">
                Sign in — contributor
              </a>
              <a href="/?role=admin" target="_blank" rel="noopener noreferrer">
                Sign in — admin
              </a>
            </div>
            <div>
              <span className="hp-footer-heading">Documentation</span>
              <a href={GITHUB_URL} target="_blank" rel="noopener">
                GitHub repository
              </a>
              <a
                href={DOCS("background-automation.md")}
                target="_blank"
                rel="noopener"
              >
                Background automation
              </a>
              <a href={DOCS("export-format.md")} target="_blank" rel="noopener">
                Export format spec
              </a>
              <a href={DOCS("architecture.md")} target="_blank" rel="noopener">
                Architecture guide
              </a>
              <a href={DOCS("privacy.md")} target="_blank" rel="noopener">
                Privacy & data handling
              </a>
              <a
                href={DOCS("dataset-standards.md")}
                target="_blank"
                rel="noopener"
              >
                FAIR dataset standards
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
