"use client";

// Client shell for the proposal detail page. The heavy ParsedProposal assembly
// (on-chain fetch + GitHub + DB) now lives behind /api/proposals/[id] and is
// read through TanStack Query, so revisiting or hover-prefetched proposals
// render instantly from the cache instead of blocking a server render on every
// navigation. The mobile/desktop detail views themselves are unchanged.
import { notFound } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ProposalSeenMarker } from "@/components/proposal-seen-marker";
import { ProposalDetailV2 } from "@/components/proposal-detail-v2";
import { ProposalDetailDesktop } from "@/components/proposal-detail-desktop";
import {
  fetchParsedProposal,
  proposalQueryKey,
  PROPOSAL_GC_TIME,
} from "@/lib/proposals-client";
import ProposalSkeleton from "@/app/proposals/[id]/loading";

export function ProposalDetailClient({ id }: { id: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: proposalQueryKey(id),
    queryFn: () => fetchParsedProposal(id),
    gcTime: PROPOSAL_GC_TIME,
  });

  if (isPending) return <ProposalSkeleton />;

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="border border-border px-6 py-5 text-center font-mono text-sm">
          <p className="text-destructive">Failed to load proposal #{id}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 border border-border px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (data === null) notFound();

  return (
    <div className="min-h-screen bg-background">
      <ProposalSeenMarker proposalId={id} />
      {/* Mobile keeps the existing detail view untouched; wide viewports get the
          three-column desktop layout. */}
      <div className="lg:hidden">
        <ProposalDetailV2 proposal={data} />
      </div>
      <div className="hidden lg:block">
        <ProposalDetailDesktop proposal={data} />
      </div>
    </div>
  );
}
