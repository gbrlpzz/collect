import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { FieldDefinition, MediaAsset, Project } from "../types";
import { Icon } from "./Icon";
import { Button } from "./ui";
import { FieldRenderer } from "./FieldRenderer";
import { attentionFieldFor, pickAttentionCheck } from "../lib/attention";
import { orderFieldsForCollection } from "../lib/fieldOrdering";
import { sha256Blob } from "../lib/mediaIntegrity";

interface CollectorProps {
  project: Project;
  draft: Record<string, unknown>;
  lastSavedAt: string | null;
  onDraftChange: (key: string, value: unknown) => void;
  onSubmit: (
    values: Record<string, unknown>,
    media: MediaAsset[],
  ) => void | Promise<void>;
  onBack: () => void;
  isSaving: boolean;
  /** Admin preview: the flow is fully interactive but nothing is persisted. */
  preview?: boolean;
  /** Test seam: disable the automatic attention check step. */
  attentionCheck?: boolean;
}

type Step =
  | { kind: "heading"; field: FieldDefinition }
  | { kind: "field"; field: FieldDefinition };

type LocationAccessState =
  | "not-needed"
  | "checking"
  | "prompt"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"
  | "error";

function isAutoAdvanceType(type: FieldDefinition["type"]): boolean {
  return (
    type === "single_choice" ||
    type === "tri_state" ||
    type === "date" ||
    type === "datetime"
  );
}

/**
 * The collection surface is a guided flow: one question per screen, no page
 * movement, capsule geometry, and a single primary action. This is the
 * pattern Apple uses for setup and checkout flows — it reduces cognitive
 * load, keeps the page static, and makes the next action obvious.
 */
