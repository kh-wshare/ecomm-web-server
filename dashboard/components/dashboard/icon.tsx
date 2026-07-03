import type { SVGProps } from "react";

export type DashboardIconName =
  | "bell"
  | "box"
  | "card"
  | "chevron-down"
  | "close"
  | "collapse"
  | "globe"
  | "grid"
  | "inventory"
  | "logout"
  | "menu"
  | "orders"
  | "settings"
  | "share"
  | "user";

type DashboardIconProps = SVGProps<SVGSVGElement> & {
  name: DashboardIconName;
};

export function DashboardIcon({
  name,
  className = "size-5",
  ...props
}: DashboardIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {iconPath(name)}
    </svg>
  );
}

function iconPath(name: DashboardIconName) {
  switch (name) {
    case "bell":
      return (
        <>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </>
      );
    case "box":
      return (
        <>
          <path d="m21 8-9 5-9-5 9-5 9 5Z" />
          <path d="m3 8 9 5v9" />
          <path d="m21 8-9 5" />
          <path d="M21 8v8l-9 6-9-6V8" />
        </>
      );
    case "card":
      return (
        <>
          <rect height="14" rx="2" width="20" x="2" y="5" />
          <path d="M2 10h20M6 15h2" />
        </>
      );
    case "chevron-down":
      return <path d="m7 10 5 5 5-5" />;
    case "close":
      return <path d="M18 6 6 18M6 6l12 12" />;
    case "collapse":
      return (
        <>
          <path d="m15 18-6-6 6-6" />
          <path d="M21 5v14" />
        </>
      );
    case "globe":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
        </>
      );
    case "grid":
      return (
        <>
          <rect height="7" rx="1" width="7" x="3" y="3" />
          <rect height="7" rx="1" width="7" x="14" y="3" />
          <rect height="7" rx="1" width="7" x="3" y="14" />
          <rect height="7" rx="1" width="7" x="14" y="14" />
        </>
      );
    case "inventory":
      return (
        <>
          <path d="M4 7h16v14H4zM2 3h20v4H2zM9 11h6" />
        </>
      );
    case "logout":
      return (
        <>
          <path d="M10 17l5-5-5-5M15 12H3" />
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        </>
      );
    case "menu":
      return <path d="M4 6h16M4 12h16M4 18h16" />;
    case "orders":
      return (
        <>
          <path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h3" />
        </>
      );
    case "settings":
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </>
      );
    case "share":
      return (
        <>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
        </>
      );
    case "user":
      return (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </>
      );
  }
}
