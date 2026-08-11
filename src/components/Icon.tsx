import type { SVGProps } from "react";

export type IconName =
  | "arrow-left"
  | "chevron-left"
  | "arrow-right"
  | "archive"
  | "camera"
  | "check"
  | "chevron-down"
  | "chevron-right"
  | "cloud"
  | "download"
  | "file"
  | "folder"
  | "globe"
  | "info"
  | "location"
  | "lock"
  | "mic"
  | "menu"
  | "more"
  | "plus"
  | "refresh"
  | "send"
  | "settings"
  | "shield"
  | "signal"
  | "sliders"
  | "spark"
  | "users"
  | "x";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, size = 20, strokeWidth = 1.8, filled = false, ...props }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: filled ? "currentColor" : "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };

  switch (name) {
    case "arrow-left":
      return <svg {...common}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>;
    case "chevron-left":
      return <svg {...common}><path d="m15 18-6-6 6-6" /></svg>;
    case "arrow-right":
      return <svg {...common}><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
    case "archive":
      return <svg {...common}><path d="M4 7h16M5 7v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7M3 4h18v3H3zM9 11h6" /></svg>;
    case "camera":
      return <svg {...common}><path d="M4 8h3l1.5-2h5L15 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><circle cx="12" cy="13.5" r="3" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4.5 4.5L19 7" /></svg>;
    case "chevron-down":
      return <svg {...common}><path d="m6 9 6 6 6-6" /></svg>;
    case "chevron-right":
      return <svg {...common}><path d="m9 6 6 6-6 6" /></svg>;
    case "cloud":
      return <svg {...common}><path d="M7 18a4 4 0 1 1 .8-7.92A5.5 5.5 0 0 1 18.5 12a3 3 0 0 1-.5 6Z" /></svg>;
    case "download":
      return <svg {...common}><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" /></svg>;
    case "file":
      return <svg {...common}><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h4" /></svg>;
    case "folder":
      return <svg {...common}><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z" /></svg>;
    case "globe":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.4 2.5 3.5 5.5 3.5 9S14.4 18.5 12 21c-2.4-2.5-3.5-5.5-3.5-9S9.6 5.5 12 3Z" /></svg>;
    case "info":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
    case "location":
      return <svg {...common}><path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></svg>;
    case "lock":
      return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
    case "mic":
      return <svg {...common}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" /></svg>;
    case "menu":
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "more":
      return <svg {...common}><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "refresh":
      return <svg {...common}><path d="M20 11a8 8 0 0 0-14.5-3L4 10m0-5v5h5M4 13a8 8 0 0 0 14.5 3L20 14m0 5v-5h-5" /></svg>;
    case "send":
      return <svg {...common}><path d="m4 4 16 8-16 8 3-8Z" /><path d="M7 12h13" /></svg>;
    case "settings":
      return <svg {...common}><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.2a2 2 0 0 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1A2 2 0 0 0 1.7 11H1.5a2 2 0 0 1 0-4h.2a2 2 0 0 0 1.4-3.4L3 3.5A2 2 0 0 1 5.8.7l.1.1A2 2 0 0 0 9.3-.6v-.2a2 2 0 0 1 4 0v.2a2 2 0 0 0 3.4 1.4l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1A2 2 0 0 0 20.9 8h.2a2 2 0 0 1 0 4h-.2a2 2 0 0 0-1.5 3Z" transform="translate(0 4) scale(.667)" /></svg>;
    case "shield":
      return <svg {...common}><path d="M12 3 19 6v5c0 4.5-2.8 7.7-7 10-4.2-2.3-7-5.5-7-10V6Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case "signal":
      return <svg {...common}><path d="M5 18v1M9 15v4M13 11v8M17 7v12M21 3v16" /></svg>;
    case "sliders":
      return <svg {...common}><path d="M4 6h5M14 6h6M4 12h9M18 12h2M4 18h2M11 18h9" /><circle cx="12" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="8" cy="18" r="2" /></svg>;
    case "spark":
      return <svg {...common}><path d="m12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3Z" /></svg>;
    case "users":
      return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M17 14a4.8 4.8 0 0 1 4 5" /></svg>;
    case "x":
      return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    default:
      return null;
  }
}
