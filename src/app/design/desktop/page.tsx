import Link from "next/link";

// Local-only landing index for the desktop design exploration.
//
// Links to every list + detail concept the design session produced so they can
// be reviewed from one place. Additive; not linked from the live app.

export const dynamic = "force-static";

const LIST = [
  { v: "a", name: "Dense data-table", desc: "Sortable columns, power-triage grid." },
  { v: "b", name: "Responsive card grid", desc: "Reflowing 1→2→3 cards; most scannable." },
  { v: "c", name: "Master-detail split", desc: "List rail + live preview pane." },
];

const DETAIL = [
  { v: "a", name: "Two-column reading", desc: "Reading column + sticky meta sidebar." },
  { v: "b", name: "Three-zone / master-detail", desc: "Queue rail + content + meta." },
  { v: "c", name: "Dashboard / command console", desc: "Full-width command bar + grids." },
];

function Section({
  title,
  base,
  items,
  extra = "",
}: {
  title: string;
  base: string;
  items: { v: string; name: string; desc: string }[];
  extra?: string;
}) {
  return (
    <section className="border-b border-border">
      <h2 className="border-b border-border px-4 py-3 font-mono text-xs font-bold uppercase tracking-wide text-foreground">
        {title}
      </h2>
      {items.map((it) => (
        <Link
          key={it.v}
          href={`${base}?variant=${it.v}${extra}`}
          className="flex items-baseline gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <span className="font-mono text-xs font-bold uppercase text-muted-foreground">
            {it.v}
          </span>
          <span className="min-w-0">
            <span className="text-[15px] font-medium text-foreground">{it.name}</span>
            <span className="ml-2 text-sm text-muted-foreground">{it.desc}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}

export default function DesignDesktopIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl">
        <header className="border-y border-border px-4 py-3 font-mono text-xs">
          <span className="font-bold uppercase tracking-wide">Desktop design concepts</span>
          <span className="ml-2 text-muted-foreground/60">view on a wide window</span>
        </header>

        {/* The converged unified SPA prototype. */}
        <section className="border-b border-border">
          <h2 className="border-b border-border px-4 py-3 font-mono text-xs font-bold uppercase tracking-wide text-foreground">
            Unified app (current direction)
          </h2>
          <Link
            href="/design/desktop/app"
            className="flex items-baseline gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <span className="font-mono text-xs font-bold uppercase text-muted-foreground">&#9654;</span>
            <span className="min-w-0">
              <span className="text-[15px] font-medium text-foreground">
                Rich table &rarr; split, resizable 3-column SPA
              </span>
              <span className="ml-2 text-sm text-muted-foreground">
                Browse as a table; click a proposal for rail &middot; detail &middot; meta. Drag dividers to resize.
              </span>
            </span>
          </Link>
        </section>

        <Section title="Proposal list" base="/design/desktop/list" items={LIST} />
        <Section
          title="Proposal detail"
          base="/design/desktop/detail"
          items={DETAIL}
          extra="&fixture=upgrade"
        />
        <p className="px-4 py-4 text-sm text-muted-foreground">
          Each page has an in-browser switcher to flip between concepts. Detail concepts
          accept <code className="font-mono">?fixture=upgrade|install|legacy</code> to see
          verified / in-progress / failed states.
        </p>
      </div>
    </div>
  );
}
