import type { ReactNode } from "react";

/*
  Nabi Family characters (Brand Guidelines › Characters, Figma node 7:8).
  Authored as inline SVG — body paths are the authentic Figma vectors, faces
  are parametric so each character reads in the brand's accent hue and can be
  re-coloured/re-sized from one component. Characters are companions for key
  emotional moments (per the brand), not decorative chrome — use sparingly.

  Each character carries a fixed, role-appropriate expression:
    • ines  — steady & trustworthy (a positive, eligible answer)
    • emi   — gentle empathy (softening a "no")
    • caleb — curious, head tilted (an open question / pending step)
*/

export type NabiName = "ines" | "emi" | "caleb";

const INK = "var(--color-ink)";

type Spec = {
  /** Native Figma viewBox, kept so the authentic geometry isn't re-scaled. */
  vb: [number, number];
  /** Body fill — a brand accent token. */
  color: string;
  /** Body shape + face, in the character's native coordinate space. */
  render: ReactNode;
};

const SPECS: Record<NabiName, Spec> = {
  // Octagon. Dot eyes + open smile = the "steady, happy" expression.
  ines: {
    vb: [107.414, 107.414],
    color: "var(--color-accent-green)",
    render: (
      <>
        <path
          d="M48.7586 1.80113C51.2072 0.9099 52.4315 0.464283 53.7071 0.464283C54.9828 0.464283 56.2071 0.909899 58.6557 1.80113L83.2809 10.764C85.7295 11.6552 86.9538 12.1008 87.931 12.9207C88.9082 13.7407 89.5596 14.869 90.8625 17.1257L103.965 39.8204C105.268 42.077 105.92 43.2054 106.141 44.4616C106.363 45.7178 106.136 47.0009 105.684 49.5671L101.133 75.3746C100.681 77.9408 100.455 79.2239 99.8168 80.3286C99.179 81.4333 98.1809 82.2708 96.1848 83.9457L76.1102 100.79C74.114 102.465 73.116 103.303 71.9173 103.739C70.7186 104.175 69.4157 104.175 66.8099 104.175H40.6044C37.9986 104.175 36.6957 104.175 35.497 103.739C34.2983 103.303 33.3003 102.465 31.3041 100.79L11.2295 83.9457C9.23335 82.2708 8.23528 81.4333 7.59747 80.3286C6.95967 79.2239 6.73342 77.9408 6.28093 75.3746L1.73039 49.5672C1.2779 47.0009 1.05166 45.7178 1.27316 44.4616C1.49467 43.2054 2.14612 42.0771 3.44901 39.8204L16.5518 17.1257C17.8547 14.869 18.5061 13.7407 19.4833 12.9207C20.4605 12.1008 21.6848 11.6552 24.1334 10.764L48.7586 1.80113Z"
          fill="var(--color-accent-green)"
        />
        <circle cx="46" cy="58.5" r="3.7" fill={INK} />
        <circle cx="61.4" cy="58.5" r="3.7" fill={INK} />
        <path
          d="M45 67 Q53.7 76 62.4 67"
          fill="none"
          stroke={INK}
          strokeWidth="3.6"
          strokeLinecap="round"
        />
      </>
    ),
  },
  // Heart. Soft closed (∪) eyes + gentle smile = warm, empathetic.
  emi: {
    vb: [135.117, 112.518],
    color: "var(--color-accent-pink)",
    render: (
      <>
        <path
          d="M24.675 7.2201C37.0135 -3.47075 55.6823 -2.13487 66.3733 10.2035L69.0344 13.2748L72.6545 9.95936C84.6931 -1.06833 103.392 -0.249138 114.42 11.7894L127.354 25.9086C138.381 37.9471 137.562 56.6465 125.524 67.6742L102.917 88.3812C101.717 89.9474 100.341 91.4164 98.7912 92.7592L86.7239 103.215L85.6594 104.191C84.907 104.88 84.1283 105.523 83.3274 106.12C70.9988 115.909 53.0296 114.327 42.6213 102.315L7.21994 61.4574C-3.47059 49.1189 -2.13494 30.45 10.2033 19.7592L24.675 7.2201Z"
          fill="var(--color-accent-pink)"
        />
        <path
          d="M50 49 Q57 56 64 49"
          fill="none"
          stroke={INK}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path
          d="M71 49 Q78 56 85 49"
          fill="none"
          stroke={INK}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path
          d="M60 62 Q67.5 69 75 62"
          fill="none"
          stroke={INK}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      </>
    ),
  },
  // Bowl, tilted. Dot eyes; the shape itself reads as the smile.
  caleb: {
    vb: [115.51, 55.8613],
    color: "var(--color-accent-blue)",
    render: (
      <g transform="rotate(-7 57.75 27.9)">
        <path
          d="M110.286 0C113.386 0 115.888 2.58681 115.463 5.65702C111.539 34.0206 87.1978 55.8611 57.755 55.8613L57.0021 55.8564C27.8982 55.4876 3.93747 33.7782 0.0471612 5.65686C-0.377575 2.58663 2.12435 0 5.22382 0L27.1452 0C29.9634 0 32.2568 2.17493 33.0521 4.8786C36.1923 15.5543 46.0628 23.3484 57.755 23.3486C69.4472 23.3485 79.3177 15.5543 82.4579 4.87857C83.2531 2.17491 85.5465 0 88.3647 0L110.286 0Z"
          fill="var(--color-accent-blue)"
        />
        <circle cx="49.6" cy="20.8" r="3.7" fill={INK} />
        <circle cx="66" cy="20.8" r="3.7" fill={INK} />
      </g>
    ),
  },
};

export function NabiCharacter({
  name,
  size = 44,
  title,
  className,
}: {
  name: NabiName;
  /** Rendered height in px; width follows the character's natural aspect. */
  size?: number;
  /** Accessible label. Omit for a purely decorative mark (aria-hidden). */
  title?: string;
  className?: string;
}) {
  const { vb } = SPECS[name];
  const [vw, vh] = vb;
  const width = Math.round((size * vw) / vh);

  return (
    <svg
      width={width}
      height={size}
      viewBox={`0 0 ${vw} ${vh}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      {SPECS[name].render}
    </svg>
  );
}
