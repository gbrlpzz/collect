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
 * The demo can play itself: when it scrolls into view it walks the real UI
 * step by step (typing, answering, saving), and the visitor can take over at
 * any moment — one tap stops the automaton and hands over the phone.
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
    body: "Single answers auto-advance after about 200 ms; capsule targets are 56 pt, comfortable in gloves.",
  },
  building_condition: {
    title: "Typed values, stable ids",
    body: "Choices store stable option ids, not labels — the export stays clean.",
  },
  building_occupancy: {
    title: "Uncertainty is data",
    body: "Yes / No / Unknown — \u201cUnknown\u201d is an honest answer, not a missing value.",
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
type AutoState = "idle" | "playing" | "done";

const reducedMotion =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

/** React ignores plain `.value` assignment; use the native input setter. */
function setNativeValue(element: HTMLInputElement, value: string) {
  const prototype = Object.getPrototypeOf(element);
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(
    element,
    value,
  );
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

/** One step of the self-playing walk, driving the real controls. */
function autoStep(root: HTMLElement, lastTitle: string): "continue" | "done" {
  const title =
    root
      .querySelector<HTMLElement>(".flow-body .step-title")
      ?.textContent?.trim() ?? "";
  if (!title) return "done";
  const sameStep = title === lastTitle;
  const primary = Array.from(
    root.querySelectorAll<HTMLButtonElement>(".flow-actions button"),
  ).find((button) =>
    /continue|skip|save observation/i.test(button.textContent ?? ""),
  );
  const option = root.querySelector<HTMLElement>(
    ".choice-button, .tri-state button",
  );

  if (title === "Site code") {
    const input = root.querySelector<HTMLInputElement>("#site_code");
    if (input) setNativeValue(input, "VA-023");
    if (primary && !primary.disabled) primary.click();
    return "continue";
  }
  if (title === "Date observed") {
    const input = root.querySelector<HTMLInputElement>('input[type="date"]');
    if (input) setNativeValue(input, "2026-08-10");
    return "continue";
  }
  // An unchanged step after an option click is a multi-select or the final
  // attention check: press the primary action instead of picking more options.
  if (sameStep && option && primary && !primary.disabled) {
    primary.click();
    return "continue";
  }
  if (option) {
    (option as HTMLButtonElement).click();
    return "continue";
  }
  if (primary && !primary.disabled) {
    primary.click();
    return "continue";
  }
  return "continue";
}

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

function IPhone({
  children,
  zoom,
}: {
  children: React.ReactNode;
  zoom?: number | null;
}) {
  return (
    <div className="hp-iphone" style={zoom ? { zoom } : undefined}>
      <div
        className="hp-iphone-buttons hp-iphone-buttons-left"
        aria-hidden="true"
      >
        <span className="hp-btn hp-btn-mute" />
        <span className="hp-btn hp-btn-vol-up" />
        <span className="hp-btn hp-btn-vol-down" />
      </div>
      <div
        className="hp-iphone-buttons hp-iphone-buttons-right"
        aria-hidden="true"
      >
        <span className="hp-btn hp-btn-power" />
      </div>
      <div className="hp-iphone-frame">
        <div className="hp-iphone-screen">
          <div className="hp-dynamic-island" aria-hidden="true" />
          <StatusBar />
          {children}
          <div className="hp-home-indicator" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

const PHONE_HEIGHT = 868;

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
  const [autoState, setAutoState] = useState<AutoState>("idle");
  const [fitZoom, setFitZoom] = useState<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const screenRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const lastTitleRef = useRef("");
  const interactedRef = useRef(false);

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

  // The phone stays within the viewport height: scale it down on short
  // screens (desktop only; the CSS media queries handle phones).
  useEffect(() => {
    const compute = () => {
      if (typeof window === "undefined" || window.innerWidth < 900) {
        setFitZoom(null);
        return;
      }
      const available = window.innerHeight - 150;
      setFitZoom(available < PHONE_HEIGHT ? available / PHONE_HEIGHT : null);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // While the demo plays itself, the page stands still: scroll is locked
  // and the phone is centered in the viewport. Scroll resumes after the
  // walk has gone through every action (save + finalization), or the
  // moment the visitor takes over. A safety timer prevents a trap.
  useEffect(() => {
    const root = document.documentElement;
    if (autoState === "playing") {
      root.classList.add("hp-lock");
      frameRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      const safety = window.setTimeout(() => {
        root.classList.remove("hp-lock");
      }, 45000);
      return () => {
        window.clearTimeout(safety);
        root.classList.remove("hp-lock");
      };
    }
    if (autoState === "done" && syncStage === 3) {
      root.classList.remove("hp-lock");
    }
    return undefined;
  }, [autoState, syncStage]);

  const stopAuto = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setAutoState((state) => (state === "playing" ? "idle" : state));
  };

  // The automaton drives the real UI. It stops the moment the visitor
  // touches the phone (or presses a key), handing over control. The tick
  // loop owns a single chained timer so stopping it never touches the sync
  // timers; the "done" state is set by the sync completion instead.
  useEffect(() => {
    if (autoState !== "playing" || phase !== "collecting") return;
    const root = screenRef.current;
    if (!root) return;
    let tickTimer = 0;
    const tick = () => {
      const next = autoStep(root, lastTitleRef.current);
      lastTitleRef.current =
        root
          .querySelector<HTMLElement>(".flow-body .step-title")
          ?.textContent?.trim() ?? "";
      if (next === "done") {
        setAutoState("done");
        return;
      }
      tickTimer = window.setTimeout(tick, 1250);
    };
    tickTimer = window.setTimeout(tick, 900);
    return () => window.clearTimeout(tickTimer);
  }, [autoState, phase, round]);

  // Start the self-play once the demo scrolls into view — unless the
  // visitor prefers reduced motion or has already interacted.
  useEffect(() => {
    const frame = frameRef.current;
    if (
      !frame ||
      reducedMotion ||
      interactedRef.current ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          setAutoState("playing");
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Any real user interaction inside the phone takes over from the automaton.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || autoState !== "playing") return;
    const takeOver = () => {
      interactedRef.current = true;
      stopAuto();
    };
    frame.addEventListener("pointerdown", takeOver, { capture: true });
    frame.addEventListener("keydown", takeOver, { capture: true });
    return () => {
      frame.removeEventListener("pointerdown", takeOver, { capture: true });
      frame.removeEventListener("keydown", takeOver, { capture: true });
    };
  }, [autoState]);

  const reset = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    lastTitleRef.current = "";
    setDraft({});
    setSavedValues(null);
    setObservation(null);
    setSyncStage(0);
    setNarrativeKey("site_section");
    setRound((value) => value + 1);
    setPhase("collecting");
  };

  const watchAgain = () => {
    reset();
    interactedRef.current = false;
    setAutoState("playing");
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
          setAutoState("done");
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
        setAutoState("done");
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
          <p className="eyebrow">Try it</p>
          <h2>The collection flow, one question at a time.</h2>
          <p>
            The app's real frontend. Watch it fill itself, or take over —
            nothing is recorded anywhere.
          </p>
        </div>

        <div className="hp-story" aria-live="polite">
          <span className="hp-story-kicker">While you fill it in</span>
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
          {autoState === "playing" && (
            <p className="hp-auto-note">
              <span className="status-dot" aria-hidden="true" /> The demo is
              playing itself — tap the phone to take over.
            </p>
          )}
          {autoState === "done" && !interactedRef.current && (
            <button className="text-button" type="button" onClick={watchAgain}>
              <Icon name="refresh" size={15} /> Watch again
            </button>
          )}
          {autoState === "idle" && (
            <button className="text-button" type="button" onClick={watchAgain}>
              <Icon name="play" size={15} /> Watch it fill itself
            </button>
          )}
        </div>

        <p className="hp-demo-note">
          Live app frontend · no permission asked · nothing is recorded
        </p>
      </div>

      <div className="hp-iphone-wrap">
        <IPhone zoom={fitZoom}>
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
                onOpenProject={reset}
                onChooseProject={() => undefined}
                onResumeObservation={reset}
                onDiscardAndStartObservation={reset}
              />
            ) : null}
          </div>
        </IPhone>
      </div>
    </div>
  );
}
