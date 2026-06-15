"use client";

// Unified desktop SPA prototype.
//
// The converged direction from the design session:
//   - Browse mode: a full-width rich data-table of all proposals.
//   - Click a proposal → Inspect mode: three resizable columns —
//       list rail (left) │ detail reading column (center) │ meta sidebar (right).
//   - Drag the rail↔content and content↔meta dividers to resize (persisted).
//   - Fully client-side; selection lives in state and syncs to the URL (?id=)
//     for deep-linking + browser back/forward. No page navigation.
//
// Stub-data only (additive, /design/desktop/app). Reuses the primitives the
// list + detail concept work already produced so it stays on-brand: hairline
// dividers, no radius, mono accents, existing colour semantics, dark-mode tokens.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RotateCw,
  ArrowLeft,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronRight,
  Github,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HubStatus } from "@/components/hub-status";
import { stubListProposals, type StubListProposal } from "@/lib/design-stub-list";
import { getStubProposal, type ParsedProposal } from "@/lib/design-stub";
import { VerifyDot, DiffStat, relativeTime } from "./shared";
import {
  CopyPageLink,
  StatusBlip,
  ForumButton,
  IconButton,
  CollapsibleRow,
} from "./detail-shared";
import {
  OnchainBlock,
  CommitRow,
  CommentaryBody,
  IncompleteBadge,
  ActivityBody,
  SourcesBody,
  MetaSidebar,
} from "./detail-blocks";

const BAR_H = 36; // h-9 top chrome

// "Protocol canister management should be the first category after all" — pin it
// to the front of the topic filter, the rest alphabetical.
const PRIORITY_TOPIC = "Protocol Canister Management";

function orderTopics(topics: string[]): string[] {
  const rest = topics.filter((t) => t !== PRIORITY_TOPIC).sort();
  return topics.includes(PRIORITY_TOPIC) ? [PRIORITY_TOPIC, ...rest] : rest;
}

// Map a list row to a full ParsedProposal fixture for the detail panes, overlaid
// with the row's own identity so the detail matches the selected row. (Same idea
// as the split concept — believable varied bodies without a fixture per row.)
function fixtureForRow(p: StubListProposal): ParsedProposal {
  const base =
    p.verificationStatus === "verified"
      ? getStubProposal("upgrade")
      : p.verificationStatus === "failed"
        ? getStubProposal("legacy")
        : getStubProposal("install");
  return {
    ...base,
    proposalId: p.id,
    title: p.title,
    topic: p.topic,
    verification: { ...base.verification, status: p.verificationStatus },
    hub: p.hub ?? undefined,
    diff:
      p.linesAdded != null || p.linesRemoved != null
        ? { added: p.linesAdded ?? 0, removed: p.linesRemoved ?? 0 }
        : base.diff,
    commentary:
      base.commentary && p.commentaryTitle
        ? { ...base.commentary, title: p.commentaryTitle }
        : base.commentary,
  };
}

// --- Resizable column width hook -------------------------------------------

function useResizableWidth({
  initial,
  min,
  max,
  storageKey,
  side,
}: {
  initial: number;
  min: number;
  max: number;
  storageKey: string;
  side: "left" | "right";
}) {
  const [width, setWidth] = useState(initial);
  const hydrated = useRef(false);

  // Load persisted width after mount (avoids SSR/client mismatch).
  useEffect(() => {
    const stored = Number(window.localStorage.getItem(storageKey));
    if (stored && !Number.isNaN(stored)) {
      // Intentional: persisted width is read after mount so the server and first
      // client render agree on `initial` (localStorage is client-only).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWidth(Math.min(max, Math.max(min, stored)));
    }
    hydrated.current = true;
  }, [storageKey, min, max]);

  useEffect(() => {
    if (hydrated.current) window.localStorage.setItem(storageKey, String(width));
  }, [width, storageKey]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = width;
      const move = (ev: PointerEvent) => {
        const delta = ev.clientX - startX;
        const raw = side === "left" ? startW + delta : startW - delta;
        setWidth(Math.min(max, Math.max(min, raw)));
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width, min, max, side]
  );

  const adjust = useCallback(
    (delta: number) => setWidth((w) => Math.min(max, Math.max(min, w + delta))),
    [min, max]
  );

  return { width, onPointerDown, adjust, min, max };
}

