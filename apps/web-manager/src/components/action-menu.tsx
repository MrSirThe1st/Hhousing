"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ActionMenuItem = {
  label: string;
  href?: string;
  onSelect?: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
};

interface ActionMenuProps {
  items: ActionMenuItem[];
  align?: "left" | "right";
}

function MoreIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <circle cx="4" cy="10" r="1.4" />
      <circle cx="10" cy="10" r="1.4" />
      <circle cx="16" cy="10" r="1.4" />
    </svg>
  );
}

export default function ActionMenu({ items, align = "right" }: ActionMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  const panelPositionClassName = align === "left" ? "left-0" : "right-0";

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-slate-600 transition hover:bg-slate-50 hover:text-[#010a19]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Ouvrir le menu d'actions"
      >
        <MoreIcon />
      </button>

      {open ? (
        <div className={`absolute ${panelPositionClassName} z-20 mt-2 min-w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg`}>
          {items.map((item) => {
            const className = `block w-full px-4 py-2.5 text-left text-sm transition ${
              item.tone === "danger"
                ? "text-red-600 hover:bg-red-50"
                : "text-slate-700 hover:bg-slate-50"
            } ${item.disabled ? "cursor-not-allowed opacity-60" : ""}`;

            if (item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={className}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  item.onSelect?.();
                  setOpen(false);
                }}
                className={className}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}