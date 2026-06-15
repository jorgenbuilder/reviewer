"use client";

// Variant C — Master-detail split.
//
// A persistent left list rail (compact rows) + a right pane that previews the
// selected proposal inline, with no navigation. Clicking a row updates the pane
// via React state. The preview body borrows detail idioms — the verification
// blip, the on-chain statement, and the VoteIndicator tally bar — populated from
// a full ParsedProposal fixture so the "keep context while triaging" idea reads
// as real.

import { useMemo, useState } from "react";
import { Check, ChevronRight, RotateCw, ExternalLink, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { HubStatus } from "@/components/hub-status";
import { stubListProposals, type StubListProposal } from "@/lib/design-stub-list";
import { getStubProposal } from "@/lib/design-stub";
import type { ParsedProposal } from "@/lib/design-stub";
import { ConceptSwitcher, DiffStat, VerifyDot, relativeTime } from "./shared";

// Map a list row's verification status to one of the three full fixtures so the
// preview pane shows believable, varied detail bodies without bespoke fixtures
// per row.
function fixtureForRow(p: StubListProposal): ParsedProposal {
  const base =
    p.verificationStatus === "verified"
      ? getStubProposal("upgrade")
      : p.verificationStatus === "failed"
        ? getStubProposal("legacy")
        : getStubProposal("install");
  // Overlay the row's own identity/meta so the pane matches the selected row.
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

const VOTE_META: Record<
  ParsedProposal["onchain"]["vote"]["status"],
  { label: string; dot: string; text: string }
> = {
  adopt: { label: "Adopt", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  reject: { label: "Reject", dot: "bg-destructive", text: "text-destructive" },
  open: { label: "Open", dot: "bg-amber-400", text: "text-amber-500" },
};

// Borrowed verbatim-in-spirit from proposal-detail-v2's VoteIndicator.
function VoteIndicator({ vote }: { vote: ParsedProposal["onchain"]["vote"] }) {
  const meta = VOTE_META[vote.status];
  const yesPct = Math.round(vote.yes * 100);
  const noPct = Math.round(vote.no * 100);
  const thresholdPct = Math.round(vote.threshold * 100);
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className={cn("flex items-center gap-1.5 text-sm font-semibold", meta.text)}>
          <span className={cn("h-2 w-2", meta.dot)} aria-hidden />
          {meta.label}
        </span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {yesPct}% yes &middot; {noPct}% no
        </span>
      </div>
      <div className="relative mt-2 h-2.5 w-full bg-muted" aria-hidden>
        <span className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${yesPct}%` }} />
        <span className="absolute inset-y-0 right-0 bg-destructive" style={{ width: `${noPct}%` }} />
        <span className="absolute inset-y-[-2px] w-px bg-foreground" style={{ left: `${thresholdPct}%` }} />
      </div>
      <div className="relative mt-1 h-3">
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-[0.65rem] tabular-nums text-muted-foreground"
          style={{ left: `${thresholdPct}%` }}
        >
          {thresholdPct}% threshold
        </span>
      </div>
    </div>
  );
}

// Compact left-rail row.
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
        active ? "bg-muted" : "hover:bg-muted/60",
        active && "border-l-2 border-l-foreground"
      )}
    >
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
          <Check className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Reviewed" />
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {p.hub && <HubStatus hub={p.hub} className="text-[0.7rem]" />}
          <VerifyDot status={p.verificationStatus} />
        </span>
      </div>
      <p className="mt-1 line-clamp-2 break-words text-[13px] font-medium leading-snug text-foreground">
        {p.title}
      </p>
      <div className="mt-1 flex items-center gap-1.5 font-mono text-[0.65rem] text-muted-foreground">
        <span className="truncate">{p.topic}</span>
        <span className="ml-auto shrink-0">{relativeTime(p.proposalTimestamp)}</span>
      </div>
    </button>
  );
}

function PreviewPane({ p }: { p: StubListProposal }) {
  const fx = useMemo(() => fixtureForRow(p), [p]);
  return (
    <div className="flex h-full flex-col">
      {/* Pane header — id, hub, verification blip + external links. Mirrors the
          detail page's segmented top bar. */}
      <div className="sticky top-0 z-10 flex h-[38px] items-stretch border-b border-border bg-background">
        <div className="flex min-w-0 flex-1 items-center gap-2 pl-3 font-mono text-xs">
          <span className="font-bold tabular-nums text-foreground">#{p.id}</span>
          <span className="truncate text-muted-foreground/70">{p.topic}</span>
        </div>
        {p.hub && (
          <span className="flex items-center pr-2">
            <HubStatus hub={p.hub} />
          </span>
        )}
        <span className="flex items-center border-l border-border px-3">
          <VerifyDot status={p.verificationStatus} />
        </span>
        <a
          href={fx.repo.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View repository on GitHub"
          title="View repository on GitHub"
          className="flex w-9 shrink-0 items-center justify-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <Github className="h-4 w-4" aria-hidden />
        </a>
        <a
          href={fx.onchain.dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on ICP dashboard"
          title="View on ICP dashboard"
          className="flex w-9 shrink-0 items-center justify-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Title block. */}
        <div className="border-b border-border px-4 py-4">
          <h1 className="break-words text-lg font-semibold leading-snug text-foreground">
            {p.title}
          </h1>
          <div className="mt-2 flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span>{relativeTime(p.proposalTimestamp)}</span>
            <span className="text-muted-foreground/40" aria-hidden>·</span>
            <DiffStat added={p.linesAdded} removed={p.linesRemoved} className="text-xs" />
          </div>
        </div>

        {/* On-chain statement + vote tally — borrowed detail idiom. */}
        <section className="border-b border-border px-4 py-4">
          <h2 className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
            {fx.installMode ? `${fx.installMode} ` : ""}
            {fx.onchain.canisterName}{" "}
            <span className="text-muted-foreground/60">{fx.onchain.shortCommit}</span>
          </h2>
          <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">
            {fx.onchain.statement}
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground/70">{fx.proposer}</p>
          <div className="mt-4">
            <VoteIndicator vote={fx.onchain.vote} />
          </div>
        </section>

        {/* AI commentary one-liner + summary. */}
        {fx.commentary && (
          <section className="border-b border-border px-4 py-4">
            <h2 className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
              AI commentary
            </h2>
            <p className="mt-2 text-sm font-semibold leading-snug text-foreground">
              {fx.commentary.title}
            </p>
            <p className="mt-1.5 line-clamp-4 break-words text-sm leading-relaxed text-muted-foreground">
              {fx.commentary.overallSummary}
            </p>
          </section>
        )}

        {/* Commits — flat hairline rows, mono hash + diff, matching detail. */}
        <section className="px-0 py-0">
          <h2 className="border-b border-border px-4 py-2 font-mono text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
            Commits <span className="text-muted-foreground/60">{fx.commits.length}</span>
          </h2>
          {fx.commits.map((c) => (
            <div
              key={c.hash}
              className="flex items-center gap-2 border-b border-border px-4 py-2.5"
            >
              <span className="font-mono text-xs text-foreground">{c.hash}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {c.subject}
              </span>
              {(c.added !== undefined || c.removed !== undefined) && (
                <DiffStat added={c.added ?? 0} removed={c.removed ?? 0} className="shrink-0 text-[0.7rem]" />
              )}
            </div>
          ))}
        </section>

        <div className="px-4 py-6 text-center font-mono text-[0.7rem] text-muted-foreground/50">
          Preview &middot; open the full review for activity, sources &amp; per-commit AI
        </div>
      </div>
    </div>
  );
}

export function ListSplit() {
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const topics = useMemo(
    () => Array.from(new Set(stubListProposals.map((p) => p.topic))).sort(),
    []
  );
  const filtered = useMemo(
    () =>
      topicFilter === "all"
        ? stubListProposals
        : stubListProposals.filter((p) => p.topic === topicFilter),
    [topicFilter]
  );
  const [selectedId, setSelectedId] = useState<string>(stubListProposals[0]?.id ?? "");
  const selected =
    filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? stubListProposals[0];
  const unseenCount = filtered.filter((p) => !p.viewerSeenAt).length;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <ConceptSwitcher active="c" />

      {/* Global top bar. */}
      <header className="flex h-[38px] shrink-0 items-stretch border-b border-border bg-background">
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

      {/* Split body: list rail (left) + preview pane (right). On narrow screens
          the rail goes full width and the pane drops below it. */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left rail. */}
        <div className="flex min-h-0 w-full shrink-0 flex-col border-b border-border lg:w-[22rem] lg:border-b-0 lg:border-r xl:w-[26rem]">
          {/* Topic filter rail. */}
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
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-16 text-center text-sm text-muted-foreground">
                No proposals for this topic.
              </div>
            ) : (
              filtered.map((p) => (
                <RailRow
                  key={p.id}
                  p={p}
                  active={selected?.id === p.id}
                  onSelect={() => setSelectedId(p.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right preview pane. */}
        <div className="min-h-0 min-w-0 flex-1">
          {selected ? (
            <PreviewPane key={selected.id} p={selected} />
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                Select a proposal <ChevronRight className="h-4 w-4" aria-hidden />
              </span>
            </div>
          )}
        </div>
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
