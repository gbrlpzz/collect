import { useState } from "react";
import { Icon } from "../components/Icon";
import { FlowDemo } from "./FlowDemo";
import { AttentionDemo } from "./AttentionDemo";
import { PackageBrowser } from "./PackageBrowser";
import { ProvenanceCard } from "./ProvenanceCard";
import { PreviewForm } from "./PreviewForm";

const APP_URL = "https://collect-tawny.vercel.app";
const ADMIN_URL = `${APP_URL}/?role=admin`;
const GITHUB_URL = "https://github.com/gbrlpzz/collect";
const DOCS = (file: string) => `${GITHUB_URL}/blob/main/docs/${file}`;

function TopBar() {
  return (
    <header className="hp-topbar">
      <div className="hp-topbar-inner">
        <a className="wordmark" href="#top">
          collect<span className="wordmark-dot">.</span>
        </a>
        <nav className="hp-topbar-actions" aria-label="Primary">
          <a
            className="hp-nav-link"
            href={GITHUB_URL}
            target="_blank"
            rel="noopener"
          >
            GitHub
          </a>
          <a
            className="hp-nav-link"
            href={APP_URL}
            target="_blank"
            rel="noopener"
          >
            Contributor sign-in
          </a>
          <a
            className="hp-nav-link"
            href={ADMIN_URL}
            target="_blank"
            rel="noopener"
          >
            Admin sign-in
          </a>
          <a className="button button-primary button-small" href="#preview">
            Request access
          </a>
        </nav>
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
        <p className="eyebrow">
          Offline-first field data collection · research preview
        </p>
        <h1 id="hero-title">
          Fieldwork you can trust,
          <br />
          where the signal ends.
        </h1>
        <p className="hp-hero-lede">
          collect is a field data collector for scientific surveys and
          structured observation. It saves every answer on the device before
          promising anything, syncs only on a durable server receipt, measures
          the attention quality of every contributor — and exports the fieldwork
          you actually did as a FAIR, machine-readable dataset.
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
        <p className="hp-capture-note">
          The research preview is invite-only — we read every request. Tell us
          your use case after leaving your email.
        </p>

        <div className="hp-hero-actions">
          <a className="text-button" href="#demo">
            See it in action
            <Icon name="chevron-down" size={15} />
          </a>
          <span className="hp-hero-sep" aria-hidden="true" />
          <a
            className="text-button"
            href={APP_URL}
            target="_blank"
            rel="noopener"
          >
            Contributor sign-in
          </a>
          <span className="hp-hero-sep" aria-hidden="true" />
          <a
            className="text-button"
            href={ADMIN_URL}
            target="_blank"
            rel="noopener"
          >
            Admin sign-in
          </a>
        </div>
      </div>
    </section>
  );
}

/** Generic tools vs collect — the differentiating factors. */
const COMPARISON: Array<{
  factor: string;
  generic: string;
  collect: React.ReactNode;
}> = [
  {
    factor: "What “saved” means",
    generic: "“Saved” can mean the request was sent",
    collect: (
      <>
        Saved means <strong>committed to the device</strong> in one local
        transaction — before the interface says anything
      </>
    ),
  },
  {
    factor: "What “synced” means",
    generic: "“Synced” can mean the upload finished",
    collect: (
      <>
        Synced means the server's <strong>durable finalization receipt</strong>{" "}
        — metadata, media, finalization, each resumable
      </>
    ),
  },
  {
    factor: "Quality signal",
    generic: "No way to tell careful records from rushed ones",
    collect: (
      <>
        <strong>Automatic attention QA</strong> on every observation — a
        guess-adjusted score per contributor, exported with the data
      </>
    ),
  },
  {
    factor: "The dataset",
    generic: "A folder of exports nobody can reuse",
    collect: (
      <>
        A <strong>FAIR research package</strong>: JSONL + CSV + GeoJSON,
        DataCite 4.4 metadata, data dictionary, media originals
      </>
    ),
  },
  {
    factor: "Schemas",
    generic: "The form can change mid-project",
    collect: (
      <>
        <strong>Immutable schema versions</strong> — historical observations
        keep their meaning
      </>
    ),
  },
  {
    factor: "Provenance",
    generic: "Manual fields contributors forget",
    collect: (
      <>
        <strong>Recorded automatically</strong> — who, what schema, which
        device, when, where, which app version, plus location and environment
      </>
    ),
  },
];

const FEATURES = [
  {
    icon: "signal" as const,
    title: "Three days offline",
    body: "Kill the app, drop the connection, wait a week. The queue, drafts, media, and receipts survive — nothing is discarded before the server acknowledges it.",
  },
  {
    icon: "check" as const,
    title: "One question at a time",
    body: "A guided flow with capsule answers and auto-advance — no scrolling, no parsing, one thumb action at a time.",
  },
  {
    icon: "location" as const,
    title: "Location, in the background",
    body: "Captured automatically after one permission grant. Never a question the contributor must answer.",
  },
  {
    icon: "camera" as const,
    title: "Media, fully offline",
    body: "Photos and audio work with no signal; original files are never recompressed, and integrity hashes are computed invisibly.",
  },
  {
    icon: "users" as const,
    title: "Readiness, not self-reports",
    body: "Device-reported status aggregates every device a contributor uses — no “I'm done” button.",
  },
  {
    icon: "lock" as const,
    title: "Consent, enforced",
    body: "Versioned in-app consent at first sign-in; the server refuses submissions without it. Accounts are invite-only.",
  },
];

