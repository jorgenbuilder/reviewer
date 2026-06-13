// Print the pipeline event timeline for debugging.
//   node scripts/events.mjs            # last 60 events across all proposals
//   node scripts/events.mjs 142270     # all events for one proposal (chronological)
import { readFileSync } from "node:fs";
import pg from "pg";

const arg = process.argv[2];
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const POSTGRES_URL = (env.match(/^POSTGRES_URL=(.*)$/m) || [])[1].trim();
const m = POSTGRES_URL.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@(db\.([^.]+)\.supabase\.co):(\d+)\/(.+)$/);
const [, , password, , ref, , database] = m;
const REGIONS = ["us-west-2","us-east-1","us-east-2","us-west-1","ca-central-1","eu-central-1","eu-west-1","eu-west-2","ap-southeast-1","ap-southeast-2"];
async function connect() {
  for (const r of REGIONS) {
    const c = new pg.Client({ host: `aws-0-${r}.pooler.supabase.com`, port: 6543, user: `postgres.${ref}`, password, database, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 6000 });
    try { await c.connect(); await c.query("SELECT 1"); return c; } catch { await c.end().catch(() => {}); }
  }
  throw new Error("no pooler region");
}
const db = await connect();
try {
  const { rows } = arg
    ? await db.query(`SELECT created_at, proposal_id, event_type, detail FROM proposal_events WHERE proposal_id=$1 ORDER BY created_at ASC`, [Number(arg)])
    : await db.query(`SELECT created_at, proposal_id, event_type, detail FROM proposal_events ORDER BY created_at DESC LIMIT 60`);
  for (const r of rows) {
    const ts = new Date(r.created_at).toISOString().replace("T", " ").slice(0, 19);
    console.log(`${ts}  #${r.proposal_id}  ${r.event_type.padEnd(22)} ${r.detail ? "  " + r.detail.slice(0, 80) : ""}`);
  }
  console.log(`\n${rows.length} event(s).`);
} finally { await db.end(); }