// Draggable AND keyboard-operable column divider. Advertises proper separator
// semantics (aria-valuenow/min/max) and supports ←/→ (Shift = larger step) plus
// Home/End to size the adjacent column to its min/max.
function ResizeHandle({
  onPointerDown,
  adjust,
  width,
  min,
  max,
  side,
  label,
  className,
}: {
  onPointerDown: (e: React.PointerEvent) => void;
  adjust: (delta: number) => void;
  width: number;
  min: number;
  max: number;
  side: "left" | "right";
  label: string;
  className?: string;
}) {
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    if (e.key === "Home") return adjust(min - width);
    if (e.key === "End") return adjust(max - width);
    const step = e.shiftKey ? 48 : 16;
    // The rail sits left of its handle, the meta sits right of its handle, so
    // arrow direction grows/shrinks each column intuitively.
    const grow = (e.key === "ArrowRight") === (side === "left");
    adjust(grow ? step : -step);
  };
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(width)}
      aria-valuemin={min}
      aria-valuemax={max}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cn(
        "group relative z-20 w-px shrink-0 cursor-col-resize bg-border outline-none focus-visible:bg-foreground",
        className
      )}
    >
      {/* Wide invisible hit area + hover/focus highlight. */}
      <span className="absolute inset-y-0 -left-1.5 -right-1.5 transition-colors group-hover:bg-foreground/15 group-focus-visible:bg-foreground/20" />
    </div>
  );
}

// --- Sorting (browse table) ------------------------------------------------

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

