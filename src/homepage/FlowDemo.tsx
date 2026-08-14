import { useEffect, useRef, useState } from "react";
import { Collector } from "../components/Collector";
import { ContributorHome } from "../components/ContributorHome";
import { TopBar } from "../components/TopBar";
import { Icon } from "../components/Icon";
import { DocLinks } from "./DocLinks";
import { projectFields } from "../data/schemaFixtures";
import type { Observation, Project } from "../types";

/**
 * Step 1: Field Collection Preview.
 * Live-linked directly to the production Collector and ContributorHome components.
 * Renders in the light iPhone mock-up using the real contributor styling tokens.
 */

type ContributorTab = "home" | "flow" | "media";

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
  organization: "Liminal Research",
  organizationMark: "L",
  name: "Example Survey",
  description: "",
  instructions: "",
  status: "active",
  schemaVersion: 1,
  license: "CC-BY-4.0",
  contactEmail: "valpuesta@example.com",
  contributors: 3,
  completeSubmissions: 104,
  lastReceived: "2026-08-14T09:32:00.000Z",
  fields: demoFields,
};

const initialSampleObservations: Observation[] = [
  {
    id: "obs-val-003",
    projectId: "demo-project",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    status: "SAVED_LOCAL",
    values: {
      site_code: "VA-003",
      building_type: "workshop",
      building_occupancy: "unknown",
    },
    media: [],
  },
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
    title: "Field Home",
    body: "Shows active survey guidance, offline sync status, and a single dominant action to begin collecting.",
  },
  flow: {
    title: "Guided Step Flow",
    body: "One clear question per screen with large touch targets for gloves and sunlight, native inputs, and keyboard-safe viewports.",
  },
  media: {
    title: "Raw Media Capture",
    body: "Stores photos and audio as unmodified original files with SHA-256 integrity hashes, bypassing compression.",
  },
};

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
  const [phase, setPhase] = useState<"home" | "collecting">("home");
  const [activeTab, setActiveTab] = useState<ContributorTab>("home");
  const [collectorStep, setCollectorStep] = useState<number>(0);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [observation, setObservation] = useState<Observation | null>(null);
  const [seedObservations, setSeedObservations] = useState<Observation[]>(
    initialSampleObservations,
  );
  const timersRef = useRef<number[]>([]);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const reset = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setDraft({});
    setObservation(null);
    setSeedObservations(initialSampleObservations);
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
    } else if (tab === "media") {
      setPhase("collecting");
      // Jump to the photo step by key so the live step order (including the
      // attention check) never shifts the target screen.
      setCollectorStep(-1);
    }
  };

  const triggerSyncAnimation = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const complete = () =>
      setObservation((current) =>
        current ? { ...current, status: "SYNCED" } : current,
      );
    timersRef.current.push(
      window.setTimeout(complete, reducedMotion ? 1000 : 3800),
    );
  };

  const handleSubmit = (values: Record<string, unknown>) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const newObs: Observation = {
      id: "demo-observation",
      projectId: demoProject.id,
      createdAt: new Date().toISOString(),
      status: "SAVED_LOCAL",
      values,
      media: [],
    };
    setObservation(newObs);
    setSeedObservations((current) => [newObs, ...current]);
    setPhase("home");
    setActiveTab("home");
    triggerSyncAnimation();
  };

  const narrative = TAB_NARRATION[activeTab];

  return (
    <div className="hp-flow-layout">
      <div className="hp-flow-copy">
        <div className="section-heading">
          <p className="eyebrow">Field Collection</p>
          <h2 id="collection-title">
            Designed for bright sun, cold hands, and zero signal.
          </h2>
          <p>
            One calm question at a time. High-contrast typography that cuts
            through glare, oversized touch targets for gloved fingers, and
            immediate local commit on every step.
          </p>
          <DocLinks files={["flows.md"]} />
        </div>

        <div className="hp-admin-tab-selector hp-contrib-tab-selector">
          <button
            type="button"
            className={`hp-admin-step-btn ${activeTab === "home" ? "active" : ""}`}
            onClick={() => handleTabClick("home")}
          >
            Field Home
          </button>
          <button
            type="button"
            className={`hp-admin-step-btn ${activeTab === "flow" ? "active" : ""}`}
            onClick={() => handleTabClick("flow")}
          >
            Guided Flow
          </button>
          <button
            type="button"
            className={`hp-admin-step-btn ${activeTab === "media" ? "active" : ""}`}
            onClick={() => handleTabClick("media")}
          >
            Raw Media
          </button>
        </div>

        <div className="hp-story" aria-live="polite">
          <span className="hp-story-kicker">Contributor Surface</span>
          <h3>{narrative.title}</h3>
          <p>{narrative.body}</p>
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
                    observations={
                      observation
                        ? [observation, ...seedObservations]
                        : seedObservations
                    }
                    isPreview={true}
                  />
                  <div className="main-shell">
                    <ContributorHome
                      projects={[demoProject]}
                      activeProject={demoProject}
                      observations={
                        observation
                          ? [observation, ...seedObservations]
                          : seedObservations
                      }
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
                        setPhase("home");
                        setActiveTab("home");
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="main-shell">
                  <Collector
                    key={`${round}-${collectorStep}`}
                    project={demoProject}
                    initialStepIndex={activeTab === "media" ? 0 : collectorStep}
                    initialFieldKey={
                      activeTab === "media" ? "site_photos" : undefined
                    }
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
