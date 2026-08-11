import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { FieldDefinition, MediaAsset, Project } from "../types";
import { Icon } from "./Icon";
import { Button, Eyebrow } from "./Primitives";
import { FieldRenderer } from "./FieldRenderer";

interface CollectorProps {
  project: Project;
  draft: Record<string, unknown>;
  lastSavedAt: string | null;
  onDraftChange: (key: string, value: unknown) => void;
  onSubmit: (values: Record<string, unknown>, media: MediaAsset[]) => void | Promise<void>;
  onBack: () => void;
  isSaving: boolean;
}

type FieldGroup = { heading?: FieldDefinition; fields: FieldDefinition[] };

function groupFields(fields: FieldDefinition[]): FieldGroup[] {
  const groups: FieldGroup[] = [];
  let current: FieldGroup = { fields: [] };
  for (const field of fields) {
    if (field.type === "heading") {
      if (current.fields.length || current.heading) groups.push(current);
      current = { heading: field, fields: [] };
    } else {
      current.fields.push(field);
    }
  }
  if (current.fields.length || current.heading) groups.push(current);
  return groups;
}

export function Collector({ project, draft, lastSavedAt, onDraftChange, onSubmit, onBack, isSaving }: CollectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaByField, setMediaByField] = useState<Record<string, MediaAsset[]>>(() => project.fields.reduce<Record<string, MediaAsset[]>>((result, field) => {
    if (field.type !== "photo" && field.type !== "audio") return result;
    const value = draft[field.key];
    result[field.key] = Array.isArray(value) ? value.filter((asset): asset is MediaAsset => typeof asset === "object" && asset !== null && "id" in asset && "name" in asset) as MediaAsset[] : [];
    return result;
  }, {}));
  const [activeMediaField, setActiveMediaField] = useState("site_photos");
  const [locationError, setLocationError] = useState<string | null>(null);
  const allMediaAssets = useMemo(() => Object.values(mediaByField).flat(), [mediaByField]);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const fields = useMemo(() => project.fields.filter((field) => field.type !== "heading"), [project.fields]);
  const groups = useMemo(() => groupFields(project.fields), [project.fields]);
  const requiredFields = fields.filter((field) => field.required);
  const hasValue = (value: unknown) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object" && "localDatetime" in value) return Boolean((value as { localDatetime?: string }).localDatetime);
    if (value && typeof value === "object" && "value" in value) return (value as { value?: unknown }).value !== undefined && (value as { value?: unknown }).value !== "";
    return value !== undefined && value !== null && value !== "";
  };
  const completedRequired = requiredFields.filter((field) => {
    if (field.type === "photo" || field.type === "audio") return (mediaByField[field.key] ?? []).length > 0;
    return hasValue(draft[field.key]);
  }).length;
  const progress = Math.round((completedRequired / Math.max(requiredFields.length, 1)) * 100);

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
      setErrorKey(null);
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
    setErrorKey(null);
    setErrorText(null);
    event.target.value = "";
  };

  const removeMedia = (fieldKey: string, index: number) => {
    const nextAssets = (mediaByField[fieldKey] ?? []).filter((_, currentIndex) => currentIndex !== index);
    setMediaByField((current) => ({ ...current, [fieldKey]: nextAssets }));
    onDraftChange(fieldKey, nextAssets);
  };

  const fieldConfigError = (field: typeof fields[number]): string | null => {
    const value = draft[field.key];
    const config = field.config ?? {};
    if (field.type === "short_text" || field.type === "long_text") {
      if (typeof value === "string" && config.minLength !== undefined && value.length < Number(config.minLength)) return `Enter at least ${config.minLength} characters.`;
      return null;
    }
    if (field.type === "number") {
      if (value && typeof value === "object" && "value" in value) {
        const numberValue = Number((value as { value?: unknown }).value);
        if (!Number.isNaN(numberValue)) {
          if (config.min !== undefined && numberValue < Number(config.min)) return `Minimum is ${config.min}.`;
          if (config.max !== undefined && numberValue > Number(config.max)) return `Maximum is ${config.max}.`;
        }
      }
      return null;
    }
    if (field.type === "photo" || field.type === "audio") {
      const count = (mediaByField[field.key] ?? []).length;
      if (config.minCount !== undefined && count < Number(config.minCount)) return `Add at least ${config.minCount} ${field.type === "photo" ? "photos" : "recordings"}.`;
      return null;
    }
    return null;
  };

  const focusField = (key: string) => {
    const section = document.getElementById(`field-${key}`);
    section?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      const target = section?.querySelector<HTMLElement>("input, textarea, select, button");
      target?.focus();
    }, 120);
  };

  const handleSubmit = () => {
    const missing = requiredFields.find((field) => {
      if (field.type === "photo" || field.type === "audio") return (mediaByField[field.key] ?? []).length === 0;
      return !hasValue(draft[field.key]);
    });
    if (missing) {
      setErrorKey(missing.key);
      setErrorText(null);
      focusField(missing.key);
      return;
    }
    const invalid = fields.map((field) => ({ field, error: fieldConfigError(field) })).find((entry) => entry.error);
    if (invalid) {
      setErrorKey(invalid.field.key);
      setErrorText(invalid.error);
      focusField(invalid.field.key);
      return;
    }
    const mediaValues = Object.fromEntries(project.fields.filter((field) => field.type === "photo" || field.type === "audio").map((field) => [field.key, (mediaByField[field.key] ?? []).map((asset) => asset.id)]));
    void onSubmit({ ...draft, ...mediaValues }, allMediaAssets);
  };

  return (
    <main className="collector-page">
      <div className="collector-topbar">
        <button className="back-button" onClick={onBack} aria-label="Back to project"><Icon name="arrow-left" size={17} /> Project</button>
        <div className="collector-title">
          <strong>New observation</strong>
          <span>{project.name}</span>
        </div>
        <span className="collector-save-state" aria-live="polite">{lastSavedAt ? <><Icon name="check" size={14} /> Saved on device</> : "Draft"}</span>
      </div>

      <div className="collector-progress-row">
        <div className="collector-progress-copy"><span className="collector-progress-title">Required fields</span><span>{completedRequired} of {requiredFields.length}</span></div>
        <span className="collector-progress-number">{progress}%</span>
      </div>
      <div className="progress-track" role="progressbar" aria-label="Required fields completed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${Math.max(progress, requiredFields.length ? 4 : 0)}%` }} /></div>

      <div className="collector-surface">
        <div className="collector-fields">
          {groups.map((group, groupIndex) => (
            <section className="collector-group" key={group.heading?.id ?? `group-${groupIndex}`} aria-labelledby={group.heading ? `group-heading-${group.heading.key}` : undefined}>
              {group.heading && <header className="field-section-heading" id={`group-heading-${group.heading.key}`}><div><Eyebrow>{group.heading.label}</Eyebrow>{group.heading.description && <p>{group.heading.description}</p>}</div></header>}
              <div className="collector-group-body">
                {group.fields.map((field) => {
                  const isError = errorKey === field.key;
                  const fieldMediaAssets = field.type === "photo" || field.type === "audio" ? (mediaByField[field.key] ?? []) : [];
                  return (
                    <section className={`collector-field ${isError ? "field-error" : ""}`} id={`field-${field.key}`} aria-labelledby={`field-label-${field.key}`} key={field.id}>
                      <div className="field-label-row">
                        <label id={`field-label-${field.key}`} htmlFor={["short_text", "long_text", "number", "date", "datetime"].includes(field.type) ? field.key : undefined}>
                          {field.label}{field.required && <span className="required-mark">Required</span>}
                        </label>
                        {isError && <span className="field-error-copy" role="alert">{errorText ?? "Complete this field"}</span>}
                      </div>
                      {field.description && <p className="field-description">{field.description}</p>}
                      <FieldRenderer
                        field={field}
                        value={fieldMediaAssets.length ? fieldMediaAssets : draft[field.key]}
                        mediaAssets={fieldMediaAssets}
                        photoNames={fieldMediaAssets.map((asset) => asset.name)}
                        onRemoveMedia={(index) => removeMedia(field.key, index)}
                        onChange={(value) => { onDraftChange(field.key, value); setErrorKey(null); setErrorText(null); }}
                        onCaptureLocation={() => captureLocation(field.key)}
                        onAddPhoto={() => { setActiveMediaField(field.key); window.setTimeout(() => fileInputRef.current?.click(), 0); }}
                        locationError={field.type === "location" ? locationError : null}
                      />
                    </section>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <input ref={fileInputRef} className="visually-hidden" type="file" accept={project.fields.find((field) => field.key === activeMediaField)?.type === "audio" ? "audio/*" : "image/*"} multiple={Boolean(project.fields.find((field) => field.key === activeMediaField)?.config?.multiple) || Number(project.fields.find((field) => field.key === activeMediaField)?.config?.maxCount ?? 1) > 1} onChange={handleMediaChange} />

        <div className="collector-receipt-note"><Icon name="check" size={15} /><span>Your draft saves automatically on this device.</span></div>
      </div>
      <div className="collector-action-bar"><Button variant="primary" fullWidth iconAfter="arrow-right" onClick={handleSubmit} disabled={isSaving}>{isSaving ? "Saving…" : "Save observation"}</Button></div>
    </main>
  );
}
