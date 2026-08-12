import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { FieldDefinition, MediaAsset, Project } from "../types";
import { Icon } from "./Icon";
import { Button } from "./Primitives";
import { FieldRenderer } from "./FieldRenderer";

interface CollectorProps {
  project: Project;
  draft: Record<string, unknown>;
  lastSavedAt: string | null;
  onDraftChange: (key: string, value: unknown) => void;
  onSubmit: (values: Record<string, unknown>, media: MediaAsset[]) => void | Promise<void>;
  onBack: () => void;
  isSaving: boolean;
  /** Admin preview: the flow is fully interactive but nothing is persisted. */
  preview?: boolean;
}

type Step =
  | { kind: "heading"; field: FieldDefinition }
  | { kind: "field"; field: FieldDefinition };

function isAutoAdvanceType(type: FieldDefinition["type"]): boolean {
  return type === "single_choice" || type === "tri_state";
}

/**
 * The collection surface is a guided flow: one question per screen, no page
 * movement, capsule geometry, and a single primary action. This is the
 * pattern Apple uses for setup and checkout flows — it reduces cognitive
 * load, keeps the page static, and makes the next action obvious.
 */
export function Collector({ project, draft, lastSavedAt, onDraftChange, onSubmit, onBack, isSaving, preview = false }: CollectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [mediaByField, setMediaByField] = useState<Record<string, MediaAsset[]>>(() => project.fields.reduce<Record<string, MediaAsset[]>>((result, field) => {
    if (field.type !== "photo" && field.type !== "audio") return result;
    const value = draft[field.key];
    result[field.key] = Array.isArray(value) ? value.filter((asset): asset is MediaAsset => typeof asset === "object" && asset !== null && "id" in asset && "name" in asset) as MediaAsset[] : [];
    return result;
  }, {}));
  const [activeMediaField, setActiveMediaField] = useState("site_photos");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const steps = useMemo<Step[]>(() => project.fields.map((field) => field.type === "heading" ? { kind: "heading", field } : { kind: "field", field }), [project.fields]);
  const current = steps[Math.min(stepIndex, steps.length - 1)];
  const allMediaAssets = useMemo(() => Object.values(mediaByField).flat(), [mediaByField]);
  const isLastStep = stepIndex === steps.length - 1;

  const hasValue = (value: unknown) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "number" && !Number.isFinite(value)) return false;
    if (value && typeof value === "object" && "localDatetime" in value) return Boolean((value as { localDatetime?: string }).localDatetime);
    if (value && typeof value === "object" && "value" in value) {
      const nestedValue = (value as { value?: unknown }).value;
      return nestedValue !== undefined && nestedValue !== "" && !(typeof nestedValue === "number" && !Number.isFinite(nestedValue));
    }
    return value !== undefined && value !== null && value !== "";
  };

  const fieldConfigError = (field: FieldDefinition): string | null => {
    const value = draft[field.key];
    const config = field.config ?? {};
    if (field.type === "short_text" || field.type === "long_text") {
      if (typeof value === "string" && config.minLength !== undefined && value.length < Number(config.minLength)) return `Enter at least ${config.minLength} characters.`;
      return null;
    }
    if (field.type === "number") {
      const rawNumber = value && typeof value === "object" && "value" in value ? (value as { value?: unknown }).value : value;
      if (rawNumber === undefined || rawNumber === null || rawNumber === "") return null;
      const numberValue = typeof rawNumber === "number" ? rawNumber : Number(rawNumber);
      if (!Number.isFinite(numberValue)) return "Enter a valid number.";
      if (config.integer && !Number.isInteger(numberValue)) return "Enter a whole number.";
      if (config.min !== undefined && numberValue < Number(config.min)) return `Minimum is ${config.min}.`;
      if (config.max !== undefined && numberValue > Number(config.max)) return `Maximum is ${config.max}.`;
      return null;
    }
    if (field.type === "photo" || field.type === "audio") {
      const count = (mediaByField[field.key] ?? []).length;
      if (config.minCount !== undefined && count < Number(config.minCount)) return `Add at least ${config.minCount} ${field.type === "photo" ? "photos" : "recordings"}.`;
      return null;
    }
    return null;
  };

  const stepError = (field: FieldDefinition): string | null => {
    if (field.required) {
      if (field.type === "photo" || field.type === "audio") {
        if ((mediaByField[field.key] ?? []).length === 0) return "This is required.";
      } else if (!hasValue(draft[field.key])) {
        return "This is required.";
      }
    }
    return fieldConfigError(field);
  };

  const canContinue = (): boolean => {
    if (current.kind === "heading") return true;
    const field = current.field;
    if (field.type === "photo" || field.type === "audio") return !field.required || (mediaByField[field.key] ?? []).length > 0;
    return !field.required || hasValue(draft[field.key]);
  };

  const focusCurrentControl = () => {
    const key = current.kind === "field" ? current.field.key : null;
    if (!key) return;
    const container = document.getElementById(`step-${key}`);
    window.setTimeout(() => {
      container?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
    }, 60);
  };

  const goNext = () => {
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
      const mediaValues = Object.fromEntries(project.fields.filter((field) => field.type === "photo" || field.type === "audio").map((field) => [field.key, (mediaByField[field.key] ?? []).map((asset) => asset.id)]));
      void onSubmit({ ...draft, ...mediaValues }, allMediaAssets);
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
      const otherOption = field.options?.find((option) => option.value === "other" || option.id.endsWith("-other"));
      const isOther = value && typeof value === "object" && "value" in value
        ? (value as { value?: unknown }).value === otherOption?.id || (value as { value?: unknown }).value === "other"
        : value === otherOption?.id || value === "other";
      if (isOther) return;
    }
    const fromStep = stepIndex;
    window.setTimeout(() => {
      setStepIndex((index) => (index === fromStep ? Math.min(index + 1, steps.length - 1) : index));
    }, 220);
  };

  const captureLocation = (fieldKey: string) => {
    const saveLocation = (coords: GeolocationCoordinates) => {
      onDraftChange(fieldKey, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        capturedAt: new Date().toISOString(),
        altitude: coords.altitude,
        altitudeAccuracy: coords.altitudeAccuracy,
        heading: coords.heading,
      });
      setLocationError(null);
      setErrorText(null);
    };
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => saveLocation(position.coords),
        () => setLocationError("Location access was unavailable. Enable location services or try again."),
        { enableHighAccuracy: true, timeout: 5000 },
      );
    } else {
      setLocationError("This browser cannot provide location data. The required field remains unsaved.");
    }
  };

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const field = project.fields.find((candidate) => candidate.key === activeMediaField);
    if (!field) return;
    const assets = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      byteSize: file.size,
      fieldId: activeMediaField,
      capturedAt: new Date().toISOString(),
      captureSource: "picker",
      blob: file,
    } satisfies MediaAsset));
    const maxCount = Number(field.config?.maxCount ?? 5);
    const nextAssets = [...(mediaByField[activeMediaField] ?? []), ...assets].slice(0, maxCount);
    setMediaByField((current) => ({ ...current, [activeMediaField]: nextAssets }));
    onDraftChange(activeMediaField, nextAssets);
    setErrorText(null);
    event.target.value = "";
  };

  const removeMedia = (fieldKey: string, index: number) => {
    const nextAssets = (mediaByField[fieldKey] ?? []).filter((_, currentIndex) => currentIndex !== index);
    setMediaByField((current) => ({ ...current, [fieldKey]: nextAssets }));
    onDraftChange(fieldKey, nextAssets);
  };

  const activeField = current.kind === "field" ? current.field : null;
  const activeMediaAssets = activeField && (activeField.type === "photo" || activeField.type === "audio") ? (mediaByField[activeField.key] ?? []) : [];
  const primaryLabel = isLastStep
    ? preview ? "Finish preview" : isSaving ? "Saving…" : "Save observation"
    : current.kind === "heading" ? "Continue" : "Continue";

  return (
    <main className="collector-page collector-flow">
      <div className="collector-topbar">
        <button className="back-button" onClick={goBack} aria-label="Back"><Icon name="chevron-left" size={17} /> {stepIndex === 0 ? "Project" : "Back"}</button>
        <div className="collector-title">
          <strong>New observation</strong>
          <span>{project.name}</span>
        </div>
        <span className="collector-save-state" aria-live="polite">{lastSavedAt ? <><Icon name="check" size={14} /> Saved on device</> : "Draft"}</span>
      </div>

      <div className="flow-progress" role="progressbar" aria-label="Observation progress" aria-valuemin={0} aria-valuemax={Math.max(steps.length - 1, 1)} aria-valuenow={stepIndex}>
        <span style={{ width: `${(stepIndex / Math.max(steps.length - 1, 1)) * 100}%` }} />
      </div>

      <div className="flow-body">
        <form className="flow-step" key={stepIndex} onSubmit={(event) => { event.preventDefault(); goNext(); }}>
          {current.kind === "heading" ? (
            <div className="step-heading-screen">
              <span className="step-kicker">Section</span>
              <h1 className="step-title">{current.field.label}</h1>
              {current.field.description && <p className="step-description">{current.field.description}</p>}
            </div>
          ) : (
            <div className="step-question">
              <div className="step-label-row">
                <h1 className="step-title">{current.field.label}</h1>
                <span className={`step-required ${current.field.required ? "" : "step-optional"}`}>{current.field.required ? "Required" : "Optional"}</span>
              </div>
              {current.field.description && <p className="step-description">{current.field.description}</p>}
              {errorText && <p className="field-help-error" role="alert">{errorText}</p>}
              <div id={`step-${current.field.key}`} className="step-control">
                <FieldRenderer
                  field={current.field}
                  value={activeMediaAssets.length ? activeMediaAssets : draft[current.field.key]}
                  mediaAssets={activeMediaAssets}
                  photoNames={activeMediaAssets.map((asset) => asset.name)}
                  onRemoveMedia={(index) => removeMedia(current.field.key, index)}
                  onChange={(value) => handleChange(current.field.key, value)}
                  onCaptureLocation={() => captureLocation(current.field.key)}
                  onAddPhoto={() => { setActiveMediaField(current.field.key); window.setTimeout(() => fileInputRef.current?.click(), 0); }}
                  locationError={current.field.type === "location" ? locationError : null}
                  required={current.field.required}
                  invalid={Boolean(errorText)}
                  autoFocus={["short_text", "long_text", "number", "date", "datetime"].includes(current.field.type)}
                />
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="flow-actions">
        <button type="button" className="flow-back" onClick={goBack}><Icon name="chevron-left" size={17} /> Back</button>
        <Button variant="primary" className="flow-continue" onClick={goNext} disabled={!canContinue() || isSaving} busy={isSaving && isLastStep}>{primaryLabel}</Button>
      </div>

      <input ref={fileInputRef} className="visually-hidden" type="file" accept={project.fields.find((field) => field.key === activeMediaField)?.type === "audio" ? "audio/*" : "image/*"} multiple={Boolean(project.fields.find((field) => field.key === activeMediaField)?.config?.multiple) || Number(project.fields.find((field) => field.key === activeMediaField)?.config?.maxCount ?? 1) > 1} onChange={handleMediaChange} />
    </main>
  );
}
