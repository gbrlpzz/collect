import { useState } from "react";
import { FlowDemo } from "./FlowDemo";
import { SyncDemo } from "./SyncDemo";
import { PackageBrowser } from "./PackageBrowser";
import { PreviewForm } from "./PreviewForm";
import { AdminWalkthrough } from "./AdminWalkthrough";
import { AttentionDemo } from "./AttentionDemo";
import { ProvenanceCard } from "./ProvenanceCard";
import { DocLinks, DOCS } from "./DocLinks";
import { Icon, type IconName } from "../components/Icon";
import { CollectBrand } from "../components/CollectBrand";

const GITHUB_URL = "https://github.com/gbrlpzz/collect";

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
          <a className="hp-nav-link" href="#guarantees">
            Guarantees
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
      <div className="hp-hero-bg" aria-hidden="true">
        <img
          src="/hero-alps.webp"
          alt=""
          className="hp-hero-bg-img"
          loading="eager"
        />
        <div className="hp-hero-bg-overlay" />
      </div>

      <div className="hp-hero-container">
        <div className="hp-hero-inner">
          <h1 id="hero-title">Field evidence you can trust.</h1>

          <p className="hp-hero-lede">
            Record structured observations, unmodified media, and GPS provenance
            offline on any device. Built for scientific transects, heritage
            surveys, and fieldwork beyond cell range.
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
              placeholder="you@example.com"
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
              Try the live collector ↓
            </a>
          </div>
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
      proof: "commit before network with verified receipt",
      href: "#sync",
      cta: "Inspect sync pipeline",
      doc: "background-automation.md",
    },
    {
      icon: "camera",
      title: "Unmodified media originals",
      claim:
        "Photos and audio retain capture quality with SHA-256 checksums, with no collection-path recompression.",
      proof: "raw originals with SHA-256 checksums",
      href: "#collection",
      cta: "View media capture",
      doc: "dataset-standards.md",
    },
    {
      icon: "check",
      title: "Isolated attention checks",
      claim:
        "Periodic checks evaluate contributor focus in memory, stripping questions and answers before database commit.",
      proof: "in-memory checks and isolated payloads",
      href: "#integrity",
      cta: "Test attention check",
      doc: "attention-qa.md",
    },
    {
      icon: "archive",
      title: "FAIR export archives",
      claim:
        "Checkpoint exports package canonical JSONL, CSV, RFC 7946 GeoJSON, DataCite 4.4 metadata, and raw media into a single archive.",
      proof: "DataCite 4.4, GeoJSON and JSONL",
      href: "#data",
      cta: "Browse export package",
      doc: "export-format.md",
    },
  ];

  const stats = [
    { value: "3-stage", label: "verified sync pipeline" },
    { value: "SHA-256", label: "media integrity checksums" },
    { value: "8-character", label: "passwordless device codes" },
    { value: "Apache-2.0", label: "open source and self-hostable" },
  ];

  return (
    <section
      className="hp-diff-section"
      id="guarantees"
      aria-label="Core guarantees"
    >
      <div className="hp-diff-inner">
        <div className="hp-diff-heading">
          <p className="eyebrow">Guarantees</p>
          <h2>Four guarantees for data collected in the wild.</h2>
          <p>
            Fieldwork happens in harsh conditions. collect is engineered around
            four technical guarantees that protect your data from capture to
            archive:
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

        {/* 1. Field Collection inside iPhone Mockup (Directly under Hero) */}
        <section
          className="hp-section hp-section-paper"
          id="collection"
          aria-labelledby="collection-title"
        >
          <div className="hp-section-inner">
            <FlowDemo />
          </div>
        </section>

        {/* 2. Four Bedrock Guarantees */}
        <DifferentiationSummary />

        {/* 3. Synchronization State Machine */}
        <section className="hp-section" id="sync" aria-labelledby="sync-title">
          <div className="hp-section-inner">
            <SyncDemo />
          </div>
        </section>

        {/* 4. Admin Operations & Schema (Dark Evening Mockup) */}
        <section
          className="hp-section hp-section-admin"
          id="admin"
          aria-labelledby="admin-title"
        >
          <div className="hp-section-inner">
            <div className="hp-flow-layout">
              <div className="hp-flow-copy">
                <div className="section-heading">
                  <p className="eyebrow">Setup & Operations</p>
                  <h2 id="admin-title">
                    Lock survey versions. Monitor sync progress across the
                    fleet.
                  </h2>
                  <p>
                    Author locked survey contracts, onboard researchers with
                    single-use 8-character codes, and monitor fleet sync
                    readiness — tracking received observations, pending device
                    queues, and attention scores in real time.
                  </p>
                  <DocLinks files={["flows.md", "spec.md"]} />
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
                    Fleet Readiness
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
                      <h3>Real-time fleet sync & progress monitoring</h3>
                      <p>
                        Track incoming observations, unsynced device queues, and
                        contributor attention reliability scores across all
                        field teams in real time.
                      </p>
                    </>
                  )}
                  {adminTab === "export" && (
                    <>
                      <h3>Verified publication checkpoints</h3>
                      <p>
                        Review received observations, monitor contributor
                        attention, and export self-contained research archives
                        once all devices report complete.
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

        {/* 5. Integrity & Privacy */}
        <section
          className="hp-section"
          id="integrity"
          aria-labelledby="integrity-title"
        >
          <div className="hp-section-inner">
            <div className="section-heading">
              <p className="eyebrow">Data Integrity</p>
              <h2 id="integrity-title">
                Detect surveyor fatigue without polluting research data.
              </h2>
              <p>
                During 8-hour field transects, fatigue causes rapid tapping
                without reading. collect interleaves subtle instruction checks
                to measure focus, stripping questions and answers in memory
                before database commit. Device context and GPS coordinates
                record verifiable provenance.
              </p>
              <DocLinks files={["attention-qa.md", "privacy.md"]} />
            </div>

            <div className="hp-integrity-grid">
              {/* Left rail: Attention QA + 4 Privacy Boundaries */}
              <div className="hp-integrity-left-rail">
                <div className="hp-integrity-card">
                  <div className="hp-integrity-card-header">
                    <h3>Attention Verification</h3>
                    <p>
                      Evaluated in memory and stripped before database commit
                    </p>
                  </div>
                  <AttentionDemo />
                </div>

                <div className="hp-privacy-stack">
                  <div className="hp-fact-card">
                    <div className="hp-fact-header">
                      <Icon name="lock" size={16} />
                      <strong>Account-Scoped Ledger</strong>
                    </div>
                    <p>
                      IndexedDB is strictly scoped per authenticated user (
                      <code>collect-local-v1-userId</code>), preventing
                      cross-account leaks.
                    </p>
                  </div>

                  <div className="hp-fact-card">
                    <div className="hp-fact-header">
                      <Icon name="shield" size={16} />
                      <strong>Server-Enforced Consent</strong>
                    </div>
                    <p>
                      The sync backend rejects submissions from accounts without
                      active, unrevoked participant consent.
                    </p>
                  </div>

                  <div className="hp-fact-card">
                    <div className="hp-fact-header">
                      <Icon name="file" size={16} />
                      <strong>Verbatim Provenance</strong>
                    </div>
                    <p>
                      Observations and media blobs are stored verbatim as
                      entered, with zero AI transformation or lossy
                      preprocessing.
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

              {/* Right rail: Spatial & Device Provenance */}
              <div className="hp-integrity-right-rail">
                <div className="hp-integrity-card">
                  <div className="hp-integrity-card-header">
                    <h3>Device & Spatial Provenance</h3>
                    <p>
                      Device model, OS, and GPS coordinates recorded per
                      observation
                    </p>
                  </div>
                  <ProvenanceCard />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. FAIR Checkpoint Dataset Explorer */}
        <section
          className="hp-section hp-section-paper"
          id="data"
          aria-labelledby="data-title"
        >
          <div className="hp-section-inner">
            <div className="section-heading">
              <p className="eyebrow">Archival & Export</p>
              <h2 id="data-title">
                Deposit-ready research packages for Zenodo and peer review.
              </h2>
              <p>
                Export packages bundle canonical JSONL, CSV, RFC 7946 GeoJSON,
                DataCite 4.4 metadata, and unmodified media with SHA-256
                checksums into a single verifiable archive.
              </p>
              <DocLinks files={["export-format.md", "dataset-standards.md"]} />
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

        {/* 7. Request Access / Pilot Form */}
        <section
          className="hp-section"
          id="preview"
          aria-labelledby="preview-title"
        >
          <div className="hp-section-inner hp-preview-layout">
            <div className="hp-preview-copy">
              <p className="eyebrow">Research Preview</p>
              <h2 id="preview-title">
                Equip your next field campaign or expedition.
              </h2>
              <p>
                We are onboarding research teams, ecological surveys, and field
                expeditions. Request preview access to test custom schemas, or
                clone the repository to self-host.
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
              <a href="#guarantees">Guarantees</a>
              <a href="#sync">Sync pipeline</a>
              <a href="#admin">Setup & operations</a>
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
          <p className="hp-footer-legal">© 2026 Gabriele Pizzi — Apache-2.0</p>
        </div>
      </footer>
    </div>
  );
}
