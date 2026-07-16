-- Urgency extraction: when DFINITY plans to vote + how urgent the proposal is.
-- Extracted per-proposal by a cheap LLM (see src/lib/urgency.ts) from the proposal
-- title/summary and, once detected, the canonical forum thread. Drives startling
-- push notifications for urgent / voting-soon proposals.

ALTER TABLE proposals_seen
  ADD COLUMN IF NOT EXISTS planned_vote_at timestamptz,      -- when DFINITY stated they plan to vote (null = not stated)
  ADD COLUMN IF NOT EXISTS urgency real,                     -- P(urgent) in [0,1] from the extractor (null = not extracted yet)
  ADD COLUMN IF NOT EXISTS urgency_evidence text,            -- verbatim quote(s) the extraction rests on
  ADD COLUMN IF NOT EXISTS urgency_source text,              -- 'proposal' | 'proposal+forum'
  ADD COLUMN IF NOT EXISTS urgency_model text,               -- model id that produced the extraction
  ADD COLUMN IF NOT EXISTS urgency_extracted_at timestamptz; -- when the extraction ran

COMMENT ON COLUMN proposals_seen.urgency IS 'LLM-extracted probability [0,1] that the proposal is urgent (expedited vote, security fix, time-sensitive)';
COMMENT ON COLUMN proposals_seen.planned_vote_at IS 'LLM-extracted timestamp when DFINITY/proposer stated they plan to vote';
