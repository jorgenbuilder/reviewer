"use client";

// Brutalist concept switcher for the desktop detail playground. Fixed
// bottom-center, hairline-bordered, mono. Lists the three concepts (A/B/C) and
// links to ?variant=… while preserving the current ?fixture=…. Also exposes the
// fixture switch so the owner can see each layout against verified/in-progress/
// failed states.

import Link from "next/link";
import { cn } from "@/lib/utils";

const VARIANTS = [
  { key: "a", label: "A", name: "Two-column" },
  { key: "b", label: "B", name: "Three-zone" },
  { key: "c", label: "C", name: "Console" },
] as const;

const FIXTURES = [
  { key: "upgrade", label: "upgrade" },
  { key: "install", label: "install" },
  { key: "legacy", label: "legacy" },
] as const;

export function DetailSwitcher({
  variant,
  fixture,
}: {
  variant: string;
  fixture: string;
}) {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 border border-border bg-background font-mono text-xs shadow-[0_2px_12px_rgba(0,0,0,0.18)]">
      <div className="flex items-stretch divide-x divide-border">
        <span className="flex items-center px-2 text-[0.6rem] uppercase tracking-wider text-muted-foreground/70">
          concept
        </span>
        {VARIANTS.map((v) => {
          const active = v.key === variant;
          return (
            <Link
              key={v.key}
              href={`/design/desktop/detail?variant=${v.key}&fixture=${fixture}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="font-bold">{v.label}</span>
              <span className="hidden sm:inline">{v.name}</span>
            </Link>
          );
        })}
      </div>
      <div className="flex items-stretch divide-x divide-border border-t border-border">
        <span className="flex items-center px-2 text-[0.6rem] uppercase tracking-wider text-muted-foreground/70">
          fixture
        </span>
        {FIXTURES.map((f) => {
          const active = f.key === fixture;
          return (
            <Link
              key={f.key}
              href={`/design/desktop/detail?variant=${variant}&fixture=${f.key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
