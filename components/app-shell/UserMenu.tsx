"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/components/user/UserProvider";
import { cn } from "@/lib/cn";

/** Sidebar identity chip — shows the current name and links to settings. */
export function UserMenu({ railed }: { railed?: boolean }) {
  const { name } = useUser();
  const pathname = usePathname();
  const active = pathname === "/settings";

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Link
      href="/settings"
      aria-current={active ? "page" : undefined}
      title={railed ? `${name} — settings` : "Settings"}
      className={cn(
        "focus-ring flex items-center gap-2.5 rounded-xl py-2 transition-colors",
        active ? "bg-filler/40" : "hover:bg-filler/40",
        railed ? "justify-center px-0" : "px-2",
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 type-label-xs font-semibold text-primary">
        {initial}
      </span>
      {!railed && (
        <span className="flex min-w-0 flex-col text-left">
          <span className="truncate type-label-sm text-ink">{name}</span>
          <span className="type-body-xs text-subtle">Settings</span>
        </span>
      )}
    </Link>
  );
}
