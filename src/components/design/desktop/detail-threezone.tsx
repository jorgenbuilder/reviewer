"use client";

// Variant B — Three-zone / master-detail.
//
// A persistent compact left rail (the recent-proposal queue, current one
// highlighted) + center content (on-chain statement, commits, commentary,
// activity, sources) + a right meta sidebar. The "never lose your place in the
// queue" power layout. Clicking a rail item swaps the highlighted/active id
// locally (no navigation) so the layout is testable without routing.

import { useState } from "react";
import Link from "next/link";
import { Home, Github } from "lucide-react";
import type { ParsedProposal } from "@/lib/design-stub";
import { stubListProposals } from "@/lib/design-stub-list";
import { HubStatus } from "@/components/hub-status";
import { cn } from "@/lib/utils";
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

const BAR_H = 38;

// Dot color for a queue row's verification status.
const RAIL_DOT: Record<string, string> = {
  verified: "bg-emerald-500",
  failed: "bg-destructive",
  in_progress: "bg-orange-500",
  pending: "bg-amber-400",
};

export function DetailThreeZone({ proposal: p }: { proposal: ParsedProposal }) {
  // The active rail item starts on the current proposal (matched by id).
  const [activeId, setActiveId] = useState(p.proposalId);
  const [commentaryOpen, setCommentaryOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const sections = [
    { id: "z-onchain", label: "On-chain" },
    { id: "z-commits", label: "Commits", count: p.commits.length },
    ...(p.commentary ? [{ id: "z-commentary", label: "AI commentary" }] : []),
    ...(p.reviewActivity?.length ? [{ id: "z-activity", label: "Activity", count: p.reviewActivity.length }] : []),
  ];

  return (
    <div className="bg-background text-foreground">
      {/* Top action bar — full viewport width */}
      <div
        className="sticky top-0 z-30 flex items-stretch border-b border-border bg-background"
        style={{ height: BAR_H }}
      >
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
        {p.hub && (
          <span className="ml-auto flex items-center pr-3">
            <HubStatus hub={p.hub} />
          </span>
        )}
        <div className={p.hub ? "flex items-stretch border-l border-border" : "ml-auto flex items-stretch border-l border-border"}>
          <StatusBlip verification={p.verification} />
          {p.repo.url && (
            <IconButton href={p.repo.url} label="View repository on GitHub">
              <Github className="h-5 w-5" strokeWidth={1.6} aria-hidden />
            </IconButton>
          )}
          <ForumButton forum={p.forum} />
        </div>
      </div>

      {/* Three zones: rail | center | meta. Rail+meta hidden on small screens. */}
      <div className="xl:grid xl:grid-cols-[300px_minmax(0,1fr)_300px]">
        {/* Left rail — the queue */}
        <aside className="hidden border-r border-border xl:block">
          <div className="sticky overflow-y-auto" style={{ top: BAR_H, maxHeight: `calc(100vh - ${BAR_H}px)` }}>
            <div className="border-b border-border bg-muted/40 px-3 py-2">
              <h2 className="font-mono text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Queue <span className="text-muted-foreground/60">{stubListProposals.length}</span>
              </h2>
            </div>
            <ul>
              {stubListProposals.map((q) => {
                const active = q.id === activeId;
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(q.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex w-full items-start gap-2 border-b border-border px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                        active ? "bg-muted" : "hover:bg-muted/50"
                      )}
                    >
                      <span
                        className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", RAIL_DOT[q.verificationStatus] ?? "bg-muted-foreground")}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-[0.7rem] text-muted-foreground">#{q.id}</span>
                          {q.hub && <HubStatus hub={q.hub} className="text-[0.65rem]" />}
                          {q.viewerSeenAt === null && (
                            <span className="font-mono text-[0.55rem] font-bold uppercase tracking-wide text-emerald-500">new</span>
                          )}
                        </span>
                        <span className={cn("mt-0.5 block truncate text-xs leading-snug", active ? "font-medium text-foreground" : "text-muted-foreground")}>
                          {q.title}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Center content */}
        <main className="min-w-0 border-border xl:border-r">
          {activeId !== p.proposalId && (
            <p className="border-b border-border bg-amber-500/10 px-4 py-2 font-mono text-[0.7rem] text-amber-700 dark:text-amber-300">
              Previewing #{activeId} from the queue — detail shown below is the loaded proposal #{p.proposalId} (rail selection is a demo no-op).
            </p>
          )}

          <section id="z-onchain" className="border-b border-border scroll-mt-[38px]">
            <OnchainBlock p={p} />
          </section>

          <section id="z-commits" className="scroll-mt-[38px]">
            <div className="border-b border-border bg-muted/40 px-4 py-2">
              <h2 className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Commits <span className="text-muted-foreground/60">{p.commits.length}</span>
              </h2>
            </div>
            {p.commits.map((c) => (
              <CommitRow key={c.hash} c={c} stickyTop={BAR_H} />
            ))}
          </section>

          {p.commentary && (
            <section id="z-commentary" className="scroll-mt-[38px]">
              <CollapsibleRow
                open={commentaryOpen}
                onToggle={() => setCommentaryOpen((o) => !o)}
                sticky
                stickyTop={BAR_H}
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
            <section id="z-activity" className="scroll-mt-[38px]">
              <CollapsibleRow
                open={activityOpen}
                onToggle={() => setActivityOpen((o) => !o)}
                sticky
                stickyTop={BAR_H}
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
            <section className="scroll-mt-[38px]">
              <CollapsibleRow
                open={sourcesOpen}
                onToggle={() => setSourcesOpen((o) => !o)}
                sticky
                stickyTop={BAR_H}
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
        </main>

        {/* Right meta sidebar */}
        <aside className="hidden xl:block">
          <div className="sticky" style={{ top: BAR_H }}>
            <MetaSidebar p={p} sections={sections} />
          </div>
        </aside>
      </div>

      {/* Below-xl fallback meta */}
      <aside className="border-t border-border xl:hidden">
        <MetaSidebar p={p} sections={[]} />
      </aside>
    </div>
  );
}
