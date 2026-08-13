interface CollectBrandProps {
  compact?: boolean;
}

/**
 * The capture mark combines a letterform-like C with an observation point.
 * It stays geometric at small sizes and inherits the surface identity color.
 */
export function CollectBrand({ compact = false }: CollectBrandProps) {
  return (
    <span
      className={`collect-brand ${compact ? "collect-brand-compact" : ""}`}
      aria-hidden="true"
    >
      <svg className="collect-mark" viewBox="0 0 32 32" focusable="false">
        <path d="M23.75 8.4a10 10 0 1 0 0 15.2" />
        <circle cx="16" cy="16" r="3.25" />
      </svg>
      <span className="collect-wordmark">
        collect<span className="wordmark-dot">.</span>
      </span>
    </span>
  );
}
