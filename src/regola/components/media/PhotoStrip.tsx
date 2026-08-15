// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { Icon } from "../icons/Icon";
import { MediaTile } from "./MediaTile";

export interface MediaItem {
  id?: string;
  src?: string;
  blob?: Blob;
  name?: string;
  type?: "photo" | "audio" | "file";
}

export interface PhotoStripProps {
  items: MediaItem[];
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  addLabel?: string;
  className?: string;
}

export function PhotoStrip({
  items,
  onAdd,
  onRemove,
  addLabel = "Add Photo",
  className = "",
}: PhotoStripProps) {
  return (
    <div className={`photo-strip ${className}`.trim()}>
      {items.map((item, index) => (
        <MediaTile
          key={item.id ?? index}
          src={item.src}
          blob={item.blob}
          index={index}
          type={item.type ?? "photo"}
          alt={item.name}
          onRemove={onRemove ? () => onRemove(index) : undefined}
        />
      ))}
      {onAdd && (
        <button type="button" className="add-media" onClick={onAdd}>
          <Icon name="plus" size={18} />
          <span>{addLabel}</span>
        </button>
      )}
    </div>
  );
}
