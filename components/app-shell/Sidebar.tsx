"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NabiMark } from "@/components/brand/NabiMark";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
};

const NAV: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    description: "Overview",
    icon: (
      <>
        <path d="M3 9.5 12 3l9 6.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </>
    ),
  },
  {
    href: "/check",
    label: "Eligibility Check",
    description: "Look up a patient",
    icon: (
      <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    ),
  },
  {
    href: "/coverage",
    label: "Coverage Overview",
    description: "What we service",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  {
    href: "/rules",
    label: "Registry Rules",
    description: "View & edit rules",
    icon: (
      <>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </>
    ),
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse to an icon rail on narrower viewports; a manual toggle still
  // works within a breakpoint until the next crossing.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1100px)");
    const apply = () => setCollapsed(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface px-3 py-6 transition-[width] duration-200 md:flex",
        collapsed ? "w-[76px] items-center" : "w-64",
      )}
    >
      {/* Brand */}
      <Link
        href="/"
        className={cn(
          "mb-8 flex items-center gap-2.5",
          collapsed ? "justify-center px-0" : "px-2",
        )}
        title="Nabi Registry"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
          <NabiMark className="h-5 w-5 text-white" />
        </span>
        {!collapsed && (
          <span className="flex flex-col leading-tight">
            <span className="font-display text-[15px] font-semibold text-ink">
              Nabi Registry
            </span>
            <span className="text-xs text-subtle">Eligibility admin</span>
          </span>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex w-full flex-col gap-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl py-2.5 transition-colors",
                collapsed ? "justify-center px-0" : "px-3",
                active
                  ? "bg-primary text-white"
                  : "text-muted hover:bg-filler/40 hover:text-ink",
              )}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[18px] w-[18px] shrink-0"
              >
                {item.icon}
              </svg>
              {!collapsed && (
                <span className="flex flex-col leading-tight">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span
                    className={cn(
                      "text-xs",
                      active ? "text-white/70" : "text-subtle",
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "focus-ring mt-auto flex items-center gap-2 rounded-xl py-2 text-xs font-medium text-subtle transition-colors hover:bg-filler/40 hover:text-ink",
          collapsed ? "justify-center px-0" : "px-3",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        {!collapsed && "Collapse"}
      </button>
    </aside>
  );
}
