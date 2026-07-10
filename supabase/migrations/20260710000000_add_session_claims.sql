-- Session→proposal claims for review cost attribution.
--
-- Cloud review sessions used to bake proposal.id into OTEL_RESOURCE_ATTRIBUTES, which made the
-- claude.ai/code environment per-proposal (and perpetually stale). Instead the session claims its
-- proposal at runtime (POST /api/claim-session, using CLAUDE_CODE_SESSION_ID), and the OTLP
-- ingest joins unattributed session-keyed metrics against these claims. Claude Code counters are
-- CUMULATIVE, so the first export after the claim carries the session's full running totals —
-- exports dropped before the claim lose nothing.
CREATE TABLE IF NOT EXISTS review_session_claims (
  session_id   TEXT NOT NULL PRIMARY KEY,
  proposal_id  BIGINT NOT NULL,
  claimed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
