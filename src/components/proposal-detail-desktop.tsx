"use client";

// Desktop proposal detail — three resizable columns: list rail │ reading column
// │ meta sidebar. Shown at the `lg` breakpoint and up; below that the mobile
// ProposalDetailV2 renders instead (see the detail page). Renders the reading
// column + meta from the server-built ParsedProposal; the rail fetches the
// proposal list (shared cache) for context and cross-navigation.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedProposal } from "@/lib/design-stub";
import type { ProposalResponse } from "@/app/api/proposals/route";
import { HubStatus } from "@/components/hub-status";
import { fetchProposalsList, PROPOSALS_QUERY_KEY, prefetchProposal } from "@/lib/proposals-client";
import { VerifyDot, relativeTime } from "@/components/design/desktop/shared";
import {
  CopyPageLink,
  StatusBlip,
  ForumButton,
  IconButton,
  CollapsibleRow,
} from "@/components/design/desktop/detail-shared";
import {
  OnchainBlock,
  CommitRow,
  CommentaryBody,
  IncompleteBadge,
  ActivityBody,
  SourcesBody,
  MetaSidebar,
} from "@/components/design/desktop/detail-blocks";
import { useResizableWidth, ResizeHandle } from "@/components/desktop-resize";

const BAR_H = 38;

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isDesktop;
}

function RailRow({ p, active }: { p: ProposalResponse; active: boolean }) {
  const queryClient = useQueryClient();
  const unseen = !p.viewerSeenAt;
  return (
    <Link
      href={`/proposals/${p.id}`}
      onMouseEnter={() => prefetchProposal(queryClient, p.id)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block border-b border-border px-3 py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        active ? "bg-muted border-l-2 border-l-foreground" : "hover:bg-muted/60"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold tabular-nums text-muted-foreground">#{p.id}</span>
        {unseen && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" title="New — not yet viewed" aria-label="New" />
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
    </Link>
  );
}

function ContentBar({ p }: { p: ParsedProposal }) {
  return (
    <div className="flex shrink-0 items-stretch border-b border-border bg-background" style={{ height: BAR_H }}>
      <Link
        href="/"
        aria-label="Back to proposals"
        title="Back to proposals"
        className="flex items-center px-3 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <Home className="h-4 w-4" aria-hidden />
      </Link>
      <span className="flex items-center pr-2 font-mono text-xs text-muted-foreground/60" aria-hidden>/</span>
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

function DetailContent({ p }: { p: ParsedProposal }) {
  const [commentaryOpen, setCommentaryOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  // A meta-sidebar "jump to" link sets the section hash — open the matching
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

export function ProposalDetailDesktop({ proposal: p }: { proposal: ParsedProposal }) {
  const isDesktop = useIsDesktop();
  const { data: proposals = [] } = useQuery({
    queryKey: PROPOSALS_QUERY_KEY,
    queryFn: fetchProposalsList,
    enabled: isDesktop,
  });

  const rail = useResizableWidth({
    initial: 360,
    min: 260,
    max: 560,
    storageKey: "desktop.railWidth",
    side: "left",
  });
  const meta = useResizableWidth({
    initial: 320,
    min: 260,
    max: 480,
    storageKey: "desktop.metaWidth",
    side: "right",
  });

  const sections = [
    { id: "onchain", label: "On-chain" },
    { id: "commits", label: "Commits", count: p.commits.length },
    ...(p.commentary ? [{ id: "commentary", label: "AI commentary" }] : []),
    ...(p.reviewActivity?.length ? [{ id: "activity", label: "Activity", count: p.reviewActivity.length }] : []),
    ...(p.commentary?.sources?.length ? [{ id: "sources", label: "Sources", count: p.commentary.sources.length }] : []),
  ];

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <div className="flex min-h-0 flex-1">
        {/* List rail */}
        <div style={{ width: rail.width }} className="hidden min-h-0 shrink-0 flex-col border-r border-border lg:flex">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-3" style={{ height: BAR_H }}>
            <Link
              href="/"
              className="flex items-center gap-1 font-mono text-[0.7rem] uppercase tracking-wide text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <Home className="h-3.5 w-3.5" aria-hidden /> All
            </Link>
            <span className="font-mono text-[0.7rem] tabular-nums text-muted-foreground/60">{proposals.length || ""}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {proposals.map((row) => (
              <RailRow key={row.id} p={row} active={row.id === p.proposalId} />
            ))}
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

        {/* Reading column */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ContentBar p={p} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DetailContent p={p} />
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

        {/* Meta sidebar */}
        <aside style={{ width: meta.width }} className="hidden min-h-0 shrink-0 flex-col overflow-y-auto lg:flex">
          <MetaSidebar p={p} sections={sections} />
        </aside>
      </div>
    </div>
  );
}
