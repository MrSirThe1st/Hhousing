export type IconName =
  | "dashboard"
  | "portfolio"
  | "clients"
  | "listings"
  | "tenants"
  | "leases"
  | "move-outs"
  | "revenues"
  | "expenses"
  | "reports"
  | "payments"
  | "maintenance"
  | "documents"
  | "messages"
  | "team"
  | "audit"
  | "organizations";

type SidebarIconProps = {
  name: IconName;
  active: boolean;
  className?: string;
};

export function SidebarIcon({ name, active, className = "h-5 w-5" }: SidebarIconProps): React.ReactElement {
  const strokeClassName = active
    ? "stroke-current"
    : "stroke-slate-600 group-hover:stroke-[#010a19] dark:stroke-slate-400 dark:group-hover:stroke-white";

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <SidebarIconPaths name={name} strokeClassName={strokeClassName} />
    </svg>
  );
}

function SidebarIconPaths({
  name,
  strokeClassName
}: {
  name: IconName;
  strokeClassName: string;
}): React.ReactElement {
  switch (name) {
    case "dashboard":
      return (
        <>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" className={strokeClassName} strokeWidth="1.8" />
          <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" className={strokeClassName} strokeWidth="1.8" />
          <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" className={strokeClassName} strokeWidth="1.8" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" className={strokeClassName} strokeWidth="1.8" />
        </>
      );
    case "portfolio":
      return (
        <>
          <path d="M4 20.5V9.5L12 4l8 5.5v11" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 20.5v-5h6v5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "clients":
      return (
        <>
          <circle cx="9" cy="8" r="3" className={strokeClassName} strokeWidth="1.8" />
          <path d="M4.5 18.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16 10.5c1.9 0 3.5 1.6 3.5 3.5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M15 5.5c1.4.2 2.5 1.4 2.5 2.9" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "listings":
      return (
        <>
          <path d="M5 18.5V5.5h14v13" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8 9.5h8M8 13h5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 18.5l2.4-2.4a1.8 1.8 0 0 0 0-2.5 1.8 1.8 0 0 0-2.5 0l-.4.4-.4-.4a1.8 1.8 0 0 0-2.5 2.5L12 18.5Z" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
        </>
      );
    case "tenants":
      return (
        <>
          <circle cx="12" cy="8" r="3.5" className={strokeClassName} strokeWidth="1.8" />
          <path d="M5.5 19c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "leases":
      return (
        <>
          <path d="M7 3.5h7l4 4v13H7z" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 3.5v4h4" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9.5 12h5M9.5 15.5h5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "move-outs":
      return (
        <>
          <path d="M14 20.5H7V3.5h10v8" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9.5 9h5M9.5 12.5h3" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M13.5 17.5h7M17.5 14.5l3 3-3 3" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "revenues":
      return (
        <>
          <path d="M4 18.5h16" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6.5 15l4-4 3 2.5 4.5-5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.5 8.5H18v2.5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "expenses":
      return (
        <>
          <path d="M4 18.5h16" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6.5 9 10.5 13l3-2.5L18 15" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.5 15H18v-2.5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "reports":
      return (
        <>
          <path d="M7 4.5h10v15H7z" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10 9h4M10 12.5h4M10 16h2" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "payments":
      return (
        <>
          <rect x="4" y="6" width="16" height="12" rx="2" className={strokeClassName} strokeWidth="1.8" />
          <path d="M4 10h16" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 14.5h3" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "maintenance":
      return (
        <>
          <path d="M14.5 6.5a3 3 0 0 1 3.9 3.9l-7.8 7.8-4.6 1 1-4.6 7.5-7.5Z" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M13 8l3 3" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "documents":
      return (
        <>
          <path d="M8 3.5h6l4 4v9.5A3.5 3.5 0 0 1 14.5 20.5H8.5A3.5 3.5 0 0 1 5 17V7a3.5 3.5 0 0 1 3-3.5Z" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 3.5v4h4" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 13.5h6" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "messages":
      return (
        <>
          <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6A2.5 2.5 0 0 1 16.5 16H11l-4 3v-3H7.5A2.5 2.5 0 0 1 5 13.5z" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8.5 9.5h7M8.5 12h4.5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "team":
      return (
        <>
          <circle cx="8.5" cy="9" r="2.5" className={strokeClassName} strokeWidth="1.8" />
          <circle cx="15.5" cy="8" r="2" className={strokeClassName} strokeWidth="1.8" />
          <path d="M4.5 18c0-2.2 1.9-4 4.2-4h.6c2.3 0 4.2 1.8 4.2 4" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M14.5 17c.2-1.6 1.5-2.8 3.1-2.8h.2c1 0 1.8.4 2.4 1.1" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "audit":
      return (
        <>
          <path d="M6 4.5h12M6 9h12M6 13.5h6" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="16.5" cy="16.5" r="3.5" className={strokeClassName} strokeWidth="1.8" />
          <path d="M19 19l2 2" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "organizations":
      return (
        <>
          <rect x="4" y="3.5" width="16" height="17" rx="2" className={strokeClassName} strokeWidth="1.8" />
          <path d="M9 3.5v17M15 3.5v17M4 9h16M4 14h16" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
  }
}
