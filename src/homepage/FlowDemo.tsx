import { useEffect, useRef, useState } from "react";
import { Collector } from "../components/Collector";
import { ContributorHome } from "../components/ContributorHome";
import { Icon } from "../components/Icon";
import { projectFields } from "../data/schemaFixtures";
import { ATTENTION_CHECKS, ATTENTION_FIELD_KEY } from "../data/attentionChecks";
import { extractAttentionResponse } from "../lib/attention";
import type { Observation, Project } from "../types";

/**
 * The demo runs the app's real frontend — the real Collector guided flow and
 * the real ContributorHome — inside a realistic iPhone mock-up. Nothing is
 * recorded anywhere: draft state lives in this component's memory only, and
 * the demo schema trims the location step so no permission is ever asked.
 *
 * It is a 100% interactive "click it yourself" sandbox where visitors directly
 * answer questions, tap glove-friendly capsules, test tri-state uncertainty,
 * and experience the durable local receipt and background synchronization.
 */

/** Demo schema = the real fixture, with location trimmed and photos optional. */
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
  organization: "Demo field organization",
  organizationMark: "D",
  name: "Vernacular buildings — Valpuesta",
  description: "A synthetic survey used on this page.",
  instructions: "Answer the demo questions — nothing is recorded.",
  status: "active",
  schemaVersion: 1,
  license: "CC-BY-4.0",
  contactEmail: "dataset@demo-lab.org",
  datasetIdentifier: "10.5281/zenodo.0000000",
  contributors: 2,
  completeSubmissions: 3,
  lastReceived: "2026-08-04",
  fields: demoFields,
};

/** Story copy keyed by the real schema field keys (label→key map below). */
const NARRATION: Record<string, { title: string; body: string }> = {
  site_section: {
    title: "One question at a time",
    body: "Section intros are full-screen steps, not headers on a long form — one calm question per screen.",
  },
  site_code: {
    title: "Required means required",
    body: "The key identifier comes first, and the flow cannot advance past it — required steps disable Continue until answered.",
  },
  site_photos: {
    title: "Media, fully offline",
    body: "Photos and audio work with no signal; original files are never recompressed.",
  },
  notes: {
    title: "The page never moves",
    body: "Long text scrolls inside its step; the screen never moves.",
  },
  visible_features: {
    title: "Compound answers",
    body: "Multi-select waits for an explicit Continue.",
  },
  building_type: {
    title: "Answers carry you forward",
    body: "Single answers auto-advance after about 200 ms; capsule targets are 52 pt, comfortable in gloves.",
  },
  building_condition: {
    title: "Typed values, stable ids",
    body: "Choices store stable option ids, not labels — the export stays clean.",
  },
  building_occupancy: {
    title: "Uncertainty is data",
    body: "Yes / No / Unknown — “Unknown” is an honest answer, not a missing value.",
  },
  provenance_section: {
    title: "Recorded, never asked",
    body: "Who, what schema, which device, when, where, which app version — plus location and environment, recorded automatically.",
  },
  observed_date: {
    title: "Native inputs",
    body: "Native date pickers with system keyboard hints.",
  },
  people_count: {
    title: "Numbers with units",
    body: "Numbers keep their unit, so the dataset never needs guessing.",
  },
  [ATTENTION_FIELD_KEY]: {
    title: "Attention, verified",
    body: "A random, universally valid quick check rides along in the flow — the question text is never stored, and the answer is stripped from the payload before commit.",
  },
  saved: {
    title: "Saved means saved",
    body: "One local transaction commits the payload before anything is promised; only the server's durable receipt moves the record to synced.",
  },
};

const labelToKey = new Map<string, string>();
for (const field of demoFields) labelToKey.set(field.label, field.key);
// The attention step's title is the check prompt itself (the real bank).
for (const check of ATTENTION_CHECKS) {
  labelToKey.set(check.prompt, ATTENTION_FIELD_KEY);
}

const SYNC_PHASES = [
  { label: "Metadata", detail: "1 operation" },
  { label: "Media", detail: "0 files" },
  { label: "Finalization", detail: "server receipt" },
];

