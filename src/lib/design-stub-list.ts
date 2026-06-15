// Local design-session stub data for the redesigned desktop PROPOSAL LIST.
//
// Additive and NOT wired into the live app. Feeds the desktop design playground
// routes under /design/desktop/* so list concepts can render a realistic,
// varied feed without hitting /api/proposals.
//
// The shape mirrors the `Proposal` interface in proposal-list-v2.tsx (the row
// the live list renders). Keep them in sync if that interface changes.

import type { VerificationStatus } from "@/lib/github";
import type { HubStatusValue } from "@/components/hub-status";

export interface StubListProposal {
  id: string;
  title: string;
  topic: string;
  verificationStatus: VerificationStatus;
  /** ISO string when the viewer last opened it, or null if never (→ "new"). */
  viewerSeenAt: string | null;
  /** Forum URL of our posted review, or null if not reviewed. */
  reviewForumUrl: string | null;
  reviewedAt: string | null;
  /** AI commentary one-liner, or null. */
  commentaryTitle: string | null;
  /** ISO string of the on-chain proposal submission time. */
  proposalTimestamp: string | null;
  linesAdded: number | null;
  linesRemoved: number | null;
  hub: HubStatusValue | null;
}

// Deadlines are expressed relative to a fixed "now" so countdowns look sane in
// the playground without depending on the real clock. Today (stub) ≈ 2026-06-14.
const D = (y: number, mo: number, d: number, h = 12, mi = 0) =>
  Date.UTC(y, mo, d, h, mi, 0);

