// Verification "needs you" report (opened from the urgent push gh-verifier triggers when a
// verify run fails for a reason only the operator can fix). Shows the LLM-written report
// and a retry button that re-dispatches verify once the cause is fixed.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { EDIT_COOKIE, deriveEditToken } from "@/lib/edit-auth";
import { getLatestVerificationReport } from "@/lib/verification-report";
import { VerificationReport } from "@/components/verification-report";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Verification #${id} · Reviewer` };
}

export default async function VerificationReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = /^\d+$/.test(id) ? await getLatestVerificationReport(id).catch(() => null) : null;
  const cookie = (await cookies()).get(EDIT_COOKIE)?.value;
  const expected = deriveEditToken();
  const unlocked = !!cookie && !!expected && cookie === expected;
  return <VerificationReport proposalId={id} report={report} unlocked={unlocked} />;
}
