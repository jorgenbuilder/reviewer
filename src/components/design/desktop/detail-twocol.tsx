"use client";

// Variant A — Two-column reading layout.
//
// A wide main reading column (on-chain statement, commits, AI commentary,
// review activity, sources) + a sticky right sidebar that keeps the high-value
// at-a-glance meta in view (verification, vote tally, hub deadline, links, diff
// totals, jump-links) while the main column scrolls.

import { useState } from "react";
import Link from "next/link";
import { Home, Github } from "lucide-react";
import type { ParsedProposal } from "@/lib/design-stub";
import { HubStatus } from "@/components/hub-status";
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

const BAR_H = 38; // top action bar height (px)

export function DetailTwoCol({ proposal: p }: { proposal: ParsedProposal }) {
  const [commentaryOpen, setCommentaryOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const sections = [
    { id: "onchain", label: "On-chain" },
    { id: "commits", label: "Commits", count: p.commits.length },
    ...(p.commentary ? [{ id: "commentary", label: "AI commentary" }] : []),
    ...(p.reviewActivity?.length ? [{ id: "activity", label: "Activity", count: p.reviewActivity.length }] : []),
    ...(p.commentary?.sources?.length ? [{ id: "sources", label: "Sources", count: p.commentary.sources.length }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl bg-background text-foreground">
      {/* Top action bar — sticky, full column width */}
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
        <span className="ml-4 hidden min-w-0 items-center truncate pr-3 text-sm text-muted-foreground md:flex">
          {p.title}
        </span>
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

      {/* Body: reading column + sticky meta sidebar */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main reading column */}
        <main className="min-w-0 border-border lg:border-r">
          <section id="onchain" className="border-b border-border scroll-mt-[38px]">
            <OnchainBlock p={p} />
          </section>

          <section id="commits" className="scroll-mt-[38px]">
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
            <section id="commentary" className="scroll-mt-[38px]">
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
            <section id="activity" className="scroll-mt-[38px]">
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
            <section id="sources" className="scroll-mt-[38px]">
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

        {/* Sticky meta sidebar (desktop only; stacks above on mobile) */}
        <aside className="hidden lg:block">
          <div className="sticky" style={{ top: BAR_H }}>
            <MetaSidebar p={p} sections={sections} />
          </div>
        </aside>
      </div>

      {/* Mobile fallback meta (below the reading column) */}
      <aside className="border-t border-border lg:hidden">
        <MetaSidebar p={p} sections={[]} />
      </aside>
    </div>
  );
}
