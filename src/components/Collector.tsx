import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { MediaAsset, Project } from "../types";
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
  const fields = useMemo(() => project.fields.filter((field) => field.type !== "heading"), [project.fields]);
  const requiredFields = fields.filter((field) => field.required);
  const hasValue = (value: unknown) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object" && "localDatetime" in value) return Boolean((value as { localDatetime?: string }).localDatetime);
    return value !== undefined && value !== null && value !== "";
  };
  const completedRequired = requiredFields.filter((field) => {
    if (field.type === "photo" || field.type === "audio") return (mediaByField[field.key] ?? []).length > 0;
    const value = draft[field.key];
    return hasValue(value);
  }).length;
  const progress = Math.round((completedRequired / Math.max(requiredFields.length, 1)) * 100);

  const captureLocation = () => {
    const saveLocation = (coords: GeolocationCoordinates) => {
      onDraftChange("location", {
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
      blob: file,
    } satisfies MediaAsset));
    const maxCount = Number(field.config?.maxCount ?? 5);
    const nextAssets = [...(mediaByField[activeMediaField] ?? []), ...assets].slice(0, maxCount);
    setMediaByField((current) => ({ ...current, [activeMediaField]: nextAssets }));
    onDraftChange(activeMediaField, nextAssets);
    setErrorKey(null);
    event.target.value = "";
  };

  const handleSubmit = () => {
    const missing = requiredFields.find((field) => {
      if (field.type === "photo" || field.type === "audio") return (mediaByField[field.key] ?? []).length === 0;
      const value = draft[field.key];
      return !hasValue(value);
    });
    if (missing) {
      setErrorKey(missing.key);
      document.getElementById(`field-${missing.key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const mediaValues = Object.fromEntries(project.fields.filter((field) => field.type === "photo" || field.type === "audio").map((field) => [field.key, (mediaByField[field.key] ?? []).map((asset) => asset.id)]));
    void onSubmit({ ...draft, ...mediaValues }, allMediaAssets);
  };

  return (
    <main className="collector-page">
      <div className="collector-topbar">
        <button className="back-button" onClick={onBack}><Icon name="arrow-left" size={17} /> Project</button>
        <div className="collector-title">
          <strong>Observation</strong>
          <span>{project.name}</span>
        </div>
        <span className="collector-save-state">{lastSavedAt ? "Saved locally" : ""}</span>
      </div>

      <div className="collector-progress-row">
        <div className="collector-progress-copy"><span>{completedRequired} of {requiredFields.length} required</span></div>
        <span className="collector-progress-number">{progress}%</span>
      </div>
      <div className="progress-track"><span style={{ width: `${Math.max(progress, 4)}%` }} /></div>

      <div className="collector-surface">
        <div className="collector-fields">
          {project.fields.map((field) => {
            if (field.type === "heading") {
              return (
                <div className="field-section-heading" key={field.id}>
                  <div className="section-rule" />
                  <div><Eyebrow>{field.label}</Eyebrow><p>{field.description}</p></div>
                </div>
              );
            }
            const isError = errorKey === field.key;
            const fieldMediaNames = field.type === "photo" || field.type === "audio" ? (mediaByField[field.key] ?? []).map((asset) => asset.name) : [];
            return (
              <section className={`collector-field ${isError ? "field-error" : ""}`} id={`field-${field.key}`} key={field.id}>
                <div className="field-label-row">
                  <label htmlFor={field.type === "short_text" || field.type === "number" || field.type === "date" ? field.key : undefined}>
                    {field.label}{field.required && <span className="required-mark">Required</span>}
                  </label>
                  {isError && <span className="field-error-copy">Complete this field</span>}
                </div>
                {field.description && <p className="field-description">{field.description}</p>}
                <FieldRenderer
                  field={field}
                  value={field.type === "photo" || field.type === "audio" ? fieldMediaNames : draft[field.key]}
                  photoNames={fieldMediaNames}
                  onChange={(value) => { onDraftChange(field.key, value); setErrorKey(null); }}
                  onCaptureLocation={captureLocation}
                  onAddPhoto={() => { setActiveMediaField(field.key); window.setTimeout(() => fileInputRef.current?.click(), 0); }}
                  locationError={field.type === "location" ? locationError : null}
                />
              </section>
            );
          })}
        </div>

        <input ref={fileInputRef} className="visually-hidden" type="file" accept={project.fields.find((field) => field.key === activeMediaField)?.type === "audio" ? "audio/*" : "image/*"} multiple={Boolean(project.fields.find((field) => field.key === activeMediaField)?.config?.multiple) || Number(project.fields.find((field) => field.key === activeMediaField)?.config?.maxCount ?? 1) > 1} onChange={handleMediaChange} />

        <div className="collector-receipt-note"><Icon name="check" size={15} /><span>Changes are saved on this device.</span></div>
      </div>
      <div className="collector-action-bar"><Button variant="primary" fullWidth iconAfter="arrow-right" onClick={handleSubmit} disabled={isSaving}>{isSaving ? "Saving…" : "Save observation"}</Button></div>
    </main>
  );
}
