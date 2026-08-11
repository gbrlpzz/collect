import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import type { FieldDefinition, LocationValue, MediaAsset } from "../types";
import { Icon } from "./Icon";
import { Button, SegmentedControl } from "./Primitives";

interface FieldRendererProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  onCaptureLocation: () => void;
  onAddPhoto: () => void;
  /** Kept for the small, string-only renderer API used by older callers. */
  photoNames?: string[];
  mediaAssets?: MediaAsset[];
  onRemoveMedia?: (index: number) => void;
  locationError?: string | null;
}

function MediaTile({
  asset,
  index,
  type,
  onRemove,
}: {
  asset: MediaAsset;
  index: number;
  type: "photo" | "audio";
  onRemove?: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (type !== "photo" || !asset.blob || !asset.mimeType.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(asset.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [asset.blob, asset.mimeType, type]);

  return (
    <div className="media-tile">
      {previewUrl ? (
        <img src={previewUrl} alt={asset.name || `Photo ${index + 1}`} />
      ) : (
        <span className="media-tile-icon"><Icon name={type === "audio" ? "mic" : "camera"} size={22} /></span>
      )}
      <span className="media-tile-index">{index + 1}</span>
      {onRemove && (
        <button type="button" className="media-remove" onClick={onRemove} aria-label={`Remove ${type} ${index + 1}`}>
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}

export function FieldRenderer({
  field,
  value,
  onChange,
  onCaptureLocation,
  onAddPhoto,
  photoNames = [],
  mediaAssets,
  onRemoveMedia,
  locationError,
}: FieldRendererProps) {
  const stringValue = typeof value === "string" ? value : "";

  if (field.type === "short_text") {
    return (
      <input
        className="field-input"
        id={field.key}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        placeholder={String(field.config?.placeholder ?? "")}
        maxLength={Number(field.config?.maxLength ?? 1000)}
        autoComplete="off"
        autoCapitalize="sentences"
        enterKeyHint="next"
      />
    );
  }

  if (field.type === "long_text") {
    return (
      <textarea
        className="field-input field-textarea"
        id={field.key}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        maxLength={Number(field.config?.maxLength ?? 5000)}
        placeholder="Write what you observed…"
        rows={4}
        autoCapitalize="sentences"
        enterKeyHint="enter"
      />
    );
  }

  if (field.type === "number") {
    const numberValue = value && typeof value === "object" && "value" in value ? (value as { value?: unknown }).value : value;
    return (
      <div className="number-input-wrap">
        <input
          className="field-input"
          id={field.key}
          type="number"
          value={typeof numberValue === "number" && !Number.isNaN(numberValue) ? String(numberValue) : typeof numberValue === "string" ? numberValue : ""}
          onChange={(event) => {
            const raw = event.target.value;
            const parsed = Number(raw);
            onChange(raw === "" ? "" : { value: Number.isFinite(parsed) ? parsed : raw, unit: field.config?.unit ? String(field.config.unit) : null });
          }}
          min={field.config?.min === undefined ? undefined : Number(field.config.min)}
          max={field.config?.max === undefined ? undefined : Number(field.config.max)}
          step={field.config?.integer ? 1 : "any"}
          inputMode={field.config?.integer ? "numeric" : "decimal"}
          enterKeyHint="next"
        />
        {field.config?.unit && <span>{String(field.config.unit)}</span>}
      </div>
    );
  }

  if (field.type === "single_choice") {
    const otherOption = field.options?.find((option) => option.value === "other" || option.id.endsWith("-other"));
    const storedValue = value && typeof value === "object" && "value" in value ? (value as { value?: unknown }).value : value;
    const storedOtherText = value && typeof value === "object" && "otherText" in value ? String((value as { otherText?: unknown }).otherText ?? "") : "";
    const isOther = storedValue === "other" || (otherOption !== undefined && storedValue === otherOption.id);
    return (
      <div className="choice-grid" role="group" aria-label={field.label}>
        {field.options?.map((option) => {
          const selected = option.id === storedValue || (option.value === "other" && isOther);
          return (
            <button
              type="button"
              key={option.id}
              className={`choice-button ${selected ? "choice-selected" : ""}`}
              aria-pressed={selected}
              onClick={() => onChange(option.value === "other" && otherOption ? { value: otherOption.id, otherText: storedOtherText } : option.id)}
            >
              <span>{option.label}</span>
              {selected && <Icon name="check" size={18} />}
            </button>
          );
        })}
        {otherOption && isOther && (
          <div className="other-value-row">
            <label className="field-help-label" htmlFor={`${field.key}-other`}>Specify other</label>
            <input
              id={`${field.key}-other`}
              className="field-input"
              type="text"
              value={storedOtherText}
              placeholder="Describe the other value…"
              maxLength={200}
              autoComplete="off"
              autoCapitalize="sentences"
              enterKeyHint="done"
              onChange={(event) => onChange({ value: otherOption.id, otherText: event.target.value })}
            />
          </div>
        )}
      </div>
    );
  }

  if (field.type === "tri_state") {
    const values = [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "unknown", label: "Unknown" },
    ];
    return <SegmentedControl className="tri-state" options={values} value={typeof value === "string" ? value : undefined} onChange={onChange} label={field.label} />;
  }

  if (field.type === "date") {
    return <input id={field.key} className="field-input" type="date" value={stringValue} onChange={(event) => onChange(event.target.value)} autoComplete="off" />;
  }

  if (field.type === "datetime") {
    const datetime = value && typeof value === "object" ? value as { localDatetime?: string } : {};
    return <input id={field.key} className="field-input" type="datetime-local" value={datetime.localDatetime ?? ""} onChange={(event) => {
      const date = new Date(event.target.value);
      const offsetMinutes = -date.getTimezoneOffset();
      const sign = offsetMinutes >= 0 ? "+" : "-";
      const absoluteMinutes = Math.abs(offsetMinutes);
      const offset = `${sign}${String(Math.floor(absoluteMinutes / 60)).padStart(2, "0")}:${String(absoluteMinutes % 60).padStart(2, "0")}`;
      onChange({ localDatetime: event.target.value, timezoneOffset: offset, utcTimestamp: Number.isNaN(date.getTime()) ? null : date.toISOString() });
    }} autoComplete="off" />;
  }

  if (field.type === "multiple_choice") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="choice-grid" role="group" aria-label={field.label}>
        {field.options?.map((option) => {
          const isSelected = selected.includes(option.id);
          return <button type="button" key={option.id} className={`choice-button ${isSelected ? "choice-selected" : ""}`} aria-pressed={isSelected} onClick={() => onChange(isSelected ? selected.filter((item) => item !== option.id) : [...selected, option.id])}><span>{option.label}</span>{isSelected && <Icon name="check" size={18} />}</button>;
        })}
      </div>
    );
  }

  if (field.type === "location") {
    const location = value as LocationValue | undefined;
    return (
      <>
        <div className={`capture-card ${location ? "capture-complete" : ""}`}>
          <div className="capture-icon"><Icon name="location" size={20} /></div>
          <div className="capture-copy">
            {location ? (
              <>
                <strong>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</strong>
                <span>Accuracy ±{Math.round(location.accuracy)} m · captured just now</span>
              </>
            ) : (
              <>
                <strong>Location not captured</strong>
                <span>Coordinates and accuracy stay with this observation.</span>
              </>
            )}
          </div>
          <Button variant="secondary" onClick={onCaptureLocation}>{location ? "Recapture" : "Capture"}</Button>
        </div>
        {locationError && <p className="field-help-error" role="alert">{locationError}</p>}
      </>
    );
  }

  if (field.type === "photo" || field.type === "audio") {
    const assets = mediaAssets ?? photoNames.map((name, index) => ({ id: `${field.key}-${index}`, name, mimeType: field.type === "photo" ? "image/*" : "audio/*", byteSize: 0, fieldId: field.key }));
    const maxCount = Number(field.config?.maxCount ?? 5);
    return (
      <div className="media-field">
        <div className="photo-strip">
          {assets.map((asset, index) => <MediaTile key={`${asset.id}-${index}`} asset={asset} index={index} type={field.type as "photo" | "audio"} onRemove={onRemoveMedia ? () => onRemoveMedia(index) : undefined} />)}
          {assets.length < maxCount && <button type="button" className="add-media" onClick={onAddPhoto} aria-label={field.type === "audio" ? "Add audio" : "Add a photo"}>
            <Icon name={field.type === "audio" ? "mic" : "camera"} size={22} />
            <span>{field.type === "audio" ? "Record" : "Add"}</span>
          </button>}
        </div>
        <div className="media-caption">
          <span>{assets.length ? `${assets.length} original${assets.length > 1 ? "s" : ""} stored on this device` : field.type === "audio" ? "No audio added yet" : "No photos added yet"}</span>
          <span>{assets.length} / {maxCount}</span>
        </div>
      </div>
    );
  }

  if (field.type === "repeatable_group") {
    const rows = Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
    return (
      <div className="repeatable-group">
        {rows.map((row, rowIndex) => (
          <div className="repeatable-row" key={rowIndex}>
            <div className="repeatable-row-heading"><strong>{field.label} {rowIndex + 1}</strong><button type="button" className="text-button" onClick={() => onChange(rows.filter((_, index) => index !== rowIndex))}>Remove</button></div>
            {field.children?.map((child) => <div className="repeatable-child" key={child.id}><label htmlFor={`${field.key}-${rowIndex}-${child.key}`}>{child.label}</label><FieldRenderer field={{ ...child, key: `${field.key}-${rowIndex}-${child.key}` }} value={row[child.key]} onChange={(childValue) => onChange(rows.map((current, index) => index === rowIndex ? { ...current, [child.key]: childValue } : current))} onCaptureLocation={onCaptureLocation} onAddPhoto={onAddPhoto} photoNames={[]} mediaAssets={[]} locationError={locationError} /></div>)}
          </div>
        ))}
        <Button variant="secondary" icon="plus" onClick={() => onChange([...rows, {}])}>Add {field.label.toLowerCase()}</Button>
      </div>
    );
  }

  return null;
}

export function readPhotoNames(event: ChangeEvent<HTMLInputElement>): string[] {
  return Array.from(event.target.files ?? []).map((file) => file.name);
}
