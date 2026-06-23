import { cn } from "@/lib/cn";
import { NabiCharacter } from "./NabiCharacter";

/*
  A playful sign-off for the dashboard: two Nabi characters peeking up from the
  bottom corners of the screen. Purely decorative (aria-hidden) — the strip's
  bottom sits flush with the screen edge and clips its overflow, so the
  characters read as hiding just below the fold, only their tops showing. The
  page pins this to the bottom of the viewport via `mt-auto`.
*/
export function DashboardCharacters({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        // -mb-6 cancels PageBody's bottom padding so the clip line is the screen
        // edge; the tall box keeps the lifted character tops from clipping.
        "pointer-events-none relative -mb-6 h-24 select-none overflow-hidden",
        className,
      )}
    >
      <NabiCharacter
        name="emi"
        size={76}
        className="absolute bottom-[30px] left-6 -rotate-6 translate-y-[55%] sm:left-12"
      />
      <NabiCharacter
        name="ines"
        size={70}
        className="absolute bottom-[30px] right-6 rotate-6 translate-y-[58%] sm:right-12"
      />
    </div>
  );
}
