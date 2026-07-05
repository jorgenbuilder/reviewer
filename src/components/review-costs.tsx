"use client";

// Realtime cost panel for a proposal review. Polls /api/proposals/[id]/costs on an interval
// (TanStack Query) so USD/token spend updates live while a Claude Code cloud session works on
// the review. Two sources: AI commentary (batch) and cloud-review sessions (OTel, ~10s cadence).
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CommentaryCost {
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  runs: number;
}
interface SessionCost {
  sessionId: string;
  source: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: number;
  model: string | null;
  updatedAt: string;
}
interface ReviewCostsData {
  commentary: CommentaryCost;
  sessions: SessionCost[];
  totals: { costUsd: number; tokens: number };
}

const usd = (n: number) =>
  n >= 1 ? `$${n.toFixed(2)}` : n > 0 ? `$${n.toFixed(4)}` : "$0.00";

function tokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function sessionTokens(s: SessionCost | CommentaryCost): number {
  return s.inputTokens + s.outputTokens + s.cacheReadTokens + s.cacheCreationTokens;
}

function relTime(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${Math.floor(secs)}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

async function fetchCosts(proposalId: string): Promise<ReviewCostsData> {
  const res = await fetch(`/api/proposals/${proposalId}/costs`);
  if (!res.ok) throw new Error("Failed to load costs");
  return res.json();
}

function useReviewCosts(proposalId: string) {
  return useQuery({
    queryKey: ["review-costs", proposalId],
    queryFn: () => fetchCosts(proposalId),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

function LiveDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`}
      title={active ? "updating" : "live"}
    />
  );
}

// Compact variant for the desktop meta-sidebar (rendered inside a MetaItem "Review cost").
export function ReviewCostMeta({ proposalId }: { proposalId: string }) {
  const { data, isFetching } = useReviewCosts(proposalId);
  const sessionsCost = data ? data.sessions.reduce((a, s) => a + s.costUsd, 0) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-semibold tabular-nums">{usd(data?.totals.costUsd ?? 0)}</span>
        <LiveDot active={isFetching} />
      </div>
      <div className="text-[0.65rem] tabular-nums text-muted-foreground">
        {tokens(data?.totals.tokens ?? 0)} tokens
      </div>
      {data && (data.commentary.runs > 0 || data.sessions.length > 0) && (
        <div className="mt-1.5 space-y-0.5 text-[0.65rem] text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <span>commentary</span>
            <span className="tabular-nums">{usd(data.commentary.costUsd)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>sessions ({data.sessions.length})</span>
            <span className="tabular-nums">{usd(sessionsCost)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReviewCosts({ proposalId }: { proposalId: string }) {
  const { data, isLoading, isError, isFetching } = useReviewCosts(proposalId);

  const hasAny =
    !!data && (data.totals.costUsd > 0 || data.sessions.length > 0 || data.commentary.runs > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            Review cost
            <span
              className={`inline-block h-2 w-2 rounded-full ${isFetching ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`}
              title={isFetching ? "updating" : "live"}
            />
          </CardTitle>
          {data && (
            <div className="text-right">
              <div className="text-2xl font-semibold tabular-nums">{usd(data.totals.costUsd)}</div>
              <div className="text-xs text-muted-foreground tabular-nums">{tokens(data.totals.tokens)} tokens</div>
            </div>
          )}
        </div>
        <CardDescription>AI commentary + Claude Code sessions, updated in realtime.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {isError && <div className="text-sm text-destructive">Couldn’t load costs.</div>}
        {data && !hasAny && (
          <div className="text-sm text-muted-foreground">No review costs recorded yet.</div>
        )}

        {data && hasAny && (
          <>
            {/* Source breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">AI commentary</div>
                <div className="mt-1 text-lg font-medium tabular-nums">{usd(data.commentary.costUsd)}</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {tokens(sessionTokens(data.commentary))} tokens · {data.commentary.runs} run{data.commentary.runs === 1 ? "" : "s"}
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Review sessions</div>
                <div className="mt-1 text-lg font-medium tabular-nums">
                  {usd(data.sessions.reduce((a, s) => a + s.costUsd, 0))}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {tokens(data.sessions.reduce((a, s) => a + sessionTokens(s), 0))} tokens · {data.sessions.length} session{data.sessions.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>

            {/* Per-session detail */}
            {data.sessions.length > 0 && (
              <div className="space-y-1.5">
                {data.sessions.map((s) => (
                  <div
                    key={s.sessionId}
                    className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-muted-foreground truncate">
                        {s.sessionId.slice(0, 8)}
                        {s.model ? ` · ${s.model}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {tokens(sessionTokens(s))} tokens · {relTime(s.updatedAt)}
                      </div>
                    </div>
                    <div className="font-medium tabular-nums">{usd(s.costUsd)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
