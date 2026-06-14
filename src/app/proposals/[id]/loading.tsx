import { Home } from "lucide-react";

// Skeleton that mirrors ProposalDetailV2: fixed top bar, on-chain section with
// statement lines + vote bar, and a few commit rows. Edge-to-edge, hairline
// dividers, no rounded corners — so the load-in matches the real layout.
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-none bg-muted ${className}`} />;
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <article className="mx-auto w-full max-w-2xl overflow-x-clip bg-background text-foreground">
        {/* Fixed top bar */}
        <header className="h-[38px]">
          <div className="fixed left-1/2 top-0 z-30 flex h-[38px] w-full max-w-2xl -translate-x-1/2 items-stretch border-y border-border bg-background">
            <span className="flex items-center px-4 text-muted-foreground/40">
              <Home className="h-4 w-4" aria-hidden />
            </span>
            <span className="flex items-center pr-3 text-muted-foreground/30" aria-hidden>/</span>
            <span className="flex items-center">
              <Bar className="h-3 w-16" />
            </span>
            <span className="ml-auto flex items-center pr-3">
              <Bar className="h-3 w-14" />
            </span>
            <span className="flex w-9 items-center justify-center border-l border-border">
              <Bar className="h-2 w-2 rounded-full" />
            </span>
            <span className="flex w-9 items-center justify-center border-l border-border">
              <Bar className="h-4 w-4" />
            </span>
            <span className="flex w-9 items-center justify-center border-l border-border">
              <Bar className="h-4 w-4" />
            </span>
          </div>
        </header>

        {/* On-chain section: header + statement lines + proposer + vote bar */}
        <div className="border-b border-border">
          <div className="flex items-stretch border-b border-border">
            <div className="flex flex-1 items-center gap-2 px-3 py-3">
              <Bar className="h-4 w-4" />
              <Bar className="h-4 w-48" />
            </div>
            <span className="flex w-9 items-center justify-center border-l border-border">
              <Bar className="h-4 w-4" />
            </span>
          </div>
          <div className="space-y-2 px-3 pb-4 pt-3">
            <Bar className="h-3 w-full" />
            <Bar className="h-3 w-11/12" />
            <Bar className="h-3 w-4/5" />
            <Bar className="mt-3 h-3 w-40" />
            <Bar className="mt-3 h-2.5 w-full" />
          </div>
        </div>

        {/* Commit rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-stretch border-b border-border">
            <div className="flex flex-1 items-center gap-2 px-3 py-3">
              <Bar className="h-4 w-4" />
              <Bar className="h-4 w-28" />
              <Bar className="ml-auto h-3 w-12" />
            </div>
            <span className="flex w-9 items-center justify-center border-l border-border">
              <Bar className="h-3.5 w-3.5" />
            </span>
            <span className="flex w-9 items-center justify-center border-l border-border">
              <Bar className="h-3.5 w-3.5" />
            </span>
          </div>
        ))}

        {/* A couple of collapsed section headers */}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 border-b border-border px-3 py-3">
            <Bar className="h-4 w-4" />
            <Bar className="h-4 w-32" />
          </div>
        ))}
      </article>
    </div>
  );
}
