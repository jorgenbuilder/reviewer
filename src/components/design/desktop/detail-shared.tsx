"use client";

// Shared sub-components for the desktop proposal-detail design concepts.
//
// These are ADAPTED COPIES of the (non-exported) primitives in
// `src/components/proposal-detail-v2.tsx`, lifted here so the three desktop
// concepts (detail-twocol / detail-threezone / detail-console) can reuse them
// without importing private symbols. Prefixed `detail-` to avoid collision with
// the parallel list-page work in this directory.

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import {
  ChevronDown,
  Check,
  Copy,
  Github,
  Link as LinkIcon,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  MessageSquare,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedProposal } from "@/lib/design-stub";

// --- Activity icon map ------------------------------------------------------

export const ACTIVITY_ICON: Record<
  NonNullable<ParsedProposal["reviewActivity"]>[number]["kind"],
  typeof ShieldCheck
> = {
  verification: ShieldCheck,
  healing: RefreshCw,
  commentary: Sparkles,
  forum: MessageSquare,
  review: FileCheck,
};

// --- Dense markdown renderer ------------------------------------------------

const mdComponents: Components = {
  a: (props) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground"
    />
  ),
  p: (props) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0" {...props} />,
  ul: (props) => (
    <ul className="my-2 space-y-1 pl-4 list-disc marker:text-muted-foreground" {...props} />
  ),
  ol: (props) => (
    <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-muted-foreground" {...props} />
  ),
  li: (props) => <li className="leading-relaxed pl-1" {...props} />,
  code: ({ children, ...props }) => (
    <code
      {...props}
      className="rounded-none border border-border bg-muted px-1 py-0.5 font-mono text-[0.85em] break-words"
    >
      {children}
    </code>
  ),
  pre: (props) => (
    <pre
      className="my-2 whitespace-pre-wrap break-words border border-border bg-muted p-2 font-mono text-[0.75rem] leading-snug [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0"
      {...props}
    />
  ),
  h1: (props) => <h3 className="mt-3 mb-1 text-sm font-semibold" {...props} />,
  h2: (props) => <h3 className="mt-3 mb-1 text-sm font-semibold" {...props} />,
  h3: (props) => <h3 className="mt-3 mb-1 text-sm font-semibold" {...props} />,
  hr: (props) => <hr className="my-3 border-border" {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
};

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("text-sm text-foreground break-words", className)}>
      <ReactMarkdown components={mdComponents}>{children}</ReactMarkdown>
    </div>
  );
}

// --- Copy controls ----------------------------------------------------------

export function CopyPageLink({ proposalId }: { proposalId: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 900);
  };
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={copy}
        aria-label="Copy link to this proposal"
        className="text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        aria-current="page"
      >
        #{proposalId}
      </button>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Link copied" : "Copy link to this proposal"}
        className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Link copied" : ""}
      </span>
    </span>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 900);
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      title={label}
      className="flex w-9 shrink-0 items-center justify-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}

// --- Header icon button -----------------------------------------------------

export function IconButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </a>
  );
}

// --- Forum button -----------------------------------------------------------

type ForumState = ParsedProposal["forum"]["state"];

const FORUM_LABEL: Record<ForumState, string> = {
  none: "Searching for forum post…",
  discovered: "Forum post discovered — open it",
  draft: "Review posted (automated verification only) — open it",
  final: "Final review posted — open it",
};