type Phase = "collecting" | "home";
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
  const [phase, setPhase] = useState<Phase>("collecting");
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [savedValues, setSavedValues] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [observation, setObservation] = useState<Observation | null>(null);
  const [narrativeKey, setNarrativeKey] = useState<string>("site_section");
  const [syncStage, setSyncStage] = useState<SyncStage>(0);
  const timersRef = useRef<number[]>([]);
  const screenRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // The narration follows whatever the real flow is showing: watch the step
  // title inside the phone and map it back to the schema field key.
  useEffect(() => {
    if (phase !== "collecting") return;
    const root = screenRef.current;
    if (!root) return;
    const read = () => {
      const title = root.querySelector<HTMLElement>(".flow-body .step-title");
      if (!title || !title.textContent) return;
      const key = labelToKey.get(title.textContent.trim());
      if (key) setNarrativeKey(key);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [phase, round]);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const reset = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setDraft({});
    setSavedValues(null);
    setObservation(null);
    setSyncStage(0);
    setNarrativeKey("site_section");
    setRound((value) => value + 1);
    setPhase("collecting");
  };

  const handleSubmit = (values: Record<string, unknown>) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setSavedValues(values);
    setObservation({
      id: "demo-observation",
      projectId: demoProject.id,
      createdAt: new Date().toISOString(),
      status: "SAVED_LOCAL",
      values,
      media: [],
    });
    setNarrativeKey("saved");
    setSyncStage(0);
    setPhase("home");
    if (reducedMotion) {
      timersRef.current.push(
        window.setTimeout(() => {
          setSyncStage(3);
          setObservation((current) =>
            current ? { ...current, status: "SYNCED" } : current,
          );
        }, 1200),
      );
      return;
    }
    timersRef.current.push(
      window.setTimeout(() => setSyncStage(1), 1800),
      window.setTimeout(() => setSyncStage(2), 3400),
      window.setTimeout(() => {
        setSyncStage(3);
        setObservation((current) =>
          current ? { ...current, status: "SYNCED" } : current,
        );
      }, 5400),
    );
  };

  const narrative = NARRATION[narrativeKey] ?? NARRATION.site_section;
  const stripped = savedValues && extractAttentionResponse(savedValues);

  return (
    <div className="hp-flow-layout" ref={frameRef}>
      <div className="hp-flow-copy">
        <div className="section-heading">
          <p className="eyebrow">Step 2 · Field Collection</p>
          <h2 id="collection-title">
            One calm question at a time. Built for zero signal.
          </h2>
          <p>
            The collector presents one question per screen with 52pt touch
            targets for gloves and sunlight, native date pickers, and raw photo
            capture. Tap the choices and test the flow yourself.
          </p>
        </div>

        <div className="hp-story" aria-live="polite">
          <span className="hp-story-kicker">Active Question Insight</span>
          <h3>{narrative.title}</h3>
          <p>{narrative.body}</p>

          {phase === "home" && observation && (
            <div className="hp-sync-ops">
              {SYNC_PHASES.map((item, index) => {
                const done = syncStage > index;
                const active = syncStage === index + 1;
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
                {observation.status === "SYNCED"
                  ? "The server's durable receipt moved this record to synced."
                  : "Waiting on the server receipt — nothing is marked sent before it."}
              </p>
            </div>
          )}

          {phase === "home" && stripped && (
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
            {phase === "collecting" ? (
              <Collector
                key={round}
                project={demoProject}
                draft={draft}
                lastSavedAt={null}
                onDraftChange={(key, value) =>
                  setDraft((current) => ({ ...current, [key]: value }))
                }
                onSubmit={(values) => handleSubmit(values)}
                onBack={reset}
                isSaving={false}
              />
            ) : observation ? (
              <ContributorHome
                projects={[demoProject]}
                activeProject={demoProject}
                observations={[observation]}
                hasDraft={false}
                onStartObservation={reset}
                onChooseProject={() => undefined}
                onResumeObservation={reset}
                onDiscardAndStartObservation={reset}
                onOpenSync={() => undefined}
              />
            ) : null}
          </div>
        </IPhone>
      </div>
    </div>
  );
}
