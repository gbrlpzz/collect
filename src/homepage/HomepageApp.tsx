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
  { label: "1. Schema", href: "#admin" },
  { label: "2. Collection", href: "#collection" },
  { label: "3. QA & Telemetry", href: "#integrity" },
  { label: "4. FAIR Package", href: "#data" },
  { label: "Comparison", href: "#comparison" },
  { label: "Use Cases", href: "#use-cases" },
  { label: "Architecture", href: "#architecture" },
  { label: "FAQ", href: "#faq" },
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
          <span>Offline-First Fieldwork Infrastructure · Apache-2.0</span>
        </div>

        <h1 id="hero-title">
          Trustworthy field observations.
          <br />
          <span className="hp-hero-accent">Built for zero signal.</span>
        </h1>

        <p className="hp-hero-lede">
          Design immutable observation schemas, capture uncompressed original
          media in remote environments, verify contributor attention without
          payload bias, and export self-contained FAIR research packages.
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

        <div className="hp-hero-quicklinks">
          <a className="hp-quicklink" href="#collection">
            <Icon name="play" size={14} />
            Try Field Simulator ↓
          </a>
          <a className="hp-quicklink" href="#data">
            <Icon name="archive" size={14} />
            Browse FAIR Package →
          </a>
          <a
            className="hp-quicklink"
            href={GITHUB_URL}
            target="_blank"
            rel="noopener"
          >
            <Icon name="globe" size={14} />
            GitHub Repo ↗
          </a>
        </div>

        <div
          className="hp-hero-metric-strip"
          aria-label="Core operational guarantees"
        >
          <div className="hp-metric-pill">
            <strong>0 Lost Records</strong>
            <span>Atomic IndexedDB receipts before network</span>
          </div>
          <div className="hp-metric-pill">
            <strong>100% Offline</strong>
            <span>Full shell & uncompressed media stored locally</span>
          </div>
          <div className="hp-metric-pill">
            <strong>8-Char Link</strong>
            <span>Zero passwords, instant Safari/PWA pairing</span>
          </div>
          <div className="hp-metric-pill">
            <strong>DataCite 4.4</strong>
            <span>GeoJSON, CSV, JSONL & SHA-256 media manifests</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function DifferentiationSummary() {
  const items = [
    {
      icon: "shield" as const,
      title: "Durable Local Receipts",
      desc: "Atomic IndexedDB multi-store transactions commit metadata, payload, and raw binary media to device storage before confirming save. Never loses a record when signal vanishes.",
    },
    {
      icon: "check" as const,
      title: "Unbiased Cognitive QA",
      desc: "Automated, guess-adjusted attention verification questions confirm surveyor focus. Question text never enters the schema and responses are stripped before commit.",
    },
    {
      icon: "users" as const,
      title: "Zero-Password Device Link",
      desc: "Instant contributor pairing with single-use 8-character codes. Works seamlessly in mobile Safari or installed PWA with zero App Store friction or passwords.",
    },
    {
      icon: "archive" as const,
      title: "FAIR Checkpoint Packages",
      desc: "One-click self-contained ZIP archives including DataCite 4.4 kernel metadata, GeoJSON, CSV, JSONL, data dictionaries, and SHA-256 verified media originals.",
    },
  ];

  return (
    <section
      className="hp-diff-section"
      id="pillars"
      aria-label="Core differentiation"
    >
      <div className="hp-diff-inner">
        <div className="hp-diff-grid">
          {items.map((item) => (
            <div className="hp-diff-card" key={item.title}>
              <div className="hp-diff-icon-wrap">
                <Icon name={item.icon} size={18} />
              </div>
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
      feature: "Offline Persistence",
      collect:
        "Atomic multi-store IndexedDB receipts written before network handshake",
      others:
        "In-memory form drafts or fragile browser caches prone to tab eviction",
      advantage: true,
    },
    {
      feature: "Media Preservation",
      collect:
        "100% original uncompressed media blobs with SHA-256 integrity hashes",
      others: "Aggressive lossy JPEG downsampling during mobile capture",
      advantage: true,
    },
    {
      feature: "Surveyor Attention QA",
      collect:
        "Cognitive checks with guess-adjusted scoring; prompt & answer stripped before commit",
      others:
        "None, or manual survey questions that pollute and bias the research dataset",
      advantage: true,
    },
    {
      feature: "Field Device Onboarding",
      collect:
        "Single-use 8-character link codes; 0 passwords, 0 App Store accounts",
      others:
        "App Store downloads, permanent passwords, or unprotected public survey links",
      advantage: true,
    },
    {
      feature: "Archival Export Standard",
      collect:
        "FAIR checkpoint ZIP (DataCite 4.4, GeoJSON, CSV, JSONL, hash manifest)",
      others:
        "Flat single-table CSV or Excel spreadsheet export without provenance",
      advantage: true,
    },
    {
      feature: "Local Multi-Account Isolation",
      collect:
        "Strict account-scoped IndexedDB instances (collect-local-v1-<userId>)",
      others: "Shared browser storage risking cross-contributor survey leaks",
      advantage: true,
    },
    {
      feature: "License & Self-Hosting",
      collect:
        "100% Open Source (Apache-2.0), self-hostable on Supabase & Vercel",
      others:
        "Proprietary vendor lock-in or complex Java/XML server infrastructure",
      advantage: true,
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
          <p className="eyebrow">Why Field Teams Choose collect</p>
          <h2 id="comp-title">
            Engineered specifically for high-stakes field evidence.
          </h2>
          <p>
            Generic form builders are built for office surveys on fast WiFi.
            collect is purpose-built to preserve scientific observations in
            harsh, disconnected field environments.
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

function UseCasesSection() {
  const useCases = [
    {
      badge: "Biodiversity & Ecology",
      title: "Remote Habitat & Species Surveys",
      desc: "Record species observations, canopy coverage, and micro-climate data deep inside remote nature reserves with zero cellular connectivity. Store uncompressed macro photography and precise hardware GPS without losing a single transect.",
    },
    {
      badge: "Built Heritage & Architecture",
      title: "Historic Structure & Masonry Audits",
      desc: "Map vernacular construction, structural deformation, and material weathering across rural settlements. Versioned schemas ensure historic observations retain their exact survey schema over decades of monitoring.",
    },
    {
      badge: "Emergency & Humanitarian",
      title: "Post-Disaster Rapid Assessment",
      desc: "Deploy multi-enumerator field teams immediately following extreme weather or seismic events. Instant 8-character device pairing gets local teams operational in seconds with offline local receipts.",
    },
    {
      badge: "Public Policy & Economics",
      title: "Regional Socio-Economic Fieldwork",
      desc: "Conduct multi-week rural household surveys with verifiable contributor attention scoring. Mathematical guess adjustment eliminates enumerator fatigue and fabricated responses without biasing research variables.",
    },
  ];

  return (
    <section
      className="hp-section"
      id="use-cases"
      aria-labelledby="usecases-title"
    >
      <div className="hp-section-inner">
        <div className="section-heading">
          <p className="eyebrow">Proven Field Scenarios</p>
          <h2 id="usecases-title">
            Built for scientific, environmental, and infrastructure fieldwork.
          </h2>
          <p>
            When data collection cannot be repeated, researchers rely on
            deterministic local durability and tamper-evident provenance.
          </p>
        </div>

        <div className="hp-usecases-grid">
          {useCases.map((uc) => (
            <div className="hp-usecase-card" key={uc.title}>
              <span className="chip hp-usecase-badge">{uc.badge}</span>
              <h3>{uc.title}</h3>
              <p>{uc.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArchitectureSection() {
  const pillars = [
    {
      title: "Multi-Store Client Isolation",
      desc: "Every authenticated account writes to an isolated IndexedDB database (collect-local-v1-<userId>). Shared field tablets never leak cached observations or drafts across different researchers.",
    },
    {
      title: "Resumable 4-Stage Sync Protocol",
      desc: "Synchronization advances sequentially: Schema Metadata → Raw Media Blobs → Observation Finalization → Durable Server Receipt. Submissions stay in local outbox until server confirms receipt.",
    },
    {
      title: "Zero-AI Pure Provenance",
      desc: "Observations are captured verbatim with authentic timestamps and device environment context. No AI transformations or heuristic rewrites alter field truth before publication.",
    },
    {
      title: "PostgreSQL Row-Level Security",
      desc: "All access boundaries are enforced at the PostgreSQL database layer via RLS policies. Service-role credentials remain strictly confined inside Supabase Edge Functions.",
    },
  ];

  return (
    <section
      className="hp-section hp-section-paper"
      id="architecture"
      aria-labelledby="arch-title"
    >
      <div className="hp-section-inner">
        <div className="section-heading">
          <p className="eyebrow">Architecture & Trust</p>
          <h2 id="arch-title">Zero-compromise technical guarantees.</h2>
          <p>
            An open architecture designed for durability, privacy, and long-term
            scientific reproducibility.
          </p>
        </div>

        <div className="hp-arch-grid">
          {pillars.map((p) => (
            <div className="hp-arch-card" key={p.title}>
              <div className="hp-arch-card-header">
                <span className="hp-arch-bullet" />
                <h3>{p.title}</h3>
              </div>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: "How does offline collection work without an App Store download?",
      a: "collect is a Progressive Web App (PWA) that leverages modern browser Cache and Service Worker APIs. When loaded once, the entire application shell is stored on the device. All question schemas, media blobs, and observations are written directly into IndexedDB, providing multi-gigabyte local storage capacity with zero network requirement.",
    },
    {
      q: "What happens if a field device battery dies or the browser closes mid-survey?",
      a: "Every single answer and photo is saved atomically to IndexedDB the moment it is entered. If the browser closes, Safari crashes, or the phone runs out of battery, reopening collect immediately restores the exact survey state and draft without data loss.",
    },
    {
      q: "How does the cognitive attention check work without biasing research data?",
      a: "A quick verification question from a curated bank is randomly presented during the survey. Provenance records a guess-adjusted 0–100 score and binary pass/fail flag. The question text never enters the published schema, and the response is stripped completely before the payload is committed to the database.",
    },
    {
      q: "How are original media files protected against corruption or tampering?",
      a: "Photos and audio recordings are stored in IndexedDB as original binary blobs without lossy downsampling. Upon submission, a cryptographic SHA-256 hash is computed. The checkpoint manifest pairs every media file with its exact byte count, MIME type, and SHA-256 checksum.",
    },
    {
      q: "Can our university or research institution self-host collect?",
      a: "Yes. collect is 100% open source under the Apache-2.0 license. The backend uses Supabase (PostgreSQL, Auth, Storage, Edge Functions) and the frontend deploys to any static host or Vercel. You can deploy it within your own cloud or on-premise infrastructure.",
    },
    {
      q: "How do single-use device link codes protect field projects?",
      a: "Administrators generate an 8-character single-use code from the dashboard. Field contributors enter this code once on their mobile device to pair their IndexedDB storage and receive their project schema. There are no passwords to manage or forget in the field.",
    },
  ];

  return (
    <section className="hp-section" id="faq" aria-labelledby="faq-title">
      <div className="hp-section-inner">
        <div className="section-heading">
          <p className="eyebrow">Frequently Asked Questions</p>
          <h2 id="faq-title">
            Everything you need to know about deploying collect.
          </h2>
          <p>
            Clear answers to common technical and operational questions from
            field coordinators and principal investigators.
          </p>
        </div>

        <div className="hp-faq-list">
          {faqs.map((faq) => (
            <details className="hp-faq-item" key={faq.q}>
              <summary className="hp-faq-summary">
                <span>{faq.q}</span>
                <span className="hp-faq-icon" aria-hidden="true" />
              </summary>
              <div className="hp-faq-answer">
                <p>{faq.a}</p>
              </div>
            </details>
          ))}
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
        <DifferentiationSummary />

        {/* Step 1: Admin Operations & Schema */}
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
                Author versioned questions, generate single-use 8-character
                device codes without passwords, monitor fleet readiness, and
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
                Single-question focus. Built for zero signal.
              </h2>
              <p>
                One question per screen, comfortable touch targets for gloves,
                uncompressed photos, and atomic IndexedDB transactions that
                guarantee no saved observation is lost.
              </p>
            </div>
            <FlowDemo />
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
                Trustworthy provenance without research payload bias.
              </h2>
              <p>
                Cognitive attention checks verify contributor focus while the
                question text never enters the schema and the answer is stripped
                before commit. Device hardware telemetry is recorded
                automatically.
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

        {/* Value Differentiation & Comparison Matrix */}
        <ComparisonSection />

        {/* Field Use Cases */}
        <UseCasesSection />

        {/* Architecture & Security Deep Dive */}
        <ArchitectureSection />

        {/* Frequently Asked Questions */}
        <FAQSection />

        {/* Request Access / Deploy */}
        <section
          className="hp-section hp-section-paper"
          id="preview"
          aria-labelledby="preview-title"
        >
          <div className="hp-section-inner hp-preview-layout">
            <div className="hp-preview-copy">
              <p className="eyebrow">Deploy collect</p>
              <h2 id="preview-title">
                Ready for your institution or research team.
              </h2>
              <p>
                A hosted instance provisioned with your survey fields, team
                invitations, and export requirements. Or clone the open source
                repository and self-host on your own infrastructure.
              </p>
              <div className="hp-deploy-options">
                <div className="hp-deploy-option">
                  <span className="hp-deploy-icon">
                    <Icon name="cloud" size={16} />
                  </span>
                  <div>
                    <strong>Managed Research Preview</strong>
                    <p>
                      Hosted Supabase + Vercel deployment with dedicated project
                      scoping.
                    </p>
                  </div>
                </div>
                <div className="hp-deploy-option">
                  <span className="hp-deploy-icon">
                    <Icon name="shield" size={16} />
                  </span>
                  <div>
                    <strong>Self-Hosted Institutional Stack</strong>
                    <p>
                      100% Apache-2.0 open source code with complete data
                      sovereignty.
                    </p>
                  </div>
                </div>
              </div>
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
              Infrastructure for trustworthy field evidence. Offline-first,
              zero-AI, and open source under Apache-2.0.
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
              <span className="hp-footer-heading">Product & Trust</span>
              <a href="#comparison">Why collect</a>
              <a href="#use-cases">Field Use Cases</a>
              <a href="#architecture">Architecture</a>
              <a href="#faq">Frequently Asked Questions</a>
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
          <p className="hp-footer-legal">
            © 2026 Gabriele Pizzi · Apache-2.0 · Open Source Field
            Infrastructure
          </p>
        </div>
      </footer>
    </div>
  );
}
