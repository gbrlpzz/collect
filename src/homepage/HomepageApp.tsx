import { useEffect, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { FlowDemo, type ContributorTab } from "./FlowDemo";
import { SyncDemo } from "./SyncDemo";
import { PackageBrowser } from "./PackageBrowser";
import { PreviewForm } from "./PreviewForm";
import { AdminWalkthrough } from "./AdminWalkthrough";
import { AttentionDemo } from "./AttentionDemo";
import { ProvenanceCard } from "./ProvenanceCard";
import { DocLinks, DOCS } from "./DocLinks";
import { Icon, type IconName } from "../components/Icon";
import { CollectBrand } from "../components/CollectBrand";
import { useSectionSpy } from "./useSectionSpy";
import { useScrollytelling } from "./useScrollytelling";

const GITHUB_URL = "https://github.com/gbrlpzz/collect";

// SAFETY: custom CSS variables are valid CSSProperties in React.
function cssVar(
  name: `--${string}`,
  value: string | number,
): React.CSSProperties {
  // SAFETY: cast to React.CSSProperties for custom property name.
  return { [name]: value } as React.CSSProperties;
}

const ADMIN_SCENES = [
  {
    tab: "setup",
    kicker: "Form Schema",
    title: "Immutable schema versioning",
    body: "Published field definitions are locked. Schema updates create a new version without altering historical observations.",
  },
  {
    tab: "contributors",
    kicker: "Fleet Readiness",
    title: "Real-time fleet sync & progress monitoring",
    body: "Track incoming observations, unsynced device queues, and contributor attention reliability scores across all field teams in real time.",
  },
  {
    tab: "export",
    kicker: "Checkpoint Export",
    title: "Verified publication checkpoints",
    body: "Review received observations, monitor contributor attention, and export self-contained research archives once all devices report complete.",
  },
] as const;

const SECTION_LINKS = [
  { id: "collection", label: "Collector" },
  { id: "guarantees", label: "Guarantees" },
  { id: "sync", label: "Sync" },
  { id: "admin", label: "Setup" },
  { id: "integrity", label: "Integrity" },
  { id: "data", label: "Dataset" },
] as const;

function TopBar({
  activeSection,
  menuOpen,
  onMenuToggle,
}: {
  activeSection: string;
  menuOpen: boolean;
  onMenuToggle: () => void;
}) {
  return (
    <header className="hp-topbar">
      <div className="hp-topbar-inner">
        <a className="hp-brand" href="#top" aria-label="collect home">
          <CollectBrand compact />
        </a>

        <nav className="hp-nav" aria-label="Sections">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.id}
              className={`hp-nav-link ${activeSection === link.id ? "active" : ""}`}
              href={`#${link.id}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hp-topbar-actions">
          <button
            type="button"
            className="hp-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="hp-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={onMenuToggle}
          >
            <Icon name={menuOpen ? "x" : "menu"} size={20} />
          </button>
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

/**
 * Section navigation for viewports below 960px, where the topbar nav is
 * hidden. A sheet anchored under the sticky topbar: scrim dismiss, Escape,
 * a focus trap while open (per docs/design.md), and a scroll lock on the
 * page behind it.
 */
function MobileMenu({
  open,
  activeSection,
  onClose,
}: {
  open: boolean;
  activeSection: string;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    // SAFETY: document.activeElement is an Element or null; every element
    // that can hold focus here implements HTMLElement.focus().
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLAnchorElement>("a[href]"));
    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onResize = () => {
      // Crossing into the desktop layout closes the sheet (the button is
      // hidden there, so it could no longer be dismissed from the bar).
      if (window.innerWidth > 960) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = overflow;
      document.documentElement.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="hp-menu-root">
      <div className="hp-menu-scrim" onClick={onClose} aria-hidden="true" />
      <div
        className="hp-menu"
        id="hp-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Sections"
        ref={panelRef}
      >
        <nav>
          {SECTION_LINKS.map((link) => {
            const active = activeSection === link.id;
            return (
              <a
                key={link.id}
                className={`hp-menu-link ${active ? "active" : ""}`}
                href={`#${link.id}`}
                aria-current={active ? "true" : undefined}
                onClick={onClose}
              >
                <span>{link.label}</span>
                <Icon name={active ? "check" : "chevron-right"} size={15} />
              </a>
            );
          })}
          <a
            className="hp-menu-link hp-menu-cta"
            href="#preview"
            onClick={onClose}
          >
            <span>Request access</span>
            <Icon name="arrow-right" size={15} />
          </a>
        </nav>
      </div>
    </div>
  );
}