export function Collector({
  project,
  draft,
  lastSavedAt,
  onDraftChange,
  onSubmit,
  onBack,
  isSaving,
  preview = false,
  attentionCheck = true,
}: CollectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const locationPermissionCheckStartedRef = useRef(false);
  const [mediaByField, setMediaByField] = useState<
    Record<string, MediaAsset[]>
  >(() =>
    project.fields.reduce<Record<string, MediaAsset[]>>((result, field) => {
      if (field.type !== "photo" && field.type !== "audio") return result;
      const value = draft[field.key];
      result[field.key] = Array.isArray(value)
        ? (value.filter(
            (asset): asset is MediaAsset =>
              typeof asset === "object" &&
              asset !== null &&
              "id" in asset &&
              "name" in asset,
          ) as MediaAsset[])
        : [];
      return result;
    }, {}),
  );
  const mediaByFieldRef = useRef(mediaByField);
  const [activeMediaField, setActiveMediaField] = useState("site_photos");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [locationAccess, setLocationAccess] =
    useState<LocationAccessState>("checking");
  const [errorText, setErrorText] = useState<string | null>(null);
  const locationAttemptedFieldRef = useRef<string | null>(null);

  // Collection order follows requirement #6: the key identifier comes first,
  // then the highest-effort questions (photos/audio, location, long text)
  // while attention is fresh. Location stays background provenance: it never
  // becomes a step, only a silent capture at the save boundary.
  // Attention verification: one random check rides quietly in the flow after
  // the first two questions. It is provenance, not a schema field — the
  // answer travels in values._attention and submission.ts strips it from the
  // research payload while the server computes correctness from its own bank.
  const baseSteps = useMemo<Step[]>(
    () =>
      orderFieldsForCollection(project.fields)
        .filter((field) => field.type !== "location")
        .map((field) =>
          field.type === "heading"
            ? { kind: "heading", field }
            : { kind: "field", field },
        ),
    [project.fields],
  );
  const attentionPlanRef = useRef<
    { field: FieldDefinition; index: number } | null | undefined
  >(undefined);
  if (attentionPlanRef.current === undefined) {
    const dataFields = baseSteps
      .filter((step) => step.kind === "field")
      .map((step) => step.field);
    if (attentionCheck && baseSteps.length >= 3 && dataFields.length >= 2) {
      const field = attentionFieldFor(
        pickAttentionCheck(dataFields.map((candidate) => candidate.key)),
      );
      const index = Math.min(
        baseSteps.length - 1,
        Math.floor(2 + Math.random() * (baseSteps.length - 1)),
      );
      attentionPlanRef.current = { field, index };
    } else {
      attentionPlanRef.current = null;
    }
  }
  const steps = useMemo<Step[]>(() => {
    const plan = attentionPlanRef.current;
    if (!plan) return baseSteps;
    const copy = [...baseSteps];
    copy.splice(plan.index, 0, { kind: "field", field: plan.field });
    return copy;
  }, [baseSteps]);
  const locationFields = useMemo(
    () => project.fields.filter((field) => field.type === "location"),
    [project.fields],
  );
  const requiresLocationAccess = !preview && locationFields.length > 0;
  const current = steps[Math.min(stepIndex, Math.max(steps.length - 1, 0))];
  const allMediaAssets = useMemo(
    () => Object.values(mediaByField).flat(),
    [mediaByField],
  );
  const isLastStep = stepIndex === steps.length - 1;

  const hasValue = (value: unknown) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "number" && !Number.isFinite(value)) return false;
    if (value && typeof value === "object" && "localDatetime" in value)
      return Boolean((value as { localDatetime?: string }).localDatetime);
    if (value && typeof value === "object" && "value" in value) {
      const nestedValue = (value as { value?: unknown }).value;
      return (
        nestedValue !== undefined &&
        nestedValue !== "" &&
        !(typeof nestedValue === "number" && !Number.isFinite(nestedValue))
      );
    }
    return value !== undefined && value !== null && value !== "";
  };

  const fieldConfigError = (field: FieldDefinition): string | null => {
    const value = draft[field.key];
    const config = field.config ?? {};
    if (field.type === "short_text" || field.type === "long_text") {
      if (
        typeof value === "string" &&
        config.minLength !== undefined &&
        value.length < Number(config.minLength)
      )
        return `Enter at least ${config.minLength} characters.`;
      return null;
    }
    if (field.type === "number") {
      const rawNumber =
        value && typeof value === "object" && "value" in value
          ? (value as { value?: unknown }).value
          : value;
      if (rawNumber === undefined || rawNumber === null || rawNumber === "")
        return null;
      const numberValue =
        typeof rawNumber === "number" ? rawNumber : Number(rawNumber);
      if (!Number.isFinite(numberValue)) return "Enter a valid number.";
      if (config.integer && !Number.isInteger(numberValue))
        return "Enter a whole number.";
      if (config.min !== undefined && numberValue < Number(config.min))
        return `Minimum is ${config.min}.`;
      if (config.max !== undefined && numberValue > Number(config.max))
        return `Maximum is ${config.max}.`;
      return null;
    }
    if (field.type === "photo" || field.type === "audio") {
      const count = (mediaByField[field.key] ?? []).length;
      if (config.minCount !== undefined && count < Number(config.minCount))
        return `Add at least ${config.minCount} ${field.type === "photo" ? "photos" : "recordings"}.`;
      return null;
    }
    return null;
  };

  const stepError = (field: FieldDefinition): string | null => {
    if (field.required) {
      if (field.type === "photo" || field.type === "audio") {
        if ((mediaByField[field.key] ?? []).length === 0)
          return "This is required.";
      } else if (!hasValue(draft[field.key])) {
        return "This is required.";
      }
    }
    return fieldConfigError(field);
  };

  const canContinue = (): boolean => {
    if (current.kind === "heading") return true;
    const field = current.field;
    if (field.type === "photo" || field.type === "audio")
      return !field.required || (mediaByField[field.key] ?? []).length > 0;
    return !field.required || hasValue(draft[field.key]);
  };

  const focusCurrentControl = () => {
    const key = current.kind === "field" ? current.field.key : null;
    if (!key) return;
    const container = document.getElementById(`step-${key}`);
    window.setTimeout(() => {
      container
        ?.querySelector<HTMLElement>("input, textarea, select, button")
        ?.focus();
    }, 60);
  };

  const goNext = async () => {
    if (current.kind === "field") {
      const error = stepError(current.field);
      if (error) {
        setErrorText(error);
        focusCurrentControl();
        return;
      }
    }
    setErrorText(null);
    if (isLastStep) {
      // Most projects have no location field. Keep the ordinary save path
      // synchronous so a completed form never waits on an invisible task.
      const saveValues = (values: Record<string, unknown>) => {
        const mediaValues = Object.fromEntries(
          project.fields
            .filter((field) => field.type === "photo" || field.type === "audio")
            .map((field) => [
              field.key,
              (mediaByField[field.key] ?? []).map((asset) => asset.id),
            ]),
        );
        void onSubmit({ ...values, ...mediaValues }, allMediaAssets);
      };
      if (!locationFields.length) {
        saveValues(draft);
        return;
      }
      // Location is provenance, not a question. Refresh it silently at the
      // save boundary; only a required schema failure becomes visible here.
      setCapturingLocation(true);
      const location = await captureLocation();
      setCapturingLocation(false);
      if (!location) {
        setLocationError(
          "Location could not be captured. Allow location access and try again.",
        );
        setErrorText(
          "Location access is required for this project. Allow it and try again.",
        );
        return;
      }
      const values = {
        ...draft,
        ...Object.fromEntries(
          locationFields.map((field) => [field.key, location]),
        ),
      };
      saveValues(values);
      return;
    }
    setStepIndex((index) => index + 1);
  };

  const goBack = () => {
    setErrorText(null);
    if (stepIndex === 0) {
      onBack();
      return;
    }
    setStepIndex((index) => index - 1);
  };

  const handleChange = (key: string, value: unknown) => {
    onDraftChange(key, value);
    setErrorText(null);
    if (current.kind !== "field") return;
    const field = current.field;
    if (!isAutoAdvanceType(field.type)) return;
    // Single answers advance immediately. "Other" waits for free text.
    if (field.type === "single_choice") {
      const otherOption = field.options?.find(
        (option) => option.value === "other" || option.id.endsWith("-other"),
      );
      const isOther =
        value && typeof value === "object" && "value" in value
          ? (value as { value?: unknown }).value === otherOption?.id ||
            (value as { value?: unknown }).value === "other"
          : value === otherOption?.id || value === "other";
      if (isOther) return;
    }
    const fromStep = stepIndex;
    window.setTimeout(() => {
      setStepIndex((index) =>
        index === fromStep ? Math.min(index + 1, steps.length - 1) : index,
      );
    }, 220);
  };

  const captureLocation = useCallback(
    (): Promise<Record<string, unknown> | null> =>
      new Promise((resolve) => {
        if (!("geolocation" in navigator)) {
          setLocationAccess("unavailable");
          setLocationNotice(
            "This browser cannot provide location. Collection is unavailable for this project on this device.",
          );
          resolve(null);
          return;
        }
        setLocationAccess("requesting");
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              capturedAt: new Date().toISOString(),
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              autoCaptured: true,
            };
            for (const field of locationFields) {
              onDraftChange(field.key, location);
            }
            setLocationAccess("granted");
            setLocationError(null);
            setLocationNotice(null);
            setErrorText(null);
            resolve(location);
          },
          (error) => {
            const denied = error.code === error.PERMISSION_DENIED;
            setLocationAccess(denied ? "denied" : "error");
            setLocationNotice(
              denied
                ? "Location is off for Collect. Enable it in Settings before continuing."
                : "Collect could not determine your location. Check Location Services and try again.",
            );
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10_000 },
        );
      }),
    [locationFields, onDraftChange],
  );

  const checkLocationAccess = useCallback(async () => {
    if (!requiresLocationAccess) {
      setLocationAccess("not-needed");
      return;
    }
    if (!("geolocation" in navigator)) {
      setLocationAccess("unavailable");
      return;
    }
    setLocationAccess("checking");
    try {
      if (!("permissions" in navigator)) {
        setLocationAccess("prompt");
        return;
      }
      const permission = await navigator.permissions.query({
        name: "geolocation",
      });
      if (permission.state === "granted") {
        await captureLocation();
      } else {
        setLocationAccess(permission.state);
      }
    } catch {
      // Safari versions without a queryable geolocation permission still
      // support the geolocation request itself. Keep that request attached to
      // the contributor's explicit action.
      setLocationAccess("prompt");
    }
  }, [captureLocation, requiresLocationAccess]);

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const field = project.fields.find(
      (candidate) => candidate.key === activeMediaField,
    );
    if (!field) return;
    const assets = files.map(
      (file) =>
        ({
          id: crypto.randomUUID(),
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          byteSize: file.size,
          fieldId: activeMediaField,
          capturedAt: new Date().toISOString(),
          captureSource: "picker",
          blob: file,
        }) satisfies MediaAsset,
    );
    const fieldKey = activeMediaField;
    const maxCount = Number(field.config?.maxCount ?? 5);
    const nextAssets = [
      ...(mediaByFieldRef.current[fieldKey] ?? []),
      ...assets,
    ].slice(0, maxCount);
    const nextMediaByField = {
      ...mediaByFieldRef.current,
      [fieldKey]: nextAssets,
    };
    mediaByFieldRef.current = nextMediaByField;
    setMediaByField(nextMediaByField);
    onDraftChange(fieldKey, nextAssets);

    // Hashing is deliberately invisible. Keep a ref to the latest media state
    // so concurrent completions cannot restore a removed item or erase a
    // sibling asset through a stale render closure.
    for (const asset of assets) {
      if (!asset.blob) continue;
      void sha256Blob(asset.blob)
        .then((sha256) => {
          if (!sha256) return;
          const currentAssets = mediaByFieldRef.current[fieldKey] ?? [];
          if (!currentAssets.some((item) => item.id === asset.id)) return;
          const hashedAssets = currentAssets.map((item) =>
            item.id === asset.id ? { ...item, sha256 } : item,
          );
          const next = {
            ...mediaByFieldRef.current,
            [fieldKey]: hashedAssets,
          };
          mediaByFieldRef.current = next;
          setMediaByField(next);
          onDraftChange(fieldKey, hashedAssets);
        })
        .catch(() => undefined);
    }
    setErrorText(null);
    event.target.value = "";
  };

  const removeMedia = (fieldKey: string, index: number) => {
    const nextAssets = (mediaByField[fieldKey] ?? []).filter(
      (_, currentIndex) => currentIndex !== index,
    );
    const next = { ...mediaByFieldRef.current, [fieldKey]: nextAssets };
    mediaByFieldRef.current = next;
    setMediaByField(next);
    onDraftChange(fieldKey, nextAssets);
  };

  const activeField = current?.kind === "field" ? current.field : null;
  const activeMediaAssets =
    activeField &&
    (activeField.type === "photo" || activeField.type === "audio")
      ? (mediaByField[activeField.key] ?? [])
      : [];
  const activeFieldHasValue = activeField
    ? activeField.type === "photo" || activeField.type === "audio"
      ? activeMediaAssets.length > 0
      : hasValue(draft[activeField.key])
    : false;
  const skippingOptionalField = Boolean(
    activeField && !activeField.required && !activeFieldHasValue,
  );

  // Location remains background provenance, but access is a hard prerequisite
  // whenever the published schema declares a location field. Previously
  // granted access is used automatically. A first request remains attached to
  // an explicit, contextual action so iOS can explain the system permission.
  useEffect(() => {
    if (locationPermissionCheckStartedRef.current) return;
    locationPermissionCheckStartedRef.current = true;
    void checkLocationAccess();
  }, [checkLocationAccess]);

  // Re-check after a contributor returns from iOS Settings. There is no safe
  // web deep link into an app's permission pane, so visibility is the reliable
  // recovery boundary for an installed PWA.
  useEffect(() => {
    if (!requiresLocationAccess) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkLocationAccess();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [checkLocationAccess, requiresLocationAccess]);
  const primaryLabel = isLastStep
    ? preview
      ? "Finish preview"
      : isSaving
        ? "Saving…"
        : "Save observation"
    : skippingOptionalField
      ? "Skip"
      : "Continue";
  const exitLabel = preview ? "Exit" : "Home";
  const exitAccessibleLabel = preview
    ? "Exit preview"
    : "Save draft and return home";

  if (requiresLocationAccess && locationAccess !== "granted") {
    const isChecking =
      locationAccess === "checking" || locationAccess === "requesting";
    const cannotRequest = locationAccess === "unavailable";
    const title =
      locationAccess === "denied"
        ? "Allow location in Settings"
        : locationAccess === "unavailable"
          ? "Location unavailable"
          : locationAccess === "error"
            ? "Location not found"
            : "Location required";
    const description =
      locationAccess === "denied"
        ? "This project records coordinates with each observation. Open Settings and allow location for Collect or this browser, then return here."
        : locationAccess === "unavailable"
          ? "This project requires coordinates, but this browser cannot provide them. Use a device and browser with Location Services enabled."
          : locationAccess === "error"
            ? "Collect has access but could not determine your position. Move to an open area, check Location Services, and try again."
            : "This project records coordinates with each observation. Your location is used only for project provenance and is saved with the observation.";

    return (
      <main className="collector-page collector-flow">
        <div className="collector-topbar">
          <button
            className="back-button"
            onClick={onBack}
            aria-label={exitAccessibleLabel}
          >
            <Icon name="x" size={17} /> {exitLabel}
          </button>
          <div className="collector-title">
            <strong>New observation</strong>
            <span>{project.name}</span>
          </div>
          <span className="collector-save-state" />
        </div>
        <div className="permission-gate" aria-live="polite">
          <span className="permission-gate-icon" aria-hidden="true">
            <Icon name="location" size={26} />
          </span>
          <div className="permission-gate-copy">
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {!cannotRequest && (
            <Button
              variant="primary"
              fullWidth
              busy={isChecking}
              disabled={isChecking}
              onClick={() => void captureLocation()}
            >
              {isChecking
                ? "Checking location…"
                : locationAccess === "prompt"
                  ? "Allow location"
                  : "Try again"}
            </Button>
          )}
          <p className="permission-gate-note">
            Collection remains locked until location access is available.
          </p>
        </div>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="collector-page collector-flow">
        <div className="collector-topbar">
          <button
            className="back-button"
            onClick={onBack}
            aria-label={exitAccessibleLabel}
          >
            <Icon name="x" size={17} /> {exitLabel}
          </button>
          <div className="collector-title">
            <strong>New observation</strong>
            <span>{project.name}</span>
          </div>
          <span className="collector-save-state" />
        </div>
        <div className="flow-body">
          <div className="flow-step">
            <p className="step-description">
              This project has no questions yet. Ask an administrator to add
              fields.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="collector-page collector-flow">
      <div className="collector-topbar">
        <button
          className="back-button"
          onClick={onBack}
          aria-label={exitAccessibleLabel}
        >
          <Icon name="x" size={17} /> {exitLabel}
        </button>
        <div className="collector-title">
          <strong>New observation</strong>
          <span>{project.name}</span>
        </div>
        <span className="collector-save-state" aria-live="polite">
          {lastSavedAt ? (
            <>
              <Icon name="check" size={14} /> Saved on device
            </>
          ) : (
            "Draft"
          )}
        </span>
      </div>

      <div
        className="flow-progress"
        role="progressbar"
        aria-label="Observation progress"
        aria-valuemin={0}
        aria-valuemax={Math.max(steps.length - 1, 1)}
        aria-valuenow={stepIndex}
      >
        <span
          style={{
            width: `${(stepIndex / Math.max(steps.length - 1, 1)) * 100}%`,
          }}
        />
      </div>

      <div className="flow-body">
        {locationNotice && locationFields.length > 0 && (
          <p className="background-status" role="status">
            <Icon name="location" size={15} /> {locationNotice}
          </p>
        )}
        {locationError && locationFields[0] && (
          <p className="background-status background-status-error" role="alert">
            <Icon name="location" size={15} /> {locationError}
            <button
              type="button"
              className="text-button background-status-action"
              onClick={() => void captureLocation()}
            >
              Try again
            </button>
          </p>
        )}
        <form
          className="flow-step"
          key={stepIndex}
          onSubmit={(event) => {
            event.preventDefault();
            goNext();
          }}
        >
          {current.kind === "heading" ? (
            <div className="step-heading-screen">
              <span className="step-kicker">Section</span>
              <h1 className="step-title">{current.field.label}</h1>
              {current.field.description && (
                <p className="step-description">{current.field.description}</p>
              )}
            </div>
          ) : (
            <div className="step-question">
              <div className="step-label-row">
                <h1 className="step-title">{current.field.label}</h1>
                <span
                  className={`step-required ${current.field.required ? "" : "step-optional"}`}
                >
                  {current.field.required ? "Required" : "Optional"}
                </span>
              </div>
              {current.field.description && (
                <p className="step-description">{current.field.description}</p>
              )}
              {errorText && (
                <p className="field-help-error" role="alert">
                  {errorText}
                </p>
              )}
              <div id={`step-${current.field.key}`} className="step-control">
                <FieldRenderer
                  field={current.field}
                  value={
                    activeMediaAssets.length
                      ? activeMediaAssets
                      : draft[current.field.key]
                  }
                  mediaAssets={activeMediaAssets}
                  photoNames={activeMediaAssets.map((asset) => asset.name)}
                  onRemoveMedia={(index) =>
                    removeMedia(current.field.key, index)
                  }
                  onChange={(value) => handleChange(current.field.key, value)}
                  onCaptureLocation={captureLocation}
                  onAddPhoto={() => {
                    setActiveMediaField(current.field.key);
                    window.setTimeout(() => fileInputRef.current?.click(), 0);
                  }}
                  locationError={
                    current.field.type === "location" ? locationError : null
                  }
                  locationNotice={
                    current.field.type === "location" ? locationNotice : null
                  }
                  required={current.field.required}
                  invalid={Boolean(errorText)}
                  autoFocus={
                    Boolean(current.field.required) ||
                    ["single_choice", "tri_state", "multiple_choice"].includes(
                      current.field.type,
                    )
                  }
                />
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="flow-actions">
        <button type="button" className="flow-back" onClick={goBack}>
          <Icon name="chevron-left" size={17} /> Back
        </button>
        <Button
          variant="primary"
          className="flow-continue"
          onClick={goNext}
          disabled={!canContinue() || isSaving || capturingLocation}
          busy={(isSaving || capturingLocation) && isLastStep}
        >
          {primaryLabel}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept={
          project.fields.find((field) => field.key === activeMediaField)
            ?.type === "audio"
            ? "audio/*"
            : "image/*"
        }
        multiple={
          Boolean(
            project.fields.find((field) => field.key === activeMediaField)
              ?.config?.multiple,
          ) ||
          Number(
            project.fields.find((field) => field.key === activeMediaField)
              ?.config?.maxCount ?? 1,
          ) > 1
        }
        onChange={handleMediaChange}
      />
    </main>
  );
}
