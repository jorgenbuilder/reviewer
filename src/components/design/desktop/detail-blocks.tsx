"use client";

// Reusable content blocks for the desktop detail concepts. Each is a small,
// self-contained section built from the shared primitives. The three concepts
// arrange these blocks differently across columns/zones.

import { useState } from "react";
import type { ParsedProposal } from "@/lib/design-stub";
import { HubStatus } from "@/components/hub-status";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_ICON,
  Markdown,
  CollapsibleRow,
  CopyButton,
  LinkCell,
  DiffStat,
  VoteIndicator,
  StatusLabel,
  AlertTriangle,
  LinkIcon,
} from "./detail-shared";

// --- On-chain statement (always-open block, no collapsible chrome) ----------

export function OnchainBlock({ p }: { p: ParsedProposal }) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-medium text-foreground">
          {p.installMode && <span className="capitalize">{p.installMode} </span>}
          {p.onchain.canisterName}{" "}
          <span className="font-mono text-[0.8em] font-bold text-muted-foreground/60">
            {p.onchain.shortCommit}
          </span>
        </h2>
        <a
          href={p.onchain.dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View proposal on the ICP dashboard"
          title="View on ICP dashboard"
          className="ml-auto inline-flex h-7 w-7 items-center justify-center border border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <LinkIcon className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
      <Markdown className="mt-3 text-muted-foreground">{p.onchain.statement}</Markdown>
      <p className="mt-3 font-mono text-xs text-muted-foreground">{p.proposer}</p>
    </div>
  );
}

// --- Commit row + list ------------------------------------------------------

export function CommitRow({
  c,
  stickyTop,
}: {
  c: ParsedProposal["commits"][number];
  stickyTop?: number;
}) {
  const [open, setOpen] = useState(false);
  const hasReview = !!c.review;
  return (
    <CollapsibleRow
      open={open}
      onToggle={() => setOpen((o) => !o)}
      canToggle={hasReview}
      sticky={stickyTop !== undefined}
      stickyTop={stickyTop}
      title={
        <>
          <span className="font-mono font-normal">{c.hash}</span>
          {(c.added !== undefined || c.removed !== undefined) && (
            <span className="ml-auto">
              <DiffStat added={c.added} removed={c.removed} />
            </span>
          )}
        </>
      }
      actions={
        <>
          <CopyButton text={c.url} label={`Copy link to commit ${c.hash}`} />
          <LinkCell href={c.url} label={`Open commit ${c.hash} on GitHub`} size={3.5} />
        </>
      }
    >
      {hasReview && (
        <div className="px-3 pb-3 pl-[1.375rem]">
          <p className="break-words text-sm font-medium leading-snug text-foreground">{c.subject}</p>
          <Markdown className="mt-1 text-muted-foreground">{c.review!}</Markdown>
        </div>
      )}
    </CollapsibleRow>
  );
}

// Card variant of a commit (for the console grid). Self-contained; always shows
// the subject, expands to reveal the review.
export function CommitCard({ c }: { c: ParsedProposal["commits"][number] }) {
  const [open, setOpen] = useState(false);
  const hasReview = !!c.review;
  return (
    <div className="border border-border bg-background">
      <button
        type="button"
        onClick={() => hasReview && setOpen((o) => !o)}
        disabled={!hasReview}
        aria-expanded={hasReview ? open : undefined}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left",
          hasReview
            ? "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            : "cursor-default"
        )}
      >
        <span className="font-mono text-xs font-normal text-foreground">{c.hash}</span>
        <span className="ml-auto">
          <DiffStat added={c.added} removed={c.removed} />
        </span>
      </button>
      <div className="border-t border-border px-3 py-2">
        <p className="break-words text-xs font-medium leading-snug text-foreground">{c.subject}</p>
        {hasReview && open && (
          <Markdown className="mt-1.5 text-muted-foreground">{c.review!}</Markdown>
        )}
        {hasReview && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-1 font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            + AI review
          </button>
        )}
      </div>
    </div>
  );
}

// --- Commentary block (markup only — no collapsible chrome) -----------------

export function CommentaryBody({ commentary }: { commentary: NonNullable<ParsedProposal["commentary"]> }) {
  return (
    <div className="space-y-3 px-4 py-4">
      <p className="text-sm font-semibold leading-snug text-foreground">{commentary.title}</p>

      {commentary.analysisIncomplete && commentary.incompleteReason && (
        <p className="border-l-2 border-amber-500/60 bg-amber-500/5 py-1.5 pl-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
          {commentary.incompleteReason}
        </p>
      )}

      <Markdown className="text-muted-foreground">{commentary.overallSummary}</Markdown>

      {commentary.whyNow && (
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Why now
          </p>
          <Markdown className="mt-1 text-muted-foreground">{commentary.whyNow}</Markdown>
        </div>
      )}

      {commentary.confidenceNotes && (
        <p className="text-xs italic leading-relaxed text-muted-foreground">
          {commentary.confidenceNotes}
        </p>
      )}
    </div>
  );
}

