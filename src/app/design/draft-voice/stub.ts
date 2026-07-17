// Shared stub content for the draft voice-control mockups (/design/draft-voice).
//
// Everything here is canned: a plausible NNS review draft (kept as structured
// blocks so the variants can mark AI edits per-block) and a scripted voice
// exchange. No API calls; the mockup pages are fully client-side.

export const PROPOSAL_ID = "138234";

export type BlockKind = "h1" | "vote" | "verified" | "h2" | "p";

export interface DraftBlock {
  id: string;
  kind: BlockKind;
  text: string;
}

export const DRAFT_BEFORE: DraftBlock[] = [
  { id: "title", kind: "h1", text: "Proposal 138234: Governance Canister Upgrade" },
  { id: "vote", kind: "vote", text: "Vote: ADOPT" },
  {
    id: "verified",
    kind: "verified",
    text: "✅ Build verified · sha256 8c4f19…e21a matches the release commit",
  },
  {
    id: "lead",
    kind: "p",
    text: "Routine governance upgrade: three merged changes, no interface breaks, and the release hash reproduces cleanly.",
  },
  { id: "h-changes", kind: "h2", text: "What changed" },
  {
    id: "fees",
    kind: "p",
    text: "Neuron fee accounting now rounds ledger fees up to the nearest e8s. The previous code truncated, undercounting fees by up to 1 e8s per disbursement.",
  },
  {
    id: "follow",
    kind: "p",
    text: "Follow relationships above the 15-followee cap are now rejected at ingress instead of failing later during processing.",
  },
  { id: "h-notes", kind: "h2", text: "Notes" },
  {
    id: "fee-math",
    kind: "p",
    text: "Fee math spot check: 3 disbursements at 10,000 e8s each gives 30,000 e8s in fees, matching the ledger transfer fee constant.",
  },
];

// Blocks the scripted edit replaces, keyed by block id.
export const DRAFT_EDIT: Record<string, string> = {
  vote: "Vote: REJECT",
  lead: "Reject: this proposal duplicates 138221, which already shipped the same commit, so executing it again is a no-op at best and re-runs migration hooks at worst.",
};

export const CHANGED_IDS = Object.keys(DRAFT_EDIT);

export function applyDraftEdit(blocks: DraftBlock[]): DraftBlock[] {
  return blocks.map((b) => (DRAFT_EDIT[b.id] ? { ...b, text: DRAFT_EDIT[b.id] } : b));
}

export interface Exchange {
  user: string; // spoken transcript
  reply: string; // AI response (text; glanceable, not read aloud)
  edits: boolean; // whether this exchange mutates the draft
  chips: { id: string; label: string }[]; // draft blocks the reply references
}

// The canned script every variant plays: exchange 1 edits the draft in place,
// exchange 2 verifies something and leaves the draft alone.
export const EXCHANGES: Exchange[] = [
  {
    user: "Change the vote to reject and lead with the duplicate proposal reason.",
    reply:
      "Done. The vote is now REJECT and the lead opens with the duplicate of 138221 rationale. Two blocks changed.",
    edits: true,
    chips: [
      { id: "vote", label: "Vote line" },
      { id: "lead", label: "Lead paragraph" },
    ],
  },
  {
    user: "Verify the fee math in the notes section.",
    reply:
      "Checked: 3 disbursements at 10,000 e8s each is 30,000 e8s, which matches the ledger transfer fee constant. No change needed.",
    edits: false,
    chips: [{ id: "fee-math", label: "Notes · fee math" }],
  },
];

// Simulated timings.
export const LISTEN_MS = 2800; // how long the "spoken" transcript takes to arrive
export const THINK_MS = 1900; // fake model latency before the reply lands
