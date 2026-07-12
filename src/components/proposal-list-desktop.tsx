"use client";

// Desktop proposal list — a full-width rich data-table (browse mode). Shown at
// the `lg` breakpoint and up; below that the mobile ProposalListV2 renders
// instead (see ProposalListResponsive). Clicking a row navigates to the
// proposal's detail page, which renders the three-column desktop layout.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCw, Check, ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsMenu } from "@/components/settings-menu";
import { HubStatus } from "@/components/hub-status";
import { VerifyDot, DiffStat, relativeTime } from "@/components/design/desktop/shared";
import { fetchProposalsList, PROPOSALS_QUERY_KEY, orderTopics, prefetchProposal } from "@/lib/proposals-client";
import type { ProposalResponse } from "@/app/api/proposals/route";
import type { VerificationStatus } from "@/lib/github";

type SortKey = "id" | "title" | "topic" | "diff" | "time" | "verification";
type SortDir = "asc" | "desc";

const VERIFY_RANK: Record<VerificationStatus, number> = {
  failed: 0,
  in_progress: 1,
  pending: 2,
  verified: 3,
};

function diffMagnitude(p: ProposalResponse): number {
  return (p.linesAdded ?? 0) + (p.linesRemoved ?? 0);
}

function sortRows(rows: ProposalResponse[], key: SortKey, dir: SortDir): ProposalResponse[] {
  const m = dir === "asc" ? 1 : -1;
  const cmp = (a: ProposalResponse, b: ProposalResponse): number => {
    switch (key) {
      case "id":
        return (Number(a.id) - Number(b.id)) * m;
      case "title":
        return a.title.localeCompare(b.title) * m;
      case "topic":
        return a.topic.localeCompare(b.topic) * m;
      case "diff":
        return (diffMagnitude(a) - diffMagnitude(b)) * m;
      case "verification":
        return (VERIFY_RANK[a.verificationStatus] - VERIFY_RANK[b.verificationStatus]) * m;
      case "time": {
        const at = a.proposalTimestamp ? new Date(a.proposalTimestamp).getTime() : 0;
        const bt = b.proposalTimestamp ? new Date(b.proposalTimestamp).getTime() : 0;
        return (at - bt) * m;
      }
      default:
        return 0;
    }
  };
  return [...rows].sort(cmp);
}

