"use client";

// Variant B — Responsive card / column grid.
//
// A multi-column grid of proposal cards that reflows by breakpoint
// (1 col → 2 at md → 3 at xl). Hairline-bordered, no radius, edge-to-edge cells
// joined by shared 1px gridlines (negative-margin trick) so it reads as a single
// terminal grid rather than floating cards. More breathing room per item than
// the table: title, commentary, a status row, diff, hub.

import { useMemo, useState } from "react";
import { Check, ChevronRight, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { HubStatus } from "@/components/hub-status";
import { stubListProposals, type StubListProposal } from "@/lib/design-stub-list";
import { ConceptSwitcher, DiffStat, VERIFY_DOT, VerifyDot, relativeTime } from "./shared";

function ProposalCard({ p }: { p: StubListProposal }) {
  const unseen = !p.viewerSeenAt;
  const verify = VERIFY_DOT[p.verificationStatus];
  return (
    <button
      type="button"
      className="group relative flex h-full flex-col gap-3 border-l border-t border-border bg-background p-4 text-left transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      {/* Top line: id + new dot + reviewed, hub on the right. */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold tabular-nums text-muted-foreground">
          #{p.id}
        </span>
        {unseen && (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500"
            title="New — not yet viewed"
            aria-label="New"
          />
        )}
        {p.reviewForumUrl && (
          <Check
            className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-label="Reviewed"
          />
        )}
        <span className="ml-auto flex items-center gap-2">
          {p.hub && <HubStatus hub={p.hub} />}
          <ChevronRight
            className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>

      {/* Title. */}
      <p className="line-clamp-3 break-words text-[15px] font-medium leading-snug text-foreground">
        {p.title}
      </p>

      {/* Commentary one-liner. */}
      {p.commentaryTitle ? (
        <p className="line-clamp-2 break-words text-xs italic leading-relaxed text-muted-foreground/80">
          {p.commentaryTitle}
        </p>
      ) : (
        <p className="text-xs italic text-muted-foreground/40">No commentary yet</p>
      )}

      {/* Spacer pushes the footer to the bottom for uniform card heights. */}
      <div className="mt-auto" />

      {/* Verification status row — dot + label, matching the palette. */}
      <div className="flex items-center gap-1.5 font-mono text-[0.7rem]">
        <VerifyDot status={p.verificationStatus} />
        <span className="text-muted-foreground">{verify.label}</span>
      </div>

      {/* Meta footer: topic · time, diff on the right. */}
      <div className="flex items-center gap-1.5 border-t border-border pt-2.5 font-mono text-[0.7rem] text-muted-foreground">
        <span className="truncate">{p.topic}</span>
        {p.proposalTimestamp && (
          <>
            <span className="text-muted-foreground/40" aria-hidden>·</span>
            <span className="shrink-0">{relativeTime(p.proposalTimestamp)}</span>
          </>
        )}
        <span className="ml-auto shrink-0">
          <DiffStat added={p.linesAdded} removed={p.linesRemoved} className="text-[0.7rem]" />
        </span>
      </div>
    </button>
  );
}

export function ListGrid() {
  const [topicFilter, setTopicFilter] = useState<string>("all");

  const topics = useMemo(
    () => Array.from(new Set(stubListProposals.map((p) => p.topic))).sort(),
    []
  );
  const filtered = useMemo(
    () =>
      topicFilter === "all"
        ? stubListProposals
        : stubListProposals.filter((p: StubListProposal) => p.topic === topicFilter),
    [topicFilter]
  );
  const unseenCount = filtered.filter((p) => !p.viewerSeenAt).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ConceptSwitcher active="b" />

      {/* Top bar. */}
      <header className="sticky top-0 z-30 flex h-[38px] items-stretch border-b border-border bg-background">
        <div className="flex min-w-0 flex-1 items-center gap-2 pl-3 font-mono text-xs">
          <span className="font-bold uppercase tracking-wide text-foreground">Reviewer</span>
          <span className="text-muted-foreground/60">{filtered.length}</span>
          {unseenCount > 0 && (
            <span className="flex items-center gap-1 text-sky-500">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
              {unseenCount} new
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label="Refresh proposals"
          title="Refresh"
          className="flex w-9 shrink-0 items-center justify-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <RotateCw className="h-4 w-4" aria-hidden />
        </button>
      </header>

      {/* Topic filter rail. */}
      <div className="sticky top-[38px] z-20 flex gap-1.5 overflow-x-auto border-b border-border bg-background px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip active={topicFilter === "all"} onClick={() => setTopicFilter("all")}>
          All
        </FilterChip>
        {topics.map((t) => (
          <FilterChip key={t} active={topicFilter === t} onClick={() => setTopicFilter(t)}>
            {t}
          </FilterChip>
        ))}
      </div>

      {/* Grid. The right/bottom border of the container plus each cell's
          left/top borders produce a continuous hairline grid (overflow-hidden
          trims the doubled outer edges). */}
      {filtered.length === 0 ? (
        <div className="px-3 py-16 text-center text-sm text-muted-foreground">
          No proposals for this topic.
        </div>
      ) : (
        <div className="grid grid-cols-1 overflow-hidden border-b border-r border-border md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProposalCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap border px-2 py-0.5 font-mono text-[0.7rem] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
