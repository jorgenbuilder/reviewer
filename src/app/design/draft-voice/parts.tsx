"use client";

// Shared presentational pieces for the draft-voice mockups: a phone-width
// frame (device-frame on desktop), the variant header bar, a styled
// markdown-ish stand-in for the CM6 draft editor, and the voice status glyph.

import Link from "next/link";
import type { ReactNode, Ref } from "react";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROPOSAL_ID, type DraftBlock } from "./stub";
import type { VoicePhase } from "./use-voice-session";

/** Phone-width column, full-height, clipped so sheets stay inside the frame. */
export function PhoneFrame({
  innerRef,
  children,
}: {
  innerRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh justify-center bg-background text-foreground">
      <div
        ref={innerRef}
        className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden border-border bg-background sm:border-x"
      >
        {children}
      </div>
    </div>
  );
}

/** Top bar naming the variant, linking back to the index, with demo replay. */
export function VariantHeader({
  code,
  name,
  onReset,
}: {
  code: string;
  name: string;
  onReset?: () => void;
}) {
  return (
    <header className="flex h-[38px] shrink-0 items-stretch border-b border-border font-mono text-xs">
      <Link
        href="/design/draft-voice"
        className="flex items-center gap-1.5 px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        index
      </Link>
      <span className="flex min-w-0 items-center truncate font-bold uppercase tracking-wide text-foreground">
        {code} · {name}
      </span>
      <span className="ml-auto flex items-center pr-2 text-muted-foreground/60">
        #{PROPOSAL_ID} / draft
      </span>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          aria-label="Replay demo"
          title="Replay demo"
          className="flex w-9 shrink-0 items-center justify-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </header>
  );
}

function Block({ b }: { b: DraftBlock }) {
  switch (b.kind) {
    case "h1":
      return <h1 className="text-lg font-bold leading-snug">{b.text}</h1>;
    case "vote": {
      const reject = b.text.includes("REJECT");
      return (
        <p
          className={cn(
            "font-mono text-sm font-bold",
            reject ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {b.text}
        </p>
      );
    }
    case "verified":
      return (
        <p className="font-mono text-xs leading-relaxed text-emerald-600 dark:text-emerald-400">
          {b.text}
        </p>
      );
    case "h2":
      return <h2 className="pt-2 text-sm font-bold">{b.text}</h2>;
    default:
      return <p className="text-[15px] leading-relaxed text-foreground/90">{b.text}</p>;
  }
}

/**
 * Markdown-ish draft stub (stands in for the CM6 editor). Blocks the AI has
 * edited keep a persistent emerald marker: the in-place "the AI touched this"
 * trail, with server-side versioning as the undo net.
 */
export function DraftView({
  blocks,
  changedIds,
  idPrefix,
}: {
  blocks: DraftBlock[];
  changedIds: string[];
  idPrefix: string;
}) {
  return (
    <article className="space-y-3 px-4 py-4">
      {blocks.map((b) => {
        const changed = changedIds.includes(b.id);
        return (
          <div
            key={b.id}
            id={`${idPrefix}-${b.id}`}
            className={cn(
              "-mx-2 rounded-md px-2 py-0.5 transition-colors duration-700",
              changed && "border-l-2 border-emerald-500/70 bg-emerald-500/10"
            )}
          >
            <Block b={b} />
          </div>
        );
      })}
    </article>
  );
}

/** Glanceable AI state: pulse = listening, dots = thinking, check = replied. */
export function StatusGlyph({
  phase,
  hasReply = false,
}: {
  phase: VoicePhase;
  hasReply?: boolean;
}) {
  if (phase === "listening") {
    return (
      <span className="relative flex size-2.5 shrink-0" aria-label="Listening">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
      </span>
    );
  }
  if (phase === "thinking") {
    return (
      <span className="flex shrink-0 items-center gap-0.5" aria-label="Working">
        {[0, 150, 300].map((d) => (
          <span
            key={d}
            className="size-1.5 animate-bounce rounded-full bg-amber-500"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </span>
    );
  }
  if (hasReply) {
    return <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-label="Done" />;
  }
  return <span className="size-2.5 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden />;
}

/** Chat bubble; user right / AI left, matching the app's muted palette. */
export function MessageBubble({
  role,
  children,
}: {
  role: "user" | "ai";
  children: ReactNode;
}) {
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
          role === "user"
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground"
        )}
      >
        {children}
      </div>
    </div>
  );
}
