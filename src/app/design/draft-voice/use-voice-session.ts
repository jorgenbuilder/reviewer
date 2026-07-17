"use client";

// Scripted stand-in for a real voice session. Each start() plays the next
// canned exchange: the transcript "arrives" word by word (listening), then a
// fake model latency (thinking), then the reply lands and onReply fires so the
// page can mutate the draft. Timers are cleared on cancel/reset/unmount, so
// interrupting mid-listen behaves like a real mic cut.

import { useEffect, useRef, useState } from "react";
import { EXCHANGES, LISTEN_MS, THINK_MS, type Exchange } from "./stub";

export type VoicePhase = "idle" | "listening" | "thinking";

export interface VoiceMsg {
  role: "user" | "ai";
  text: string;
  exchange: Exchange;
}

export function useVoiceSession(onReply?: (ex: Exchange) => void) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<VoiceMsg[]>([]);
  const phaseRef = useRef<VoicePhase>("idle");
  const nextRef = useRef(0); // which scripted exchange plays next
  const timersRef = useRef<number[]>([]);
  const onReplyRef = useRef(onReply);
  onReplyRef.current = onReply;

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  function setPhaseBoth(p: VoicePhase) {
    phaseRef.current = p;
    setPhase(p);
  }

  function clearTimers() {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }

  /** Stop listening/thinking without losing the conversation so far. */
  function cancel() {
    clearTimers();
    setTranscript("");
    setPhaseBoth("idle");
  }

  /** Play the next scripted exchange (no-op unless idle). */
  function start() {
    if (phaseRef.current !== "idle") return;
    const ex = EXCHANGES[nextRef.current % EXCHANGES.length];
    nextRef.current += 1;
    setPhaseBoth("listening");
    setTranscript("");
    const words = ex.user.split(" ");
    const step = LISTEN_MS / words.length;
    const push = (t: number) => timersRef.current.push(t);
    words.forEach((_, i) =>
      push(
        window.setTimeout(
          () => setTranscript(words.slice(0, i + 1).join(" ")),
          Math.round(step * (i + 1))
        )
      )
    );
    push(
      window.setTimeout(() => {
        setMessages((m) => [...m, { role: "user", text: ex.user, exchange: ex }]);
        setTranscript("");
        setPhaseBoth("thinking");
      }, LISTEN_MS + 200)
    );
    push(
      window.setTimeout(() => {
        setMessages((m) => [...m, { role: "ai", text: ex.reply, exchange: ex }]);
        setPhaseBoth("idle");
        onReplyRef.current?.(ex);
      }, LISTEN_MS + 200 + THINK_MS)
    );
  }

  /** Wipe the conversation and rewind the script (demo replay). */
  function reset() {
    clearTimers();
    nextRef.current = 0;
    setMessages([]);
    setTranscript("");
    setPhaseBoth("idle");
  }

  return { phase, transcript, messages, start, cancel, reset };
}
