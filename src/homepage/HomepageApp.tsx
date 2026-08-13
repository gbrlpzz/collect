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

const NAV = [
  { label: "Why collect", href: "#why" },
  { label: "Features", href: "#features" },
  { label: "Data formats", href: "#formats" },
  { label: "Attention", href: "#attention" },
  { label: "Research preview", href: "#preview" },
];

function TopBar() {
  return (
    <header className="hp-topbar">
      <div className="hp-topbar-inner">
        <a className="wordmark" href="#top">
          collect<span className="wordmark-dot">.</span>
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
            className="hp-nav-link"
            href={GITHUB_URL}
            target="_blank"
            rel="noopener"
          >
            GitHub
          </a>
          <span className="hp-topbar-group" aria-label="Sign in">
            <a
              className="hp-nav-link"
              href={APP_URL}
              target="_blank"
              rel="noopener"
            >
              Contributor
            </a>
            <a
              className="hp-nav-link"
              href={ADMIN_URL}
              target="_blank"
              rel="noopener"
            >
              Admin
            </a>
          </span>
          <a className="button button-primary button-small" href="#preview">
            Request access
          </a>
        </div>
      </div>
    </header>
  );
}

function AppTiles() {
  return (
    <div className="hp-tiles" aria-label="The two installable apps">
      <a className="hp-tile" href={APP_URL} target="_blank" rel="noopener">
        <img
          className="hp-tile-icon"
          src="/icon.svg"
          alt=""
          width={56}
          height={56}
        />
        <span className="hp-tile-copy">
          <strong>collect</strong>
          <span>Field app — contributor surface</span>
        </span>
        <span className="hp-tile-action">
          Sign in <Icon name="arrow-right" size={14} />
        </span>
      </a>
      <a className="hp-tile" href={ADMIN_URL} target="_blank" rel="noopener">
        <img
          className="hp-tile-icon hp-tile-icon-admin"
          src="/icon-admin.svg"
          alt=""
          width={56}
          height={56}
        />
        <span className="hp-tile-copy">
          <strong>collect Admin</strong>
          <span>Operations console — administrator surface</span>
        </span>
        <span className="hp-tile-action">
          Sign in <Icon name="arrow-right" size={14} />
        </span>
      </a>
    </div>
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
            href={GITHUB_URL}
            target="_blank"
            rel="noopener"
          >
            Source on GitHub
          </a>
        </div>

        <AppTiles />
      </div>

      <div className="hp-hero-demo" id="demo">
        <FlowDemo />
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

const STEPS = [
  {
    title: "Define the form",
    body: "A deliberately small set of strongly typed fields — text, numbers, choices, tri-state, date, location, photo, audio, repeatable groups. Publishing freezes an immutable schema version.",
  },
  {
    title: "Invite the team",
    body: "Accounts are invite-only. Contributors accept versioned consent at first sign-in, work fully offline, and every observation carries an automatic attention check.",
  },
  {
    title: "Export the dataset",
    body: "One reproducible checkpoint per cutoff: JSONL, CSV, GeoJSON, schema history, media originals, and the FAIR metadata a published dataset needs.",
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
    body: "Forms are built from a deliberately small set of strongly typed fields. Publishing freezes a version; history keeps its meaning.",
    chip: "schema/schema-v1.json",
  },
  {
    title: "Readiness, not self-reports",
    body: "Device-reported status aggregates every device a contributor uses — no “I'm done” button. Administrators watch pending submissions per device and ping stragglers.",
    chip: "contributors.csv",
  },
  {
    title: "Consent, enforced",
    body: "Contributors accept a versioned consent statement at first sign-in; the server refuses submissions without it, and the consent record travels in exports.",
    chip: "submissions.jsonl",
  },
];

function Differentiators() {
  return (
    <section className="hp-section" id="why" aria-labelledby="why-title">
      <div className="hp-section-inner">
        <div className="section-heading">
          <p className="eyebrow">Why collect is different</p>
          <h2 id="why-title">Built for the place generic tools fail.</h2>
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
      id="features"
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

function HowItWorks() {
  return (
    <section className="hp-section" aria-labelledby="how-title">
      <div className="hp-section-inner">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title">From blank project to published dataset.</h2>
        </div>
        <ol className="hp-steps">
          {STEPS.map((step, index) => (
            <li className="hp-step" key={step.title}>
              <span className="hp-step-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
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
          <a
            className="button button-primary button-small hp-admin-cta"
            href={ADMIN_URL}
            target="_blank"
            rel="noopener"
          >
            Sign in to collect Admin
          </a>
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

const PREVIEW_PERKS = [
  "A running instance with your own schema",
  "Invite-only access for your contributors",
  "Automatic attention QA on every record",
  "FAIR checkpoint exports for your dataset",
  "Setup and onboarding support",
];

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
        <Differentiators />
        <FeatureGrid />
        <HowItWorks />

        <section
          className="hp-section hp-section-paper"
          id="formats"
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

        <section
          className="hp-section"
          id="attention"
          aria-labelledby="attention-title"
        >
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
          <div className="hp-section-inner hp-preview-layout">
            <div className="hp-preview-copy">
              <p className="eyebrow">The research preview</p>
              <h2 id="preview-title">Try it with your own fieldwork.</h2>
              <p>
                The research preview gives you a running instance with your own
                schema, your own contributors, and your own exports. Leave your
                email and tell us what you collect — we read every request.
              </p>
              <ul className="hp-perks">
                {PREVIEW_PERKS.map((perk) => (
                  <li key={perk}>
                    <Icon name="check" size={15} /> {perk}
                  </li>
                ))}
              </ul>
              <p className="hp-preview-note">
                No account is created by this form. Access stays invite-only — a
                preview, not a signup.
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
