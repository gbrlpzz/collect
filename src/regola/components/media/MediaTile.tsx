// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { useEffect, useState } from "react";
import { Icon, type IconName } from "../icons/Icon";

export interface MediaTileProps {
  src?: string | null;
  blob?: Blob | null;
  index: number;
  type?: "photo" | "audio" | "file";
  alt?: string;
  onRemove?: () => void;
  className?: string;
}

export function MediaTile({
  src,
  blob,
  index,
  type = "photo",
  alt,
  onRemove,
  className = "",
}: MediaTileProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(src ?? null);

  useEffect(() => {
    if (src) {
      setPreviewUrl(src);
      return;
    }
    if (!blob || !blob.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob, src]);

  const iconName: IconName =
    type === "audio" ? "mic" : type === "file" ? "file" : "camera";

  return (
    <div className={`media-tile ${className}`.trim()}>
      {previewUrl ? (
        <img src={previewUrl} alt={alt || `${type} ${index + 1}`} />
      ) : (
        <span className="media-tile-icon">
          <Icon name={iconName} size={22} />
        </span>
      )}
      <span className="media-tile-index">{index + 1}</span>
      {onRemove && (
        <button
          type="button"
          className="media-remove"
          onClick={onRemove}
          aria-label={`Remove ${type} ${index + 1}`}
        >
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}
