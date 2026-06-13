// Backfill proposals_seen.review_forum_url / reviewed_at from reviews already posted in the
// NNS Review Hub canister. Only fills rows that currently have NO forum post; never
// overwrites an existing one.
//
// Usage:
//   node scripts/backfill-forum-posts.mjs            # DRY RUN — shows what would change
//   node scripts/backfill-forum-posts.mjs --apply    # perform the updates
//
// Reads hub reviews from /tmp/hub-reviews.json (produced by `node hub.mjs history` in
// ii-automation). Reads POSTGRES_URL from .env.local.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

const APPLY = process.argv.includes("--apply");
const root = fileURLToPath(new URL("..", import.meta.url));

// --- load POSTGRES_URL from .env.local (no extra deps) ---
const env = readFileSync(root + ".env.local", "utf8");
const POSTGRES_URL = (env.match(/^POSTGRES_URL=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, "");
if (!POSTGRES_URL) throw new Error("POSTGRES_URL not found in .env.local");

// The direct host (db.<ref>.supabase.co) is IPv6-only and unreachable here, so connect via
// the regional IPv4 pooler. Parse components (greedy up to the last "@db." so a "@" in the
// password is fine), then probe regions for the one that accepts the project.
const m = POSTGRES_URL.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@(db\.([^.]+)\.supabase\.co):(\d+)\/(.+)$/);
if (!m) throw new Error("could not parse POSTGRES_URL");
const [, , password, , ref, , database] = m;

const POOLER_REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2", "ca-central-1",
  "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3", "ap-southeast-1",
  "ap-southeast-2", "ap-northeast-1", "ap-south-1", "sa-east-1",
];

async function connectViaPooler() {
  for (const region of POOLER_REGIONS) {
    const c = new pg.Client({
      host: `aws-0-${region}.pooler.supabase.com`,
      port: 6543,
      user: `postgres.${ref}`,
      password,
      database,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 6000,
    });
    try {
      await c.connect();
      await c.query("SELECT 1");
      console.log(`connected via pooler region: ${region}`);
      return c;
    } catch {
      await c.end().catch(() => {});
    }
  }
  throw new Error("no pooler region accepted the connection");
}

// --- hub reviews: proposalId -> { link, reviewedAtIso } ---
const hubReviews = JSON.parse(readFileSync("/tmp/hub-reviews.json", "utf8"));
const hub = new Map();
for (const r of hubReviews) {
  const iso = new Date(Number(BigInt(r.timestamp) / 1000000n)).toISOString();
  hub.set(String(r.proposalId), { link: r.link, reviewedAt: iso });
}

const client = await connectViaPooler();

try {
  const { rows } = await client.query(
    `SELECT proposal_id, title, review_forum_url FROM proposals_seen`
  );
  const portalIds = new Set(rows.map((r) => String(r.proposal_id)));

  const toUpdate = [];   // null row + hub review exists
  const skipNoHub = [];  // null row, no hub review
  let alreadyHaveUrl = 0;
  for (const r of rows) {
    const id = String(r.proposal_id);
    if (r.review_forum_url) { alreadyHaveUrl++; continue; }
    if (hub.has(id)) toUpdate.push({ id, title: r.title, ...hub.get(id) });
    else skipNoHub.push(id);
  }
  const hubNoPortalRow = [...hub.keys()].filter((id) => !portalIds.has(id));

  console.log("=== backfill plan ===");
  console.log(`portal rows total            : ${rows.length}`);
  console.log(`  already have forum url      : ${alreadyHaveUrl} (left untouched)`);
  console.log(`  null + matching hub review  : ${toUpdate.length}  ← WILL UPDATE`);
  console.log(`  null + no hub review        : ${skipNoHub.length} (left null)`);
  console.log(`hub reviews with no portal row: ${hubNoPortalRow.length} (skipped: ${hubNoPortalRow.join(", ") || "none"})`);
  console.log("\nrows to update:");
  for (const u of toUpdate) console.log(`  #${u.id}  ${u.reviewedAt.slice(0,10)}  ${u.link}`);

  if (!APPLY) {
    console.log("\nDRY RUN — re-run with --apply to write these changes.");
  } else {
    console.log(`\napplying ${toUpdate.length} updates…`);
    let n = 0;
    for (const u of toUpdate) {
      const res = await client.query(
        `UPDATE proposals_seen SET review_forum_url = $1, reviewed_at = $2
         WHERE proposal_id = $3 AND review_forum_url IS NULL`,
        [u.link, u.reviewedAt, Number(u.id)]
      );
      n += res.rowCount;
    }
    console.log(`✅ updated ${n} row(s).`);
  }
} finally {
  await client.end();
}
