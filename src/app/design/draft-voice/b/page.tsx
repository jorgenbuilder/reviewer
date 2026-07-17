"use client";

// Variant B · Caption strip. Hypothesis: the conversation never needs to be a
// destination. A floating talk pill plus a two-line caption strip (live
// transcript while listening, reply summary after) keeps the draft at least
// ~70% visible at all times; the full transcript is an on-demand panel capped
// at 30% of the viewport. The draft itself is where you watch the edit land.

import { useState } from "react";
import { ChevronDown, ChevronUp, Mic, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DraftView, PhoneFrame, StatusGlyph, VariantHeader } from "../parts";
import { useVoiceSession } from "../use-voice-session";
import { applyDraftEdit, CHANGED_IDS, DRAFT_BEFORE, type DraftBlock } from "../stub";

export default function CaptionStripVariant() {
  const [blocks, setBlocks] = useState<DraftBlock[]>(DRAFT_BEFORE);
  const [changed, setChanged] = useState<string[]>([]);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const session = useVoiceSession((ex) => {
    if (!ex.edits) return;
    // The draft is fully visible behind the strip, so the edit is watched
    // live: apply, then scroll the changed block into view.
    setBlocks(applyDraftEdit);
    setChanged(CHANGED_IDS);
    window.setTimeout(() => scrollToBlock(CHANGED_IDS[0]), 250);
  });

  function scrollToBlock(id: string) {
    document
      .getElementById(`b-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function onTalk() {
    if (session.phase === "listening") {
      session.cancel();
      return;
    }
    setCaptionOpen(true);
    setHistoryOpen(false);
    session.start();
  }

  function reset() {
    session.reset();
    setBlocks(DRAFT_BEFORE);
    setChanged([]);
    setCaptionOpen(false);
    setHistoryOpen(false);
  }

  const lastAi = [...session.messages].reverse().find((m) => m.role === "ai");
  const captionText =
    session.phase === "listening"
      ? session.transcript || "Listening…"
      : session.phase === "thinking"
        ? "Working…"
        : (lastAi?.text ?? "Tap talk and say what to change.");

  return (
    <PhoneFrame>
      <VariantHeader code="B" name="Caption strip" onReset={reset} />
      <div className="relative min-h-0 flex-1">
        {/* The draft is the interface; it stays readable throughout. */}
        <div className="h-full overflow-y-auto pb-44">
          <DraftView blocks={blocks} changedIds={changed} idPrefix="b" />
        </div>

        {/* Bottom overlay: history / caption, then the talk pill. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {historyOpen && (
            <div className="pointer-events-auto flex max-h-[30dvh] w-full flex-col rounded-xl border border-border bg-card/95 shadow-xl backdrop-blur">
              <div className="flex h-8 shrink-0 items-center justify-between border-b border-border px-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Transcript
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  aria-label="Collapse transcript"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
                {session.messages.map((m, i) => (
                  <div key={i} className="flex gap-2 text-xs leading-relaxed">
                    <span
                      className={cn(
                        "mt-0.5 w-7 shrink-0 font-mono text-[10px] font-bold uppercase",
                        m.role === "user"
                          ? "text-foreground"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {m.role === "user" ? "you" : "ai"}
                    </span>
                    <span className="text-foreground/90">{m.text}</span>
                  </div>
                ))}
                {session.phase === "listening" && (
                  <div className="flex gap-2 text-xs leading-relaxed">
                    <span className="mt-0.5 w-7 shrink-0 font-mono text-[10px] font-bold uppercase text-foreground">
                      you
                    </span>
                    <span className="italic text-muted-foreground">
                      {session.transcript || "…"}
                    </span>
                  </div>
                )}
                {session.messages.length === 0 && session.phase === "idle" && (
                  <p className="py-1 font-mono text-xs text-muted-foreground/70">
                    Nothing yet.
                  </p>
                )}
              </div>
            </div>
          )}

          {captionOpen && !historyOpen && (
            <div className="pointer-events-auto w-full rounded-xl border border-border bg-card/95 px-3 py-2.5 shadow-xl backdrop-blur">
              <div className="flex items-start gap-2.5">
                <span className="mt-1">
                  <StatusGlyph phase={session.phase} hasReply={!!lastAi} />
                </span>
                <p className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug text-foreground">
                  {captionText}
                </p>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(true)}
                    aria-label="Show transcript"
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCaptionOpen(false);
                      session.cancel();
                    }}
                    aria-label="Dismiss"
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              {session.phase === "idle" && lastAi && (
                <div className="mt-1.5 flex flex-wrap gap-1.5 pl-[22px]">
                  {lastAi.exchange.chips.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => scrollToBlock(c.id)}
                      className={cn(
                        "rounded-md border px-2 py-0.5 font-mono text-[11px]",
                        lastAi.exchange.edits
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                          : "border-border bg-muted/60 text-muted-foreground"
                      )}
                    >
                      {lastAi.exchange.edits ? "View change · " : ""}
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onTalk}
            disabled={session.phase === "thinking"}
            className={cn(
              "pointer-events-auto flex h-12 items-center gap-2 rounded-full px-6 font-mono text-xs font-bold uppercase tracking-wide shadow-xl transition-colors",
              session.phase === "listening"
                ? "bg-destructive text-white"
                : "bg-primary text-primary-foreground",
              session.phase === "thinking" && "opacity-60"
            )}
          >
            {session.phase === "listening" ? (
              <>
                <Square className="h-4 w-4" aria-hidden /> Stop
              </>
            ) : session.phase === "thinking" ? (
              <>
                <StatusGlyph phase="thinking" /> Working
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" aria-hidden /> Talk
              </>
            )}
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}
