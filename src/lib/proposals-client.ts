import type { ProposalResponse } from "@/app/api/proposals/route";

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

// "Protocol Canister Management should be the first category." Pin it to the
// front of the topic filter; the rest follow alphabetically.
const PRIORITY_TOPIC = "Protocol Canister Management";

export function orderTopics(topics: string[]): string[] {
  const rest = topics.filter((t) => t !== PRIORITY_TOPIC).sort();
  return topics.includes(PRIORITY_TOPIC) ? [PRIORITY_TOPIC, ...rest] : rest;
}
