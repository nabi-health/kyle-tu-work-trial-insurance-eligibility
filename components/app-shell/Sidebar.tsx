"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NabiMark } from "@/components/brand/NabiMark";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
};

const NAV: NavItem[] = [
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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 md:flex">
      <Link href="/check" className="mb-8 flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
          <NabiMark className="h-5 w-5 text-white" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-display text-[15px] font-semibold text-ink">
            Nabi Registry
          </span>
          <span className="text-xs text-subtle">Eligibility admin</span>
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                active
                  ? "bg-primary text-white"
                  : "text-muted hover:bg-filler/40 hover:text-ink"
              }`}
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
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-medium">{item.label}</span>
                <span
                  className={`text-xs ${
                    active ? "text-white/70" : "text-subtle"
                  }`}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl bg-cream px-3 py-3 text-xs leading-relaxed text-muted ring-1 ring-line">
        Internal tool. Rule changes take effect immediately for every eligibility
        check.
      </div>
    </aside>
  );
}
