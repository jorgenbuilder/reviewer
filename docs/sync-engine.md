# Sync engine architecture (BUI-253 v2)

Status: **designed, Stage 0 parked** (2026-07-17). Canonical spec + decision log:
Linear BUI-253 (+ sub-issue BUI-254). This doc is the in-repo reference for
anyone (human or agent) touching the data system.

## Governing principle

**The portal's database stores only what the portal authors. Anything
fetchable from the chain comes from the chain. Nothing is polled into
storage.**

Corollary (operator rule, 2026-07-17): **never use ic-api / dashboard
indexers when a real on-chain query can answer** — indexers are caches with
known staleness (e.g. Registry `upgrades[]` serving 2021 data). Chain reads
go through agent-js anonymous queries / certified `read_state`.

## The four data planes

| Plane | Data | Path to client | Freshness |
|---|---|---|---|
| 1. Synced annotations | proposals_seen, review_drafts (+versions), proposal_events, proposal_forum_threads, proposal_commentaries, review_session_costs, urgency fields | Change-log pull protocol (`/api/sync`) | Event-driven only; these tables change exactly when our pipeline writes them |
| 2. On-chain immutable | Proposal title/summary/payload/hashes/proposer/topic | Client → governance canister (agent-js, anonymous query) | Fetch once on first view, cache in Dexie forever |
| 3. On-chain volatile | Vote status + tally; hub state (hub canister `mhnfx-niaaa-aaaas-qdluq-cai`) | Client → chain, on view | Persisted last-known renders instantly; revalidate on view. **Never enters Postgres** |
| 4. GitHub-derived | Honest canister-subtree diff stats | gh-verifier Action computes at checkout → verification-event callback → plane 1 (BUI-254) | Event-driven |

There is **no materialized snapshot table, no server-side view-model
assembly in the sync path, and no cron polling loop**. `buildParsedProposal`
+ the current read routes are the legacy path, untouched until cutover
(parallel system), deleted in Stage 3.

## Sync protocol (plane 1)

Validated by adversarial deep research 2026-07-17 (two runs; details in
BUI-253):

- **Global version counter** (Replicache "Global Version" strategy): every
  write to a synced table fires an AFTER trigger that does
  `UPDATE sync_version SET v = v + 1` in the same transaction and appends
  `change_log(v, table_name, row_id, deleted)`. The row lock serializes
  writers so version order == commit order. A plain bigserial cursor is
  **provably unsound**: sequence values are assigned at insert time but rows
  become visible in commit order, so a concurrent pull can permanently skip
  rows. Throughput cap (~50 writes/s) is irrelevant at single-operator scale.
- **Pull**: `GET /api/sync?since=<v>`. `since=0` → paginated full bootstrap;
  else rows with `v > since` + tombstones + current `v` + `protocolVersion`.
  Auth: edit cookie (human) or CRON_SECRET bearer (agents) — same posture as
  the draft API. Note this makes sync unlock-gated where legacy reads were
  public (deliberate; single-operator app).
- **Doorbell**: Supabase Realtime broadcast from a Postgres trigger on
  `sync_version` — contentless "v advanced" ping; client pulls through the
  authed API. Assume at-most-once delivery. The doorbell is an accelerator
  only: the client MUST pull on launch, `visibilitychange`, and websocket
  reconnect (iOS PWA sockets die silently when backgrounded and do not
  auto-reconnect).
- **Schema evolution**: buster/`protocolVersion` string stored with the local
  DB; mismatch → clear local store, cursor to 0, full rebootstrap. No local
  migrations.

## Client stack (Stage 1)

- **Dexie (IndexedDB)** incremental store — one table per collection +
  `meta` (cursor, buster). Deltas applied transactionally with the cursor
  update. NOT persistQueryClient for the corpus: it rewrites the whole cache
  as one blob per mutation (documented perf failure at tens of MB).
- **TanStack DB** collections over Dexie; components use live queries
  (differential dataflow). Core is 0.x — pin versions;
  `@tanstack/query-db-collection` is the stable surface.
- **Chain access**: agent-js in the browser. Plane 2 fetch-once; plane 3
  revalidate-on-view with persisted last-known. Hub state for the whole list
  is 3 anonymous canister queries (`getReviewerReviewHistory/MissedProposals/
  Todos`).
- **Client-side parse**: `parseProposalSummary` is a pure function over the
  plane-2 summary — it moves into the client at cutover, as does the
  activity-log shaping now in `buildParsedProposal`.
- `navigator.storage.persist()` on first run. Installed-PWA storage on iOS
  17+: browser-level quota (up to 60% of disk), ITP-exempt.

## Guards

