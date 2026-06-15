"use client";

// Shared primitives for the desktop list design concepts. Additive, used only by
// the /design/desktop/list playground. Mirrors the visual language of
// proposal-list-v2.tsx (VerifyDot, relative time) so the concepts feel like the
// same product.

import { cn } from "@/lib/utils";
import type { VerificationStatus } from "@/lib/github";

export const VERIFY_DOT: Record<
  VerificationStatus,
  { color: string; pulse: boolean; label: string }
> = {
  verified: { color: "bg-emerald-500", pulse: false, label: "Build verified" },
  failed: { color: "bg-destructive", pulse: false, label: "Verification failed" },
  in_progress: { color: "bg-amber-500", pulse: true, label: "Verifying" },
  pending: { color: "bg-muted-foreground/40", pulse: true, label: "Verification pending" },
};

export function VerifyDot({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  const { color, pulse, label } = VERIFY_DOT[status];
  return (
    <span className={cn("flex items-center", className)} title={label} aria-label={label}>
      <span className={cn("h-2 w-2 rounded-full", color, pulse && "animate-pulse")} />
    </span>
  );
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Diff stats (+added / −removed), mono + tabular, matching the live row.
export function DiffStat({
  added,
  removed,
  className,
}: {
  added: number | null;
  removed: number | null;
  className?: string;
}) {
  if (added == null && removed == null) {
    return <span className={cn("text-muted-foreground/40", className)}>&mdash;</span>;
  }
  return (
    <span className={cn("font-mono font-bold tabular-nums", className)}>
      <span className="text-emerald-600 dark:text-emerald-400">+{added ?? 0}</span>{" "}
      <span className="text-destructive">&minus;{removed ?? 0}</span>
    </span>
  );
}

// Concept switcher — fixed top-right, hairline-bordered, mono. Links to
// ?variant=a|b|c and highlights the active one. Shared by all three concepts.
export const CONCEPTS: { key: "a" | "b" | "c"; name: string }[] = [
  { key: "a", name: "Table" },
  { key: "b", name: "Grid" },
  { key: "c", name: "Split" },
];

export function ConceptSwitcher({ active }: { active: "a" | "b" | "c" }) {
  return (
    <nav
      aria-label="Design concept"
      className="fixed right-3 top-3 z-50 flex items-stretch border border-border bg-background font-mono text-[0.7rem] shadow-sm"
    >
      <span className="flex items-center px-2 uppercase tracking-wide text-muted-foreground/60">
        Concept
      </span>
      {CONCEPTS.map((c) => (
        <a
          key={c.key}
          href={`?variant=${c.key}`}
          aria-current={active === c.key ? "page" : undefined}
          className={cn(
            "flex items-center gap-1 border-l border-border px-2 py-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
            active === c.key
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <span className="font-bold uppercase">{c.key}</span>
          <span className="hidden sm:inline">{c.name}</span>
        </a>
      ))}
    </nav>
  );
}