function SortHeader({
  label,
  display,
  col,
  active,
  dir,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  display?: React.ReactNode;
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
        {display ?? label}
        <Icon className={cn("h-3 w-3 shrink-0", active ? "opacity-100" : "opacity-40")} aria-hidden />
      </button>
    </th>
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

export function ProposalListDesktop() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    data: proposals = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: PROPOSALS_QUERY_KEY,
    queryFn: fetchProposalsList,
    refetchInterval: 60 * 1000,
  });

  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [topicFilter, setTopicFilter] = useState<string>("all");

  const topics = useMemo(
    () => orderTopics(Array.from(new Set(proposals.map((p) => p.topic)))),
    [proposals]
  );

  const rows = useMemo(() => {
    const filtered =
      topicFilter === "all" ? proposals : proposals.filter((p) => p.topic === topicFilter);
    return sortRows(filtered, sortKey, sortDir);
  }, [proposals, topicFilter, sortKey, sortDir]);

  const onSort = (col: SortKey) => {
    if (col === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir(col === "title" || col === "topic" ? "asc" : "desc");
    }
  };

  const unseenCount = rows.filter((p) => !p.viewerSeenAt).length;

  const open = (id: string) => router.push(`/proposals/${id}`);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex h-[38px] shrink-0 items-stretch border-b border-border bg-background">
        <div className="flex min-w-0 flex-1 items-center gap-2 pl-3 font-mono text-xs">
          <span className="font-bold uppercase tracking-wide text-foreground">Reviewer</span>
          <span className="text-muted-foreground/60">{proposals.length}</span>
          {unseenCount > 0 && (
            <span className="flex items-center gap-1 text-sky-500">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
              {unseenCount} new
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh proposals"
          title="Refresh"
          className="flex w-9 shrink-0 items-center justify-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          <RotateCw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden />
        </button>
        <div className="flex items-stretch border-l border-border">
          <SettingsMenu triggerClassName="h-full w-9 rounded-none px-0 hover:bg-muted" />
        </div>
      </header>

      {/* Topic filter */}
      {topics.length > 0 && (
        <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border bg-background px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip active={topicFilter === "all"} onClick={() => setTopicFilter("all")}>
            All
          </FilterChip>
          {topics.map((t) => (
            <FilterChip key={t} active={topicFilter === t} onClick={() => setTopicFilter(t)}>
              {t}
            </FilterChip>
          ))}
        </div>
      )}

      {/* Body */}
      {error ? (
        <div className="flex flex-1 items-center justify-center px-3 text-center text-sm text-destructive">
          Failed to load proposals. Try refresh.
        </div>
      ) : isLoading ? (
        <div className="flex flex-1 items-center justify-center px-3 text-center font-mono text-sm text-muted-foreground">
          Loading…
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="sticky top-0 z-20">
              <tr>
                <SortHeader label="ID" col="id" active={sortKey === "id"} dir={sortDir} onSort={onSort} className="w-[5.5rem]" />
                <SortHeader
                  label="Verification status"
                  display={<span aria-hidden className="text-[0.7rem] leading-none">●</span>}
                  col="verification"
                  active={sortKey === "verification"}
                  dir={sortDir}
                  onSort={onSort}
                  align="center"
                  className="w-10"
                />
                <SortHeader label="Title" col="title" active={sortKey === "title"} dir={sortDir} onSort={onSort} />
                <SortHeader label="Topic" col="topic" active={sortKey === "topic"} dir={sortDir} onSort={onSort} className="w-[14rem]" />
                <SortHeader label="Diff" col="diff" active={sortKey === "diff"} dir={sortDir} onSort={onSort} align="right" className="w-[7rem]" />
                <th scope="col" className="w-[7rem] border-b border-border bg-background px-3 py-2 text-right text-[0.65rem] font-bold uppercase tracking-wider font-mono text-muted-foreground">
                  Hub
                </th>
                <th scope="col" className="w-12 border-b border-border bg-background px-2 py-2 text-center text-[0.65rem] font-bold uppercase tracking-wider font-mono text-muted-foreground" title="Reviewed">
                  Rev
                </th>
                <SortHeader label="Time" col="time" active={sortKey === "time"} dir={sortDir} onSort={onSort} align="right" className="w-[6rem]" />
                <th scope="col" className="w-8 border-b border-border bg-background px-2 py-2" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-16 text-center font-mono text-sm text-muted-foreground">
                    {topicFilter === "all"
                      ? "No proposals yet. You'll be notified when new ones appear."
                      : "No proposals for this topic."}
                  </td>
                </tr>
              )}
              {rows.map((p) => {
                const unseen = !p.viewerSeenAt;
                return (
                  <tr
                    key={p.id}
                    tabIndex={0}
                    onClick={() => open(p.id)}
                    onMouseEnter={() => {
                      router.prefetch(`/proposals/${p.id}`);
                      prefetchProposal(queryClient, p.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        open(p.id);
                      }
                    }}
                    className="group cursor-pointer border-b border-border align-top transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <td className="px-3 py-2.5 align-middle">
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold tabular-nums text-muted-foreground">#{p.id}</span>
                        {unseen && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" title="New — not yet viewed" aria-label="New" />
                        )}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 align-middle">
                      <span className="flex justify-center">
                        <VerifyDot status={p.verificationStatus} />
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="line-clamp-1 break-words text-sm font-medium leading-snug text-foreground">{p.title}</p>
                      {p.commentaryTitle && (
                        <p className="mt-0.5 line-clamp-1 break-words text-xs italic text-muted-foreground/80">
                          {p.commentaryTitle}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <span className="line-clamp-1 font-mono text-[0.7rem] text-muted-foreground">{p.topic}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right align-middle">
                      <DiffStat added={p.linesAdded} removed={p.linesRemoved} className="text-[0.7rem]" />
                    </td>
                    <td className="px-3 py-2.5 text-right align-middle">
                      {p.hub ? (
                        <span className="flex justify-end">
                          <HubStatus hub={p.hub} />
                        </span>
                      ) : (
                        <span className="font-mono text-[0.7rem] text-muted-foreground/40">&mdash;</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-center align-middle">
                      {p.reviewForumUrl ? (
                        <Check className="mx-auto h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-label="Reviewed" />
                      ) : (
                        <span className="font-mono text-[0.7rem] text-muted-foreground/30" aria-hidden>·</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right align-middle">
                      <span className="font-mono text-[0.7rem] tabular-nums text-muted-foreground">
                        {relativeTime(p.proposalTimestamp)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 align-middle">
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" aria-hidden />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
