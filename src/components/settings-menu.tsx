"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

// Settings entry point — links to the dedicated /settings page (the old
// slide-over panel didn't work well on mobile). All settings logic now lives
// in SettingsPanel, rendered by src/app/settings/page.tsx.
export function SettingsMenu({ triggerClassName }: { triggerClassName?: string } = {}) {
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      title="Settings"
      className={cn(
        "inline-flex items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        triggerClassName
      )}
    >
      <Menu className="h-5 w-5" aria-hidden />
    </Link>
  );
}
