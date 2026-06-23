import { NabiCharacter } from "./NabiCharacter";

/*
  A playful sign-off for the dashboard: a few Nabi characters peeking up from the
  bottom edge of the page. Purely decorative (aria-hidden) — the strip clips its
  own overflow so the characters read as hiding just below the fold, only their
  tops showing. Gentle, varied rotations keep it from feeling like a rigid row.
*/
export function DashboardCharacters() {
  return (
    <div
      aria-hidden
      className="pointer-events-none relative -mb-6 mt-2 h-16 overflow-hidden select-none"
    >
      <NabiCharacter
        name="emi"
        size={76}
        className="absolute bottom-0 left-6 translate-y-[42%] -rotate-6 sm:left-12"
      />
      <NabiCharacter
        name="caleb"
        size={92}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[34%]"
      />
      <NabiCharacter
        name="ines"
        size={68}
        className="absolute bottom-0 right-6 translate-y-[44%] rotate-6 sm:right-12"
      />
    </div>
  );
}
