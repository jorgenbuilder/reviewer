import { getStubProposal, stubVariants, type StubVariant } from "@/lib/design-stub";
import { DetailTwoCol } from "@/components/design/desktop/detail-twocol";
import { DetailThreeZone } from "@/components/design/desktop/detail-threezone";
import { DetailConsole } from "@/components/design/desktop/detail-console";
import { DetailSwitcher } from "@/components/design/desktop/detail-switcher";

// Local-only design playground for the DESKTOP proposal-detail concepts.
//
// Visit /design/desktop/detail (defaults to ?variant=a&fixture=upgrade).
//   ?variant=a | b | c        — Two-column | Three-zone | Console
//   ?fixture=upgrade | install | legacy  — switch the data fixture
//
// Additive and not linked from the live app.
//
// Rendered dynamically so `?variant=`/`?fixture=` are read per request —
// `force-static` would freeze searchParams empty and always show variant "a".
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ variant?: string; fixture?: string }>;
}

export default async function DesignDesktopDetailPage({ searchParams }: PageProps) {
  const { variant, fixture } = await searchParams;

  const v = (["a", "b", "c"].includes(variant ?? "") ? variant : "a") as "a" | "b" | "c";
  const f = (stubVariants.includes(fixture as StubVariant) ? fixture : "upgrade") as StubVariant;
  const proposal = getStubProposal(f);

  return (
    <div className="min-h-screen bg-background">
      {v === "a" && <DetailTwoCol proposal={proposal} />}
      {v === "b" && <DetailThreeZone proposal={proposal} />}
      {v === "c" && <DetailConsole proposal={proposal} />}
      <DetailSwitcher variant={v} fixture={f} />
    </div>
  );
}