- **The sync store is a display cache, not agent ground truth.** Review
  agents keep querying chain/REST live for clock-bearing facts (execution
  status, hub duplicates, canonical threads) at session start and pre-post
  (BUI-251 freshness rule).
- **Verification status** for the UI derives from our own `proposal_events`
  (gh-verifier posts them), NOT from polling the GitHub Actions API (current
  legacy behavior: re-polls a 100-run window per request; old proposals
  silently lose status).
- **No fabricated stats**: serverless GitHub-API subtree stats are provably
  dishonest (compare endpoint: max 300 files for the entire comparison,
  first page only, silent truncation, pagination is commits-only; GraphQL
  `history(path:)` returns repo-wide stats). Honest stats come from
  gh-verifier's checkout (BUI-254): compare API for `merge_base_commit.sha`
  only when needed → `git fetch --depth=1` both SHAs → two-dot
  `git diff --numstat base head -- <subtree>`. The LLM line-count fallback in
  `proposal-view.ts` and the 0/0 sentinel in backfill-diff-stats retire with
  BUI-254; absent stats render as absent.

## Stages

- **Stage 0 (server)**: migration (`sync_version`, `change_log`, triggers on
  the 7 plane-1 tables) + `/api/sync` + fix the `upstash-signature` auth
  bypass in check-proposals (accepts any request bearing the header without
  verification; sibling routes use the real QStash `Receiver`). Legacy read
  routes untouched.
- **Stage 1 (client, behind a flag)**: Dexie + TanStack DB + agent-js chain
  fetches + doorbell. Measure bootstrap size/time, delta correctness,
  doorbell latency, iOS resume.
- **Stage 2**: per-view cutover (list → detail → widgets); rollback = flag.
- **Stage 3**: teardown — `buildParsedProposal`, GitHub Actions status
  polling, diff-stat cascades (post-BUI-254), timer-based revalidation.
- **BUI-254 (gh-verifier repo, parallel)**: subtree numstat in the Action,
  callback payload extension, portal writes `proposals_seen.lines_added/
  removed`, retire the four dishonest derivations, backfill.

Cutover bar: one week on the flag; zero store-vs-API divergence on spot
checks; no missed updates after backgrounding/resume on iPhone; acceptable
bootstrap on cellular.

## Resolved decisions (with dates)

- 2026-07-17: global version counter, not bigserial (research: out-of-order
  commit race).
- 2026-07-17: Dexie incremental store, not persistQueryClient blobs; TanStack
  DB as reactive layer; buster rebootstrap for schema evolution.
- 2026-07-17: doorbell-only realtime via Supabase broadcast (Replicache poke
  pattern); pull-on-focus is the guarantee.
- 2026-07-17: no off-the-shelf engine (ElectricSQL/PowerSync/Zero — extra
  services + replication slots buy nothing for single-user, no offline
  writes, full replication).
- 2026-07-17 (operator): tally never enters the database; frontend persists
  it and revalidates on view.
- 2026-07-17 (operator): everything fetchable from on-chain comes from
  on-chain; **never ic-api when a real chain query exists**.
- 2026-07-17: no materialized snapshot table at all (v2 reassessment; see
  BUI-253 comments for the full rationale chain).
- No offline writes, ever — writes stay on the existing authed REST routes.

## Open questions (parked for next session)

1. **Draft-versions bootstrap size**: sync all `review_draft_versions` or
   only latest-N per proposal with on-demand fetch for older? (Only table
   with unbounded growth per proposal.)
2. **Verification-status reconstruction**: confirm `proposal_events` history
   is complete enough to derive status for the whole existing corpus before
   dropping the GitHub Actions poll.
3. **agent-js bundle weight** in the browser (candid + agent): measure in
   Stage 1; consider a lazy-loaded chain module.
4. **Governance query rate/latency from browser**: expected fine (~600 ms
   read_state measured for BUI-251); verify in Stage 1.
5. **`/api/sync` auth posture**: edit-cookie gating accepted for now;
   revisit if a public read surface is ever wanted.
6. **Supabase Realtime delivery guarantees**: still unverified by research;
   design assumes lossy. Do not depend on Broadcast Replay (alpha).

## Current state / how to resume

- Migration file `supabase/migrations/20260717000000_add_sync_read_model.sql`
  exists in the tree but is **NOT applied to prod and deliberately not
  committed** until Stage 0 resumes (a file in `supabase/migrations/` is
  presumed applied — don't break that presumption).
- `.comms.md` has the Stage 0 claim marked PARKED.
- No route or lib changes are in flight; the v1 materializer code was
  reverted before anything shipped.
- Resume point: commit + apply the migration (pooler pattern, see
  `scripts/`), build `/api/sync`, fix check-proposals auth — then Stage 1.
