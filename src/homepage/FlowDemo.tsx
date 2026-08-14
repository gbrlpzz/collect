import { useEffect, useRef, useState } from "react";
import { Collector } from "../components/Collector";
import { ContributorHome } from "../components/ContributorHome";
import { TopBar } from "../components/TopBar";
import { Icon } from "../components/Icon";
import { projectFields } from "../data/schemaFixtures";
import { ATTENTION_FIELD_KEY } from "../data/attentionChecks";
import { extractAttentionResponse } from "../lib/attention";
import type { Observation, Project } from "../types";

/**
 * Step 1: Field Collection Preview.
 * Live-linked directly to the production Collector and ContributorHome components.
 * Renders in the light iPhone mock-up using the real contributor styling tokens.
 */

type ContributorTab = "home" | "flow" | "inputs" | "sync";

const demoFields = projectFields
  .filter((field) => field.type !== "location")
  .map((field) =>
    field.key === "site_photos"
      ? {
          ...field,
          required: false,
          config: { ...(field.config ?? {}), minCount: 0 },
        }
      : field,
  );

const demoProject: Project = {
  id: "demo-project",
  organization: "Liminal Research Group",
  organizationMark: "L",
  name: "Vernacular buildings — Valpuesta",
  description: "A synthetic survey used on this page.",
  instructions: "Answer the demo questions — nothing is recorded.",
  status: "active",
  schemaVersion: 1,
  license: "CC-BY-4.0",
  contactEmail: "valpuesta@liminal-lab.org",
  datasetIdentifier: "10.5281/zenodo.0000000",
  contributors: 3,
  completeSubmissions: 104,
  lastReceived: "2026-08-14T09:32:00.000Z",
  fields: demoFields,
};

const initialSampleObservations: Observation[] = [
  {
    id: "obs-val-001",
    projectId: "demo-project",
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    status: "SYNCED",
    values: {
      site_code: "VA-001",
      building_type: "house",
      building_occupancy: "yes",
    },
    media: [],
  },
  {
    id: "obs-val-002",
    projectId: "demo-project",
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    status: "SYNCED",
    values: {
      site_code: "VA-002",
      building_type: "farm",
      building_occupancy: "no",
    },
    media: [],
  },
];

const TAB_NARRATION: Record<ContributorTab, { title: string; body: string }> = {
  home: {
    title: "Field Home & Offline State",
    body: "Opens on the assigned project with offline sync status and '+ Add observation' anchored in the bottom dock.",
  },
  flow: {
    title: "One Calm Question per Screen",
    body: "One question per screen with 52pt touch targets for gloves and sunlight, with auto-advancing choices.",
  },
  inputs: {
    title: "Uncertainty & Original Media",
    body: "Tri-state 'Unknown' records genuine uncertainty. Photos and audio save uncompressed with SHA-256 hashes.",
  },
  sync: {
    title: "Durable Receipts & Resumable Sync",
    body: "IndexedDB commit in <5ms before network handshake, followed by automatic 3-stage background sync.",
  },
};

const SYNC_PHASES = [
  { label: "Metadata", detail: "1 operation" },
  { label: "Media", detail: "0 files" },
  { label: "Finalization", detail: "server receipt" },
];

type SyncStage = 0 | 1 | 2 | 3;

const reducedMotion =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

function StatusBar() {
  return (
    <div className="hp-status-bar" aria-hidden="true">
      <span className="hp-status-time">9:41</span>
      <span className="hp-status-icons">
        <svg viewBox="0 0 18 12" width="18" height="12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="0.8" />
          <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.8" />
          <rect x="9" y="3" width="3" height="9" rx="0.8" />
          <rect x="13.5" y="0.5" width="3" height="11.5" rx="0.8" />
        </svg>
        <svg
          viewBox="0 0 16 12"
          width="16"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M1.5 8.5a9.5 9.5 0 0 1 13 0" />
          <path d="M4 6.2a6.4 6.4 0 0 1 8 0" />
          <path d="M6.5 4a3.6 3.6 0 0 1 3 0" />
        </svg>
        <svg
          viewBox="0 0 25 12"
          width="25"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
        >
          <rect x="0.6" y="0.6" width="21" height="10.8" rx="3" />
          <rect
            x="2.2"
            y="2.2"
            width="15"
            height="7.6"
            rx="1.6"
            fill="currentColor"
            stroke="none"
          />
          <path
            d="M23.5 4v4a2 2 0 0 0 0-4Z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      </span>
    </div>
  );
}

