const FORUM_BASE_URL = "https://forum.dfinity.org";
const NNS_PROPOSAL_CATEGORY_ID = 76;
const NNS_PROPOSAL_CATEGORY_SLUG = "governance/nns-proposal-discussions";

export function getForumCategoryUrl(): string {
  return `${FORUM_BASE_URL}/c/${NNS_PROPOSAL_CATEGORY_SLUG}/${NNS_PROPOSAL_CATEGORY_ID}`;
}

// --- Authenticated Discourse access via a long-lived User-API-Key ---------------------
// Replaces the old session-cookie approach (no browser, no stored cookies). The key is
// minted out-of-band (ii-automation/scripts/mint-userapikey.mjs) and provided as
// FORUM_USER_API_KEY. ForumAuthError (key revoked/invalid) is distinct from a plain
// "not found yet" so callers don't retry forever on a dead key.

export class ForumAuthError extends Error {}

function apiKey(): string {
  const key = process.env.FORUM_USER_API_KEY;
  if (!key) throw new ForumAuthError("FORUM_USER_API_KEY not configured");
  return key;
}

async function forumGet(path: string): Promise<Response> {
  return fetch(`${FORUM_BASE_URL}${path}`, {
    headers: {
      "User-Api-Key": apiKey(),
      Accept: "application/json",
      "User-Agent": "pcm-portal/forum-detect",
    },
  });
}

interface SearchTopic {
  id: number;
  title: string;
  slug: string;
  category_id: number;
}

export interface CanonicalThread {
  url: string;
  title: string;
}

async function search(proposalId: string): Promise<SearchTopic[]> {
  const res = await forumGet(`/search.json?q=${encodeURIComponent(proposalId)}`);
  if (res.status === 401 || res.status === 403) {
    throw new ForumAuthError(`forum search rejected key: HTTP ${res.status}`);
  }
  if (!res.ok) throw new Error(`forum search failed: HTTP ${res.status}`);
  const data = await res.json();
  return data.topics ?? [];
}

