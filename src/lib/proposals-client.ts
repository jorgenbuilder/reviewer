import type { QueryClient } from "@tanstack/react-query";
import type { ProposalResponse } from "@/app/api/proposals/route";
import type { ParsedProposal } from "@/lib/design-stub";

// Client-side fetch for the proposals list. Shares the ["proposals"] query key
// with ProposalListV2 so the mobile list, the desktop table, and the detail rail
// all read one cached response.
export const PROPOSALS_QUERY_KEY = ["proposals"] as const;

export async function fetchProposalsList(): Promise<ProposalResponse[]> {
  const res = await fetch("/api/proposals");
  if (!res.ok) throw new Error("Failed to fetch proposals");
  const data = await res.json();
  return (data.proposals ?? []) as ProposalResponse[];
}

// Detail payload for a single proposal. Keyed per-id so once fetched (or hover-
// prefetched from a list), switching to that proposal renders instantly from the
// cache while a background refetch keeps it current. `null` means a confirmed 404.
export const proposalQueryKey = (id: string) => ["proposal", id] as const;

// Keep detail payloads around well past unmount so bouncing between proposals
// stays instant for a whole review session (default gcTime is only 5 min).
export const PROPOSAL_GC_TIME = 30 * 60 * 1000;

export async function fetchParsedProposal(id: string): Promise<ParsedProposal | null> {
  const res = await fetch(`/api/proposals/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch proposal #${id}`);
  return (await res.json()) as ParsedProposal;
}

// Fire-and-forget hover prefetch; no-op when the cache entry is still fresh.
export function prefetchProposal(queryClient: QueryClient, id: string): void {
  void queryClient.prefetchQuery({
    queryKey: proposalQueryKey(id),
    queryFn: () => fetchParsedProposal(id),
    gcTime: PROPOSAL_GC_TIME,
  });
}

// "Protocol Canister Management should be the first category." Pin it to the
// front of the topic filter; the rest follow alphabetically.
const PRIORITY_TOPIC = "Protocol Canister Management";

export function orderTopics(topics: string[]): string[] {
  const rest = topics.filter((t) => t !== PRIORITY_TOPIC).sort();
  return topics.includes(PRIORITY_TOPIC) ? [PRIORITY_TOPIC, ...rest] : rest;
}
