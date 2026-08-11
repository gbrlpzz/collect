import type { ChangeEvent } from "react";
import type { FieldDefinition, LocationValue } from "../types";
import { Icon } from "./Icon";
import { Button } from "./Primitives";

interface FieldRendererProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  onCaptureLocation: () => void;
  onAddPhoto: () => void;
  photoNames: string[];
  locationError?: string | null;
}

export function FieldRenderer({ field, value, onChange, onCaptureLocation, onAddPhoto, photoNames, locationError }: FieldRendererProps) {
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
          value={typeof numberValue === "number" ? String(numberValue) : typeof numberValue === "string" ? numberValue : ""}
          onChange={(event) => {
            const raw = event.target.value;
            onChange(raw === "" ? "" : { value: Number(raw), unit: field.config?.unit ? String(field.config.unit) : null });
          }}
          min={field.config?.min === undefined ? undefined : Number(field.config.min)}
          max={field.config?.max === undefined ? undefined : Number(field.config.max)}
          step={field.config?.integer ? 1 : "any"}
          inputMode="numeric"
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
      <div className="choice-grid">
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
              {selected && <Icon name="check" size={16} />}
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
              onChange={(event) => onChange({ value: otherOption.id, otherText: event.target.value })}
            />
          </div>
        )}
      </div>
    );
  }

  if (field.type === "tri_state") {
    const values = [
      ["yes", "Yes"],
      ["no", "No"],
      ["unknown", "Unknown"],
    ];
    return (
      <div className="tri-state" role="group" aria-label={field.label}>
        {values.map(([key, label]) => (
          <button type="button" key={key} className={value === key ? "tri-selected" : ""} aria-pressed={value === key} onClick={() => onChange(key)}>
            {label}
          </button>
        ))}
      </div>
    );
  }

  if (field.type === "date") {
    return <input id={field.key} className="field-input" type="date" value={stringValue} onChange={(event) => onChange(event.target.value)} />;
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
    }} />;
  }

  if (field.type === "multiple_choice") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="choice-grid">
        {field.options?.map((option) => {
          const isSelected = selected.includes(option.id);
          return <button type="button" key={option.id} className={`choice-button ${isSelected ? "choice-selected" : ""}`} aria-pressed={isSelected} onClick={() => onChange(isSelected ? selected.filter((item) => item !== option.id) : [...selected, option.id])}><span>{option.label}</span>{isSelected && <Icon name="check" size={16} />}</button>;
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
                <span>Coordinates and accuracy are stored with the observation.</span>
              </>
            )}
          </div>
          <Button variant="secondary" onClick={onCaptureLocation}>{location ? "Recapture" : "Capture location"}</Button>
        </div>
        {locationError && <p className="field-help-error">{locationError}</p>}
      </>
    );
  }

  if (field.type === "photo" || field.type === "audio") {
    return (
      <div className="media-field">
        <div className="photo-strip">
          {photoNames.map((name, index) => (
            <div className="photo-placeholder" key={`${name}-${index}`}>
              <Icon name={field.type === "audio" ? "mic" : "camera"} size={22} />
              <span>{index + 1}</span>
            </div>
          ))}
          <button type="button" className="add-media" onClick={onAddPhoto} aria-label={field.type === "audio" ? "Add audio" : "Add a photo"}>
            <Icon name={field.type === "audio" ? "mic" : "plus"} size={22} />
          </button>
        </div>
        <div className="media-caption">
          <span>{photoNames.length ? `${photoNames.length} original${photoNames.length > 1 ? "s" : ""} stored locally` : field.type === "audio" ? "No audio added yet" : "No photos added yet"}</span>
          <span>{String(field.config?.maxCount ?? 5)} max</span>
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
            {field.children?.map((child) => <div className="repeatable-child" key={child.id}><label>{child.label}</label><FieldRenderer field={child} value={row[child.key]} onChange={(childValue) => onChange(rows.map((current, index) => index === rowIndex ? { ...current, [child.key]: childValue } : current))} onCaptureLocation={onCaptureLocation} onAddPhoto={onAddPhoto} photoNames={[]} /></div>)}
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