// Newest topics in the NNS-proposal category, most-recent first. Used as the discovery
// fallback: Discourse full-text search does NOT tokenize a proposal ID that appears only
// inside a dashboard URL (e.g. the batched "NNS Updates YYYY-MM-DD" threads), so a search
// by bare ID returns nothing for them. Listing the category and scanning first posts finds
// them regardless of how the ID is formatted.
async function listRecentCategoryTopics(limit: number): Promise<SearchTopic[]> {
  const res = await forumGet(`/c/${NNS_PROPOSAL_CATEGORY_SLUG}/${NNS_PROPOSAL_CATEGORY_ID}.json?order=created`);
  if (res.status === 401 || res.status === 403) {
    throw new ForumAuthError(`forum category fetch rejected key: HTTP ${res.status}`);
  }
  if (!res.ok) throw new Error(`forum category fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  const topics: SearchTopic[] = (data?.topic_list?.topics ?? []).map((t: { id: number; title: string; slug: string }) => ({
    id: t.id,
    title: t.title,
    slug: t.slug,
    category_id: NNS_PROPOSAL_CATEGORY_ID,
  }));
  return topics.slice(0, limit);
}

// True iff `text` references this exact proposal: either its dashboard URL, or the bare ID
// not embedded in a longer number (so "142679" does not match "1426790" or a hash).
function bodyReferencesProposal(text: string, proposalId: string): boolean {
  if (text.includes(`/proposal/${proposalId}`)) return true;
  return new RegExp(`(?<![0-9])${proposalId}(?![0-9])`).test(text);
}

// A thread is the canonical discussion iff its first post references the proposal.
async function firstPostMentions(topic: SearchTopic, proposalId: string): Promise<boolean> {
  const res = await forumGet(`/t/${topic.slug}/${topic.id}.json`);
  if (res.status === 401 || res.status === 403) {
    throw new ForumAuthError(`forum thread fetch rejected key: HTTP ${res.status}`);
  }
  if (!res.ok) return false;
  const data = await res.json();
  const firstPost = data.post_stream?.posts?.[0];
  const text = firstPost?.cooked || firstPost?.raw || "";
  return bodyReferencesProposal(text, proposalId);
}

// Return the first candidate topic (in the NNS-proposal category) whose first post
// references the proposal, or null.
async function firstMatchingTopic(topics: SearchTopic[], proposalId: string): Promise<CanonicalThread | null> {
  const nnsTopics = topics.filter((t) => t.category_id === NNS_PROPOSAL_CATEGORY_ID);
  for (const topic of nnsTopics) {
    if (await firstPostMentions(topic, proposalId)) {
      return { url: `${FORUM_BASE_URL}/t/${topic.slug}/${topic.id}`, title: topic.title };
    }
  }
  return null;
}

// How many recent category topics the fallback scans. Proposals are found within a day or
// two of submission, so the newest couple dozen threads more than cover the window.
const FALLBACK_SCAN_LIMIT = 25;

/**
 * Find the canonical NNS forum thread for a proposal, or null if not found yet.
 * Throws ForumAuthError if the key is rejected (so callers can stop + alert).
 *
 * Two-stage discovery:
 *   1. Full-text search by proposal ID — fast path for individual "Proposal NNNNN …"
 *      threads, where the ID is plaintext in the title.
 *   2. Fallback scan of the most recent category topics — catches the batched
 *      "NNS Updates YYYY-MM-DD" threads, where the ID lives only inside a dashboard URL
 *      and is therefore invisible to full-text search.
 */
export async function findCanonicalThread(proposalId: string): Promise<CanonicalThread | null> {
  const viaSearch = await firstMatchingTopic(await search(proposalId), proposalId);
  if (viaSearch) return viaSearch;
  return await firstMatchingTopic(await listRecentCategoryTopics(FALLBACK_SCAN_LIMIT), proposalId);
}

// Plain text of a topic's first post plus any follow-up posts by the same author (the
// thread starter — for canonical proposal threads that's DFINITY, whose posts carry the
// "we plan to vote on ..." announcements). HTML-stripped, for LLM consumption.
export async function getTopicPostsText(topicId: number, maxPosts = 4): Promise<string[]> {
  const res = await forumGet(`/t/${topicId}.json`);
  if (res.status === 401 || res.status === 403) {
    throw new ForumAuthError(`forum topic fetch rejected key: HTTP ${res.status}`);
  }
  if (!res.ok) throw new Error(`forum topic fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  const posts: Array<{ username?: string; cooked?: string; raw?: string; created_at?: string }> =
    data.post_stream?.posts ?? [];
  if (posts.length === 0) return [];
  const starter = posts[0].username;
  const out: string[] = [];
  for (const p of posts) {
    if (p.username !== starter) continue;
    const text = (p.cooked || p.raw || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Prefix the post date — relative statements ("we plan to vote on Monday") resolve
    // against when the post was written, not when the proposal was submitted.
    if (text) out.push(`[posted ${p.created_at || "unknown date"}] ${text}`);
    if (out.length >= maxPosts) break;
  }
  return out;
}

// --- Posting (write scope) -----------------------------------------------------------
// Posting uses a SEPARATE write-scoped key (least privilege: detection uses the read key).
// The account that minted FORUM_USER_API_KEY_WRITE is the author of the post.

export class ForumRateLimitError extends Error {
  waitSeconds: number;
  constructor(waitSeconds: number) { super("rate_limited"); this.waitSeconds = waitSeconds; }
}
export class ForumDuplicateError extends Error {} // body identical/too-similar → already posted

function writeApiKey(): string {
  const key = process.env.FORUM_USER_API_KEY_WRITE;
  if (!key) throw new ForumAuthError("FORUM_USER_API_KEY_WRITE not configured");
  return key;
}

export const FORUM_POST_USERNAME = process.env.FORUM_USERNAME || "jorgenbuilder";

export function topicIdFromUrl(url: string): number | null {
  try {
    const seg = new URL(url).pathname.split("/").filter(Boolean).find((s) => /^\d+$/.test(s));
    return seg ? Number(seg) : null;
  } catch {
    return null;
  }
}

interface TopicPost {
  id: number;
  post_number: number;
  username?: string;
  cooked?: string;
  raw?: string;
}

// Topic posts via the write key, with raw markdown included (needed to inspect and edit the
// verification-note post; cooked HTML is not safely round-trippable).
async function fetchTopicPosts(topicId: number): Promise<{ slug: string; posts: TopicPost[] }> {
  const res = await fetch(`${FORUM_BASE_URL}/t/${topicId}.json?include_raw=1`, {
    headers: { "User-Api-Key": writeApiKey(), Accept: "application/json", "User-Agent": "pcm-portal/post" },
  });
  if (res.status === 401 || res.status === 403) throw new ForumAuthError(`topic read rejected write key: HTTP ${res.status}`);
  if (!res.ok) throw new Error(`topic fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  return { slug: data.slug || "topic", posts: data.post_stream?.posts ?? [] };
}

// Idempotency guard: has the posting user already posted in this topic?
// True iff `username` has already posted a note for THIS proposal in the topic. The match is
// per-proposal (post body references the proposal), not merely per-topic: batched
// "NNS Updates YYYY-MM-DD" threads cover several proposals, so a plain "user has any post
// here" check would suppress every note after the first. Each verification note embeds its
// proposal ID, so referencing that ID reliably distinguishes them.
export async function hasReviewNoteForProposal(topicId: number, username: string, proposalId: string): Promise<boolean> {
  const { posts } = await fetchTopicPosts(topicId);
  return posts.some(
    (p) => p.username?.toLowerCase() === username.toLowerCase() && bodyReferencesProposal(p.cooked || p.raw || "", proposalId)
  );
}

// --- Combined verification notes ------------------------------------------------------
// One verification-note post per topic: a batched "NNS Updates" thread covers several
// proposals, and each build's line is appended to the topic's existing note post (a silent
// Discourse edit) instead of landing as a separate reply. A post qualifies as THE note post
// iff every non-empty line is a verification line — which excludes full human reviews, since
// those carry a vote line and prose. Must match templates/forum-verification-note.md.
const NOTE_LINE_PREFIX = "✅ Build verified:";

function isVerificationNoteRaw(raw: string): boolean {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length > 0 && lines.every((l) => l.startsWith(NOTE_LINE_PREFIX));
}

export interface NotePost { id: number; postNumber: number; url: string; raw: string }

// The posting user's existing verification-note post in this topic, or null.
export async function findVerificationNotePost(topicId: number, username: string): Promise<NotePost | null> {
  const { slug, posts } = await fetchTopicPosts(topicId);
  for (const p of posts) {
    if (p.username?.toLowerCase() !== username.toLowerCase()) continue;
    if (p.raw && isVerificationNoteRaw(p.raw)) {
      return { id: p.id, postNumber: p.post_number, url: `${FORUM_BASE_URL}/t/${slug}/${topicId}/${p.post_number}`, raw: p.raw };
    }
  }
  return null;
}

// Append one verification line to the existing note post. Guards: refetches raw immediately
// before the PUT and refuses to touch anything that isn't purely a note post (closes the
// select-then-edit race); no-ops if the proposal's line is already present; verifies the line
// landed after the write and retries, since two concurrent appends are a read-modify-write
// race and Discourse has no compare-and-set on raw. Throwing without marking posted is safe —
// the reconciler retries the whole (idempotent) invocation.
export async function appendVerificationLine(note: NotePost, line: string, proposalId: string): Promise<PostedReply> {
  const reply: PostedReply = { id: note.id, postNumber: note.postNumber, url: note.url };
  const readRaw = async (): Promise<string> => {
    const res = await fetch(`${FORUM_BASE_URL}/posts/${note.id}.json`, {
      headers: { "User-Api-Key": writeApiKey(), Accept: "application/json", "User-Agent": "pcm-portal/post" },
    });
    if (res.status === 401 || res.status === 403) throw new ForumAuthError(`post read rejected write key: HTTP ${res.status}`);
    if (!res.ok) throw new Error(`post fetch failed: HTTP ${res.status}`);
    return (await res.json()).raw || "";
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await readRaw();
    if (bodyReferencesProposal(raw, proposalId)) return reply; // already there (or our write landed)
    if (!isVerificationNoteRaw(raw)) throw new Error(`refusing to edit post ${note.id}: no longer a pure verification-note post`);

    const put = await fetch(`${FORUM_BASE_URL}/posts/${note.id}.json`, {
      method: "PUT",
      headers: { "User-Api-Key": writeApiKey(), "Content-Type": "application/json", "User-Agent": "pcm-portal/post" },
      body: JSON.stringify({ post: { raw: raw.trimEnd() + "\n" + line.trim() } }),
    });
    const body = await put.json().catch(() => ({}));
    if (put.status === 401 || put.status === 403) throw new ForumAuthError(`post edit rejected write key: HTTP ${put.status}`);
    if (put.status === 429) throw new ForumRateLimitError(Number(body?.extras?.wait_seconds) || 10);
    if (!put.ok) throw new Error(`post edit failed: HTTP ${put.status} ${JSON.stringify(body).slice(0, 200)}`);
    if (bodyReferencesProposal(await readRaw(), proposalId)) return reply; // survived — done
    // else a concurrent editor clobbered our write; loop re-reads and re-appends
  }
  throw new Error(`append to post ${note.id} lost the edit race repeatedly; will retry via reconciler`);
}

export interface PostedReply { id: number; postNumber: number; url: string }

export async function postReply(topicId: number, raw: string): Promise<PostedReply> {
  const res = await fetch(`${FORUM_BASE_URL}/posts.json`, {
    method: "POST",
    headers: { "User-Api-Key": writeApiKey(), "Content-Type": "application/json", "User-Agent": "pcm-portal/post" },
    body: JSON.stringify({ topic_id: topicId, raw }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 || res.status === 403) throw new ForumAuthError(`post rejected write key: HTTP ${res.status}`);
  if (res.status === 429) throw new ForumRateLimitError(Number(body?.extras?.wait_seconds) || 10);
  if (res.status === 422) {
    const errs = (body.errors || []).join(" ");
    if (/identical|too similar/i.test(errs)) throw new ForumDuplicateError(errs);
    throw new Error(`post validation failed: ${errs || JSON.stringify(body).slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`post failed: HTTP ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  const slug = body.topic_slug || "topic";
  return { id: body.id, postNumber: body.post_number, url: `${FORUM_BASE_URL}/t/${slug}/${body.topic_id}/${body.post_number}` };
}
