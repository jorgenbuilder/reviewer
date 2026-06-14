import Link from "next/link";
import { Home } from "lucide-react";
import { SettingsPanel } from "@/components/settings-panel";

// Dedicated settings page (replaces the cramped mobile slide-over).
export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <article className="mx-auto w-full max-w-2xl overflow-x-clip bg-background pb-[40vh] text-foreground">
        {/* Fixed top bar — same pattern as the list/detail pages. */}
        <header className="h-[38px]">
          <div className="fixed left-1/2 top-0 z-30 flex h-[38px] w-full max-w-2xl -translate-x-1/2 items-stretch border-y border-border bg-background">
            <Link
              href="/"
              aria-label="Back to proposals"
              className="flex items-center px-4 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <Home className="h-4 w-4" aria-hidden />
            </Link>
            <span className="flex items-center pr-3 text-muted-foreground/60" aria-hidden>
              /
            </span>
            <span className="flex items-center font-mono text-xs font-bold uppercase tracking-wide text-foreground">
              Settings
            </span>
          </div>
        </header>

        <SettingsPanel />
      </article>
    </div>
  );
}
