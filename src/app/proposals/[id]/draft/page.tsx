// The review draft editor page (BUI-242) — the in-app replacement for the
// obsidian-git working surface. All state lives client-side in DraftEditor.
import type { Metadata } from "next";
import { DraftEditor } from "@/components/draft-editor";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Draft #${id} · Reviewer` };
}

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DraftEditor proposalId={id} />;
}
