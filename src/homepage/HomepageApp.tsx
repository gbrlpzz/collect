import { Icon } from "../components/Icon";
import { FlowDemo } from "./FlowDemo";
import { AttentionDemo } from "./AttentionDemo";
import { PackageBrowser } from "./PackageBrowser";
import { ProvenanceCard } from "./ProvenanceCard";
import { PreviewForm } from "./PreviewForm";

const APP_URL = "https://collect-tawny.vercel.app";
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
            className="button button-primary button-small"
            href={APP_URL}
            target="_blank"
            rel="noopener"
          >
            Open the app
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hp-hero" id="top" aria-labelledby="hero-title">
      <div className="hp-hero-inner">
        <p className="eyebrow">Offline-first field data collection</p>
        <h1 id="hero-title">
          Fieldwork you can trust,
          <br />
          where the signal ends.
        </h1>
        <p className="hp-hero-lede">
          collect is a mobile-first collector for scientific surveys,
          inventories, and structured observation. Every answer is saved on the
          device before anything is promised, synced only on a durable server
          receipt, and exported as a FAIR, machine-readable dataset — with the
          attention quality of every contributor measured, not assumed.
        </p>
        <div className="hp-hero-actions">
          <a className="button button-primary" href="#demo">
            Try the research preview
            <Icon name="chevron-down" size={17} />
          </a>
          <a
            className="button button-secondary"
            href={GITHUB_URL}
            target="_blank"
            rel="noopener"
          >
            Read the source
          </a>
        </div>
        <ul className="hp-hero-meta">
          <li>Apache-2.0</li>
          <li>Installable PWA</li>
          <li>Invite-only research preview</li>
        </ul>
      </div>
    </section>
  );
}

const CONTRACT = [
  {
    title: "Saved means saved",
    body: (
      <>
        Submit commits the structured payload, media metadata, media blobs, and
        outbox operations in <strong>one local database transaction</strong>{" "}
        before the interface says anything. A "Saved on this device" receipt
        never depends on the network — kill the app, drop the connection, wait a
        week.
      </>
    ),
  },
  {
    title: "Synced means synced",
    body: (
      <>
        Metadata → each media object → finalization: three resumable phases,
        none skippable, retried automatically with backoff. Only the server's{" "}
        <strong>durable finalization receipt</strong> moves a record to
        "synced". A request started is never a sync completed.
      </>
    ),
  },
  {
    title: "Evidence stays honest",
    body: (
      <>
        Published schemas are immutable, finalized observations are immutable,
        conflicts are explicit — never silently overwritten. Every record
        carries full provenance:{" "}
        <strong>
          who, what schema, which device, when, where, which app version
        </strong>
        , plus location and environment, captured automatically.
      </>
    ),
  },
];

function Contract() {
  return (
    <section className="hp-section" aria-labelledby="contract-title">
      <div className="hp-section-inner">
        <div className="section-heading">
          <p className="eyebrow">The contract</p>
          <h2 id="contract-title">
            Three promises, each backed by a mechanism.
          </h2>
          <p>
            Most survey software fails in the field in predictable ways. collect
            replaces slogans with mechanisms you can audit.
          </p>
        </div>
        <ol className="hp-contract-list">
          {CONTRACT.map((item, index) => (
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
  return (
    <div className="hp-shell">
      <TopBar />
      <main id="main">
        <Hero />
        <Contract />

        <section
          className="hp-section hp-section-paper hp-flow-section"
          id="demo"
          aria-labelledby="flow-title"
        >
          <div className="hp-section-inner">
            <FlowDemo />
          </div>
        </section>

        <section className="hp-section" aria-labelledby="package-title">
          <div className="hp-section-inner">
            <div className="section-heading">
              <p className="eyebrow">The data you get</p>
              <h2 id="package-title">A dataset, not a folder.</h2>
              <p>
                Every checkpoint is a self-contained ZIP: canonical JSONL, CSV
                and GeoJSON views, every published schema version, media
                originals, and the FAIR metadata a published dataset needs. No
                application required to read it. This is a real demo package,
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
          className="hp-section hp-section-paper"
          aria-labelledby="attention-title"
        >
          <div className="hp-section-inner hp-split">
            <div className="section-heading hp-sticky">
              <p className="eyebrow">Attention QA</p>
              <h2 id="attention-title">Quality you can measure, not assume.</h2>
              <p>
                Every observation quietly includes one random, universally valid
                quick check — options shuffled, inserted after the first two
                questions. The question text is never stored: only a stable
                check key and the selected value. The server verifies against
                its own bank and computes a guess-adjusted score per
                contributor.
              </p>
              <p className="muted">
                Answer the check — then see exactly what the dataset will
                contain, and what it will never contain.
              </p>
            </div>
            <AttentionDemo />
          </div>
        </section>

        <section className="hp-section" aria-labelledby="provenance-title">
          <div className="hp-section-inner hp-split">
            <div className="section-heading hp-sticky">
              <p className="eyebrow">Provenance</p>
              <h2 id="provenance-title">
                Recorded automatically, never asked.
              </h2>
              <p>
                Location is captured with every observation after one permission
                grant. Device model, operating system, browser, screen,
                connection, battery, timezone, and language are written silently
                with every record. A failed optional capture never blocks a
                save.
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
          aria-labelledby="preview-title"
        >
          <div className="hp-section-inner hp-form-wrap">
            <div className="section-heading">
              <p className="eyebrow">The research preview</p>
              <h2 id="preview-title">
                collect is invite-only — ask for access.
              </h2>
              <p>
                The research preview gives you a running instance with your own
                schema, your own contributors, and your own exports. Tell us
                what you collect and where the network ends; we read every
                request.
              </p>
            </div>
            <PreviewForm />
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
              <span className="hp-footer-heading">Product</span>
              <a href={APP_URL} target="_blank" rel="noopener">
                Open the app
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
