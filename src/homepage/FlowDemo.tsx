import { Fragment, useEffect, useRef, useState } from "react";
import { Collector } from "../components/Collector";
import { ContributorHome } from "../components/ContributorHome";
import { TopBar } from "../components/TopBar";
import { DocLinks } from "./DocLinks";
import { projectFields } from "../data/schemaFixtures";
import type {
  FormDraft,
  Observation,
  Project,
  SubmissionValues,
} from "../types";

/**
 * Step 1: Field Collection Preview.
 * Live-linked directly to the production Collector and ContributorHome components.
 * Renders in the light iPhone mock-up using the real contributor styling tokens.
 */

export type ContributorTab = "home" | "flow" | "media";

const demoFields = projectFields
  .filter((field) => field.type !== "location")
  .map((field) =>
    field.key === "site_photos"
      ? {
          ...field,
          required: false,
          config: { ...field.config, minCount: 0 },
        }
      : field,
  );

const demoProject: Project = {
  id: "demo-project",
  organization: "Field Research",
  organizationMark: "F",
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

/** The input types the schema supports; each chip jumps the preview phone
 *  to the matching question so visitors see the flow is not media-only. */
const FIELD_TYPES: { label: string; fieldKey: string }[] = [
  { label: "Short text", fieldKey: "site_code" },
  { label: "Single choice", fieldKey: "building_type" },
  { label: "Tri-state", fieldKey: "building_occupancy" },
  { label: "Multi-select", fieldKey: "visible_features" },
  { label: "Date", fieldKey: "observed_date" },
  { label: "Number", fieldKey: "people_count" },
  { label: "Photo & audio", fieldKey: "site_photos" },
  { label: "Field notes", fieldKey: "notes" },
];

const TAB_NARRATION = {
  home: {
    title: "Field Home",
    body: "Shows active survey guidance, offline sync status, and a single dominant action to begin collecting.",
  },
  flow: {
    title: "Guided Step Flow",
    body: "One clear question per screen: short text, single choice, tri-state, multi-select, dates, and counts use native inputs with large touch targets for gloves and sunlight.",
  },
  media: {
    title: "Raw Media Capture",
    body: "Photos, audio, and field notes join every other input type — originals stay unmodified with SHA-256 integrity hashes, never recompressed.",
  },
} as const satisfies Record<ContributorTab, { title: string; body: string }>;

const reducedMotion = Boolean(
  globalThis.window?.matchMedia &&
  globalThis.window.matchMedia("(prefers-reduced-motion: reduce)").matches,
);

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

export function FlowDemo({
  tab = "home",
  onTabChange = () => undefined,
}: {
  tab?: ContributorTab;
  onTabChange?: (tab: ContributorTab) => void;
}) {
  const [round] = useState(0);
  const [phase, setPhase] = useState<"home" | "collecting">("home");
  const [collectorStep, setCollectorStep] = useState<number>(0);
  const [jumpKey, setJumpKey] = useState<string | undefined>(undefined);
  const [draft, setDraft] = useState<FormDraft>({});
  const [observation, setObservation] = useState<Observation | null>(null);
  const [seedObservations, setSeedObservations] = useState<Observation[]>(
    initialSampleObservations,
  );
  const timersRef = useRef<number[]>([]);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  // Follow the controlled tab, which the guided tour and the tab chips drive.
  useEffect(() => {
    if (tab === "home") {
      setPhase("home");
    } else if (tab === "flow") {
      setPhase("collecting");
      setCollectorStep(0);
      setJumpKey(undefined);
    } else if (tab === "media") {
      setPhase("collecting");
      // Jump to the photo step by key so the live step order (including the
      // attention check) never shifts the target screen.
      setCollectorStep(-1);
      setJumpKey("site_photos");
    }
  }, [tab]);

  const handleTabClick = (next: ContributorTab) => {
    onTabChange(next);
  };

  const jumpToField = (fieldKey: string) => {
    setPhase("collecting");
    onTabChange("flow");
    setCollectorStep(-1);
    setJumpKey(fieldKey);
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

  const handleSubmit = (values: SubmissionValues) => {
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
    onTabChange("home");
    triggerSyncAnimation();
  };

  const narrative = TAB_NARRATION[tab];

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
            className={`hp-admin-step-btn ${tab === "home" ? "active" : ""}`}
            onClick={() => handleTabClick("home")}
          >
            Field Home
          </button>
          <button
            type="button"
            className={`hp-admin-step-btn ${tab === "flow" ? "active" : ""}`}
            onClick={() => handleTabClick("flow")}
          >
            Guided Flow
          </button>
          <button
            type="button"
            className={`hp-admin-step-btn ${tab === "media" ? "active" : ""}`}
            onClick={() => handleTabClick("media")}
          >
            Raw Media
          </button>
        </div>

        {tab === "flow" && (
          <p className="hp-field-types">
            {FIELD_TYPES.map((type, index) => (
              <Fragment key={type.fieldKey}>
                {/* Label and separator stay together so a wrapped line never
                    begins with a separator (which reads as an indent). */}
                <span className="hp-field-type-item">
                  <button
                    type="button"
                    className="hp-field-type"
                    onClick={() => jumpToField(type.fieldKey)}
                  >
                    {type.label}
                  </button>
                  {index < FIELD_TYPES.length - 1 && (
                    <span className="hp-field-type-sep" aria-hidden="true">
                      ·
                    </span>
                  )}
                </span>{" "}
              </Fragment>
            ))}
          </p>
        )}

        <div className="hp-story" aria-live="polite">
          <h3>{narrative.title}</h3>
          <p>{narrative.body}</p>
        </div>
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
                        onTabChange("home");
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
                        onTabChange("flow");
                        setCollectorStep(0);
                      }}
                      onChooseProject={() => undefined}
                      onResumeObservation={() => {
                        setPhase("collecting");
                        onTabChange("flow");
                      }}
                      onDiscardAndStartObservation={() => {
                        setPhase("collecting");
                        onTabChange("flow");
                      }}
                      onOpenSync={() => {
                        setPhase("home");
                        onTabChange("home");
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="main-shell">
                  <Collector
                    key={`${round}-${collectorStep}-${jumpKey ?? ""}`}
                    project={demoProject}
                    initialStepIndex={
                      tab === "media" || jumpKey ? 0 : collectorStep
                    }
                    initialFieldKey={
                      tab === "media" ? "site_photos" : (jumpKey ?? undefined)
                    }
                    draft={draft}
                    lastSavedAt={null}
                    onDraftChange={(key, value) =>
                      setDraft((current) => ({ ...current, [key]: value }))
                    }
                    onSubmit={(values) => handleSubmit(values)}
                    onBack={() => {
                      setPhase("home");
                      onTabChange("home");
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