/**
 * Headline motion treatments under review. The landing page reads
 * `?motion=` so the treatments can be compared on a real device before one
 * is chosen; anything unrecognized falls back to the default. See the
 * headline cadence block in homepage.css.
 */
const HERO_MOTIONS = [
  "focus",
  "read",
  "cadence",
  "sheen",
  "wipe",
  "lens",
  "off",
] as const;
type HeroMotion = (typeof HERO_MOTIONS)[number];
const DEFAULT_HERO_MOTION: HeroMotion = "focus";

function requestedHeroMotion(): HeroMotion {
  if (!globalThis.window) return DEFAULT_HERO_MOTION;
  const requested = new URLSearchParams(globalThis.window.location.search).get(
    "motion",
  );
  const match = HERO_MOTIONS.find((motion) => motion === requested);
  if (match) return match;
  // Disable hero animation on mobile (≤680px, matching CSS breakpoint)
  if (window.innerWidth <= 680) return "off";
  return DEFAULT_HERO_MOTION;
}

function Hero({ onEmailSubmit }: { onEmailSubmit: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [heroMotion] = useState<HeroMotion>(requestedHeroMotion);

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
    <section
      className="hp-hero"
      id="top"
      aria-labelledby="hero-title"
      data-hero-motion={heroMotion}
    >
      <div className="hp-hero-bg" aria-hidden="true">
        <img
          src="/hero-alps.webp"
          alt=""
          className="hp-hero-bg-img"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="hp-hero-bg-overlay" />
      </div>

      <div className="hp-hero-container">
        <div className="hp-hero-inner">
          {/*
            One sentence, delivered in four clauses. Each clause is its own
            box so the headline can be read out in cadence (see
            .hp-hero-clause in homepage.css); the spaces between them keep
            the sentence intact for screen readers and for small screens,
            where the clauses run together as flowing text.
          */}
          <h1 id="hero-title">
            <span className="hp-hero-clause">
              <span className="hp-hero-wordmark">
                collect<span className="wordmark-dot">.</span>
              </span>
            </span>{" "}
            <span className="hp-hero-clause">trustworthy</span>{" "}
            <span className="hp-hero-clause">field evidence</span>{" "}
            <span className="hp-hero-clause">
              <span className="hp-hero-beat">offline</span>{" "}
              <span className="hp-hero-beat">on any phone.</span>
            </span>
          </h1>

          <p className="hp-hero-lede">
            An offline-first field collection app for research teams. Installs
            from the browser, exports complete datasets.
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
    doc: string;
  }> = [
    {
      icon: "shield",
      title: "Local-first durability",
      claim:
        "Observations and media commit to IndexedDB before any network attempt, updating to synced only upon server confirmation.",
      proof: "commit before network with verified receipt",
      doc: "background-automation.md",
    },
    {
      icon: "camera",
      title: "Unmodified media originals",
      claim:
        "Photos and audio retain capture quality with SHA-256 checksums, with no collection-path recompression.",
      proof: "raw originals with SHA-256 checksums",
      doc: "dataset-standards.md",
    },
    {
      icon: "check",
      title: "Isolated attention checks",
      claim:
        "Periodic checks evaluate contributor focus in memory, stripping questions and answers before database commit.",
      proof: "in-memory checks and isolated payloads",
      doc: "attention-qa.md",
    },
    {
      icon: "archive",
      title: "FAIR export archives",
      claim:
        "Checkpoint exports package canonical JSONL, CSV, RFC 7946 GeoJSON, DataCite 4.4 metadata, and raw media into a single archive.",
      proof: "DataCite 4.4, GeoJSON and JSONL",
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
      className="hp-diff-section hp-section-scrolly"
      id="guarantees"
      aria-label="Core guarantees"
    >
      <div className="hp-scrolly hp-scrolly-hold">
        <div className="hp-scrolly-panel">
          <div className="hp-diff-inner">
            <div className="hp-diff-heading">
              <p className="eyebrow">Guarantees</p>
              <h2>Four guarantees for data collected in the wild.</h2>
              <p>
                Fieldwork happens in harsh conditions. collect is engineered
                around four technical guarantees that protect your data from
                capture to archive:
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
                  <div className="hp-diff-doc-link">
                    <a
                      href={DOCS(item.doc)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      docs/{item.doc}
                    </a>
                  </div>
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
        </div>
      </div>
    </section>
  );
}

const CONTRIB_TABS: ContributorTab[] = ["home", "flow", "media"];

export function HomepageApp() {
  const [draftEmail, setDraftEmail] = useState("");
  const [contribTab, setContribTab] = useState<ContributorTab>("home");
  const [menuOpen, setMenuOpen] = useState(false);

  const captureEmail = (email: string) => {
    setDraftEmail(email);
    const reduceMotion = Boolean(
      globalThis.window?.matchMedia &&
        globalThis.window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches,
    );
    document.getElementById("preview")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  const activeSection = useSectionSpy([
    "collection",
    "guarantees",
    "sync",
    "admin",
    "integrity",
    "data",
    "preview",
  ]);

  const collection = useScrollytelling<HTMLDivElement>(CONTRIB_TABS.length);
  const sync = useScrollytelling<HTMLDivElement>(3);
  const admin = useScrollytelling<HTMLDivElement>(ADMIN_SCENES.length);
  const adminScene = ADMIN_SCENES[admin.active];

  useEffect(() => {
    setContribTab(CONTRIB_TABS[collection.active]);
  }, [collection.active]);
  return (
    <div className="hp-shell">
      <TopBar
        activeSection={activeSection}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((open) => !open)}
      />
      <MobileMenu
        open={menuOpen}
        activeSection={activeSection}
        onClose={() => setMenuOpen(false)}
      />
      <main id="main">
        <Hero onEmailSubmit={captureEmail} />

        {/* 1. Field Collection inside iPhone Mockup (Directly under Hero) */}
        <section
          className="hp-section-scrolly hp-section-canvas"
          id="collection"
          aria-labelledby="collection-title"
        >
          <div
            className="hp-scrolly"
            ref={collection.ref}
            style={cssVar("--hp-steps", CONTRIB_TABS.length)}
          >
            <div className="hp-scrolly-panel">
              <div className="hp-section-inner">
                <FlowDemo
                  tab={contribTab}
                  onTabChange={(nextTab) => {
                    setContribTab(nextTab);
                    const idx = CONTRIB_TABS.indexOf(nextTab);
                    if (idx !== -1) collection.goToStep(idx);
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2. Four Bedrock Guarantees */}
        <DifferentiationSummary />

        {/* 3. Synchronization State Machine */}
        <section
          className="hp-section-scrolly hp-section-canvas"
          id="sync"
          aria-labelledby="sync-title"
        >
          <div
            className="hp-scrolly"
            ref={sync.ref}
            style={cssVar("--hp-steps", 3)}
          >
            <div className="hp-scrolly-panel">
              <div className="hp-section-inner">
                <SyncDemo active={sync.active} onStepChange={sync.goToStep} />
              </div>
            </div>
          </div>
        </section>

        {/* 4. Admin Operations & Schema */}
        <section
          className="hp-section-scrolly hp-section-paper"
          id="admin"
          aria-labelledby="admin-title"
        >
          <div
            className="hp-scrolly"
            ref={admin.ref}
            style={cssVar("--hp-steps", ADMIN_SCENES.length)}
          >
            <div className="hp-scrolly-panel">
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
                        readiness — tracking received observations, pending
                        device queues, and attention scores in real time.
                      </p>
                      <DocLinks files={["flows.md", "spec.md"]} />
                    </div>

                    <div
                      className="hp-admin-tab-selector"
                      aria-label="Administrator steps"
                    >
                      {ADMIN_SCENES.map((scene, i) => (
                        <button
                          key={scene.tab}
                          type="button"
                          className={`hp-admin-step-btn ${
                            admin.active === i ? "active" : ""
                          }`}
                          aria-pressed={admin.active === i}
                          onClick={() => admin.goToStep(i)}
                        >
                          {scene.kicker}
                        </button>
                      ))}
                    </div>

                    <div className="hp-story" aria-live="polite">
                      <h3>{adminScene.title}</h3>
                      <p>{adminScene.body}</p>
                    </div>
                  </div>

                  <div className="hp-flow-visual hp-admin-visual">
                    <AdminWalkthrough
                      initialTab={adminScene.tab}
                      onTabChange={(tab) => {
                        const idx = ADMIN_SCENES.findIndex(
                          (s) => s.tab === tab,
                        );
                        if (idx !== -1) admin.goToStep(idx);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Integrity & Privacy */}
        <section
          className="hp-section-scrolly hp-section-canvas"
          id="integrity"
          aria-labelledby="integrity-title"
        >
          <div className="hp-scrolly hp-scrolly-hold">
            <div className="hp-scrolly-panel">
              <div className="hp-section-inner">
                <div className="section-heading">
                  <p className="eyebrow">Data Integrity</p>
                  <h2 id="integrity-title">
                    Detect surveyor fatigue without polluting research data.
                  </h2>
                  <p>
                    During 8-hour field transects, fatigue causes rapid tapping
                    without reading. collect interleaves subtle instruction
                    checks to measure focus, stripping questions and answers in
                    memory before database commit. Device context and GPS
                    coordinates record verifiable provenance.
                  </p>
                  <DocLinks files={["attention-qa.md", "privacy.md"]} />
                </div>

                <div className="hp-integrity-grid">
                  {/* Left rail: Attention QA + Storage Boundaries */}
                  <div className="hp-integrity-left-rail">
                    <div className="hp-integrity-card">
                      <div className="hp-integrity-card-header">
                        <h3>Attention Verification</h3>
                        <p>
                          Evaluated in memory and stripped before database
                          commit
                        </p>
                      </div>
                      <AttentionDemo />
                    </div>

                    <div className="hp-integrity-card hp-privacy-card">
                      <div className="hp-integrity-card-header">
                        <h3>Storage & Access Safeguards</h3>
                        <p>
                          Client storage isolation and server-side authorization
                        </p>
                      </div>
                      <div className="hp-privacy-list">
                        <div className="hp-privacy-row">
                          <div className="hp-privacy-icon">
                            <Icon name="lock" size={15} />
                          </div>
                          <div className="hp-privacy-content">
                            <strong>Account-Scoped Storage</strong>
                            <p>
                              IndexedDB is strictly scoped per authenticated
                              user (<code>collect-local-v1-userId</code>),
                              preventing data leaks across shared field devices.
                            </p>
                          </div>
                        </div>

                        <div className="hp-privacy-row">
                          <div className="hp-privacy-icon">
                            <Icon name="shield" size={15} />
                          </div>
                          <div className="hp-privacy-content">
                            <strong>Server-Enforced Consent</strong>
                            <p>
                              The sync backend strictly rejects submissions from
                              accounts without active, unrevoked participant
                              consent.
                            </p>
                          </div>
                        </div>
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
            </div>
          </div>
        </section>

        {/* 6. FAIR Checkpoint Dataset Explorer */}
        <section
          className="hp-section-scrolly hp-section-paper"
          id="data"
          aria-labelledby="data-title"
        >
          <div className="hp-scrolly hp-scrolly-hold">
            <div className="hp-scrolly-panel">
              <div className="hp-section-inner">
                <div className="section-heading">
                  <p className="eyebrow">Archival & Export</p>
                  <h2 id="data-title">
                    Deposit-ready research packages for open repositories and
                    peer review.
                  </h2>
                  <p>
                    Export packages bundle canonical JSONL, CSV, RFC 7946
                    GeoJSON, DataCite 4.4 metadata, and unmodified media with
                    SHA-256 checksums into a single verifiable archive.
                  </p>
                  <DocLinks
                    files={["export-format.md", "dataset-standards.md"]}
                  />
                </div>
                <PackageBrowser />
                <p className="hp-section-note">
                  Inspecting reference checkpoint package from{" "}
                  <code>docs/demo-dataset</code>, conforming to{" "}
                  <a
                    href={DOCS("export-format.md")}
                    target="_blank"
                    rel="noopener"
                  >
                    docs/export-format.md
                  </a>
                  .
                </p>

                {/* FAIR Compliance Principles from docs/dataset-standards.md */}
                <div className="hp-fact-grid" style={cssVar("--fact-cols", 3)}>
                  <div className="hp-fact-card">
                    <div className="hp-fact-header">
                      <Icon name="archive" size={16} />
                      <strong>Findable (DataCite 4.4)</strong>
                    </div>
                    <p>
                      Native <code>datacite.json</code> metadata kernel with DOI
                      identifiers, organizational creators, and license
                      declarations for repository deposit and institutional
                      archiving.
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
                      Self-contained ZIP archives containing uncompressed
                      original media files, schema version histories, and
                      SHA-256 integrity manifests.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Request Access / Pilot Form */}
        <section
          className="hp-section-scrolly hp-section-canvas"
          id="preview"
          aria-labelledby="preview-title"
        >
          <div className="hp-scrolly hp-scrolly-hold">
            <div className="hp-scrolly-panel">
              <div className="hp-section-inner hp-preview-layout">
                <div className="hp-preview-copy">
                  <p className="eyebrow">Research Preview</p>
                  <h2 id="preview-title">Equip your next expedition.</h2>
                  <p>
                    Request preview access to test custom schemas, or clone the
                    repository to self-host.
                  </p>
                </div>
                <div className="hp-preview-card">
                  <PreviewForm initialEmail={draftEmail} />
                </div>
              </div>
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
              <span className="hp-footer-heading">Product</span>
              <a href="#collection">Collector</a>
              <a href="#guarantees">Guarantees</a>
              <a href="#sync">Sync engine</a>
              <a href="#admin">Setup & fleet</a>
              <a href="#integrity">Data integrity</a>
              <a href="#data">Dataset export</a>
            </div>
            <div>
              <span className="hp-footer-heading">Documentation</span>
              <a href={DOCS("architecture.md")} target="_blank" rel="noopener">
                Architecture
              </a>
              <a
                href={DOCS("background-automation.md")}
                target="_blank"
                rel="noopener"
              >
                Automation
              </a>
              <a href={DOCS("export-format.md")} target="_blank" rel="noopener">
                Export format
              </a>
              <a
                href={DOCS("dataset-standards.md")}
                target="_blank"
                rel="noopener"
              >
                FAIR standards
              </a>
              <a href={DOCS("privacy.md")} target="_blank" rel="noopener">
                Privacy & QA
              </a>
            </div>
            <div>
              <span className="hp-footer-heading">Access</span>
              <a href={GITHUB_URL} target="_blank" rel="noopener">
                GitHub
              </a>
              <a href="#preview">Request access</a>
              <a href="/app" target="_blank" rel="noopener noreferrer">
                Sign in (Contributor)
              </a>
              <a
                href="/app?role=admin"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sign in (Admin)
              </a>
            </div>
          </nav>
          <p className="hp-footer-legal">
            © 2026{" "}
            <a
              href="https://gabrielepizzi.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Gabriele Pizzi
            </a>{" "}
            — Apache-2.0
          </p>
        </div>
      </footer>
      <Analytics />
    </div>
  );
}
