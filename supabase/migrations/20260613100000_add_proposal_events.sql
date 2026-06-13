-- Lightweight append-only pipeline event log, for monitoring/debugging the
-- detect → verify → canonical → post lifecycle.
CREATE TABLE IF NOT EXISTS proposal_events (
  id BIGSERIAL PRIMARY KEY,
  proposal_id BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_events_proposal ON proposal_events (proposal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_events_created ON proposal_events (created_at DESC);