function IPhone({ children }: { children: React.ReactNode }) {
  return (
    <div className="hp-iphone">
      <div className="hp-iphone-screen">
        <div className="hp-dynamic-island" aria-hidden="true" />
        <StatusBar />
        {children}
        <div className="hp-home-indicator" aria-hidden="true" />
      </div>
    </div>
  );
}

export function FlowDemo() {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"home" | "collecting">("collecting");
  const [activeTab, setActiveTab] = useState<ContributorTab>("flow");
  const [collectorStep, setCollectorStep] = useState<number>(0);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [savedValues, setSavedValues] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [observation, setObservation] = useState<Observation | null>(null);
  const [syncStage, setSyncStage] = useState<SyncStage>(0);
  const timersRef = useRef<number[]>([]);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const reset = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setDraft({});
    setSavedValues(null);
    setObservation(null);
    setSyncStage(0);
    setRound((value) => value + 1);
    setPhase("home");
    setActiveTab("home");
    setCollectorStep(0);
  };

  const handleTabClick = (tab: ContributorTab) => {
    setActiveTab(tab);
    if (tab === "home") {
      setPhase("home");
    } else if (tab === "flow") {
      setPhase("collecting");
      setCollectorStep(0);
    } else if (tab === "inputs") {
      setPhase("collecting");
      // Step 3 is building_occupancy (Tri-state "Is the building occupied?")
      setCollectorStep(3);
    } else if (tab === "sync") {
      setPhase("home");
      // If we don't have a recent local observation, create a synced receipt for demo
      if (!savedValues) {
        const sampleValues = {
          site_code: "VA-023",
          building_type: "house",
          building_occupancy: "yes",
          [ATTENTION_FIELD_KEY]: "demo:valid",
        };
        setSavedValues(sampleValues);
        const newObs: Observation = {
          id: "obs-val-023",
          projectId: demoProject.id,
          createdAt: new Date().toISOString(),
          status: "SAVED_LOCAL",
          values: sampleValues,
          media: [],
        };
        setObservation(newObs);
        setSyncStage(0);
        triggerSyncAnimation();
      }
    }
  };

  const triggerSyncAnimation = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (reducedMotion) {
      timersRef.current.push(
        window.setTimeout(() => {
          setSyncStage(3);
          setObservation((current) =>
            current ? { ...current, status: "SYNCED" } : current,
          );
        }, 1000),
      );
      return;
    }

    timersRef.current.push(
      window.setTimeout(() => setSyncStage(1), 1200),
      window.setTimeout(() => setSyncStage(2), 2400),
      window.setTimeout(() => {
        setSyncStage(3);
        setObservation((current) =>
          current ? { ...current, status: "SYNCED" } : current,
        );
      }, 3800),
    );
  };

  const handleSubmit = (values: Record<string, unknown>) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setSavedValues(values);
    const newObs: Observation = {
      id: "demo-observation",
      projectId: demoProject.id,
      createdAt: new Date().toISOString(),
      status: "SAVED_LOCAL",
      values,
      media: [],
    };
    setObservation(newObs);
    setSyncStage(0);
    setPhase("home");
    setActiveTab("sync");
    triggerSyncAnimation();
  };

  const narrative = TAB_NARRATION[activeTab];
  const stripped = savedValues && extractAttentionResponse(savedValues);
  const latestObs = observation;

  return (
    <div className="hp-flow-layout">
      <div className="hp-flow-copy">
        <div className="section-heading">
          <p className="eyebrow">Step 1 · Field Collection</p>
          <h2 id="collection-title">
            One calm question at a time. Built for zero signal.
          </h2>
          <p>
            The collector presents one question per screen with 52pt touch
            targets for gloves and sunlight, native date pickers, and raw photo
            capture. Tap the choices and test the flow yourself.
          </p>
        </div>

        <div className="hp-admin-tab-selector hp-contrib-tab-selector">
          <button
            type="button"
            className={`hp-admin-step-btn ${activeTab === "home" ? "active" : ""}`}
            onClick={() => handleTabClick("home")}
          >
            1. Field Home
          </button>
          <button
            type="button"
            className={`hp-admin-step-btn ${activeTab === "flow" ? "active" : ""}`}
            onClick={() => handleTabClick("flow")}
          >
            2. Guided Flow
          </button>
          <button
            type="button"
            className={`hp-admin-step-btn ${activeTab === "inputs" ? "active" : ""}`}
            onClick={() => handleTabClick("inputs")}
          >
            3. Uncertainty & Media
          </button>
          <button
            type="button"
            className={`hp-admin-step-btn ${activeTab === "sync" ? "active" : ""}`}
            onClick={() => handleTabClick("sync")}
          >
            4. Local Receipts & Sync
          </button>
        </div>

        <div className="hp-story" aria-live="polite">
          <span className="hp-story-kicker">Contributor Surface</span>
          <h3>{narrative.title}</h3>
          <p>{narrative.body}</p>

          {activeTab === "sync" && latestObs && (
            <div className="hp-sync-ops">
              {SYNC_PHASES.map((item, index) => {
                const done = syncStage > index || latestObs.status === "SYNCED";
                const active =
                  syncStage === index + 1 && latestObs.status !== "SYNCED";
                return (
                  <div className="hp-sync-op" key={item.label}>
                    <span
                      className={`hp-sync-mark ${done ? "hp-sync-done" : active ? "hp-sync-active" : ""}`}
                      aria-hidden="true"
                    >
                      {done ? "✓" : ""}
                    </span>
                    <span>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </span>
                  </div>
                );
              })}
              <p className="hp-sync-note">
                {latestObs.status === "SYNCED"
                  ? "The server's durable receipt moved this record to synced."
                  : "Waiting on the server receipt — nothing is marked sent before it."}
              </p>
            </div>
          )}

          {activeTab === "sync" && stripped && (
            <details className="hp-payload">
              <summary>View what was recorded</summary>
              <pre>{JSON.stringify(stripped.values, null, 2)}</pre>
              <p>
                The attention answer (
                <code>
                  {stripped.response
                    ? `${stripped.response.checkKey}:${stripped.response.selectedValue}`
                    : "—"}
                </code>
                ) was stripped before commit — it never enters the payload.
              </p>
            </details>
          )}
        </div>

        <div className="hp-auto-bar">
          <button className="text-button" type="button" onClick={reset}>
            <Icon name="refresh" size={15} /> Reset flow to start
          </button>
        </div>

        <p className="hp-demo-note">
          Live app frontend · click it yourself · nothing is recorded
        </p>
      </div>

      <div className="hp-iphone-wrap">
        <IPhone>
          <div className="hp-app-viewport" ref={screenRef}>
            <div
              className="app-shell"
              data-mode="contributor"
              data-surface="contributor"
              data-view={phase === "collecting" ? "collector" : "home"}
            >
              {phase === "home" ? (
                <>
                  <TopBar
                    mode="contributor"
                    view="home"
                    onNavigate={(v) => {
                      if (v === "home") {
                        setPhase("home");
                        setActiveTab("home");
                      }
                    }}
                    observations={observation ? [observation] : []}
                    isPreview={true}
                  />
                  <div className="main-shell">
                    <ContributorHome
                      projects={[demoProject]}
                      activeProject={demoProject}
                      observations={observation ? [observation] : []}
                      hasDraft={false}
                      onStartObservation={() => {
                        setPhase("collecting");
                        setActiveTab("flow");
                        setCollectorStep(0);
                      }}
                      onChooseProject={() => undefined}
                      onResumeObservation={() => {
                        setPhase("collecting");
                        setActiveTab("flow");
                      }}
                      onDiscardAndStartObservation={() => {
                        setPhase("collecting");
                        setActiveTab("flow");
                      }}
                      onOpenSync={() => {
                        handleTabClick("sync");
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="main-shell">
                  <Collector
                    key={`${round}-${collectorStep}`}
                    project={demoProject}
                    initialStepIndex={collectorStep}
                    draft={draft}
                    lastSavedAt={null}
                    onDraftChange={(key, value) =>
                      setDraft((current) => ({ ...current, [key]: value }))
                    }
                    onSubmit={(values) => handleSubmit(values)}
                    onBack={() => {
                      setPhase("home");
                      setActiveTab("home");
                    }}
                    isSaving={false}
                  />
                </div>
              )}
            </div>
          </div>
        </IPhone>
      </div>
    </div>
  );
}
