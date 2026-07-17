"use client";

// Variant A · Detent sheet. Hypothesis: the conversation is a place you
// visit. A Maps-style bottom sheet with peek / half / full snap points (drag
// the grabber, tap it to step up, tap the scrim to drop back) keeps the draft
// visible and progressively dimmed underneath. When an edit lands, the sheet
// auto-drops to peek so the changed blocks are what you see.

import { useEffect, useRef, useState } from "react";
import { ChevronUp, Mic, Square, X } from "lucide-react";
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

type Detent = "hidden" | "peek" | "half" | "full";

const PEEK_PX = 88;

export default function DetentSheetVariant() {
  const frameRef = useRef<HTMLDivElement>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ y: number; shown: number; moved: boolean } | null>(null);
  const [frameH, setFrameH] = useState(720);
  const [blocks, setBlocks] = useState<DraftBlock[]>(DRAFT_BEFORE);
  const [changed, setChanged] = useState<string[]>([]);
  const [detent, setDetent] = useState<Detent>("hidden");
  const [shown, setShown] = useState(0); // px of sheet currently visible
  const [dragging, setDragging] = useState(false);

  function detentPx(d: Detent): number {
    if (d === "hidden") return 0;
    if (d === "peek") return PEEK_PX;
    if (d === "half") return Math.round(frameH * 0.46);
    return Math.round(frameH * 0.88);
  }
  const sheetH = Math.round(frameH * 0.88);

  function goTo(d: Detent) {
    setDetent(d);
    setShown(detentPx(d));
  }

  const session = useVoiceSession((ex) => {
    if (!ex.edits) return;
    // The edit landing in the draft IS the confirmation: apply it, collapse
    // the sheet to peek, and bring the first changed block into view.
    setBlocks(applyDraftEdit);
    setChanged(CHANGED_IDS);
    goTo("peek");
    window.setTimeout(() => {
      document
        .getElementById(`a-${CHANGED_IDS[0]}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
  });

  // Measure the frame so detents track the real viewport.
  useEffect(() => {
    const measure = () => {
      if (frameRef.current) setFrameH(frameRef.current.clientHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Keep the sheet glued to its detent when the frame resizes.
  useEffect(() => {
    if (!dragging) setShown(detentPx(detent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameH, detent]);

  // Pin the conversation to its latest message.
  useEffect(() => {
    msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: "smooth" });
  }, [session.messages.length, session.transcript, session.phase]);

  function onPointerDown(e: React.PointerEvent) {
    dragState.current = { y: e.clientY, shown, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    const s = dragState.current;
    if (!s) return;
    const delta = s.y - e.clientY;
    if (Math.abs(delta) > 4) s.moved = true;
    setShown(Math.min(Math.max(s.shown + delta, 0), detentPx("full")));
  }
  function onPointerUp() {
    const s = dragState.current;
    if (!s) return;
    dragState.current = null;
    setDragging(false);
    if (!s.moved) {
      // Tap on the grabber: step up one detent (full cycles back to peek).
      goTo(detent === "peek" ? "half" : detent === "half" ? "full" : "peek");
      return;
    }
    if (shown < PEEK_PX * 0.6) {
      goTo("hidden");
      session.cancel();
      return;
    }
    let best: Detent = "peek";
    for (const c of ["half", "full"] as Detent[]) {
      if (Math.abs(shown - detentPx(c)) < Math.abs(shown - detentPx(best))) best = c;
    }
    goTo(best);
  }

  function reset() {
    session.reset();
    setBlocks(DRAFT_BEFORE);
    setChanged([]);
    goTo("hidden");
  }

  const lastMsg = session.messages[session.messages.length - 1];
  const peekLine =
    session.phase === "listening"
      ? session.transcript || "Listening…"
      : session.phase === "thinking"
        ? "Working…"
        : lastMsg
          ? lastMsg.text
          : "Tap the mic and talk";

  const scrimOpacity =
    Math.max(0, (shown - PEEK_PX) / Math.max(1, detentPx("full") - PEEK_PX)) * 0.7;

  return (
    <PhoneFrame innerRef={frameRef}>
      <VariantHeader code="A" name="Detent sheet" onReset={reset} />
      <div className="relative min-h-0 flex-1">
        {/* The draft (the artifact) underneath everything. */}
        <div className="h-full overflow-y-auto pb-28">
          <DraftView blocks={blocks} changedIds={changed} idPrefix="a" />
        </div>

        {/* Scrim: dim strength follows how far the sheet is up. */}
        <div
          className={cn(
            "absolute inset-0 z-10 bg-background",
            !dragging && "transition-opacity duration-300"
          )}
          style={{
            opacity: scrimOpacity,
            pointerEvents: scrimOpacity > 0.35 ? "auto" : "none",
          }}
          onClick={() => goTo("peek")}
          aria-hidden
        />

        {/* Talk FAB in the thumb zone (only while the sheet is away). */}
        {detent === "hidden" && (
          <button
            type="button"
            onClick={() => {
              goTo("half");
              session.start();
            }}
            aria-label="Talk to the AI"
            className="absolute bottom-6 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform active:scale-95"
          >
            <Mic className="h-6 w-6" aria-hidden />
          </button>
        )}

        {/* The conversation sheet. */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl border-x border-t border-border bg-card shadow-2xl",
            !dragging && "transition-transform duration-300 ease-out"
          )}
          style={{ height: sheetH, transform: `translateY(${sheetH - shown}px)` }}
        >
          {/* Grabber + peek row: drag to any detent, tap to step up. */}
          <div
            className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/40" aria-hidden />
            <div className="flex h-12 items-center gap-2.5 px-4">
              <StatusGlyph phase={session.phase} hasReply={session.messages.length > 0} />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                {peekLine}
              </span>
              <ChevronUp
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  detent === "full" && "rotate-180"
                )}
                aria-hidden
              />
            </div>
          </div>

          {/* Conversation. */}
          <div ref={msgsRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3">
            {session.messages.length === 0 && session.phase === "idle" && (
              <p className="pt-4 text-center font-mono text-xs leading-relaxed text-muted-foreground/70">
                Say things like &ldquo;change the vote to reject&rdquo; or
                <br />
                &ldquo;verify the fee math&rdquo;.
              </p>
            )}
            {session.messages.map((m, i) => (
              <MessageBubble key={i} role={m.role}>
                {m.text}
              </MessageBubble>
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

          {/* Controls. */}
          <div className="flex shrink-0 items-center gap-3 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() =>
                session.phase === "listening" ? session.cancel() : session.start()
              }
              disabled={session.phase === "thinking"}
              aria-label={session.phase === "listening" ? "Stop listening" : "Talk"}
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-full shadow transition-colors",
                session.phase === "listening"
                  ? "bg-destructive text-white"
                  : "bg-primary text-primary-foreground",
                session.phase === "thinking" && "opacity-50"
              )}
            >
              {session.phase === "listening" ? (
                <Square className="h-5 w-5" aria-hidden />
              ) : (
                <Mic className="h-5 w-5" aria-hidden />
              )}
            </button>
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground/70">
              {session.phase === "listening"
                ? "Listening · tap to stop"
                : session.phase === "thinking"
                  ? "Working on it…"
                  : "Tap to talk · drag the bar to resize"}
            </span>
            <button
              type="button"
              onClick={() => {
                goTo("hidden");
                session.cancel();
              }}
              aria-label="Close"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
