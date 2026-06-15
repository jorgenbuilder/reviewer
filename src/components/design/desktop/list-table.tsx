"use client";

// Variant A — Dense data-table.
//
// A terminal-grid power-triage surface. Uses the full desktop width for real
// columns (id, status, title + commentary subline, topic, diff, hub, reviewed,
// time) with sortable headers, hairline dividers, tight rows. Hand-built table
// (no rounded corners, edge-to-edge) so the grid feel stays brutalist.

import { useMemo, useState } from "react";
import {
  Check,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HubStatus } from "@/components/hub-status";
import { stubListProposals, type StubListProposal } from "@/lib/design-stub-list";
import { ConceptSwitcher, DiffStat, VerifyDot, relativeTime } from "./shared";

type SortKey = "id" | "title" | "topic" | "diff" | "time" | "verification";
type SortDir = "asc" | "desc";

const VERIFY_RANK: Record<StubListProposal["verificationStatus"], number> = {
  failed: 0,
  in_progress: 1,
  pending: 2,
  verified: 3,
};

function diffMagnitude(p: StubListProposal): number {
  return (p.linesAdded ?? 0) + (p.linesRemoved ?? 0);
}

function SortHeader({
  label,
  col,
  active,
  dir,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  col: SortKey;
  active: boolean;
  dir: SortDir;
  onSort: (c: SortKey) => void;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const Icon = !active ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-border bg-background px-3 py-2 text-[0.65rem] font-bold uppercase tracking-wider",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn(
          "inline-flex items-center gap-1 font-mono uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          align === "right" && "flex-row-reverse"
        )}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <Icon
          className={cn("h-3 w-3 shrink-0", active ? "opacity-100" : "opacity-40")}
          aria-hidden
        />
      </button>
    </th>
  );
}

