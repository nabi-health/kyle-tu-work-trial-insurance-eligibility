"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NabiMark } from "@/components/brand/NabiMark";
import { UserMenu } from "@/components/app-shell/UserMenu";
import { cn } from "@/lib/cn";

type NavChild = {
  href: string;
  label: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** When present, the item expands into these subtabs in the sidebar. */
  children?: NavChild[];
};

const NAV: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <>
        <path d="M3 9.5 12 3l9 6.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </>
    ),
  },
  {
    href: "/assistant",
    label: "Assistant",
    icon: (
      <>
        <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-3.9-.9L3 21l1.9-5.6A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
      </>
    ),
  },
  {
    href: "/check",
    label: "Eligibility",
    icon: (
      <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    ),
    children: [
      { href: "/check", label: "Check" },
      { href: "/check/bulk", label: "Bulk sandbox" },
      { href: "/check/tests", label: "Test" },
    ],
  },
  {
    href: "/coverage",
    label: "Coverage Overview",
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
  // `railed` lags `collapsed`: labels stay visible through the collapse
  // animation and switch to the icon rail only once it's fully collapsed (set
  // on transitionEnd). Expanding clears it immediately so labels return at once.
  const [railed, setRailed] = useState(false);
  // Which expandable nav groups are open. Auto-opens the group containing the
  // active route; a manual toggle works otherwise.
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    for (const item of NAV) {
      if (item.children && isActive(pathname, item.href)) {
        setOpenGroups((s) => (s.has(item.href) ? s : new Set(s).add(item.href)));
      }
    }
  }, [pathname]);

  function toggleGroup(href: string) {
    setOpenGroups((s) => {
      const next = new Set(s);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  }

  // Auto-collapse to an icon rail on narrower viewports; a manual toggle still
  // works within a breakpoint until the next crossing.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1100px)");
    const apply = () => {
      setCollapsed(mq.matches);
      if (!mq.matches) setRailed(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    if (!next) setRailed(false);
  }

  return (
    <aside
      onTransitionEnd={(e) => {
        if (e.propertyName === "width" && collapsed) setRailed(true);
      }}
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-line bg-surface px-3 py-6 transition-[width] duration-200 md:flex",
        collapsed ? "w-[66px]" : "w-64",
      )}
    >
      {/* Brand */}
      <Link
        href="/"
        className={cn(
          // Keep px-3 in both states so the mark's left edge stays pinned 24px
          // from the border — same column as the nav icons below — and never
          // shifts when collapsing/expanding.
          "mb-8 flex h-11 items-center gap-2.5 px-1",
        )}
        title="Nabi Registry"
      >
        <NabiMark className="h-8 w-8 shrink-0 text-primary" />
        {!railed && (
          <span className="flex flex-col whitespace-nowrap leading-tight">
            <span className="type-label-md text-ink">
              Nabi Registry
            </span>
            <span className="type-body-xs text-subtle">Eligibility admin</span>
          </span>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex w-full flex-col gap-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const icon = (
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
          );

          // Expandable group — only when labels are visible (not railed).
          if (item.children && !railed) {
            const open = openGroups.has(item.href);
            return (
              <div key={item.href} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(item.href)}
                  aria-expanded={open}
                  className={cn(
                    "focus-ring group flex h-10 w-full items-center gap-3 rounded-xl px-3 transition-colors",
                    active
                      ? "text-ink"
                      : "text-muted hover:bg-filler/40 hover:text-ink",
                  )}
                >
                  {icon}
                  <span className="flex-1 text-left type-label-sm whitespace-nowrap">
                    {item.label}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                      "h-4 w-4 shrink-0 text-subtle transition-transform",
                      open && "rotate-180",
                    )}
                    aria-hidden
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {open && (
                  <div className="flex flex-col gap-0.5">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          aria-current={childActive ? "page" : undefined}
                          className={cn(
                            "flex h-9 items-center whitespace-nowrap rounded-xl pl-11 pr-3 type-label-sm transition-colors",
                            childActive
                              ? "bg-primary text-white"
                              : "text-muted hover:bg-filler/40 hover:text-ink",
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Plain link — leaf items, and grouped items while railed.
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={railed ? item.label : undefined}
              className={cn(
                "group flex h-10 items-center gap-3 rounded-xl transition-colors",
                // Keep px-3 in both states: in the 66px rail this leaves exactly
                // 24px on each side of the 18px icon, so it reads centered and
                // never shifts horizontally when collapsing/expanding.
                "px-3",
                active
                  ? "bg-primary text-white"
                  : "text-muted hover:bg-filler/40 hover:text-ink",
              )}
            >
              {icon}
              {!railed && (
                <span className="type-label-sm whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: identity + collapse */}
      <div className="mt-auto flex flex-col gap-1 border-t border-line pt-3">
        <UserMenu railed={railed} />
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "focus-ring flex items-center gap-2 rounded-xl py-2 type-label-xs text-subtle transition-colors hover:bg-filler/40 hover:text-ink",
            railed ? "justify-center px-0" : "px-3",
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
          {!railed && <span className="whitespace-nowrap">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
