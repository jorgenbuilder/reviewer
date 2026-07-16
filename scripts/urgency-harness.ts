// Urgency-extraction harness: training loop + backfill for planned_vote_at / urgency.
//
// Sweeps proposals_seen, gathers each proposal's text (ic-api) and canonical forum posts
// (Discourse read key), runs the extractor from src/lib/urgency.ts, and either reports
// (default, DRY RUN) or writes the results back (--apply).
//
// Usage (from reviewer/):
//   npx tsx scripts/urgency-harness.ts                 # dry run over all proposals, writes report
//   npx tsx scripts/urgency-harness.ts --limit 30      # dry run over the 30 newest
//   npx tsx scripts/urgency-harness.ts --only 142805   # single proposal (prints full detail)
//   npx tsx scripts/urgency-harness.ts --apply         # backfill DB (all proposals)
//   npx tsx scripts/urgency-harness.ts --missing       # restrict to rows without an extraction
//
// Env: POSTGRES_URL (read from .env.local automatically), ANTHROPIC_API_KEY,
//      FORUM_USER_API_KEY or DFINITY_FORUM_USER_API_KEY (forum read key).
// Report: scripts/out/urgency-report.md + urgency-results.json
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import pg from "pg";
import { extractUrgency, startlingLevel, URGENCY_MODEL } from "../src/lib/urgency";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = join(ROOT, "scripts", "out");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const MISSING_ONLY = args.includes("--missing");
const LIMIT = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : null;
const ONLY = args.includes("--only") ? String(args[args.indexOf("--only") + 1]) : null;
const CONCURRENCY = 4;