export function ListTable() {
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [topicFilter, setTopicFilter] = useState<string>("all");

  const topics = useMemo(
    () => Array.from(new Set(stubListProposals.map((p) => p.topic))).sort(),
    []
  );

  const rows = useMemo(() => {
    const filtered =
      topicFilter === "all"
        ? stubListProposals
        : stubListProposals.filter((p) => p.topic === topicFilter);
    const dirMul = sortDir === "asc" ? 1 : -1;
    const cmp = (a: StubListProposal, b: StubListProposal): number => {
      switch (sortKey) {
        case "id":
          return (Number(a.id) - Number(b.id)) * dirMul;
        case "title":
          return a.title.localeCompare(b.title) * dirMul;
        case "topic":
          return a.topic.localeCompare(b.topic) * dirMul;
        case "diff":
          return (diffMagnitude(a) - diffMagnitude(b)) * dirMul;
        case "verification":
          return (
            (VERIFY_RANK[a.verificationStatus] - VERIFY_RANK[b.verificationStatus]) *
            dirMul
          );
        case "time": {
          const at = a.proposalTimestamp ? new Date(a.proposalTimestamp).getTime() : 0;
          const bt = b.proposalTimestamp ? new Date(b.proposalTimestamp).getTime() : 0;
          return (at - bt) * dirMul;
        }
        default:
          return 0;
      }
    };
    return [...filtered].sort(cmp);
  }, [sortKey, sortDir, topicFilter]);

  const onSort = (col: SortKey) => {
    if (col === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      // Sensible defaults: text ascending, numeric/time descending.
      setSortDir(col === "title" || col === "topic" ? "asc" : "desc");
    }
  };

  const unseenCount = rows.filter((p) => !p.viewerSeenAt).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ConceptSwitcher active="a" />

      {/* Top bar — full bleed, hairline, mono. Mirrors the live header idiom. */}
      <header className="sticky top-0 z-30 flex h-[38px] items-stretch border-b border-border bg-background">
        <div className="flex min-w-0 flex-1 items-center gap-2 pl-3 font-mono text-xs">
          <span className="font-bold uppercase tracking-wide text-foreground">Reviewer</span>
          <span className="text-muted-foreground/60">{rows.length}</span>
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
      <div className="flex gap-1.5 overflow-x-auto border-b border-border bg-background px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip active={topicFilter === "all"} onClick={() => setTopicFilter("all")}>
          All
        </FilterChip>
        {topics.map((t) => (
          <FilterChip key={t} active={topicFilter === t} onClick={() => setTopicFilter(t)}>
            {t}
          </FilterChip>
        ))}
      </div>

      {/* The table. overflow-x-auto contains any narrow-viewport overflow inside
          the scroller, so the page never overflows horizontally. */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="sticky top-[38px] z-20">
            <tr>
              <SortHeader label="ID" col="id" active={sortKey === "id"} dir={sortDir} onSort={onSort} className="w-[5.5rem]" />
              <th
                scope="col"
                className="w-8 border-b border-border bg-background px-2 py-2 text-center text-[0.65rem] font-bold uppercase tracking-wider"
                title="Verification"
              >
                <span className="sr-only">Verification</span>
                <span aria-hidden className="font-mono text-muted-foreground">●</span>
              </th>
              <SortHeader label="Title" col="title" active={sortKey === "title"} dir={sortDir} onSort={onSort} />
              <SortHeader label="Topic" col="topic" active={sortKey === "topic"} dir={sortDir} onSort={onSort} className="w-[14rem]" />
              <SortHeader label="Diff" col="diff" active={sortKey === "diff"} dir={sortDir} onSort={onSort} align="right" className="w-[7rem]" />
              <th
                scope="col"
                className="w-[7rem] border-b border-border bg-background px-3 py-2 text-right text-[0.65rem] font-bold uppercase tracking-wider font-mono text-muted-foreground"
              >
                Hub
              </th>
              <th
                scope="col"
                className="w-12 border-b border-border bg-background px-2 py-2 text-center text-[0.65rem] font-bold uppercase tracking-wider font-mono text-muted-foreground"
                title="Reviewed"
              >
                Rev
              </th>
              <SortHeader label="Time" col="time" active={sortKey === "time"} dir={sortDir} onSort={onSort} align="right" className="w-[6rem]" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const unseen = !p.viewerSeenAt;
              return (
                <tr
                  key={p.id}
                  tabIndex={0}
                  className="group cursor-pointer border-b border-border align-top transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  {/* ID + new dot */}
                  <td className="px-3 py-2.5 align-middle">
                    <span className="flex items-center gap-1.5">
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
                    </span>
                  </td>
                  {/* Verification dot */}
                  <td className="px-2 py-2.5 align-middle">
                    <span className="flex justify-center">
                      <VerifyDot status={p.verificationStatus} />
                    </span>
                  </td>
                  {/* Title + commentary subline */}
                  <td className="px-3 py-2.5">
                    <p className="line-clamp-1 break-words text-sm font-medium leading-snug text-foreground">
                      {p.title}
                    </p>
                    {p.commentaryTitle && (
                      <p className="mt-0.5 line-clamp-1 break-words text-xs italic text-muted-foreground/80">
                        {p.commentaryTitle}
                      </p>
                    )}
                  </td>
                  {/* Topic */}
                  <td className="px-3 py-2.5 align-middle">
                    <span className="line-clamp-1 font-mono text-[0.7rem] text-muted-foreground">
                      {p.topic}
                    </span>
                  </td>
                  {/* Diff */}
                  <td className="px-3 py-2.5 text-right align-middle">
                    <DiffStat added={p.linesAdded} removed={p.linesRemoved} className="text-[0.7rem]" />
                  </td>
                  {/* Hub */}
                  <td className="px-3 py-2.5 text-right align-middle">
                    {p.hub ? (
                      <span className="flex justify-end">
                        <HubStatus hub={p.hub} />
                      </span>
                    ) : (
                      <span className="font-mono text-[0.7rem] text-muted-foreground/40">&mdash;</span>
                    )}
                  </td>
                  {/* Reviewed */}
                  <td className="px-2 py-2.5 text-center align-middle">
                    {p.reviewForumUrl ? (
                      <Check
                        className="mx-auto h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                        aria-label="Reviewed"
                      />
                    ) : (
                      <span className="font-mono text-[0.7rem] text-muted-foreground/30" aria-hidden>
                        ·
                      </span>
                    )}
                  </td>
                  {/* Time */}
                  <td className="px-3 py-2.5 text-right align-middle">
                    <span className="font-mono text-[0.7rem] tabular-nums text-muted-foreground">
                      {relativeTime(p.proposalTimestamp)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
