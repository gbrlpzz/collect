interface CollectBrandProps {
  compact?: boolean;
}

/** A field frame and observation point: capture without implying a data type. */
export function CollectBrand({ compact = false }: CollectBrandProps) {
  return (
    <span
      className={`collect-brand ${compact ? "collect-brand-compact" : ""}`}
      aria-hidden="true"
    >
      <svg className="collect-mark" viewBox="0 0 32 32" focusable="false">
        <path d="M12 5H8a3 3 0 0 0-3 3v4M20 5h4a3 3 0 0 1 3 3v4M5 20v4a3 3 0 0 0 3 3h4M27 20v4a3 3 0 0 1-3 3h-4" />
        <circle cx="16" cy="16" r="3.25" />
      </svg>
      <span className="collect-wordmark">
        collect<span className="wordmark-dot">.</span>
      </span>
    </span>
  );
}