// --- env: POSTGRES_URL from .env.local (matches backfill-forum-posts.mjs) ---
if (!process.env.POSTGRES_URL) {
  const env = readFileSync(join(ROOT, ".env.local"), "utf8");
  const url = (env.match(/^POSTGRES_URL=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, "");
  if (url) process.env.POSTGRES_URL = url;
}
const POSTGRES_URL = process.env.POSTGRES_URL;
if (!POSTGRES_URL) throw new Error("POSTGRES_URL not set and not found in .env.local");
if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
const FORUM_KEY = process.env.FORUM_USER_API_KEY || process.env.DFINITY_FORUM_USER_API_KEY;

// --- postgres via IPv4 pooler (direct host is IPv6-only) ---
const m = POSTGRES_URL.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@(db\.([^.]+)\.supabase\.co):(\d+)\/(.+)$/);
if (!m) throw new Error("could not parse POSTGRES_URL");
const [, , password, , ref, , database] = m;
const POOLER_REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2", "ca-central-1",
  "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3", "ap-southeast-1",
  "ap-southeast-2", "ap-northeast-1", "ap-south-1", "sa-east-1",
];
async function connectViaPooler(): Promise<pg.Client> {
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

// --- data sources ---

// Proposal text via the public IC API (works for every proposal, no candid decode).
async function fetchProposalText(id: string): Promise<{ title: string; summary: string; timestamp: Date | null } | null> {
  const res = await fetch(`https://ic-api.internetcomputer.org/api/v3/proposals/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return {
    title: data.title || "",
    summary: data.summary || "",
    timestamp: data.proposal_timestamp_seconds ? new Date(Number(data.proposal_timestamp_seconds) * 1000) : null,
  };
}

// Canonical-thread posts: first post + thread starter's follow-ups, date-prefixed.
// (Same logic as lib/forum.ts getTopicPostsText, standalone so the script needs no Next env.)
async function fetchForumPosts(forumUrl: string): Promise<string[]> {
  if (!FORUM_KEY) return [];
  const seg = new URL(forumUrl).pathname.split("/").filter(Boolean).find((s) => /^\d+$/.test(s));
  if (!seg) return [];
  const res = await fetch(`https://forum.dfinity.org/t/${seg}.json`, {
    headers: { "User-Api-Key": FORUM_KEY, Accept: "application/json", "User-Agent": "pcm-portal/urgency-harness" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const posts: Array<{ username?: string; cooked?: string; created_at?: string }> = data.post_stream?.posts ?? [];
  if (posts.length === 0) return [];
  const starter = posts[0].username;
  const out: string[] = [];
  for (const p of posts) {
    if (p.username !== starter) continue;
    const text = (p.cooked || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text) out.push(`[posted ${p.created_at || "unknown date"}] ${text}`);
    if (out.length >= 4) break;
  }
  return out;
}

interface Row {
  proposal_id: string;
  title: string | null;
  topic: string;
  proposal_timestamp: Date | null;
  urgency: number | null;
  forum_url: string | null;
}

interface Result {
  proposalId: string;
  title: string;
  topic: string;
  source: "proposal" | "proposal+forum";
  urgency: number;
  plannedVoteAt: string | null;
  evidence: string | null;
  level: string;
  error?: string;
}

async function main() {
  const client = await connectViaPooler();
  try {
    const { rows } = await client.query<Row>(`
      SELECT p.proposal_id::text AS proposal_id, p.title, p.topic, p.proposal_timestamp, p.urgency,
             t.forum_url
      FROM proposals_seen p
      LEFT JOIN LATERAL (
        SELECT forum_url FROM proposal_forum_threads
        WHERE proposal_id = p.proposal_id::text AND is_canonical
        LIMIT 1
      ) t ON true
      ${ONLY ? `WHERE p.proposal_id = ${Number(ONLY)}` : MISSING_ONLY ? "WHERE p.urgency IS NULL" : ""}
      ORDER BY p.proposal_id DESC
      ${LIMIT ? `LIMIT ${LIMIT}` : ""}
    `);
    console.log(`${rows.length} proposal(s) to process (model: ${URGENCY_MODEL}, ${APPLY ? "APPLY" : "DRY RUN"})`);

    const results: Result[] = [];
    let done = 0;
    async function worker(queue: Row[]) {
      for (;;) {
        const row = queue.shift();
        if (!row) return;
        const id = row.proposal_id;
        try {
          const [prop, posts] = await Promise.all([
            fetchProposalText(id),
            row.forum_url ? fetchForumPosts(row.forum_url) : Promise.resolve([]),
          ]);
          const source = posts.length > 0 ? "proposal+forum" as const : "proposal" as const;
          const extraction = await extractUrgency({
            proposalId: id,
            title: prop?.title || row.title || "",
            summary: prop?.summary || "",
            proposalTimestamp: prop?.timestamp ?? row.proposal_timestamp,
            forumPosts: posts,
          });
          const level = startlingLevel(extraction.urgency, extraction.plannedVoteAt, prop?.timestamp ?? row.proposal_timestamp ?? new Date()) ?? "normal";
          results.push({
            proposalId: id, title: prop?.title || row.title || "", topic: row.topic, source,
            urgency: extraction.urgency, plannedVoteAt: extraction.plannedVoteAt,
            evidence: extraction.evidence, level,
          });
          if (APPLY) {
            await client.query(
              `UPDATE proposals_seen SET planned_vote_at=$1, urgency=$2, urgency_evidence=$3,
                 urgency_source=$4, urgency_model=$5, urgency_extracted_at=now()
               WHERE proposal_id=$6`,
              [extraction.plannedVoteAt, extraction.urgency, extraction.evidence?.slice(0, 1000) ?? null,
               source, URGENCY_MODEL, Number(id)]
            );
          }
        } catch (e) {
          results.push({
            proposalId: id, title: row.title || "", topic: row.topic, source: "proposal",
            urgency: 0, plannedVoteAt: null, evidence: null, level: "error", error: (e as Error).message,
          });
        }
        done++;
        if (done % 10 === 0) console.log(`  ${done}/${rows.length}`);
      }
    }
    const queue = [...rows];
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

    // --- report ---
    results.sort((a, b) => b.urgency - a.urgency);
    if (ONLY) {
      // Single-proposal probe: print, don't clobber the sweep report files.
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, "urgency-results.json"), JSON.stringify(results, null, 2));

    const errors = results.filter((r) => r.error);
    const flagged = results.filter((r) => !r.error && (r.urgency >= 0.3 || r.plannedVoteAt));
    const md = [
      `# Urgency extraction ${APPLY ? "backfill" : "dry run"} — ${new Date().toISOString()}`,
      ``,
      `Model: ${URGENCY_MODEL} · ${results.length} proposals · ${flagged.length} with a signal (urgency ≥ 0.3 or a stated vote) · ${errors.length} errors`,
      ``,
      `| # | urgency | level@submit | planned vote | src | title | evidence |`,
      `|---|---------|--------------|--------------|-----|-------|----------|`,
      ...results.filter((r) => !r.error).map((r) =>
        `| ${r.proposalId} | ${r.urgency.toFixed(2)} | ${r.level} | ${r.plannedVoteAt ?? ""} | ${r.source === "proposal+forum" ? "P+F" : "P"} | ${r.title.slice(0, 60).replace(/\|/g, "/")} | ${(r.evidence ?? "").slice(0, 120).replace(/\|/g, "/")} |`
      ),
      ``,
      ...(errors.length ? [`## Errors`, ...errors.map((r) => `- #${r.proposalId}: ${r.error}`)] : []),
    ].join("\n");
    writeFileSync(join(OUT_DIR, "urgency-report.md"), md);
    console.log(`\n${flagged.length}/${results.length} proposals carry a signal; ${errors.length} errors.`);
    console.log(`report: scripts/out/urgency-report.md`);
    if (!APPLY) console.log("DRY RUN — re-run with --apply to write to proposals_seen.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
