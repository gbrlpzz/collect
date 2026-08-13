import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { AdminDashboard, AdminProject } from "../components/AdminDashboard";
import { SegmentedControl } from "../components/ui";
import { FlowDemo, demoProject } from "./FlowDemo";
import { AttentionDemo } from "./AttentionDemo";
import { PackageBrowser } from "./PackageBrowser";
import { ProvenanceCard } from "./ProvenanceCard";
import { PreviewForm } from "./PreviewForm";

const APP_URL = "https://collect-tawny.vercel.app";
const ADMIN_URL = `${APP_URL}/?role=admin`;
const GITHUB_URL = "https://github.com/gbrlpzz/collect";

const NAV = [
  { label: "Demo", href: "#demo" },
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
          Offline-first data collection · research preview
        </p>
        <h1 id="hero-title">
          Data collection you can trust,
          <br />
          where the signal ends.
        </h1>
        <p className="hp-hero-lede">
          Save on the device. Sync on a server receipt. Export a FAIR dataset
          with quality signals attached.
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
          Research preview is invite-only. Leave your email — we read every
          request.
        </p>

        <div className="hp-hero-actions">
          <a className="text-button" href="#demo">
            See it in action
            <Icon name="chevron-down" size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}

function AdminPreview() {
  const [view, setView] = useState<"dashboard" | "project">("dashboard");
  const [project, setProject] = useState(demoProject);

  if (view === "project") {
    return (
      <AdminProject
        project={project}
        onBack={() => setView("dashboard")}
        onToast={() => undefined}
        onExport={() => undefined}
        onSchemaPublished={setProject}
        onToggleStatus={() =>
          setProject((current) => ({
            ...current,
            status: current.status === "active" ? "closed" : "active",
          }))
        }
        onPreviewContributor={() => setView("dashboard")}
      />
    );
  }

  return (
    <AdminDashboard
      project={demoProject}
      projects={[demoProject]}
      onNavigate={(next) => {
        if (next === "admin-project") setView("project");
      }}
      onSelectProject={setProject}
    />
  );
}

function DemoSurface() {
  const [surface, setSurface] = useState("contributor");
  return (
    <section
      className="hp-section hp-hero-demo"
      id="demo"
      aria-label="Live product preview"
    >
      <div className="hp-section-inner">
        <div className="hp-demo-tabs-wrap">
          <SegmentedControl
            className="hp-demo-tabs"
            label="Product surface"
            options={[
              { value: "contributor", label: "Contributor" },
              { value: "admin", label: "Admin" },
            ]}
            value={surface}
            onChange={setSurface}
          />
        </div>
        <div className="hp-demo-surface" key={surface}>
          {surface === "contributor" ? (
            <FlowDemo />
          ) : (
            <div className="hp-browser-device" aria-label="Admin app preview">
              <div className="hp-browser-chrome" aria-hidden="true">
                <span className="hp-browser-dot" />
                <span className="hp-browser-dot" />
                <span className="hp-browser-dot" />
                <span className="hp-browser-address">collect Admin</span>
              </div>
              <div className="hp-admin-preview">
                <AdminPreview />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Generic tools vs collect — the differentiating factors. */
const WHY_POINTS = [
  {
    title: "Capture anywhere",
    body: "Each observation is committed to the device before the network is involved.",
    label: "Local receipt",
  },
  {
    title: "Confirm delivery",
    body: "Metadata, media, and finalization are resumable; synced means a server receipt.",
    label: "Durable sync",
  },
  {
    title: "Make quality visible",
    body: "One verified attention check per observation produces a contributor score.",
    label: "Attention QA",
  },
  {
    title: "Preserve meaning",
    body: "Published schemas stay versioned, so historical records keep their meaning.",
    label: "Immutable history",
  },
  {
    title: "Return a dataset",
    body: "JSONL, CSV, GeoJSON, schema history, media, and FAIR metadata travel together.",
    label: "Reusable export",
  },
];

function WhySection() {
  return (
    <section className="hp-section" id="why" aria-labelledby="why-title">
      <div className="hp-section-inner">
        <div className="section-heading">
          <p className="eyebrow">The difference</p>
          <h2 id="why-title">A reliable path from observation to dataset.</h2>
          <p>Every handoff has a receipt.</p>
        </div>
        <div className="hp-why-list">
          {WHY_POINTS.map((point, index) => (
            <article className="hp-why-item" key={point.title}>
              <span className="hp-why-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{point.title}</h3>
                <p>{point.body}</p>
              </div>
              <span className="hp-why-label">{point.label}</span>
            </article>
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
          <p className="eyebrow">The export</p>
          <h2 id="formats-title">A research package, ready to reuse.</h2>
          <p>
            JSONL, CSV, GeoJSON, schema history, media originals, and FAIR
            metadata in one checkpoint.
          </p>
        </div>
        <PackageBrowser />
      </div>
    </section>
  );
}

const QUALITY_TABS = [
  { value: "attention", label: "Attention" },
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
          <h2 id="quality-title">Make quality visible.</h2>
          <p>
            Attention verification and device provenance travel with the record.
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
          <h2 id="admin-title">Bring the data home.</h2>
          <p>Manage protocols, contributors, and exports from one surface.</p>
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

        <div className="hp-reveal">
          <DemoSurface />
        </div>

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
              <p className="eyebrow">Research preview</p>
              <h2 id="preview-title">Put your protocol in the field.</h2>
              <p>Request a preview with your schema and contributors.</p>
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
            <p>
              Data collection, ready offline. Source available under Apache-2.0.
            </p>
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