const ADMIN_FEATURES = [
  {
    title: "FAIR by default",
    body: "License, dataset contact, and an optional DOI are set once on the project and embedded in every export: DataCite 4.4 metadata, a data dictionary with semantic mapping hooks, and a human-readable README.",
    chip: "dataset/datacite.json",
  },
  {
    title: "Immutable schemas",
    body: "Forms are built from a deliberately small set of strongly typed fields — text, numbers, choices, tri-state, date, location, photo, audio, repeatable groups. Publishing freezes a version; history keeps its meaning.",
    chip: "schema/schema-v1.json",
  },
  {
    title: "Readiness, not self-reports",
    body: "Device-reported status aggregates every device a contributor uses — no “I'm done” button. Administrators watch pending submissions per device and ping stragglers.",
    chip: "contributors.csv",
  },
  {
    title: "Consent, enforced",
    body: "Contributors accept a versioned consent statement at first sign-in; the server refuses submissions without it, and the consent record travels in exports. Accounts are invite-only.",
    chip: "submissions.jsonl",
  },
];

function Differentiators() {
  return (
    <section className="hp-section" aria-labelledby="differentiators-title">
      <div className="hp-section-inner">
        <div className="section-heading">
          <p className="eyebrow">Why collect is different</p>
          <h2 id="differentiators-title">
            Built for the place generic tools fail.
          </h2>
          <p>
            Most survey software is a generic form builder or a fragile online
            tool. Fieldwork needs a different contract — and the difference is
            in the mechanisms, not the marketing.
          </p>
        </div>

        <div
          className="hp-compare"
          role="table"
          aria-label="collect vs generic survey tools"
        >
          <div className="hp-compare-head" role="row">
            <span role="columnheader" />
            <span role="columnheader">Generic survey tool</span>
            <span role="columnheader">collect</span>
          </div>
          {COMPARISON.map((row) => (
            <div className="hp-compare-row" role="row" key={row.factor}>
              <span className="hp-compare-factor" role="rowheader">
                {row.factor}
              </span>
              <span className="hp-compare-generic" role="cell">
                {row.generic}
              </span>
              <span className="hp-compare-collect" role="cell">
                {row.collect}
              </span>
            </div>
          ))}
        </div>

        <ol className="hp-contract-list">
          {[
            {
              title: "Saved means saved",
              body: (
                <>
                  Submit commits the structured payload, media metadata, media
                  blobs, and outbox operations in{" "}
                  <strong>one local database transaction</strong> before the
                  interface says anything. The receipt never depends on the
                  network.
                </>
              ),
            },
            {
              title: "Synced means synced",
              body: (
                <>
                  Metadata → each media object → finalization: three resumable
                  phases, retried automatically with backoff. Only the server's{" "}
                  <strong>durable finalization receipt</strong> moves a record
                  to “synced”.
                </>
              ),
            },
            {
              title: "Evidence stays honest",
              body: (
                <>
                  Published schemas and finalized observations are immutable;
                  conflicts are explicit, never silently overwritten. Every
                  record carries full provenance:{" "}
                  <strong>
                    who, what schema, which device, when, where, which app
                    version
                  </strong>
                  .
                </>
              ),
            },
          ].map((item, index) => (
            <li className="hp-contract-row" key={item.title}>
              <span className="hp-contract-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="hp-contract-copy">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FeatureGrid() {
  return (
    <section
      className="hp-section hp-section-paper"
      aria-labelledby="features-title"
    >
      <div className="hp-section-inner">
        <div className="section-heading">
          <p className="eyebrow">What's inside</p>
          <h2 id="features-title">Everything a field team needs.</h2>
        </div>
        <div className="hp-feature-grid">
          {FEATURES.map((feature) => (
            <article className="hp-feature-card" key={feature.title}>
              <span className="hp-feature-icon" aria-hidden="true">
                <Icon name={feature.icon} size={18} />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminSection() {
  return (
    <section
      className="hp-section hp-section-dark"
      aria-labelledby="admin-title"
    >
      <div className="hp-section-inner">
        <div className="section-heading">
          <p className="eyebrow">collect Admin</p>
          <h2 id="admin-title">For the team that owns the dataset.</h2>
          <p>
            The operations surface — a separate install, black tile, same
            system. Create the form, publish immutable schema versions, invite
            contributors, watch readiness and attention, and export reproducible
            checkpoints.
          </p>
        </div>
        <div className="hp-admin-grid">
          {ADMIN_FEATURES.map((feature) => (
            <article className="hp-admin-card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
              <code className="hp-mono-chip">{feature.chip}</code>
            </article>
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
    document.getElementById("preview")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="hp-shell">
      <TopBar />
      <main id="main">
        <Hero onEmailSubmit={captureEmail} />
        <Differentiators />
        <FeatureGrid />

        <section
          className="hp-section hp-flow-section"
          id="demo"
          aria-labelledby="flow-title"
        >
          <div className="hp-section-inner">
            <FlowDemo />
          </div>
        </section>

        <section
          className="hp-section hp-section-paper"
          aria-labelledby="package-title"
        >
          <div className="hp-section-inner">
            <div className="section-heading">
              <p className="eyebrow">The data you get</p>
              <h2 id="package-title">A dataset, not a folder.</h2>
              <p>
                Every checkpoint is a self-contained ZIP: canonical JSONL, CSV
                and GeoJSON views, every published schema version, media
                originals, and the FAIR metadata a published dataset needs. No
                application required to read it. Browse a real demo package —
                derived from the demo dataset in the repository.
              </p>
            </div>
            <PackageBrowser />
            <p className="hp-section-note">
              Demo rows from <code>docs/demo-dataset</code> — three observations
              of a rural building survey. The package format is specified in{" "}
              <a href={DOCS("export-format.md")} target="_blank" rel="noopener">
                docs/export-format.md
              </a>
              .
            </p>
          </div>
        </section>

        <section className="hp-section" aria-labelledby="attention-title">
          <div className="hp-section-inner hp-split">
            <div className="section-heading hp-sticky">
              <p className="eyebrow">Attention QA</p>
              <h2 id="attention-title">Quality you can measure, not assume.</h2>
              <p>
                Every observation quietly includes one random, universally valid
                quick check — options shuffled, inserted into the flow. The
                question text is never stored: only a stable check key and the
                selected value. The server verifies against its own bank and
                computes a guess-adjusted score per contributor.
              </p>
              <p className="muted">
                Answer the check — then see exactly what the dataset will
                contain, and what it will never contain.
              </p>
            </div>
            <AttentionDemo />
          </div>
        </section>

        <section
          className="hp-section hp-section-paper"
          aria-labelledby="provenance-title"
        >
          <div className="hp-section-inner hp-split">
            <div className="section-heading hp-sticky">
              <p className="eyebrow">Provenance</p>
              <h2 id="provenance-title">
                Recorded automatically, never asked.
              </h2>
              <p>
                Device model, operating system, browser, screen, connection,
                battery, timezone, and language are written silently with every
                record. A failed optional capture never blocks a save.
              </p>
              <p className="muted">
                This is your device, right now, read with the app's own
                environment collector — the same record that rides along with
                every submission.
              </p>
            </div>
            <ProvenanceCard />
          </div>
        </section>

        <AdminSection />

        <section
          className="hp-section hp-section-paper"
          id="preview"
          aria-labelledby="preview-title"
        >
          <div className="hp-section-inner hp-form-wrap">
            <div className="section-heading">
              <p className="eyebrow">The research preview</p>
              <h2 id="preview-title">Try it with your own fieldwork.</h2>
              <p>
                The research preview gives you a running instance with your own
                schema, your own contributors, and your own exports. Leave your
                email and tell us what you collect — we read every request.
              </p>
            </div>
            <PreviewForm initialEmail={draftEmail} />
          </div>
        </section>
      </main>

      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <div className="hp-footer-brand">
            <a className="wordmark" href="#top">
              collect<span className="wordmark-dot">.</span>
            </a>
            <p>Fieldwork, ready offline. Source available under Apache-2.0.</p>
          </div>
          <nav className="hp-footer-links" aria-label="Footer">
            <div>
              <span className="hp-footer-heading">Access</span>
              <a href="#preview">Research preview</a>
              <a href="#demo">Live demo</a>
              <a href={APP_URL} target="_blank" rel="noopener">
                Contributor sign-in
              </a>
              <a href={ADMIN_URL} target="_blank" rel="noopener">
                Admin sign-in
              </a>
              <a href={GITHUB_URL} target="_blank" rel="noopener">
                GitHub
              </a>
            </div>
            <div>
              <span className="hp-footer-heading">Docs</span>
              <a href={DOCS("architecture.md")} target="_blank" rel="noopener">
                Architecture
              </a>
              <a href={DOCS("export-format.md")} target="_blank" rel="noopener">
                Export format
              </a>
              <a href={DOCS("attention-qa.md")} target="_blank" rel="noopener">
                Attention QA
              </a>
              <a href={DOCS("design.md")} target="_blank" rel="noopener">
                Design
              </a>
            </div>
          </nav>
          <p className="hp-footer-legal">
            © 2026 Gabriele Pizzi · Apache-2.0 · No AI transforms the
            collection path.
          </p>
        </div>
      </footer>
    </div>
  );
}