export function ForumGlyph({ state }: { state: ForumState }) {
  const filled = state === "draft" || state === "final";
  const styles: Record<ForumState, string> = {
    none: "text-muted-foreground/40",
    discovered: "text-muted-foreground",
    draft: "text-amber-400",
    final: "text-emerald-500",
  };
  const path = "M3 4 H21 V16 H11 L6 20 V16 H3 Z";
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5", styles[state])}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.6}
      strokeLinejoin="miter"
      strokeLinecap="butt"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

export function ForumButton({ forum }: { forum: ParsedProposal["forum"] }) {
  const label = FORUM_LABEL[forum.state];
  const cls =
    "inline-flex h-9 w-9 items-center justify-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
  if (forum.url) {
    return (
      <a href={forum.url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={cls}>
        <ForumGlyph state={forum.state} />
      </a>
    );
  }
  return (
    <span role="img" aria-label={label} title={label} className={cn(cls, "cursor-default")}>
      <ForumGlyph state={forum.state} />
    </span>
  );
}

// --- Verification status blip -----------------------------------------------

const BLIP_LABEL: Record<ParsedProposal["verification"]["status"], string> = {
  pending: "Verification pending",
  verified: "Build verified",
  failed: "Verification failed",
  in_progress: "Verifying",
};

function Spinner() {
  return (
    <span
      className="block h-full w-full animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
      aria-hidden
    />
  );
}

export function StatusBlip({
  verification,
}: {
  verification: ParsedProposal["verification"];
}) {
  const status = verification.status;
  const healing = status === "in_progress" && verification.healingIteration !== undefined;
  const label = healing
    ? `Self-healing, iteration ${verification.healingIteration}`
    : BLIP_LABEL[status];

  const inner = (
    <>
      {status === "verified" && (
        <span className="block h-3 w-3 rounded-full bg-emerald-500" aria-hidden />
      )}
      {status === "failed" && (
        <span className="block h-3 w-3 rounded-full bg-destructive" aria-hidden />
      )}
      {(status === "pending" || status === "in_progress") && (
        <span className="relative block h-5 w-5">
          <Spinner />
          {healing && (
            <span
              className="absolute inset-0 m-auto flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[0.55rem] font-bold leading-none text-white"
              aria-hidden
            >
              {verification.healingIteration}
            </span>
          )}
        </span>
      )}
    </>
  );

  const base = "relative inline-flex h-9 w-9 items-center justify-center";
  if (verification.runUrl) {
    return (
      <a
        href={verification.runUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
        className={cn(base, "hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring")}
      >
        {inner}
      </a>
    );
  }
  return (
    <span role="img" aria-label={label} title={label} className={base}>
      {inner}
    </span>
  );
}

// Inline status label (text form of the blip) — useful in sidebars.
export function StatusLabel({ verification }: { verification: ParsedProposal["verification"] }) {
  const status = verification.status;
  const healing = status === "in_progress" && verification.healingIteration !== undefined;
  const map: Record<ParsedProposal["verification"]["status"], { text: string; cls: string }> = {
    verified: { text: "verified", cls: "text-emerald-600 dark:text-emerald-400" },
    failed: { text: "failed", cls: "text-destructive" },
    in_progress: { text: healing ? `healing #${verification.healingIteration}` : "verifying", cls: "text-orange-500" },
    pending: { text: "pending", cls: "text-amber-500" },
  };
  const m = map[status];
  return (
    <span className={cn("font-mono text-xs font-bold uppercase tracking-wide", m.cls)}>
      {m.text}
    </span>
  );
}

// --- Vote / governance tally indicator --------------------------------------

const VOTE_META: Record<
  ParsedProposal["onchain"]["vote"]["status"],
  { label: string; dot: string; text: string }
> = {
  adopt: {
    label: "Adopt",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  reject: {
    label: "Reject",
    dot: "bg-destructive",
    text: "text-destructive",
  },
  open: {
    label: "Open",
    dot: "bg-amber-400",
    text: "text-amber-500",
  },
};

export function VoteIndicator({ vote }: { vote: ParsedProposal["onchain"]["vote"] }) {
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
        <span
          className="absolute inset-y-0 left-0 bg-emerald-500"
          style={{ width: `${yesPct}%` }}
        />
        <span
          className="absolute inset-y-0 right-0 bg-destructive"
          style={{ width: `${noPct}%` }}
        />
        <span
          className="absolute inset-y-[-2px] w-px bg-foreground"
          style={{ left: `${thresholdPct}%` }}
        />
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

// --- Collapsible row --------------------------------------------------------
//
// Same primitive as proposal-detail-v2, but `stickyTop` is configurable so each
// concept can pin section headers below its own (different-height) top chrome.

export function CollapsibleRow({
  open,
  onToggle,
  canToggle = true,
  sticky = false,
  stickyTop = 0,
  title,
  actions,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  canToggle?: boolean;
  sticky?: boolean;
  /** px offset for the sticky header (height of the surrounding top chrome). */
  stickyTop?: number;
  title: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={cn(
          "flex items-stretch border-b border-border bg-background",
          sticky && "sticky z-10"
        )}
        style={sticky ? { top: stickyTop } : undefined}
      >
        <button
          type="button"
          onClick={() => canToggle && onToggle()}
          aria-expanded={canToggle ? open : undefined}
          disabled={!canToggle}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 px-3 py-3 text-left",
            canToggle
              ? "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              : "cursor-default"
          )}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              !open && "-rotate-90",
              !canToggle && "invisible"
            )}
            aria-hidden
          />
          <span className="flex min-w-0 flex-1 items-center gap-2 text-[15px] font-medium text-foreground">
            {title}
          </span>
        </button>
        {actions && <div className="flex items-stretch">{actions}</div>}
      </div>
      {open && children && <div className="border-b border-border pt-3">{children}</div>}
    </div>
  );
}

// --- Diff stat (mono +/−) ---------------------------------------------------

export function DiffStat({ added, removed }: { added?: number; removed?: number }) {
  if (added === undefined && removed === undefined) return null;
  return (
    <span className="font-mono text-[0.7rem] font-bold tabular-nums">
      <span className="text-emerald-600 dark:text-emerald-400">+{added ?? 0}</span>{" "}
      <span className="text-destructive">&minus;{removed ?? 0}</span>
    </span>
  );
}

// --- External-link cell (matches commit/onchain action cell) ----------------

export function LinkCell({ href, label, size = 4 }: { href: string; label: string; size?: number }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="flex w-9 shrink-0 items-center justify-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <LinkIcon className={cn(size === 4 ? "h-4 w-4" : "h-3.5 w-3.5")} aria-hidden />
    </a>
  );
}

export { Github, LinkIcon, AlertTriangle };
