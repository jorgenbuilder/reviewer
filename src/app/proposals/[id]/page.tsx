import { ProposalDetailClient } from "@/components/proposal-detail-client";

interface ProposalPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProposalPageProps) {
  const { id } = await params;
  return { title: `Proposal #${id} Reviewer` };
}

// Thin server shell: the ParsedProposal is fetched client-side through TanStack
// Query (see ProposalDetailClient), so switching proposals doesn't block a
// server render on the on-chain + GitHub + DB assembly every time.
export default async function ProposalPage({ params }: ProposalPageProps) {
  const { id } = await params;
  return <ProposalDetailClient id={id} />;
}
