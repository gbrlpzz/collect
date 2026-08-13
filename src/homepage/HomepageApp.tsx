import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { SegmentedControl } from "../components/ui";
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
  { label: "Why", href: "#why" },
  { label: "Data", href: "#formats" },
  { label: "Quality", href: "#quality" },
  { label: "Preview", href: "#preview" },
];

function TopBar() {
  return (
    <header className="hp-topbar">
      <div className="hp-topbar-inner">
        <a className="hp-brand" href="#top">
          <img
            className="hp-logo"
            src="/icon.svg"
            alt=""
            width={26}
            height={26}
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
        <img
          className="hp-hero-logo"
          src="/icon.svg"
          alt="collect"
          width={64}
          height={64}
        />
        <p className="eyebrow">
          Offline-first field data collection · research preview
        </p>
        <h1 id="hero-title">
          Fieldwork you can trust,
          <br />
          where the signal ends.
        </h1>
        <p className="hp-hero-lede">
          collect saves every observation on the device before promising
          anything, syncs only on a durable server receipt, and exports a FAIR
          dataset with attention quality measured per contributor.
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
          The research preview is invite-only. Leave your email — we read every
          request.
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

        <ul className="hp-hero-stats">
          <li>Three resumable sync phases</li>
          <li>Guess-adjusted attention scores</li>
          <li>DataCite 4.4 exports</li>
        </ul>
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
        transaction, before the interface says anything
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

function WhySection() {
  return (
    <section className="hp-section" id="why" aria-labelledby="why-title">
      <div className="hp-section-inner">
        <div className="section-heading">
          <p className="eyebrow">Why collect is different</p>
          <h2 id="why-title">Built for the place generic tools fail.</h2>
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
      </div>
    </section>
  );
}

function DataSection() {
  return (
    <section
      className="hp-section hp-section-paper"
      id="formats"
      aria-labelledby="formats-title"
    >
      <div className="hp-section-inner">
        <div className="section-heading">
          <p className="eyebrow">The data you get</p>
          <h2 id="formats-title">A dataset, not a folder.</h2>
          <p>
            Every checkpoint is a self-contained, machine-readable research
            package.
          </p>
        </div>
        <PackageBrowser />
        <p className="hp-section-note">
          Demo rows from <code>docs/demo-dataset</code>. The package format is
          specified in{" "}
          <a href={DOCS("export-format.md")} target="_blank" rel="noopener">
            docs/export-format.md
          </a>
          .
        </p>
      </div>
    </section>
  );
}

const QUALITY_TABS = [
  { value: "attention", label: "Attention QA" },
  { value: "provenance", label: "Provenance" },
];

function QualitySection() {
  const [tab, setTab] = useState("attention");
  return (
    <section
      className="hp-section"
      id="quality"
      aria-labelledby="quality-title"
    >
      <div className="hp-section-inner">
        <div className="section-heading">
          <p className="eyebrow">Quality &amp; provenance</p>
          <h2 id="quality-title">Measured, not assumed.</h2>
          <p>
            Verifiable quality signals and full device provenance, exported with
            the dataset.
          </p>
        </div>
        <div className="hp-quality">
          <SegmentedControl
            className="hp-quality-tabs"
            label="Quality topic"
            options={QUALITY_TABS}
            value={tab}
            onChange={setTab}
          />
          <div className="hp-quality-panel" key={tab}>
            {tab === "attention" ? <AttentionDemo /> : <ProvenanceCard />}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminBand() {
  return (
    <section
      className="hp-section hp-section-dark"
      aria-labelledby="admin-title"
    >
      <div className="hp-section-inner hp-admin-band">
        <div>
          <p className="eyebrow">
            <img
              className="hp-logo hp-logo-dark"
              src="/icon-admin.svg"
              alt=""
              width={22}
              height={22}
            />
            collect Admin
          </p>
          <h2 id="admin-title">The operations surface.</h2>
          <p>Define the form, invite contributors, export the dataset.</p>
        </div>
        <a
          className="button button-primary"
          href={ADMIN_URL}
          target="_blank"
          rel="noopener"
        >
          Sign in to collect Admin
        </a>
      </div>
    </section>
  );
}

export function HomepageApp() {
  const [draftEmail, setDraftEmail] = useState("");

  // Scroll-based reveals: sections appear as they enter the viewport.
  useEffect(() => {
    const elements = document.querySelectorAll(".hp-reveal");
    if (typeof IntersectionObserver === "undefined") {
      elements.forEach((element) => element.classList.add("hp-in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("hp-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

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

        <section className="hp-section hp-hero-demo" id="demo">
          <div className="hp-section-inner">
            <div className="hp-reveal">
              <FlowDemo />
            </div>
          </div>
        </section>

        <div className="hp-reveal">
          <WhySection />
        </div>

        <div className="hp-reveal">
          <DataSection />
        </div>

        <div className="hp-reveal">
          <QualitySection />
        </div>

        <div className="hp-reveal">
          <AdminBand />
        </div>

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
                A running instance with your schema and contributors. Tell us
                what you collect.
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
            <a className="hp-brand" href="#top">
              <img
                className="hp-logo"
                src="/icon.svg"
                alt=""
                width={28}
                height={28}
              />
              <span className="wordmark">
                collect<span className="wordmark-dot">.</span>
              </span>
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
          </nav>
          <p className="hp-footer-legal">© 2026 Gabriele Pizzi · Apache-2.0</p>
        </div>
      </footer>
    </div>
  );
}
