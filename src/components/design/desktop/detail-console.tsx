"use client";

// Variant C — Dashboard / command-bar.
//
// A full-width sticky command bar at top carries ALL the action buttons plus
// live verification status, vote summary, and hub deadline inline — using the
// width instead of cramming into a 672px strip. Below, a structured console:
// the on-chain statement spans full width, commits render in a responsive grid
// of cards, and commentary + (activity / sources) sit side-by-side. Less
// "document", more "review console".

import Link from "next/link";
import { Home, Github } from "lucide-react";
import type { ParsedProposal } from "@/lib/design-stub";
import { HubStatus } from "@/components/hub-status";
import { cn } from "@/lib/utils";
import {
  CopyPageLink,
  StatusBlip,
  StatusLabel,
  ForumButton,
  IconButton,
} from "./detail-shared";
import {
  OnchainBlock,
  CommitCard,
  CommentaryBody,
  IncompleteBadge,
  ActivityBody,
  SourcesBody,
} from "./detail-blocks";

// Inline vote chip for the command bar.
function VoteChip({ vote }: { vote: ParsedProposal["onchain"]["vote"] }) {
  const meta: Record<typeof vote.status, { label: string; dot: string; text: string }> = {
    adopt: { label: "Adopt", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
    reject: { label: "Reject", dot: "bg-destructive", text: "text-destructive" },
    open: { label: "Open", dot: "bg-amber-400", text: "text-amber-500" },
  };
  const m = meta[vote.status];
  const yesPct = Math.round(vote.yes * 100);
  const noPct = Math.round(vote.no * 100);
  const thresholdPct = Math.round(vote.threshold * 100);
  return (
    <div className="flex items-center gap-2">
      <span className={cn("flex items-center gap-1 text-xs font-semibold", m.text)}>
        <span className={cn("h-2 w-2", m.dot)} aria-hidden />
        {m.label}
      </span>
      <span className="relative hidden h-2 w-28 bg-muted md:block" aria-hidden>
        <span className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${yesPct}%` }} />
        <span className="absolute inset-y-0 right-0 bg-destructive" style={{ width: `${noPct}%` }} />
        <span className="absolute inset-y-[-2px] w-px bg-foreground" style={{ left: `${thresholdPct}%` }} />
      </span>
      <span className="font-mono text-[0.65rem] tabular-nums text-muted-foreground">
        {yesPct}/{noPct}
      </span>
    </div>
  );
}

function StatItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-center border-l border-border px-4">
      <span className="font-mono text-[0.55rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <span className="mt-0.5">{children}</span>
    </div>
  );
}

export function DetailConsole({ proposal: p }: { proposal: ParsedProposal }) {
  const totalAdded = p.commits.reduce((n, c) => n + (c.added ?? 0), 0);
  const totalRemoved = p.commits.reduce((n, c) => n + (c.removed ?? 0), 0);
  const hasDiff = p.commits.some((c) => c.added !== undefined || c.removed !== undefined);

  return (
    <div className="bg-background text-foreground">
      {/* Command bar — sticky, full width. Two rows: nav/title + actions, then
          a live stat strip. */}
      <div className="sticky top-0 z-30 border-b border-border bg-background">
        {/* Row 1: breadcrumb + title + action buttons */}
        <div className="flex items-stretch border-b border-border">
          <nav aria-label="Breadcrumb" className="flex items-stretch font-mono text-xs text-muted-foreground">
            <Link
              href="/"
              aria-label="Back to proposals"
              className="flex items-center px-4 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <Home className="h-4 w-4" aria-hidden />
            </Link>
            <span className="flex items-center pr-3 text-muted-foreground/60" aria-hidden>
              /
            </span>
            <CopyPageLink proposalId={p.proposalId} />
          </nav>
          <h1 className="ml-3 flex min-w-0 flex-1 items-center truncate py-2 pr-3 text-sm font-medium text-foreground">
            {p.title}
          </h1>
          <div className="flex items-stretch border-l border-border">
            <StatusBlip verification={p.verification} />
            {p.repo.url && (
              <IconButton href={p.repo.url} label="View repository on GitHub">
                <Github className="h-5 w-5" strokeWidth={1.6} aria-hidden />
              </IconButton>
            )}
            <ForumButton forum={p.forum} />
          </div>
        </div>

        {/* Row 2: live stat strip (verification / vote / hub / diff / commits) */}
        <div className="flex items-stretch overflow-x-auto">
          <div className="flex flex-col justify-center px-4 py-2">
            <span className="font-mono text-[0.55rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Canister
            </span>
            <span className="mt-0.5 text-sm font-medium">
              {p.installMode && <span className="capitalize">{p.installMode} </span>}
              {p.onchain.canisterName}{" "}
              <span className="font-mono text-xs font-bold text-muted-foreground/60">{p.onchain.shortCommit}</span>
            </span>
          </div>
          <StatItem label="Verification">
            <StatusLabel verification={p.verification} />
          </StatItem>
          <StatItem label="Governance">
            <VoteChip vote={p.onchain.vote} />
          </StatItem>
          {p.hub && (
            <StatItem label="Review hub">
              <HubStatus hub={p.hub} />
            </StatItem>
          )}
          {hasDiff && (
            <StatItem label="Diff total">
              <span className="font-mono text-xs font-bold tabular-nums">
                <span className="text-emerald-600 dark:text-emerald-400">+{totalAdded}</span>{" "}
                <span className="text-destructive">&minus;{totalRemoved}</span>
              </span>
            </StatItem>
          )}
          <StatItem label="Commits">
            <span className="font-mono text-xs font-bold tabular-nums">{p.commits.length}</span>
          </StatItem>
        </div>
      </div>

      {/* Console content area */}
      <div className="mx-auto w-full max-w-7xl">
        {/* On-chain statement — full width */}
        <section className="border-b border-border">
          <div className="border-b border-border bg-muted/40 px-4 py-2">
            <h2 className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              On-chain proposal
            </h2>
          </div>
          <OnchainBlock p={p} />
        </section>

        {/* Commits — responsive card grid */}
        <section className="border-b border-border">
          <div className="border-b border-border bg-muted/40 px-4 py-2">
            <h2 className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Commits <span className="text-muted-foreground/60">{p.commits.length}</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {p.commits.map((c) => (
              <CommitCard key={c.hash} c={c} />
            ))}
          </div>
        </section>

        {/* Commentary + (activity / sources) side by side */}
        <section className="lg:grid lg:grid-cols-2 lg:divide-x lg:divide-border">
          {p.commentary && (
            <div className="border-b border-border lg:border-b-0">
              <div className="border-b border-border bg-muted/40 px-4 py-2">
                <h2 className="flex items-center gap-2 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  AI commentary
                  {p.commentary.analysisIncomplete && <IncompleteBadge />}
                </h2>
              </div>
              <CommentaryBody commentary={p.commentary} />
            </div>
          )}

          <div className={cn(!p.commentary && "lg:col-span-2")}>
            {p.reviewActivity && p.reviewActivity.length > 0 && (
              <div className="border-b border-border">
                <div className="border-b border-border bg-muted/40 px-4 py-2">
                  <h2 className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Review activity <span className="text-muted-foreground/60">{p.reviewActivity.length}</span>
                  </h2>
                </div>
                <ActivityBody events={p.reviewActivity} />
              </div>
            )}
            {p.commentary?.sources && p.commentary.sources.length > 0 && (
              <div className="border-b border-border lg:border-b-0">
                <div className="border-b border-border bg-muted/40 px-4 py-2">
                  <h2 className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Sources <span className="text-muted-foreground/60">{p.commentary.sources.length}</span>
                  </h2>
                </div>
                <SourcesBody sources={p.commentary.sources} />
              </div>
            )}
          </div>
        </section>
        <div className="h-24" />
      </div>
    </div>
  );
}
