-- Close-out state for a fully completed human review.
--   review_post_state gains a 'final' value: NULL -> 'posted' (auto factual note) ->
--   'final' (full review posted to the canonical thread AND pushed to the review-hub
--   canister). 'final' is set only after both the forum edit and the hub push succeed.
ALTER TABLE proposals_seen
  ADD COLUMN IF NOT EXISTS review_finalized_at TIMESTAMPTZ;
