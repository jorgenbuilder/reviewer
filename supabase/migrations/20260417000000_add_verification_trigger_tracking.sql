-- Track when verify.yml was dispatched for each proposal.
-- Replaces the GitHub-API-based dedup in trigger-verification, which
-- silently failed for runs outside the 100-run window.
ALTER TABLE proposals_seen
ADD COLUMN IF NOT EXISTS verification_triggered_at TIMESTAMPTZ;

-- Backfill: treat every existing row as already-triggered so the cron
-- doesn't re-fire historical proposals on first run after deploy.
UPDATE proposals_seen
SET verification_triggered_at = seen_at
WHERE verification_triggered_at IS NULL;

COMMENT ON COLUMN proposals_seen.verification_triggered_at IS 'When verify.yml was dispatched via the cron. NULL = not yet triggered.';
