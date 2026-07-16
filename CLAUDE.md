# Reviewer portal (proposal-reviewer-portal)

Next.js app on Vercel (auto-deploys from `main`), Supabase Postgres, web push.
Single-operator app for reviewing NNS proposals.

## Multi-agent coordination — REQUIRED

Multiple agents (and the user) may work in this repo at the same time. Before
touching anything with conflict potential — **migrations, `package.json`/deps,
prod DB writes, Vercel env vars, shared libs (`src/lib/*`), or files another
task is likely to edit** — do BOTH of:

1. `git pull --rebase origin main` and check `git status` for another agent's
   in-flight changes.
2. Write an entry to **`.comms.md`** (repo root, gitignored, newest first):
   who you are, what you're building, and the exact conflict-prone surfaces
   you're claiming (migration filenames, tables, env var names, files). Mark
   the entry done when you finish. Read the existing entries first and don't
   step on an IN PROGRESS claim — coordinate around it or wait.

Migrations are the highest-risk surface: they're applied directly to the
production Supabase (see `scripts/` for the pooler-connection pattern), so a
duplicate/conflicting migration hits prod, not just the tree.

## Conventions

- Migrations live in `supabase/migrations/`; apply to prod via the IPv4 pooler
  (direct db.<ref>.supabase.co host is IPv6-only; see scripts for the region
  probe pattern).
- Push after every change — Vercel deploys `main`; verify with
  `npx tsc --noEmit` and `npm run build` before pushing.
- UI changes: edit + typecheck only; the user verifies visuals locally.