export function IncompleteBadge() {
  return (
    <span className="inline-flex items-center gap-1 border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
      <AlertTriangle className="h-2.5 w-2.5" aria-hidden /> Incomplete
    </span>
  );
}

// --- Review activity block --------------------------------------------------

export function ActivityBody({ events }: { events: NonNullable<ParsedProposal["reviewActivity"]> }) {
  return (
    <ol className="px-4 py-3">
      {events.map((ev, i) => {
        const Icon = ACTIVITY_ICON[ev.kind];
        return (
          <li key={i} className="flex gap-2 py-1.5">
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm leading-snug text-foreground">
                {ev.url ? (
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground"
                  >
                    {ev.message}
                  </a>
                ) : (
                  ev.message
                )}
              </p>
              <p className="flex flex-wrap gap-x-3 font-mono text-[0.65rem] text-muted-foreground">
                <span>{new Date(ev.at).toLocaleString()}</span>
                {ev.meta?.turns !== undefined && <span>{ev.meta.turns} turns</span>}
                {ev.meta?.durationMs !== undefined && (
                  <span>{Math.round(ev.meta.durationMs / 1000)}s</span>
                )}
                {ev.meta?.costUsd !== undefined && <span>${ev.meta.costUsd.toFixed(2)}</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// --- Sources block ----------------------------------------------------------

export function SourcesBody({ sources }: { sources: NonNullable<NonNullable<ParsedProposal["commentary"]>["sources"]> }) {
  return (
    <ul className="space-y-1 px-4 py-3 text-sm">
      {sources.map((s) =>
        s.url ? (
          <li key={s.label}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1.5 break-words text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground"
            >
              <LinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 break-words">{s.label}</span>
            </a>
          </li>
        ) : (
          <li key={s.label} className="flex items-start gap-1.5 break-words text-muted-foreground">
            <LinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
            <span className="min-w-0 break-words">{s.label}</span>
          </li>
        )
      )}
    </ul>
  );
}

// --- Meta sidebar (shared by twocol + threezone) ----------------------------
//
// The at-a-glance panel: verification, vote tally, hub deadline, repo/forum
// links, diff totals, and section jump-links. `sections` drives the jump-list.

export function MetaSidebar({
  p,
  sections,
}: {
  p: ParsedProposal;
  sections: { id: string; label: string; count?: number }[];
}) {
  const totalAdded = p.commits.reduce((n, c) => n + (c.added ?? 0), 0);
  const totalRemoved = p.commits.reduce((n, c) => n + (c.removed ?? 0), 0);
  const hasDiff = p.commits.some((c) => c.added !== undefined || c.removed !== undefined);

  return (
    <div className="divide-y divide-border border-border">
      {/* Verification */}
      <MetaItem label="Verification">
        <div className="flex items-center justify-between gap-2">
          <StatusLabel verification={p.verification} />
          {p.verification.runUrl && (
            <a
              href={p.verification.runUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[0.65rem] text-muted-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:text-foreground hover:decoration-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              run ↗
            </a>
          )}
        </div>
      </MetaItem>

      {/* Vote */}
      <MetaItem label="Governance">
        <VoteIndicator vote={p.onchain.vote} />
      </MetaItem>

      {/* Hub deadline */}
      {p.hub && (
        <MetaItem label="Review hub">
          <HubStatus hub={p.hub} />
        </MetaItem>
      )}

      {/* Diff totals */}
      {hasDiff && (
        <MetaItem label="Diff total">
          <DiffStat added={totalAdded} removed={totalRemoved} />
        </MetaItem>
      )}

      {/* Links */}
      <MetaItem label="Links">
        <div className="flex flex-col gap-1.5 text-sm">
          <a
            href={p.repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {p.repo.owner}/{p.repo.name} ↗
          </a>
          <a
            href={p.onchain.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            ICP dashboard ↗
          </a>
          {p.forum.url && (
            <a
              href={p.forum.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              forum post ↗
            </a>
          )}
        </div>
      </MetaItem>

      {/* Jump links */}
      {sections.length > 0 && (
        <MetaItem label="Jump to">
          <nav className="flex flex-col gap-1">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center justify-between gap-2 font-mono text-xs text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span>{s.label}</span>
                {s.count !== undefined && (
                  <span className="tabular-nums text-muted-foreground/60">{s.count}</span>
                )}
              </a>
            ))}
          </nav>
        </MetaItem>
      )}
    </div>
  );
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <p className="mb-1.5 font-mono text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      {children}
    </div>
  );
}
