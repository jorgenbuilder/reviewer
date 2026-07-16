// Review drafts (BUI-242): DB access + save semantics for the in-app markdown
// draft that replaced the obsidian-git working surface.
//
// Model: review_drafts holds the current content + head_version; every accepted
// save appends a full-snapshot row to review_draft_versions (author, timestamp —
// no commit messages). Writers send the head_version they based their edit on;
// a stale base triggers a three-way merge (node-diff3) against the common
// ancestor, so non-overlapping human/agent edits land without anyone noticing.
// Only genuinely overlapping edits surface as a conflict for the editor UI.
import "server-only";
import { diff3Merge } from "node-diff3";
import { supabase } from "./supabase/client";
import { getVerificationStatusForProposals } from "./github";

export interface DraftRecord {
  proposalId: string;
  content: string;
  headVersion: number;
  updatedAt: string;
}

export interface DraftVersionMeta {
  version: number;
  author: string;
  merged: boolean;
  parentVersion: number | null;
  createdAt: string;
}

export type SaveResult =
  | { outcome: "saved"; version: number }
  | { outcome: "merged"; version: number; content: string }
  | { outcome: "conflict"; headVersion: number; headContent: string };

// Matches the skeleton new-draft.mjs used to create in the author repo: the vote
// line + verification block, nothing else. The run URL is filled when the build
// is already verified at creation time.
export function draftSkeleton(proposalId: string, runUrl?: string | null): string {
  return [
    `**Proposal #${proposalId}: Adopt**`,
    ``,
    `✅ Build verified: [🔍 #${proposalId}](${runUrl || ""})`,
    `✅ Commit integrity verified`,
    ``,
  ].join("\n");
}

export async function getDraft(proposalId: string): Promise<DraftRecord | null> {
  const { data, error } = await supabase
    .from("review_drafts")
    .select("*")
    .eq("proposal_id", parseInt(proposalId, 10))
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    proposalId,
    content: data.content,
    headVersion: data.head_version,
    updatedAt: data.updated_at,
  };
}

/** Get the draft, lazily creating the skeleton (version 1, author 'system'). */
export async function getOrCreateDraft(proposalId: string): Promise<DraftRecord> {
  const existing = await getDraft(proposalId);
  if (existing) return existing;

  const runUrl = await getVerificationStatusForProposals([proposalId])
    .then((m) => m.get(proposalId)?.runUrl ?? null)
    .catch(() => null);
  const content = draftSkeleton(proposalId, runUrl);
  const pid = parseInt(proposalId, 10);

  // Two racers may both try to create; ignoreDuplicates makes the loser a no-op,
  // then both read whatever won.
  const { error } = await supabase
    .from("review_drafts")
    .upsert({ proposal_id: pid, content, head_version: 1 }, { onConflict: "proposal_id", ignoreDuplicates: true });
  if (error) throw error;
  await supabase
    .from("review_draft_versions")
    .upsert(
      { proposal_id: pid, version: 1, content, author: "system", parent_version: null },
      { onConflict: "proposal_id,version", ignoreDuplicates: true }
    );

  const created = await getDraft(proposalId);
  if (!created) throw new Error("draft creation raced and lost");
  return created;
}

export async function listDraftVersions(proposalId: string): Promise<DraftVersionMeta[]> {
  const { data, error } = await supabase
    .from("review_draft_versions")
    .select("version, author, merged, parent_version, created_at")
    .eq("proposal_id", parseInt(proposalId, 10))
    .order("version", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({
    version: r.version,
    author: r.author,
    merged: r.merged,
    parentVersion: r.parent_version,
    createdAt: r.created_at,
  }));
}

export async function getDraftVersionContent(proposalId: string, version: number): Promise<string | null> {
  const { data, error } = await supabase
    .from("review_draft_versions")
    .select("content")
    .eq("proposal_id", parseInt(proposalId, 10))
    .eq("version", version)
    .maybeSingle();
  if (error) throw error;
  return data?.content ?? null;
}

// Three-way merge: ours = current head, base = the version the writer edited
// from, theirs = the incoming content. Returns merged text or null on a true
// (overlapping) conflict.
function merge3(base: string, ours: string, theirs: string): string | null {
  const regions = diff3Merge(ours.split("\n"), base.split("\n"), theirs.split("\n"));
  const out: string[] = [];
  for (const region of regions) {
    if (region.ok) out.push(...region.ok);
    else return null;
  }
  return out.join("\n");
}

/**
 * Save a draft with optimistic concurrency + auto-merge. Retries the head bump
 * a few times so two concurrent writers serialize instead of erroring.
 */
export async function saveDraft(
  proposalId: string,
  incoming: { content: string; baseVersion: number; author: string }
): Promise<SaveResult> {
  const pid = parseInt(proposalId, 10);

  for (let attempt = 0; attempt < 3; attempt++) {
    const head = await getOrCreateDraft(proposalId);

    let content = incoming.content;
    let merged = false;

    if (incoming.baseVersion !== head.headVersion) {
      const base = await getDraftVersionContent(proposalId, incoming.baseVersion);
      if (base == null) {
        // Unknown base (pruned or bogus) — can't merge; surface as conflict.
        return { outcome: "conflict", headVersion: head.headVersion, headContent: head.content };
      }
      const result = merge3(base, head.content, incoming.content);
      if (result == null) {
        return { outcome: "conflict", headVersion: head.headVersion, headContent: head.content };
      }
      content = result;
      merged = true;
    }

    // No-op saves shouldn't grow history.
    if (content === head.content) {
      return merged
        ? { outcome: "merged", version: head.headVersion, content }
        : { outcome: "saved", version: head.headVersion };
    }

    const newVersion = head.headVersion + 1;
    const { data: bumped, error } = await supabase
      .from("review_drafts")
      .update({ content, head_version: newVersion, updated_at: new Date().toISOString() })
      .eq("proposal_id", pid)
      .eq("head_version", head.headVersion) // optimistic lock
      .select("proposal_id");
    if (error) throw error;
    if (!bumped || bumped.length === 0) continue; // lost the race — re-read and retry

    const { error: vErr } = await supabase.from("review_draft_versions").insert({
      proposal_id: pid,
      version: newVersion,
      content,
      author: incoming.author,
      parent_version: incoming.baseVersion,
      merged,
    });
    if (vErr) console.error(`[drafts] version row insert failed for #${proposalId} v${newVersion}:`, vErr.message);

    return merged ? { outcome: "merged", version: newVersion, content } : { outcome: "saved", version: newVersion };
  }

  const head = await getDraft(proposalId);
  return { outcome: "conflict", headVersion: head?.headVersion ?? 0, headContent: head?.content ?? "" };
}
