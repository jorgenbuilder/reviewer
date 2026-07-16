import { Home } from "lucide-react";

// Loading skeletons for the proposal detail page. Below `lg` this mirrors
// ProposalDetailV2 (single centred column); at `lg` and up it mirrors
// ProposalDetailDesktop's three panes — list rail, reading column, meta
// sidebar — so the load-in matches whichever layout will render.
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-none bg-muted ${className}`} />;
}

// A commit/section row: caret + label, right-edge action squares.
function RowSkeleton({ actions = 2 }: { actions?: number }) {
  return (
    <div className="flex items-stretch border-b border-border">
      <div className="flex flex-1 items-center gap-2 px-3 py-3">
        <Bar className="h-4 w-4" />
        <Bar className="h-4 w-28" />
        <Bar className="ml-auto h-3 w-12" />
      </div>
      {Array.from({ length: actions }).map((_, i) => (
        <span key={i} className="flex w-9 items-center justify-center border-l border-border">
          <Bar className="h-3.5 w-3.5" />
        </span>
      ))}
    </div>
  );
}

// Statement block: heading row + text lines + proposer + vote bar.
function OnchainSkeleton() {
  return (
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
  );
}

// Mobile: single centred column with a fixed top bar (matches ProposalDetailV2).
function MobileSkeleton() {
  return (
    <article className="mx-auto w-full max-w-2xl overflow-x-clip bg-background text-foreground lg:hidden">
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
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className="flex w-9 items-center justify-center border-l border-border">
              <Bar className="h-4 w-4" />
            </span>
          ))}
        </div>
      </header>
      <OnchainSkeleton />
      {Array.from({ length: 5 }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 border-b border-border px-3 py-3">
          <Bar className="h-4 w-4" />
          <Bar className="h-4 w-32" />
        </div>
      ))}
    </article>
  );
}

// One proposal row in the desktop list rail.
function RailRowSkeleton() {
  return (
    <div className="border-b border-border px-3 py-3">
      <div className="flex items-center gap-2">
        <Bar className="h-3 w-14" />
        <Bar className="ml-auto h-3 w-10" />
        <Bar className="h-2 w-2 rounded-full" />
      </div>
      <Bar className="mt-2 h-3.5 w-11/12" />
      <Bar className="mt-1.5 h-3.5 w-2/3" />
      <div className="mt-2 flex items-center gap-2">
        <Bar className="h-2.5 w-32" />
        <Bar className="ml-auto h-2.5 w-12" />
      </div>
    </div>
  );
}

// One labelled block in the desktop meta sidebar (label + value lines).
function MetaItemSkeleton({ lines = 1 }: { lines?: number }) {
  return (
    <div className="px-4 py-3">
      <Bar className="mb-2 h-2.5 w-20" />
      <Bar className="h-3.5 w-24" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <Bar key={i} className="mt-1.5 h-2.5 w-36" />
      ))}
    </div>
  );
}

// Desktop: list rail / reading column / meta sidebar (matches ProposalDetailDesktop).
function DesktopSkeleton() {
  return (
    <div className="hidden h-screen flex-col bg-background text-foreground lg:flex">
      <div className="flex min-h-0 flex-1">
        {/* List rail */}
        <div className="flex w-[360px] min-h-0 shrink-0 flex-col border-r border-border">
          <div className="flex h-[38px] shrink-0 items-center justify-between border-b border-border px-3">
            <span className="flex items-center gap-1 font-mono text-[0.7rem] uppercase tracking-wide text-muted-foreground/40">
              <Home className="h-3.5 w-3.5" aria-hidden /> All
            </span>
            <Bar className="h-3 w-6" />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <RailRowSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Reading column */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-border">
          <div className="flex h-[38px] shrink-0 items-stretch border-b border-border">
            <span className="flex items-center px-4 text-muted-foreground/40">
              <Home className="h-4 w-4" aria-hidden />
            </span>
            <span className="flex items-center pr-3 text-muted-foreground/30" aria-hidden>/</span>
            <span className="flex items-center">
              <Bar className="h-3 w-16" />
            </span>
            <span className="ml-3 flex min-w-0 items-center">
              <Bar className="h-3.5 w-72 max-w-full" />
            </span>
            <span className="ml-auto flex items-center pr-3">
              <Bar className="h-3 w-14" />
            </span>
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className="flex w-9 items-center justify-center border-l border-border">
                <Bar className="h-4 w-4" />
              </span>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <OnchainSkeleton />
            {Array.from({ length: 3 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 border-b border-border px-3 py-3">
                <Bar className="h-4 w-4" />
                <Bar className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Meta sidebar */}
        <aside className="flex w-[320px] min-h-0 shrink-0 flex-col overflow-hidden">
          <div className="divide-y divide-border border-border">
            <MetaItemSkeleton />
            <MetaItemSkeleton lines={3} />
            <MetaItemSkeleton lines={2} />
            <MetaItemSkeleton lines={2} />
            <MetaItemSkeleton />
            <MetaItemSkeleton lines={3} />
            <MetaItemSkeleton lines={5} />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <MobileSkeleton />
      <DesktopSkeleton />
    </div>
  );
}
