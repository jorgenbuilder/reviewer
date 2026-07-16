// Review-hub status for a single proposal, read straight from the NNS Technical
// Review Hub canister (mhnfx-niaaa-aaaas-qdluq-cai, mainnet). Reads are anonymous
// — the reviewer principal is just an argument — so no auth/login is needed here.
//
// Status for jorgenbuilder's reviewer identity:
//   - "done"    → the proposal is in the reviewer's review history
//   - "miss"    → the proposal is in the reviewer's missed list (deadline passed,
//                 no review)
//   - "pending" → otherwise; carries the deadline so the UI can count down to it
//
// Interface mirrors interface/reviewer-hub.did in ../ii-automation (fetched live
// from chain). Timestamps are nanoseconds since epoch.
import "server-only";
import { HttpAgent, Actor } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { IDL } from "@dfinity/candid";

const HUB_CANISTER_ID = "mhnfx-niaaa-aaaas-qdluq-cai";
// jorgenbuilder's registered reviewer principal (id.ai). Reads pass it as an arg.
const REVIEWER_PRINCIPAL =
  "swkkr-obybt-jro3j-e522f-blc54-3wstw-7h7un-cfghi-4a7rf-45fus-jae";

const hubIdlFactory = () => {
  const Proposal = IDL.Record({
    creationDate: IDL.Int,
    deadline: IDL.Int,
    deadlineDate: IDL.Int,
    proposalId: IDL.Nat,
    timestamp: IDL.Int,
    title: IDL.Text,
    topic: IDL.Nat,
  });
  const Reviewer = IDL.Record({
    forumProfileUrl: IDL.Text,
    nickname: IDL.Text,
    principal: IDL.Principal,
  });
  const Review = IDL.Record({
    link: IDL.Text,
    proposalId: IDL.Nat,
    recommendation: IDL.Variant({ adopt: IDL.Null, reject: IDL.Null }),
    reviewer: Reviewer,
    status: IDL.Variant({ paid: IDL.Null, volunteer: IDL.Null }),
    timestamp: IDL.Int,
    topic: IDL.Nat,
  });
  return IDL.Service({
    // Proposals assigned to the reviewer with no review yet (and before deadline).
    getReviewerTodos: IDL.Func([IDL.Principal], [IDL.Vec(Proposal)], ["query"]),
    getReviewerReviewHistory: IDL.Func([IDL.Principal], [IDL.Vec(Review)], ["query"]),
    getReviewerMissedProposals: IDL.Func([IDL.Principal], [IDL.Vec(Proposal)], ["query"]),
  });
};

type HubRecommendation = { adopt: null } | { reject: null };

interface HubActor {
  getReviewerTodos: (p: Principal) => Promise<{ proposalId: bigint; deadline: bigint }[]>;
  getReviewerReviewHistory: (
    p: Principal
  ) => Promise<{ proposalId: bigint; recommendation: HubRecommendation }[]>;
  getReviewerMissedProposals: (p: Principal) => Promise<{ proposalId: bigint }[]>;
}

const recommendationOf = (r: HubRecommendation): "adopt" | "reject" =>
  "adopt" in r ? "adopt" : "reject";

let cachedActor: HubActor | null = null;
async function hubActor(): Promise<HubActor> {
  if (cachedActor) return cachedActor;
  const agent = await HttpAgent.create({ host: "https://icp-api.io" });
  cachedActor = Actor.createActor(hubIdlFactory, {
    agent,
    canisterId: HUB_CANISTER_ID,
  }) as unknown as HubActor;
  return cachedActor;
}

export type HubStatus =
  | { state: "done"; recommendation?: "adopt" | "reject" }
  | { state: "miss" }
  | { state: "pending"; deadlineMs: number };

/**
 * Hub review status for a proposal, for jorgenbuilder's reviewer identity.
 * "pending" only when the proposal is actually ASSIGNED to the reviewer and
 * unreviewed (a todo). Returns null if it isn't assigned/tracked or the read fails.
 */
export async function getHubStatus(proposalId: string): Promise<HubStatus | null> {
  try {
    const hub = await hubActor();
    const pid = BigInt(proposalId);
    const reviewer = Principal.fromText(REVIEWER_PRINCIPAL);
    const [history, missed, todos] = await Promise.all([
      hub.getReviewerReviewHistory(reviewer),
      hub.getReviewerMissedProposals(reviewer),
      hub.getReviewerTodos(reviewer),
    ]);
    const review = history.find((r) => r.proposalId === pid);
    if (review) return { state: "done", recommendation: recommendationOf(review.recommendation) };
    if (missed.some((p) => p.proposalId === pid)) return { state: "miss" };
    const todo = todos.find((p) => p.proposalId === pid);
    if (todo) return { state: "pending", deadlineMs: Number(todo.deadline / 1_000_000n) };
    return null; // not assigned to this reviewer
  } catch {
    return null;
  }
}

/**
 * Hub status for many proposals in one batch of reads (for the list page).
 * Three canister queries total — the reviewer's todos (assigned + unreviewed),
 * missed, and review history — keyed by proposal id (string). Only proposals
 * RELEVANT to the reviewer get a status; everything else is absent (so the list
 * and reminders never act on canisters the reviewer isn't assigned). Empty map
 * on failure.
 */
export async function getHubStatusMap(): Promise<Map<string, HubStatus>> {
  const map = new Map<string, HubStatus>();
  try {
    const hub = await hubActor();
    const reviewer = Principal.fromText(REVIEWER_PRINCIPAL);
    const [history, missed, todos] = await Promise.all([
      hub.getReviewerReviewHistory(reviewer),
      hub.getReviewerMissedProposals(reviewer),
      hub.getReviewerTodos(reviewer),
    ]);
    // Pending only for proposals actually assigned to the reviewer.
    for (const p of todos) {
      map.set(p.proposalId.toString(), {
        state: "pending",
        deadlineMs: Number(p.deadline / 1_000_000n),
      });
    }
    for (const p of missed) map.set(p.proposalId.toString(), { state: "miss" });
    for (const r of history)
      map.set(r.proposalId.toString(), {
        state: "done",
        recommendation: recommendationOf(r.recommendation),
      });
  } catch {
    // empty map — list simply renders without hub status
  }
  return map;
}
