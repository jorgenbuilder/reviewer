import { ListTable } from "@/components/design/desktop/list-table";
import { ListGrid } from "@/components/design/desktop/list-grid";
import { ListSplit } from "@/components/design/desktop/list-split";

// Local-only design playground for the desktop PROPOSAL LIST.
//
// Visit /design/desktop/list (defaults to ?variant=a).
// Switch concepts with ?variant=a | b | c, or use the top-right concept switcher.
//   a — Dense data-table (power triage)
//   b — Responsive card/column grid (scannable)
//   c — Master-detail split (keep context)
//
// This route is additive and not linked from the live app.
//
// Rendered dynamically so `?variant=` is read per request — `force-static`
// would freeze searchParams empty at build time and always show variant "a".
export const dynamic = "force-dynamic";

const VARIANTS = ["a", "b", "c"] as const;
type Variant = (typeof VARIANTS)[number];

interface DesignListPageProps {
  searchParams: Promise<{ variant?: string }>;
}

export default async function DesignDesktopListPage({
  searchParams,
}: DesignListPageProps) {
  const { variant } = await searchParams;
  const active = (VARIANTS.includes(variant as Variant) ? variant : "a") as Variant;

  if (active === "b") return <ListGrid />;
  if (active === "c") return <ListSplit />;
  return <ListTable />;
}
