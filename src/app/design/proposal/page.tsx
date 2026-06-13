import Link from "next/link";
import { ProposalDetailV2 } from "@/components/proposal-detail-v2";
import { getStubProposal, stubVariants, type StubVariant } from "@/lib/design-stub";

// Local-only design playground for ProposalDetailV2.
//
// Visit http://localhost:3000/design/proposal (defaults to ?variant=upgrade).
// Switch fixtures with ?variant=upgrade | install | legacy.
//
// This route is additive and not linked from the live app.

export const dynamic = "force-static";

interface DesignProposalPageProps {
  searchParams: Promise<{ variant?: string }>;
}

export default async function DesignProposalPage({
  searchParams,
}: DesignProposalPageProps) {
  const { variant } = await searchParams;
  const active = (stubVariants.includes(variant as StubVariant)
    ? variant
    : "upgrade") as StubVariant;
  const proposal = getStubProposal(active);

  return (
    <div className="min-h-screen bg-background">
      {/* Playground variant switcher — not part of the real view */}
      <nav className="sticky top-0 z-10 flex items-center gap-1 border-b border-border bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <span className="mr-2 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
          Variant
        </span>
        {stubVariants.map((v) => (
          <Link
            key={v}
            href={`/design/proposal?variant=${v}`}
            className={
              v === active
                ? "border border-foreground bg-foreground px-2 py-0.5 text-xs font-medium text-background"
                : "border border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
            }
          >
            {v}
          </Link>
        ))}
      </nav>

      <ProposalDetailV2 proposal={proposal} />
    </div>
  );
}
