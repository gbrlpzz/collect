import { useState } from "react";
import { FlowDemo } from "./FlowDemo";
import { PackageBrowser } from "./PackageBrowser";
import { PreviewForm } from "./PreviewForm";
import { AdminWalkthrough } from "./AdminWalkthrough";
import { AttentionDemo } from "./AttentionDemo";
import { ProvenanceCard } from "./ProvenanceCard";

const APP_URL = "https://collect-tawny.vercel.app";
const ADMIN_URL = `${APP_URL}/?role=admin`;
const GITHUB_URL = "https://github.com/gbrlpzz/collect";
const DOCS = (file: string) => `${GITHUB_URL}/blob/main/docs/${file}`;

const NAV = [
  { label: "1. Schema & Setup", href: "#admin" },
  { label: "2. Collection", href: "#collection" },
  { label: "3. Integrity", href: "#integrity" },
  { label: "4. Data Package", href: "#data" },
  { label: "Request Access", href: "#preview" },
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
            width={24}
            height={24}
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
      setError("Enter a valid email address.");
      return;
    }
    onEmailSubmit(email.trim());
  };

  return (
    <section className="hp-hero" id="top" aria-labelledby="hero-title">
      <div className="hp-hero-inner">
        <p className="eyebrow">Infrastructure for trustworthy field evidence</p>
        <h1 id="hero-title">
          Collect structured field observations.
          <br />
          100% offline.
        </h1>
        <p className="hp-hero-lede">
          Design custom observation schemas, capture structured evidence and
          uncompressed media with zero signal, and export complete,
          publication-ready research datasets.
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
            placeholder="you@your-institution.org"
            aria-label="Work email"
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
            Explore workflow ↓
          </a>
        </div>
      </div>
    </section>
  );
}

export function HomepageApp() {
  const [draftEmail, setDraftEmail] = useState("");

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

        {/* Step 1: Real Admin Project Dashboard */}
        <section
          className="hp-section hp-section-dark"
          id="admin"
          aria-labelledby="admin-title"
        >
          <div className="hp-section-inner">
            <div className="section-heading hp-admin-heading">
              <p className="eyebrow">Step 1 · Setup & Operations</p>
              <h2 id="admin-title">
                Define immutable schemas and pair field devices.
              </h2>
              <p>
                Author versioned questions, generate single-use device pairing
                codes without passwords, monitor contributor readiness, and
                trigger research snapshots.
              </p>
            </div>
            <AdminWalkthrough />
          </div>
        </section>

        {/* Step 2: Real Field Collection inside iPhone Mockup */}
        <section
          className="hp-section hp-section-paper"
          id="collection"
          aria-labelledby="collection-title"
        >
          <div className="hp-section-inner">
            <div className="section-heading">
              <p className="eyebrow">Step 2 · Field Collection</p>
              <h2 id="collection-title">
                Single-question focus. Built for the field.
              </h2>
              <p>
                One question at a time, comfortable touch targets, uncompressed
                photos, and atomic local receipts that guarantee no saved
                observation is lost when offline.
              </p>
            </div>
            <FlowDemo />
          </div>
        </section>

        {/* Step 3: Differentiating Integrity & Provenance */}
        <section
          className="hp-section"
          id="integrity"
          aria-labelledby="integrity-title"
        >
          <div className="hp-section-inner">
            <div className="section-heading">
              <p className="eyebrow">Step 3 · Provenance & Quality</p>
              <h2 id="integrity-title">
                Trustworthy provenance without research payload bias.
              </h2>
              <p>
                Cognitive attention verification is stripped before commit to
                prevent data dictionary contamination, while device telemetry
                and cryptographic hashes are captured automatically.
              </p>
            </div>
            <div className="hp-integrity-grid">
              <div className="hp-integrity-card">
                <div className="hp-integrity-card-header">
                  <h3>Attention Verification QA</h3>
                  <p>
                    Question never enters schema · Answer stripped before commit
                  </p>
                </div>
                <AttentionDemo />
              </div>
              <div className="hp-integrity-card">
                <div className="hp-integrity-card-header">
                  <h3>Hardware & Environment Provenance</h3>
                  <p>
                    Automatic telemetry · Never blocks local submission receipt
                  </p>
                </div>
                <ProvenanceCard />
              </div>
            </div>
          </div>
        </section>

        {/* Step 4: Real Data Package Checkpoint Explorer */}
        <section
          className="hp-section hp-section-paper"
          id="data"
          aria-labelledby="data-title"
        >
          <div className="hp-section-inner">
            <div className="section-heading">
              <p className="eyebrow">Step 4 · Archival & Export</p>
              <h2 id="data-title">
                A complete, self-contained research package.
              </h2>
              <p>
                Every checkpoint archive includes canonical JSONL, CSV, GeoJSON,
                DataCite 4.4 kernel metadata, machine-readable data dictionary,
                and byte-for-byte original media with SHA-256 integrity hashes.
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

        {/* Request Access / Deploy */}
        <section
          className="hp-section"
          id="preview"
          aria-labelledby="preview-title"
        >
          <div className="hp-section-inner hp-preview-layout">
            <div className="hp-preview-copy">
              <p className="eyebrow">Get Started</p>
              <h2 id="preview-title">Deploy collect for your research team.</h2>
              <p>
                A hosted instance provisioned with your survey fields, team
                invitations, and export requirements. Tell us what you collect.
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
                width={24}
                height={24}
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
              <a href="#admin">1. Schema & Setup</a>
              <a href="#collection">2. Field Collection</a>
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
