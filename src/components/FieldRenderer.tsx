import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  isRecord,
  type FieldDefinition,
  type FormDraft,
  type FormValue,
  type LocationValue,
  type MediaAsset,
} from "../types";
import { Icon } from "./Icon";
import { Button, ClearButton, SegmentedControl } from "./ui";

interface FieldRendererProps {
  field: FieldDefinition;
  value?: FormValue;
  onChange: (value: FormValue) => void;
  onCaptureLocation: () => void;
  onAddPhoto: () => void;
  /** Kept for the small, string-only renderer API used by older callers. */
  photoNames?: string[];
  mediaAssets?: MediaAsset[];
  onRemoveMedia?: (index: number) => void;
  locationError?: string | null;
  locationNotice?: string | null;
  required?: boolean;
  describedBy?: string;
  invalid?: boolean;
  autoFocus?: boolean;
}

function MediaTile({
  asset,
  index,
  type,
  fieldLabel,
  onRemove,
}: {
  asset: MediaAsset;
  index: number;
  type: "photo" | "audio";
  fieldLabel: string;
  onRemove?: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (
      type !== "photo" ||
      !asset.blob ||
      !asset.mimeType.startsWith("image/")
    ) {
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
        <span className="media-tile-icon">
          <Icon name={type === "audio" ? "mic" : "camera"} size={22} />
        </span>
      )}
      <span className="media-tile-index">{index + 1}</span>
      {onRemove && (
        <button
          type="button"
          className="media-remove"
          onClick={onRemove}
          aria-label={`Remove ${type} ${index + 1} from ${fieldLabel}`}
        >
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
  locationNotice,
  required = false,
  describedBy,
  invalid = false,
  autoFocus = false,
}: FieldRendererProps) {
  const repeatableFocusRowRef = useRef<number | null>(null);
  const stringValue =
    value !== null &&
    value !== undefined &&
    !Array.isArray(value) &&
    Object(value) !== value
      ? String(value)
      : "";
  const accessibilityProps = {
    "aria-label": field.label,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": invalid || undefined,
    "aria-required": required || undefined,
  };

  if (field.type === "short_text") {
    return (
      <div className="input-with-clear">
        <input
          className="field-input"
          id={field.key}
          required={required}
          {...accessibilityProps}
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={String(field.config?.placeholder ?? "")}
          maxLength={Number(field.config?.maxLength ?? 1000)}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="next"
          autoFocus={autoFocus}
        />
        {stringValue && (
          <ClearButton
            label={`Clear ${field.label}`}
            onClick={() => onChange("")}
          />
        )}
      </div>
    );
  }

  if (field.type === "long_text") {
    return (
      <div className="input-with-clear input-with-clear-textarea">
        <textarea
          className="field-input field-textarea"
          id={field.key}
          required={required}
          {...accessibilityProps}
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          maxLength={Number(field.config?.maxLength ?? 5000)}
          placeholder="Write what you observed…"
          rows={4}
          autoCapitalize="sentences"
          enterKeyHint="enter"
          autoFocus={autoFocus}
        />
        {stringValue && (
          <ClearButton
            label={`Clear ${field.label}`}
            onClick={() => onChange("")}
          />
        )}
      </div>
    );
  }

  if (field.type === "number") {
    // SAFETY: number value may be wrapped in an object with a value property.
    const numberValue =
      isRecord(value) && "value" in value
        ? (value as { value?: unknown }).value
        : value;
    const numericValue = Number.isFinite(numberValue)
      ? Number(numberValue)
      : null;
    const min =
      field.config?.min === undefined ? undefined : Number(field.config.min);
    const max =
      field.config?.max === undefined ? undefined : Number(field.config.max);
    const showStepper = field.config?.integer === true;
    const adjust = (delta: number) => {
      const base = numericValue ?? 0;
      let next = base + delta;
      if (min !== undefined) next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
      onChange({
        value: next,
        unit: field.config?.unit ? String(field.config.unit) : null,
      });
    };
    const displayValue = Number.isFinite(numberValue)
      ? String(numberValue)
      : numberValue !== null &&
          numberValue !== undefined &&
          !Array.isArray(numberValue) &&
          Object(numberValue) !== numberValue
        ? String(numberValue)
        : "";
    return (
      <div className={showStepper ? "number-stepper" : "number-input-wrap"}>
        {showStepper && (
          <button
            type="button"
            className="stepper-button"
            aria-label={`Decrease ${field.label}`}
            onClick={() => adjust(-1)}
            disabled={
              numericValue !== null && min !== undefined && numericValue <= min
            }
          >
            −
          </button>
        )}
        <input
          className="field-input"
          id={field.key}
          type="number"
          required={required}
          {...accessibilityProps}
          value={displayValue}
          onChange={(event) => {
            const raw = event.target.value;
            const parsed = Number(raw);
            onChange(
              raw === ""
                ? ""
                : {
                    value: Number.isFinite(parsed) ? parsed : raw,
                    unit: field.config?.unit ? String(field.config.unit) : null,
                  },
            );
          }}
          min={min}
          max={max}
          step={field.config?.integer ? 1 : "any"}
          inputMode={field.config?.integer ? "numeric" : "decimal"}
          enterKeyHint="next"
          autoFocus={autoFocus}
        />
        {showStepper && (
          <button
            type="button"
            className="stepper-button"
            aria-label={`Increase ${field.label}`}
            onClick={() => adjust(1)}
            disabled={
              numericValue !== null && max !== undefined && numericValue >= max
            }
          >
            +
          </button>
        )}
        {!showStepper && field.config?.unit && (
          <span>{String(field.config.unit)}</span>
        )}
      </div>
    );
  }

  if (field.type === "single_choice") {
    const otherOption = field.options?.find(
      (option) => option.value === "other" || option.id.endsWith("-other"),
    );
    // SAFETY: single choice value may be wrapped in an object with a value property.
    const storedValue =
      isRecord(value) && "value" in value
        ? (value as { value?: unknown }).value
        : value;
    // SAFETY: single choice value may be wrapped in an object with an otherText property.
    const storedOtherText =
      isRecord(value) && "otherText" in value
        ? String((value as { otherText?: unknown }).otherText ?? "")
        : "";
    const isOther =
      storedValue === "other" ||
      (otherOption !== undefined && storedValue === otherOption.id);
    return (
      <div className="choice-grid" role="group" {...accessibilityProps}>
        {field.options?.map((option, index) => {
          const selected =
            option.id === storedValue || (option.value === "other" && isOther);
          return (
            <button
              type="button"
              key={option.id}
              className={`choice-button ${selected ? "choice-selected" : ""}`}
              aria-pressed={selected}
              autoFocus={autoFocus && index === 0}
              onClick={() =>
                onChange(
                  option.value === "other" && otherOption
                    ? { value: otherOption.id, otherText: storedOtherText }
                    : option.id,
                )
              }
            >
              <span>{option.label}</span>
              {selected && <Icon name="check" size={18} />}
            </button>
          );
        })}
        {otherOption && isOther && (
          <div className="other-value-row">
            <label className="field-help-label" htmlFor={`${field.key}-other`}>
              Specify other
            </label>
            <div className="input-with-clear">
              <input
                id={`${field.key}-other`}
                className="field-input"
                type="text"
                required={required}
                {...accessibilityProps}
                value={storedOtherText}
                placeholder="Describe the other value…"
                maxLength={200}
                autoComplete="off"
                autoCapitalize="sentences"
                enterKeyHint="done"
                autoFocus={autoFocus}
                onChange={(event) =>
                  onChange({
                    value: otherOption.id,
                    otherText: event.target.value,
                  })
                }
              />
              {storedOtherText && (
                <ClearButton
                  label="Clear other value"
                  onClick={() =>
                    onChange({ value: otherOption.id, otherText: "" })
                  }
                />
              )}
            </div>
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
    return (
      <SegmentedControl
        className="tri-state"
        options={values}
        value={
          value !== null &&
          value !== undefined &&
          !Array.isArray(value) &&
          Object(value) !== value
            ? String(value)
            : undefined
        }
        onChange={onChange}
        label={field.label}
        describedBy={describedBy}
        required={required}
        invalid={invalid}
        autoFocus={autoFocus}
      />
    );
  }

  if (field.type === "date") {
    return (
      <input
        id={field.key}
        className="field-input"
        type="date"
        required={required}
        {...accessibilityProps}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        autoFocus={autoFocus}
      />
    );
  }

  if (field.type === "datetime") {
    // SAFETY: datetime value is stored as an object with localDatetime string.
    const datetime =
      value && Object(value) === value
        ? (value as { localDatetime?: string })
        : {};
    return (
      <input
        id={field.key}
        className="field-input"
        type="datetime-local"
        required={required}
        {...accessibilityProps}
        value={datetime.localDatetime ?? ""}
        onChange={(event) => {
          const date = new Date(event.target.value);
          const offsetMinutes = -date.getTimezoneOffset();
          const sign = offsetMinutes >= 0 ? "+" : "-";
          const absoluteMinutes = Math.abs(offsetMinutes);
          const offset = `${sign}${String(Math.floor(absoluteMinutes / 60)).padStart(2, "0")}:${String(absoluteMinutes % 60).padStart(2, "0")}`;
          onChange({
            localDatetime: event.target.value,
            timezoneOffset: offset,
            utcTimestamp: Number.isNaN(date.getTime())
              ? null
              : date.toISOString(),
          });
        }}
        autoComplete="off"
        autoFocus={autoFocus}
      />
    );
  }

  if (field.type === "multiple_choice") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="choice-grid" role="group" {...accessibilityProps}>
        {field.options?.map((option, index) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              type="button"
              key={option.id}
              className={`choice-button ${isSelected ? "choice-selected" : ""}`}
              aria-pressed={isSelected}
              autoFocus={autoFocus && index === 0}
              onClick={() =>
                onChange(
                  isSelected
                    ? selected.filter((item) => item !== option.id)
                    : [...selected, option.id],
                )
              }
            >
              <span>{option.label}</span>
              {isSelected && <Icon name="check" size={18} />}
            </button>
          );
        })}
      </div>
    );
  }

  if (field.type === "location") {
    // SAFETY: location value is stored as LocationValue.
    const location = value as LocationValue | undefined;
    const problem = locationError ?? locationNotice;
    return (
      <div
        className={`capture-card ${location ? "capture-complete" : ""}`}
        role="group"
        {...accessibilityProps}
      >
        <div className="capture-icon">
          <Icon name="location" size={20} />
        </div>
        <div className="capture-copy">
          {location ? (
            <>
              <strong>
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </strong>
              <span>
                Accuracy ±{Math.round(location.accuracy)} m · captured
                automatically
              </span>
            </>
          ) : problem ? (
            <>
              <strong>Location not recorded</strong>
              <span>{problem}</span>
            </>
          ) : (
            <>
              <strong>Capturing location…</strong>
              <span>
                Coordinates record automatically with this observation.
              </span>
            </>
          )}
        </div>
        {!location && problem && (
          <Button
            variant="secondary"
            aria-label={`Retry ${field.label}`}
            onClick={onCaptureLocation}
          >
            Try again
          </Button>
        )}
        {location && <Icon name="check" size={20} />}
      </div>
    );
  }

  if (field.type === "photo" || field.type === "audio") {
    const assets =
      mediaAssets ??
      photoNames.map((name, index) => ({
        id: `${field.key}-${index}`,
        name,
        mimeType: field.type === "photo" ? "image/*" : "audio/*",
        byteSize: 0,
        fieldId: field.key,
      }));
    const maxCount = Number(field.config?.maxCount ?? 5);
    return (
      <div className="media-field" role="group" {...accessibilityProps}>
        <div className="photo-strip">
          {assets.map((asset, index) => (
            <MediaTile
              key={`${asset.id}-${index}`}
              asset={asset}
              index={index}
              type={field.type === "audio" ? "audio" : "photo"}
              fieldLabel={field.label}
              onRemove={onRemoveMedia ? () => onRemoveMedia(index) : undefined}
            />
          ))}
          {assets.length < maxCount && (
            <button
              type="button"
              className="add-media"
              onClick={onAddPhoto}
              aria-label={
                field.type === "audio"
                  ? `Add audio for ${field.label}`
                  : `Add a photo for ${field.label}`
              }
            >
              <Icon
                name={field.type === "audio" ? "mic" : "camera"}
                size={22}
              />
              <span>{field.type === "audio" ? "Record" : "Add"}</span>
            </button>
          )}
        </div>
        <div className="media-caption">
          <span>
            {assets.length
              ? `${assets.length} original${assets.length > 1 ? "s" : ""} stored on this device`
              : field.type === "audio"
                ? "No audio added yet"
                : "No photos added yet"}
          </span>
          <span>
            {assets.length} / {maxCount}
          </span>
        </div>
      </div>
    );
  }

  if (field.type === "repeatable_group") {
    // SAFETY: repeatable group rows are stored as an array of FormDraft records.
    const rows = Array.isArray(value) ? (value as FormDraft[]) : [];
    return (
      <div className="repeatable-group" role="group" {...accessibilityProps}>
        {rows.map((row, rowIndex) => (
          <div className="repeatable-row" key={rowIndex}>
            <div className="repeatable-row-heading">
              <strong>
                {field.label} {rowIndex + 1}
              </strong>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  onChange(rows.filter((_, index) => index !== rowIndex))
                }
              >
                Remove
              </button>
            </div>
            {field.children?.map((child, childIndex) => (
              <div className="repeatable-child" key={child.id}>
                <label htmlFor={`${field.key}-${rowIndex}-${child.key}`}>
                  {child.label}
                </label>
                <FieldRenderer
                  field={{
                    ...child,
                    key: `${field.key}-${rowIndex}-${child.key}`,
                  }}
                  value={row[child.key]}
                  onChange={(childValue) =>
                    onChange(
                      rows.map((current, index) =>
                        index === rowIndex
                          ? { ...current, [child.key]: childValue }
                          : current,
                      ),
                    )
                  }
                  onCaptureLocation={onCaptureLocation}
                  onAddPhoto={onAddPhoto}
                  photoNames={[]}
                  mediaAssets={[]}
                  locationError={locationError}
                  required={child.required}
                  autoFocus={
                    autoFocus &&
                    childIndex === 0 &&
                    (repeatableFocusRowRef.current === null
                      ? rowIndex === 0
                      : rowIndex === repeatableFocusRowRef.current)
                  }
                />
              </div>
            ))}
          </div>
        ))}
        <Button
          variant="secondary"
          icon="plus"
          onClick={() => {
            repeatableFocusRowRef.current = rows.length;
            onChange([...rows, {}]);
          }}
        >
          Add {field.label.toLowerCase()}
        </Button>
      </div>
    );
  }

  return null;
}

export function readPhotoNames(event: ChangeEvent<HTMLInputElement>): string[] {
  return Array.from(event.target.files ?? []).map((file) => file.name);
}
