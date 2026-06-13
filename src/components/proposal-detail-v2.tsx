"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import {
  ExternalLink,
  ChevronDown,
  GitCommit,
  Copy,
  Check,
  Github,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedProposal } from "@/lib/design-stub";

// Pure presentational redesign of the proposal detail view.
//
// Mobile-first, edge-to-edge, no rounded corners, hairline dividers between
// sections. Renders entirely from a `ParsedProposal` prop — no data fetching.

interface ProposalDetailV2Props {
  proposal: ParsedProposal;
}

// --- Dense markdown renderer (tight spacing, no rounded corners) -----------

const mdComponents: Components = {
  a: ({ node, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground"
    />
  ),
  p: ({ node, ...props }) => (
    <p className="my-2 leading-relaxed first:mt-0 last:mb-0" {...props} />
  ),
  ul: ({ node, ...props }) => (
    <ul className="my-2 space-y-1 pl-4 list-disc marker:text-muted-foreground" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-muted-foreground" {...props} />
  ),
  li: ({ node, ...props }) => <li className="leading-relaxed pl-1" {...props} />,
  code: ({ node, className, children, ...props }) => (
    <code
      className="rounded-none border border-border bg-muted px-1 py-0.5 font-mono text-[0.85em]"
      {...props}
    >
      {children}
    </code>
  ),
  h1: ({ node, ...props }) => <h3 className="mt-3 mb-1 text-sm font-semibold" {...props} />,
  h2: ({ node, ...props }) => <h3 className="mt-3 mb-1 text-sm font-semibold" {...props} />,
  h3: ({ node, ...props }) => <h3 className="mt-3 mb-1 text-sm font-semibold" {...props} />,
  hr: ({ node, ...props }) => <hr className="my-3 border-border" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
};

function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("text-sm text-foreground", className)}>
      <ReactMarkdown components={mdComponents}>{children}</ReactMarkdown>
    </div>
  );
}

// --- Header icon button (small square, no rounded corners) -----------------

