-- Realtime cost tracking for proposal reviews.
--
-- Two cost sources, unified for display on the proposal detail view:
--   * 'commentary'   — the AI-commentary Claude Code sandbox run (cost/tokens already land on
--                      proposal_commentaries; this migration just adds token columns there).
--   * 'cloud-review' — the Claude Code cloud session(s) a human runs to work on the review,
--                      reported via OpenTelemetry (claude_code.token.usage / .cost.usage) to
--                      /api/otel/v1/metrics and upserted here, one row per session.

-- Per-session cost rows. Claude Code emits CUMULATIVE counters, so each OTLP export carries the
-- running total for a session; the ingest upserts (latest export wins) keyed by session.
CREATE TABLE IF NOT EXISTS review_session_costs (
  proposal_id             BIGINT NOT NULL,
  session_id              TEXT   NOT NULL,
  source                  TEXT   NOT NULL DEFAULT 'cloud-review',

  input_tokens            BIGINT NOT NULL DEFAULT 0,
  output_tokens           BIGINT NOT NULL DEFAULT 0,
  cache_read_tokens       BIGINT NOT NULL DEFAULT 0,
  cache_creation_tokens   BIGINT NOT NULL DEFAULT 0,
  cost_usd                NUMERIC(12, 6) NOT NULL DEFAULT 0,

  model                   TEXT,
  first_seen_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (proposal_id, session_id, source)
);

CREATE INDEX IF NOT EXISTS idx_review_session_costs_proposal
  ON review_session_costs (proposal_id, updated_at DESC);

-- Token breakdown for the commentary source (cost_usd / duration_ms / turns already exist).
ALTER TABLE proposal_commentaries ADD COLUMN IF NOT EXISTS input_tokens          BIGINT;
ALTER TABLE proposal_commentaries ADD COLUMN IF NOT EXISTS output_tokens         BIGINT;
ALTER TABLE proposal_commentaries ADD COLUMN IF NOT EXISTS cache_read_tokens     BIGINT;
ALTER TABLE proposal_commentaries ADD COLUMN IF NOT EXISTS cache_creation_tokens BIGINT;
