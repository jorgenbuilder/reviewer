import { DesktopApp } from "@/components/design/desktop/desktop-app";

// Unified desktop SPA prototype: rich table → click → resizable three-column
// (rail | detail | meta). Client-driven; selection syncs to ?id=.
//
// Visit /design/desktop/app. Additive; not linked from the live app.

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

// Read ?id= on the server so a deep-link's first paint already renders the
// right view (no table→inspect flash on load).
export default async function DesignDesktopAppPage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  return <DesktopApp initialSelectedId={id ?? null} />;
}