function IconButton({
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

// --- Verification status blip ----------------------------------------------
//
// A compact status dot rendered on the proposal-number row:
//   verified    -> solid green dot
//   pending     -> spinning loader ring
//   in_progress -> spinning loader ring; if a self-healing iteration is
//                  running, an orange circle with the iteration number sits
//                  inside the spinner
//   failed      -> solid red dot
//
// Clicking the blip rotates through the states locally so the owner can test
// every appearance without real verifier data. The rotation cycle is:
//   pending -> verified -> failed -> healing #1 -> #2 -> #3 -> (back to pending)

type BlipState =
  | { status: "pending" }
  | { status: "verified" }
  | { status: "failed" }
  | { status: "in_progress"; healingIteration?: number };

const BLIP_CYCLE: BlipState[] = [
  { status: "pending" },
  { status: "verified" },
  { status: "failed" },
  { status: "in_progress", healingIteration: 1 },
  { status: "in_progress", healingIteration: 2 },
  { status: "in_progress", healingIteration: 3 },
];

const BLIP_LABEL: Record<BlipState["status"], string> = {
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

function StatusBlip({
  verification,
}: {
  verification: ParsedProposal["verification"];
}) {
  // Start from the proposal's real state, then cycle on click for testing.
  const initial: BlipState =
    verification.status === "in_progress"
      ? { status: "in_progress", healingIteration: verification.healingIteration }
      : { status: verification.status };

  const [state, setState] = useState<BlipState>(initial);

  const advance = () => {
    setState((prev) => {
      const idx = BLIP_CYCLE.findIndex(
        (s) =>
          s.status === prev.status &&
          (s.status !== "in_progress" ||
            s.healingIteration ===
              (prev as { healingIteration?: number }).healingIteration)
      );
      return BLIP_CYCLE[(idx + 1) % BLIP_CYCLE.length];
    });
  };

  const healing =
    state.status === "in_progress" && state.healingIteration !== undefined;
  const label =
    state.status === "in_progress" && healing
      ? `Self-healing, iteration ${state.healingIteration}`
      : BLIP_LABEL[state.status];

  return (
    <button
      type="button"
      onClick={advance}
      aria-label={`${label} (tap to cycle status)`}
      title={`${label} — tap to cycle`}
      className="relative inline-flex h-9 w-9 items-center justify-center hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      {state.status === "verified" && (
        <span className="block h-3 w-3 rounded-full bg-emerald-500" aria-hidden />
      )}
      {state.status === "failed" && (
        <span className="block h-3 w-3 rounded-full bg-destructive" aria-hidden />
      )}
      {(state.status === "pending" || state.status === "in_progress") && (
        <span className="relative block h-5 w-5">
          <Spinner />
          {healing && (
            <span
              className="absolute inset-0 m-auto flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[0.55rem] font-bold leading-none text-white"
              aria-hidden
            >
              {state.healingIteration}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

// --- Copyable mono value ---------------------------------------------------

function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="group inline-flex max-w-full items-center gap-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      aria-label={`Copy ${label}`}
    >
      <span className="truncate font-mono text-xs text-foreground">{value}</span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      )}
    </button>
  );
}

// --- Section primitives ----------------------------------------------------

function Section({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-border px-4 py-4", className)}>
      {title && (
        <h2 className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-border/60 last:border-b-0">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

// --- Main component --------------------------------------------------------

export function ProposalDetailV2({ proposal: p }: ProposalDetailV2Props) {
  const [commentaryOpen, setCommentaryOpen] = useState(false);

  const hasTechFacts =
    p.canisterId || p.installMode || p.wasmHash || p.argHash !== undefined || p.diff;

  return (
    <article className="mx-auto w-full max-w-2xl bg-background text-foreground">
      {/* 1. Header */}
      <header>
        {/* Full-bleed segmented control bar: proposal number on the left, a
            flush row of buttons on the right sharing one edge-to-edge bottom
            border with vertical dividers between them. Status indicator is the
            leftmost button. */}
        <div className="flex items-stretch border-b border-border">
          <span className="flex items-center pl-4 pr-3 font-mono text-xs text-muted-foreground">
            #{p.proposalId}
          </span>
          <div className="ml-auto flex items-stretch border-l border-border">
            <StatusBlip verification={p.verification} />
            {p.repo.url && (
              <IconButton href={p.repo.url} label="View repository on GitHub">
                <Github className="h-4 w-4" aria-hidden />
              </IconButton>
            )}
            {p.forumPostUrl && (
              <IconButton href={p.forumPostUrl} label="View forum post">
                <MessageSquare className="h-4 w-4" aria-hidden />
              </IconButton>
            )}
          </div>
        </div>
        <div className="px-4 pb-4 pt-3">
          <h1 className="text-base font-semibold leading-snug tracking-tight sm:text-lg">
            {p.title}
          </h1>
          <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <dt className="sr-only">Topic</dt>
              <dd className="font-medium text-foreground/80">{p.topic}</dd>
            </div>
            <div className="flex items-center gap-1">
              <dt>Proposer</dt>
              <dd className="font-mono">{p.proposer}</dd>
            </div>
          </dl>
        </div>
      </header>

      {/* 2a. Highlight — "what this does" */}
      <section className="border-b border-border bg-muted/40 px-4 py-4">
        <h2 className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
          What this does
        </h2>
        <p className="text-[0.95rem] leading-relaxed text-foreground">{p.highlight}</p>
      </section>

      {/* 2b. Description sections (Features & Fixes, etc.) */}
      {p.description.map((sec, i) => (
        <Section key={`${sec.heading}-${i}`} title={sec.heading}>
          <Markdown>{sec.markdown}</Markdown>
        </Section>
      ))}

      {/* 2c. Proposer summary (full markdown) */}
      {p.summaryMarkdown.trim() && (
        <Section title="Summary">
          <Markdown className="text-muted-foreground">{p.summaryMarkdown}</Markdown>
        </Section>
      )}

      {/* 3. Technical facts */}
      {hasTechFacts && (
        <Section title="Technical">
          <dl>
            {p.canisterId && (
              <Fact label="Canister">
                <CopyValue value={p.canisterId} label="canister id" />
              </Fact>
            )}
            {p.installMode && (
              <Fact label="Install mode">
                <span className="font-mono text-xs">{p.installMode}</span>
              </Fact>
            )}
            {p.wasmHash && (
              <Fact label="WASM hash">
                <CopyValue value={p.wasmHash} label="WASM hash" />
              </Fact>
            )}
            <Fact label="Arg hash">
              {p.argHash ? (
                <CopyValue value={p.argHash} label="arg hash" />
              ) : (
                <span className="text-xs text-muted-foreground italic">none</span>
              )}
            </Fact>
            {p.diff && (
              <Fact label="Diff">
                <span className="font-mono text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400">+{p.diff.added}</span>{" "}
                  <span className="text-destructive">-{p.diff.removed}</span>
                </span>
              </Fact>
            )}
          </dl>
        </Section>
      )}

      {/* 4. Commits */}
      <Section title={`Commits · ${p.repo.owner}/${p.repo.name}`}>
        {p.previousCommit && (
          <p className="mb-2 font-mono text-[0.7rem] text-muted-foreground">
            {p.previousCommit.slice(0, 10)} → {p.targetCommit.slice(0, 10)}
          </p>
        )}
        <ul className="-mx-1">
          {p.commits.map((c) => (
            <li key={c.hash}>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 px-1 py-2 hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <GitCommit className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-snug text-foreground">{c.subject}</span>
                  <span className="mt-0.5 flex items-center gap-2 font-mono text-[0.7rem] text-muted-foreground">
                    <span>{c.hash}</span>
                    {c.verified ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3 w-3" aria-hidden /> verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                        unverified
                      </span>
                    )}
                  </span>
                </span>
                <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
        {p.commits.some((c) => !c.verified) && (
          <p className="mt-2 text-[0.7rem] leading-relaxed text-muted-foreground">
            Unverified commits were derived by hashing an embedded WASM and could not be matched to
            a source commit.
          </p>
        )}
      </Section>

      {/* 5. AI commentary (collapsible, secondary) */}
      {p.commentary && (
        <section className="border-b border-border">
          <button
            type="button"
            onClick={() => setCommentaryOpen((o) => !o)}
            aria-expanded={commentaryOpen}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
              AI commentary
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                commentaryOpen && "rotate-180"
              )}
              aria-hidden
            />
          </button>
          {commentaryOpen && (
            <div className="px-4 pb-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {p.commentary.summary}
              </p>
            </div>
          )}
        </section>
      )}

      {/* 6. Review action */}
      <div className="px-4 py-5">
        {p.reviewPostUrl ? (
          <a
            href={p.reviewPostUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-1.5 border border-border bg-muted px-4 py-2.5 text-sm font-medium hover:bg-muted/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            View posted review <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : (
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 border border-foreground bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Write review
          </button>
        )}
      </div>
    </article>
  );
}
