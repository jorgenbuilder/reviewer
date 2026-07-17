"use client";

// Variant C · Inverted (conversation-primary). Hypothesis: for multi-step
// instructions the dialogue should own the screen while a session is active.
// The DRAFT becomes the peeking layer: a pull-up sheet whose grab bar
// summarizes state (vote + edited-block count), and diff chips in AI replies
// deep-link straight to the touched blocks. Ending the session returns to the
// draft with the edit markers intact.

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DraftView,
  MessageBubble,
  PhoneFrame,
  StatusGlyph,
  VariantHeader,
} from "../parts";
import { useVoiceSession } from "../use-voice-session";
import { applyDraftEdit, CHANGED_IDS, DRAFT_BEFORE, type DraftBlock } from "../stub";

export default function InvertedVariant() {
  const msgsRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"draft" | "session">("draft");
  const [draftUp, setDraftUp] = useState(false);
  const [barPulse, setBarPulse] = useState(false);
  const [blocks, setBlocks] = useState<DraftBlock[]>(DRAFT_BEFORE);
  const [changed, setChanged] = useState<string[]>([]);

  const session = useVoiceSession((ex) => {
    if (!ex.edits) return;
    setBlocks(applyDraftEdit);
    setChanged(CHANGED_IDS);
    // The draft peek bar flashes so the edit is noticeable without leaving
    // the conversation; the chips are the deep link.
    setBarPulse(true);
    window.setTimeout(() => setBarPulse(false), 2200);
  });

  useEffect(() => {
    msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: "smooth" });
  }, [session.messages.length, session.transcript, session.phase]);

  function startSession() {
    setMode("session");
    session.start();
  }

  function endSession() {
    session.cancel();
    setMode("draft");
    setDraftUp(false);
    if (changed.length > 0) {
      window.setTimeout(() => {
        document
          .getElementById(`c-base-${changed[0]}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 350);
    }
  }

  function openDraftAt(id: string) {
    setDraftUp(true);
    window.setTimeout(() => {
      document
        .getElementById(`c-sheet-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
  }

  function reset() {
    session.reset();
    setBlocks(DRAFT_BEFORE);
    setChanged([]);
    setMode("draft");
    setDraftUp(false);
    setBarPulse(false);
  }

  const voteText = blocks.find((b) => b.id === "vote")?.text ?? "";
  const rejected = voteText.includes("REJECT");

  return (
    <PhoneFrame>
      <VariantHeader code="C" name="Inverted" onReset={reset} />
      <div className="relative min-h-0 flex-1">
        {/* Base layer: the draft, primary when no session is active. */}
        <div className="h-full overflow-y-auto pb-28">
          <DraftView blocks={blocks} changedIds={changed} idPrefix="c-base" />
        </div>
        {mode === "draft" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={startSession}
              className="pointer-events-auto flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-mono text-xs font-bold uppercase tracking-wide text-primary-foreground shadow-xl transition-transform active:scale-95"
            >
              <Mic className="h-4 w-4" aria-hidden /> Voice session
            </button>
          </div>
        )}

        {/* Conversation layer: owns the screen while the session is active. */}
        <div
          className={cn(
            "absolute inset-0 z-20 flex flex-col bg-background transition-transform duration-300 ease-out",
            mode === "session" ? "translate-y-0" : "translate-y-full"
          )}
        >
          <div className="flex h-10 shrink-0 items-center gap-2.5 border-b border-border px-4">
            <StatusGlyph phase={session.phase} hasReply={session.messages.length > 0} />
            <span className="font-mono text-xs font-bold uppercase tracking-wide">
              Voice session
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground/70">
              {session.phase === "listening"
                ? "listening"
                : session.phase === "thinking"
                  ? "working"
                  : "idle"}
            </span>
            <button
              type="button"
              onClick={endSession}
              className="rounded-md border border-border px-2 py-1 font-mono text-[11px] font-bold uppercase text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              End
            </button>
          </div>

          {/* Conversation with diff chips on AI replies. */}
          <div ref={msgsRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {session.messages.length === 0 && session.phase === "idle" && (
              <p className="pt-4 text-center font-mono text-xs leading-relaxed text-muted-foreground/70">
                The conversation runs here; pull the draft up
                <br />
                any time to check the artifact.
              </p>
            )}
            {session.messages.map((m, i) => (
              <div key={i}>
                <MessageBubble role={m.role}>{m.text}</MessageBubble>
                {m.role === "ai" && m.exchange.chips.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.exchange.chips.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => openDraftAt(c.id)}
                        className={cn(
                          "rounded-md border px-2 py-0.5 font-mono text-[11px]",
                          m.exchange.edits
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                            : "border-border bg-muted/60 text-muted-foreground"
                        )}
                      >
                        {m.exchange.edits ? "±" : "✓"} {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {session.phase === "listening" && (
              <MessageBubble role="user">
                <span className="italic opacity-80">{session.transcript || "…"}</span>
              </MessageBubble>
            )}
            {session.phase === "thinking" && (
              <MessageBubble role="ai">
                <StatusGlyph phase="thinking" />
              </MessageBubble>
            )}
          </div>

          {/* Mic footer. */}
          <div className="flex shrink-0 items-center justify-center border-t border-border py-3">
            <button
              type="button"
              onClick={() =>
                session.phase === "listening" ? session.cancel() : session.start()
              }
              disabled={session.phase === "thinking"}
              aria-label={session.phase === "listening" ? "Stop listening" : "Talk"}
              className={cn(
                "flex size-14 items-center justify-center rounded-full shadow-lg transition-colors",
                session.phase === "listening"
                  ? "bg-destructive text-white"
                  : "bg-primary text-primary-foreground",
                session.phase === "thinking" && "opacity-50"
              )}
            >
              {session.phase === "listening" ? (
                <Square className="h-6 w-6" aria-hidden />
              ) : (
                <Mic className="h-6 w-6" aria-hidden />
              )}
            </button>
          </div>
          {/* Room for the draft peek bar below the mic. */}
          <div className="h-11 shrink-0" aria-hidden />

          {/* The DRAFT as the peeking sheet over the conversation. */}
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-30 flex h-[88%] flex-col rounded-t-2xl border-x border-t bg-card shadow-2xl transition-all duration-300 ease-out",
              draftUp ? "translate-y-0" : "translate-y-[calc(100%-2.75rem)]",
              barPulse ? "border-emerald-500/70" : "border-border"
            )}
          >
            <button
              type="button"
              onClick={() => setDraftUp((v) => !v)}
              className="flex h-11 shrink-0 items-center gap-2.5 px-4 text-left"
            >
              <span
                className={cn(
                  "h-1 w-8 shrink-0 rounded-full transition-colors",
                  barPulse ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/40"
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                Draft ·{" "}
                <span
                  className={cn(
                    "font-bold",
                    rejected
                      ? "text-destructive"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {rejected ? "REJECT" : "ADOPT"}
                </span>
                {changed.length > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {" "}
                    · {changed.length} blocks edited
                  </span>
                )}
              </span>
              {draftUp ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
            </button>
            <div className="min-h-0 flex-1 overflow-y-auto border-t border-border">
              <DraftView blocks={blocks} changedIds={changed} idPrefix="c-sheet" />
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