function sortRows(rows: StubListProposal[], key: SortKey, dir: SortDir): StubListProposal[] {
  const m = dir === "asc" ? 1 : -1;
  const cmp = (a: StubListProposal, b: StubListProposal): number => {
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
  /** Visual content for the header button (defaults to `label`). `label` is
      still used for the accessible name. */
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

// --- Compact rail row -------------------------------------------------------

function RailRow({
  p,
  active,
  onSelect,
}: {
  p: StubListProposal;
  active: boolean;
  onSelect: () => void;
}) {
  const unseen = !p.viewerSeenAt;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "block w-full border-b border-border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        active ? "bg-muted border-l-2 border-l-foreground" : "hover:bg-muted/60"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold tabular-nums text-muted-foreground">#{p.id}</span>
        {unseen && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" title="New — not yet viewed" aria-label="New" />
        )}
        {p.reviewForumUrl && (
          <Check className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Reviewed" />
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {p.hub && <HubStatus hub={p.hub} className="text-[0.7rem]" />}
          <VerifyDot status={p.verificationStatus} />
        </span>
      </div>
      <p className="mt-1 line-clamp-2 break-words text-[13px] font-medium leading-snug text-foreground">{p.title}</p>
      <div className="mt-1 flex items-center gap-1.5 font-mono text-[0.65rem] text-muted-foreground">
        <span className="truncate">{p.topic}</span>
        <span className="ml-auto shrink-0">{relativeTime(p.proposalTimestamp)}</span>
      </div>
    </button>
  );
}

// --- Detail reading column (center) ----------------------------------------

function DetailContent({ p }: { p: ParsedProposal }) {
  const [commentaryOpen, setCommentaryOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  // A meta-sidebar "jump to" link sets the section hash. Open the matching
  // collapsible (so the user doesn't land on a shut header) and scroll to it.
  useEffect(() => {
    const onHash = () => {
      const id = window.location.hash.replace("#", "");
      if (id === "commentary") setCommentaryOpen(true);
      if (id === "activity") setActivityOpen(true);
      if (id === "sources") setSourcesOpen(true);
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <>
      <section id="onchain" className="border-b border-border scroll-mt-2">
        <OnchainBlock p={p} />
      </section>

      <section id="commits" className="scroll-mt-2">
        <div className="sticky top-0 z-10 border-b border-border bg-muted/60 px-4 py-2 backdrop-blur">
          <h2 className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Commits <span className="text-muted-foreground/60">{p.commits.length}</span>
          </h2>
        </div>
        {p.commits.map((c) => (
          <CommitRow key={c.hash} c={c} stickyTop={0} />
        ))}
      </section>

      {p.commentary && (
        <section id="commentary" className="scroll-mt-2">
          <CollapsibleRow
            open={commentaryOpen}
            onToggle={() => setCommentaryOpen((o) => !o)}
            sticky
            stickyTop={0}
            title={
              <>
                AI commentary
                {p.commentary.analysisIncomplete && <IncompleteBadge />}
              </>
            }
          >
            <CommentaryBody commentary={p.commentary} />
          </CollapsibleRow>
        </section>
      )}

      {p.reviewActivity && p.reviewActivity.length > 0 && (
        <section id="activity" className="scroll-mt-2">
          <CollapsibleRow
            open={activityOpen}
            onToggle={() => setActivityOpen((o) => !o)}
            sticky
            stickyTop={0}
            title={
              <>
                Review activity
                <span className="font-normal text-muted-foreground/60">{p.reviewActivity.length}</span>
              </>
            }
          >
            <ActivityBody events={p.reviewActivity} />
          </CollapsibleRow>
        </section>
      )}

      {p.commentary?.sources && p.commentary.sources.length > 0 && (
        <section id="sources" className="scroll-mt-2">
          <CollapsibleRow
            open={sourcesOpen}
            onToggle={() => setSourcesOpen((o) => !o)}
            sticky
            stickyTop={0}
            title={
              <>
                Sources
                <span className="font-normal text-muted-foreground/60">{p.commentary.sources.length}</span>
              </>
            }
          >
            <SourcesBody sources={p.commentary.sources} />
          </CollapsibleRow>
        </section>
      )}
      <div className="h-24" />
    </>
  );
}

// --- Content top bar (per-proposal identity + actions) ----------------------

function ContentBar({
  p,
  onBack,
  backRef,
}: {
  p: ParsedProposal;
  onBack: () => void;
  backRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <div
      className="flex shrink-0 items-stretch border-b border-border bg-background"
      style={{ height: BAR_H }}
    >
      <button
        ref={backRef}
        type="button"
        onClick={onBack}
        aria-label="Back to all proposals"
        title="Back to all proposals"
        className="flex items-center px-3 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
      </button>
      <span className="flex items-center pr-2 font-mono text-xs text-muted-foreground/60" aria-hidden>
        /
      </span>
      <span className="flex items-center font-mono text-xs text-foreground">
        <CopyPageLink proposalId={p.proposalId} />
      </span>
      <span className="ml-3 hidden min-w-0 items-center truncate pr-3 text-sm text-muted-foreground lg:flex">
        {p.title}
      </span>
      {p.hub && (
        <span className="ml-auto flex items-center pr-3">
          <HubStatus hub={p.hub} />
        </span>
      )}
      <div className={cn("flex items-stretch border-l border-border", !p.hub && "ml-auto")}>
        <StatusBlip verification={p.verification} />
        {p.repo.url && (
          <IconButton href={p.repo.url} label="View repository on GitHub">
            <Github className="h-5 w-5" strokeWidth={1.6} aria-hidden />
          </IconButton>
        )}
        <ForumButton forum={p.forum} />
      </div>
    </div>
  );
}

// --- Browse table -----------------------------------------------------------

function BrowseTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  onSelect,
}: {
  rows: StubListProposal[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (c: SortKey) => void;
  onSelect: (id: string) => void;
}) {
  return (
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
            <th scope="col" className="w-8 border-b border-border bg-background px-2 py-2" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-3 py-16 text-center font-mono text-sm text-muted-foreground">
                No proposals match this filter.
              </td>
            </tr>
          )}
          {rows.map((p) => {
            const unseen = !p.viewerSeenAt;
            return (
              <tr
                key={p.id}
                id={`row-${p.id}`}
                tabIndex={0}
                onClick={() => onSelect(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(p.id);
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
                    <span className="font-mono text-[0.7rem] text-muted-foreground/30" aria-hidden>
                      ·
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right align-middle">
                  <span className="font-mono text-[0.7rem] tabular-nums text-muted-foreground">
                    {relativeTime(p.proposalTimestamp)}
                  </span>
                </td>
                <td className="px-2 py-2.5 align-middle">
                  <ChevronRight
                    className="h-4 w-4 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground"
                    aria-hidden
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// --- Topic filter chip ------------------------------------------------------

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

// --- Main SPA ---------------------------------------------------------------

export function DesktopApp({ initialSelectedId = null }: { initialSelectedId?: string | null }) {
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  // Seeded from the server-read ?id= so a deep-link's first paint already shows
  // the right view (no table→inspect flash).
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId && stubListProposals.some((p) => p.id === initialSelectedId)
      ? initialSelectedId
      : null
  );
  const [refreshing, setRefreshing] = useState(false);

  // Focus management on enter/exit inspect: only user-driven select() calls set
  // a pending target (URL-mount / popstate don't steal focus).
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<{ type: "back" } | { type: "row"; id: string } | null>(null);

  const rail = useResizableWidth({
    initial: 360,
    min: 260,
    max: 560,
    storageKey: "design.desktop.railWidth",
    side: "left",
  });
  const meta = useResizableWidth({
    initial: 320,
    min: 260,
    max: 480,
    storageKey: "design.desktop.metaWidth",
    side: "right",
  });

  // URL sync: read ?id= on mount + on back/forward; write on selection change.
  // An unresolvable id is stripped from the URL so a stale param can't linger.
  useEffect(() => {
    const apply = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (id && !stubListProposals.some((p) => p.id === id)) {
        params.delete("id");
        const qs = params.toString();
        window.history.replaceState({}, "", qs ? `?${qs}` : window.location.pathname);
        setSelectedId(null);
        return;
      }
      setSelectedId(id ?? null);
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);

  // Apply pending focus after the view swaps (focus only, no state).
  useEffect(() => {
    const pf = pendingFocus.current;
    if (!pf) return;
    pendingFocus.current = null;
    if (pf.type === "back") backBtnRef.current?.focus();
    else document.getElementById(`row-${pf.id}`)?.focus();
  }, [selectedId]);

  const select = useCallback((id: string | null) => {
    setSelectedId((prev) => {
      // Entering inspect → focus the back control; leaving → return focus to the
      // row we came from.
      pendingFocus.current = id ? { type: "back" } : prev ? { type: "row", id: prev } : null;
      return id;
    });
    const params = new URLSearchParams(window.location.search);
    if (id) params.set("id", id);
    else params.delete("id");
    const qs = params.toString();
    window.history.pushState({}, "", qs ? `?${qs}` : window.location.pathname);
  }, []);

  const onRefresh = useCallback(() => {
    // Prototype: stub data has nothing to refetch — give honest spin feedback.
    // Prod wires this to the real proposals refetch.
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 600);
  }, []);

  const orderedTopics = useMemo(
    () => orderTopics(Array.from(new Set(stubListProposals.map((p) => p.topic)))),
    []
  );

  const filtered = useMemo(
    () =>
      topicFilter === "all"
        ? stubListProposals
        : stubListProposals.filter((p) => p.topic === topicFilter),
    [topicFilter]
  );

  const sortedRows = useMemo(() => sortRows(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);
  const unseenCount = filtered.filter((p) => !p.viewerSeenAt).length;

  const selectedRow = selectedId ? stubListProposals.find((p) => p.id === selectedId) ?? null : null;
  const fixture = useMemo(() => (selectedRow ? fixtureForRow(selectedRow) : null), [selectedRow]);

  const onSort = (col: SortKey) => {
    if (col === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir(col === "title" || col === "topic" ? "asc" : "desc");
    }
  };

  const sections = fixture
    ? [
        { id: "onchain", label: "On-chain" },
        { id: "commits", label: "Commits", count: fixture.commits.length },
        ...(fixture.commentary ? [{ id: "commentary", label: "AI commentary" }] : []),
        ...(fixture.reviewActivity?.length
          ? [{ id: "activity", label: "Activity", count: fixture.reviewActivity.length }]
          : []),
        ...(fixture.commentary?.sources?.length
          ? [{ id: "sources", label: "Sources", count: fixture.commentary.sources.length }]
          : []),
      ]
    : [];

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Global top bar */}
      <header
        className="flex shrink-0 items-stretch border-b border-border bg-background"
        style={{ height: BAR_H }}
      >
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
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh proposals"
          title="Refresh"
          className="flex w-9 shrink-0 items-center justify-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          <RotateCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden />
        </button>
      </header>

      {/* Topic filter — global, both modes (Protocol Canister Management first) */}
      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border bg-background px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip active={topicFilter === "all"} onClick={() => setTopicFilter("all")}>
          All
        </FilterChip>
        {orderedTopics.map((t) => (
          <FilterChip key={t} active={topicFilter === t} onClick={() => setTopicFilter(t)}>
            {t}
          </FilterChip>
        ))}
      </div>

      {/* Body */}
      {fixture && selectedRow ? (
        <div className="flex min-h-0 flex-1">
          {/* List rail (lg+) */}
          <div
            style={{ width: rail.width }}
            className="hidden min-h-0 shrink-0 flex-col border-r border-border lg:flex"
          >
            <div
              className="flex shrink-0 items-center justify-between border-b border-border px-3"
              style={{ height: BAR_H }}
            >
              <button
                type="button"
                onClick={() => select(null)}
                className="flex items-center gap-1 font-mono text-[0.7rem] uppercase tracking-wide text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All
              </button>
              <span className="font-mono text-[0.7rem] tabular-nums text-muted-foreground/60">
                {filtered.length}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-12 text-center font-mono text-xs text-muted-foreground">
                  No proposals match this filter.
                </p>
              ) : (
                filtered.map((p) => (
                  <RailRow
                    key={p.id}
                    p={p}
                    active={p.id === selectedId}
                    onSelect={() => select(p.id)}
                  />
                ))
              )}
            </div>
          </div>

          <ResizeHandle
            onPointerDown={rail.onPointerDown}
            adjust={rail.adjust}
            width={rail.width}
            min={rail.min}
            max={rail.max}
            side="left"
            label="Resize list rail"
            className="hidden lg:block"
          />

          {/* Detail reading column */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <ContentBar p={fixture} onBack={() => select(null)} backRef={backBtnRef} />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DetailContent key={fixture.proposalId} p={fixture} />
            </div>
          </div>

          <ResizeHandle
            onPointerDown={meta.onPointerDown}
            adjust={meta.adjust}
            width={meta.width}
            min={meta.min}
            max={meta.max}
            side="right"
            label="Resize meta sidebar"
            className="hidden lg:block"
          />

          {/* Meta sidebar — shows alongside the rail from lg so the vote tally,
              diff total and dashboard link are never lost in the 1024–1279 band. */}
          <aside
            style={{ width: meta.width }}
            className="hidden min-h-0 shrink-0 flex-col overflow-y-auto lg:flex"
          >
            <MetaSidebar p={fixture} sections={sections} />
          </aside>
        </div>
      ) : (
        <BrowseTable
          rows={sortedRows}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          onSelect={select}
        />
      )}
    </div>
  );
}