export const stubListProposals: StubListProposal[] = [
  {
    id: "142271",
    title: "Upgrade the Governance Canister to Commit 1a9f0c2",
    topic: "Protocol Canister Management",
    verificationStatus: "in_progress",
    viewerSeenAt: null,
    reviewForumUrl: null,
    reviewedAt: null,
    commentaryTitle: "Adds periodic neuron-maturity disbursement to the NNS",
    proposalTimestamp: "2026-06-14T08:12:00Z",
    linesAdded: 318,
    linesRemoved: 44,
    hub: { state: "pending", deadlineMs: D(2026, 5, 16, 8, 0) },
  },
  {
    id: "142270",
    title: "Add NNS canister: engine-controller",
    topic: "Protocol Canister Management",
    verificationStatus: "pending",
    viewerSeenAt: null,
    reviewForumUrl: null,
    reviewedAt: null,
    commentaryTitle: "New privileged canister, installed inert pending authority",
    proposalTimestamp: "2026-06-14T06:40:00Z",
    linesAdded: 612,
    linesRemoved: 0,
    hub: { state: "pending", deadlineMs: D(2026, 5, 15, 18, 0) },
  },
  {
    id: "142265",
    title: "Upgrade the Registry Canister to Commit 8facd56",
    topic: "Protocol Canister Management",
    verificationStatus: "verified",
    viewerSeenAt: "2026-06-13T20:00:00Z",
    reviewForumUrl: "https://forum.dfinity.org/t/nns-updates-2026-06-12/52001/8",
    reviewedAt: "2026-06-12T15:02:00Z",
    commentaryTitle: "engine-controller authorization for CloudEngine subnets",
    proposalTimestamp: "2026-06-12T14:02:00Z",
    linesAdded: 40,
    linesRemoved: 6,
    hub: { state: "done" },
  },
  {
    id: "142260",
    title: "Elect new IC/Replica revision (commit 7d3e9b1)",
    topic: "IC OS Version Election",
    verificationStatus: "verified",
    viewerSeenAt: "2026-06-13T11:00:00Z",
    reviewForumUrl: "https://forum.dfinity.org/t/proposals-to-elect-7d3e9b1/51990/3",
    reviewedAt: "2026-06-11T09:30:00Z",
    commentaryTitle: "Routine GuestOS bump; consensus + crypto deps refreshed",
    proposalTimestamp: "2026-06-11T08:00:00Z",
    linesAdded: 1240,
    linesRemoved: 880,
    hub: { state: "done" },
  },
  {
    id: "142255",
    title: "Set authorized subnets for cycles minting canister",
    topic: "Subnet Management",
    verificationStatus: "verified",
    viewerSeenAt: "2026-06-12T16:30:00Z",
    reviewForumUrl: null,
    reviewedAt: null,
    commentaryTitle: "Adds two app subnets to the CMC routing table",
    proposalTimestamp: "2026-06-10T19:20:00Z",
    linesAdded: 8,
    linesRemoved: 2,
    hub: { state: "pending", deadlineMs: D(2026, 5, 14, 23, 0) },
  },
  {
    id: "142248",
    title: "Upgrade SNS Governance to Commit c41a77e for the OpenChat SNS",
    topic: "Service Nervous System Management",
    verificationStatus: "verified",
    viewerSeenAt: "2026-06-12T10:00:00Z",
    reviewForumUrl: "https://forum.dfinity.org/t/openchat-sns-upgrade/51970/2",
    reviewedAt: "2026-06-09T14:00:00Z",
    commentaryTitle: "Proposal-topic critical-flag support for SNS neurons",
    proposalTimestamp: "2026-06-09T12:00:00Z",
    linesAdded: 196,
    linesRemoved: 73,
    hub: { state: "done" },
  },
  {
    id: "142240",
    title: "Change subnet membership: add node to subnet tdb26",
    topic: "Subnet Management",
    verificationStatus: "verified",
    viewerSeenAt: "2026-06-11T22:00:00Z",
    reviewForumUrl: null,
    reviewedAt: null,
    commentaryTitle: null,
    proposalTimestamp: "2026-06-09T07:45:00Z",
    linesAdded: 3,
    linesRemoved: 1,
    hub: { state: "miss" },
  },
  {
    id: "142233",
    title: "Upgrade the Cycles Ledger Canister to Commit 5b0d2af",
    topic: "Protocol Canister Management",
    verificationStatus: "failed",
    viewerSeenAt: "2026-06-10T09:00:00Z",
    reviewForumUrl: "https://forum.dfinity.org/t/cycles-ledger-upgrade/51955/5",
    reviewedAt: "2026-06-08T18:00:00Z",
    commentaryTitle: "Build did not reproduce — WASM hash mismatch flagged",
    proposalTimestamp: "2026-06-08T16:30:00Z",
    linesAdded: 524,
    linesRemoved: 311,
    hub: { state: "miss" },
  },
  {
    id: "142228",
    title: "Motion: adopt a quarterly cadence for node-provider audits",
    topic: "Governance",
    verificationStatus: "pending",
    viewerSeenAt: "2026-06-09T13:00:00Z",
    reviewForumUrl: null,
    reviewedAt: null,
    commentaryTitle: "Non-technical motion; no canister payload to verify",
    proposalTimestamp: "2026-06-07T15:00:00Z",
    linesAdded: null,
    linesRemoved: null,
    hub: null,
  },
  {
    id: "142219",
    title: "Upgrade the Ledger Canister to Commit 9e1c4d0",
    topic: "Protocol Canister Management",
    verificationStatus: "verified",
    viewerSeenAt: "2026-06-08T08:00:00Z",
    reviewForumUrl: "https://forum.dfinity.org/t/ledger-upgrade-9e1c4d0/51940/2",
    reviewedAt: "2026-06-06T12:00:00Z",
    commentaryTitle: "ICRC-3 block certification path enabled by default",
    proposalTimestamp: "2026-06-06T10:00:00Z",
    linesAdded: 87,
    linesRemoved: 19,
    hub: { state: "done" },
  },
  {
    id: "142210",
    title: "Elect new HostOS revision (commit 2c8f1a3)",
    topic: "IC OS Version Election",
    verificationStatus: "verified",
    viewerSeenAt: "2026-06-07T17:00:00Z",
    reviewForumUrl: null,
    reviewedAt: null,
    commentaryTitle: null,
    proposalTimestamp: "2026-06-05T20:00:00Z",
    linesAdded: 410,
    linesRemoved: 290,
    hub: { state: "done" },
  },
  {
    id: "142201",
    title: "Add node provider: Aviate Labs (self-declaration + identity)",
    topic: "Participant Management",
    verificationStatus: "pending",
    viewerSeenAt: "2026-06-06T09:00:00Z",
    reviewForumUrl: null,
    reviewedAt: null,
    commentaryTitle: "Onboards a new node provider; identity docs attached",
    proposalTimestamp: "2026-06-04T11:00:00Z",
    linesAdded: null,
    linesRemoved: null,
    hub: null,
  },
  {
    id: "142188",
    title: "Upgrade SNS-W (SNS Wasm Modules) canister",
    topic: "Service Nervous System Management",
    verificationStatus: "failed",
    viewerSeenAt: "2026-06-05T14:00:00Z",
    reviewForumUrl: "https://forum.dfinity.org/t/nns-updates-legacy/12345/7",
    reviewedAt: "2026-06-03T13:00:00Z",
    commentaryTitle: null,
    proposalTimestamp: "2026-06-03T09:00:00Z",
    linesAdded: null,
    linesRemoved: null,
    hub: { state: "miss" },
  },
  {
    id: "142175",
    title: "Update node rewards table for Q2 2026",
    topic: "Node Admin",
    verificationStatus: "verified",
    viewerSeenAt: "2026-06-04T10:00:00Z",
    reviewForumUrl: "https://forum.dfinity.org/t/node-rewards-q2-2026/51900/4",
    reviewedAt: "2026-06-02T16:00:00Z",
    commentaryTitle: "Adjusts XDR-denominated rewards across 11 regions",
    proposalTimestamp: "2026-06-02T08:00:00Z",
    linesAdded: 132,
    linesRemoved: 132,
    hub: { state: "done" },
  },
  {
    id: "142160",
    title: "Upgrade the ckBTC Minter Canister to Commit 0af3e29",
    topic: "Protocol Canister Management",
    verificationStatus: "verified",
    viewerSeenAt: "2026-06-03T19:00:00Z",
    reviewForumUrl: "https://forum.dfinity.org/t/ckbtc-minter-upgrade/51880/6",
    reviewedAt: "2026-06-01T11:00:00Z",
    commentaryTitle: "Raises KYT retry ceiling; no fee-schedule change",
    proposalTimestamp: "2026-06-01T09:00:00Z",
    linesAdded: 64,
    linesRemoved: 28,
    hub: { state: "done" },
  },
];
