"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import { ExternalLink, Home, RotateCw } from "lucide-react";
import type { VerificationReportView } from "@/lib/verification-report";

const md: Components = {
  p: ({ node, ...props }) => <p className="my-2 leading-relaxed" {...props} />,
  ul: ({ node, ...props }) => <ul className="my-2 list-disc space-y-1 pl-4 marker:text-muted-foreground" {...props} />,
  ol: ({ node, ...props }) => <ol className="my-2 list-decimal space-y-1 pl-4 marker:text-muted-foreground" {...props} />,
  li: ({ node, ...props }) => <li className="pl-1 leading-relaxed" {...props} />,
  a: ({ node, ...props }) => <a className="underline" target="_blank" rel="noreferrer" {...props} />,
  code: ({ node, ...props }) => (
    <code className="break-words border border-border bg-muted px-1 py-0.5 font-mono text-[0.85em]" {...props} />
  ),
  pre: ({ node, ...props }) => (
    <pre
      className="my-2 whitespace-pre-wrap break-words border border-border bg-muted p-2 font-mono text-[0.75rem] leading-snug [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0"
      {...props}
    />
  ),
  h1: ({ node, ...props }) => <h2 className="mb-1 mt-4 text-sm font-semibold" {...props} />,
  h2: ({ node, ...props }) => <h2 className="mb-1 mt-4 text-sm font-semibold" {...props} />,
  h3: ({ node, ...props }) => <h3 className="mb-1 mt-3 text-sm font-semibold" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
};

const CAUSE_LABEL: Record<string, string> = {
  billing_or_auth: "Billing / credential",
  no_fix: "Auto-fix found nothing to change",
  gave_up: "Auto-fix gave up",
  hash_mismatch: "Hash mismatch",
  other: "Needs attention",
};

const fmt = (iso: string) => new Date(iso).toLocaleString();

export function VerificationReport({
  proposalId,
  report,
  unlocked,
}: {
  proposalId: string;
  report: VerificationReportView | null;
  unlocked: boolean;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    report?.retryRequestedAt ? "sent" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setState("sending");
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/retry-verification`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      setState("sent");
    } catch (e) {
      setError((e as Error).message);
      setState("error");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <article className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-background text-foreground">
        <header className="flex h-[38px] items-stretch border-y border-border font-mono text-xs text-muted-foreground">
          <Link href="/" aria-label="Home" className="flex items-center px-4 hover:bg-muted hover:text-foreground">
            <Home className="h-4 w-4" aria-hidden />
          </Link>
          <span className="flex items-center pr-2 text-muted-foreground/60" aria-hidden>/</span>
          <Link href={`/proposals/${proposalId}`} className="flex items-center pr-2 text-foreground hover:underline">
            #{proposalId}
          </Link>
          <span className="flex items-center text-muted-foreground/60" aria-hidden>/ verification</span>
        </header>

        {!report ? (
          <p className="px-4 py-6 font-mono text-xs text-muted-foreground">
            No verification report for this proposal.
          </p>
        ) : (
          <>
            <section className="border-b border-border px-4 py-3">
              <div className="font-mono text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                {CAUSE_LABEL[report.cause] ?? report.cause} · {fmt(report.reportedAt)}
              </div>
              <h1 className="mt-1 text-base font-semibold leading-snug">{report.summary}</h1>
              {report.runUrl && (
                <a
                  href={report.runUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 font-mono text-xs underline"
                >
                  Failed run <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              )}
            </section>

            {report.supersededBy && (
              <div className="border-b border-emerald-500/60 bg-emerald-500/10 px-4 py-2 font-mono text-xs text-emerald-700 dark:text-emerald-400">
                Newer activity since this report: {report.supersededBy.type.replace("verification_", "")} at{" "}
                {fmt(report.supersededBy.at)}.
              </div>
            )}

            <section className="flex-1 px-4 py-2 text-sm break-words">
              <ReactMarkdown components={md}>{report.report}</ReactMarkdown>
            </section>

            <footer className="sticky bottom-0 border-t border-border bg-background px-4 py-3">
              {!report.retryable ? (
                <p className="font-mono text-xs text-muted-foreground">
                  A hash mismatch is not retried automatically. Investigate before adopting.
                </p>
              ) : !unlocked ? (
                <p className="font-mono text-xs text-muted-foreground">
                  This device isn&apos;t unlocked.{" "}
                  <a
                    href={`/unlock?next=${encodeURIComponent(`/proposals/${proposalId}/verification`)}`}
                    className="font-bold text-foreground underline"
                  >
                    Unlock
                  </a>{" "}
                  to retry from here.
                </p>
              ) : (
                <>
                  <button
                    onClick={retry}
                    disabled={state === "sending"}
                    className="flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-4 py-3 font-mono text-sm font-bold uppercase text-background disabled:opacity-50"
                  >
                    <RotateCw className={`h-4 w-4 ${state === "sending" ? "animate-spin" : ""}`} aria-hidden />
                    {state === "sent" ? "Retry again" : "Fixed it, retry verification"}
                  </button>
                  {state === "sent" && (
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      Verification re-dispatched. You&apos;ll get a push if it fails again.
                    </p>
                  )}
                  {state === "error" && <p className="mt-2 font-mono text-xs text-destructive">Retry failed: {error}</p>}
                </>
              )}
            </footer>
          </>
        )}
      </article>
    </div>
  );
}
