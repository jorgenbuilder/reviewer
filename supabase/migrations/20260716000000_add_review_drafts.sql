-- Review drafts: the in-app markdown draft per proposal (BUI-242). Replaces the
-- obsidian-git working surface. Full-snapshot version history — every save writes a
-- version row (author + timestamp, no commit messages); diffs are computed at read
-- time. head_version on the draft row drives optimistic concurrency; stale writes are
-- three-way merged (node-diff3) in the API layer, not here.

CREATE TABLE IF NOT EXISTS review_drafts (
  proposal_id BIGINT PRIMARY KEY,
  content TEXT NOT NULL,
  head_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS review_draft_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id BIGINT NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  -- 'jorgen' (device-cookie edits) or 'agent:<name>' (CRON_SECRET API callers)
  author TEXT NOT NULL,
  -- the head the writer based their edit on; differs from version-1 after a merge
  parent_version INTEGER,
  -- true when this version was produced by an automatic three-way merge
  merged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, version)
);

CREATE INDEX IF NOT EXISTS idx_review_draft_versions_proposal
  ON review_draft_versions (proposal_id, version DESC);
