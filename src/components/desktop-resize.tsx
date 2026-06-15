"use client";

// Resizable column primitive for the desktop layout: a drag- AND keyboard-
// operable divider plus the width state hook that persists to localStorage.

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function useResizableWidth({
  initial,
  min,
  max,
  storageKey,
  side,
}: {
  initial: number;
  min: number;
  max: number;
  storageKey: string;
  side: "left" | "right";
}) {
  const [width, setWidth] = useState(initial);
  const hydrated = useRef(false);

  // Load the persisted width after mount so the server and first client render
  // agree on `initial` (localStorage is client-only).
  useEffect(() => {
    const stored = Number(window.localStorage.getItem(storageKey));
    if (stored && !Number.isNaN(stored)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWidth(Math.min(max, Math.max(min, stored)));
    }
    hydrated.current = true;
  }, [storageKey, min, max]);

  useEffect(() => {
    if (hydrated.current) window.localStorage.setItem(storageKey, String(width));
  }, [width, storageKey]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = width;
      const move = (ev: PointerEvent) => {
        const delta = ev.clientX - startX;
        const raw = side === "left" ? startW + delta : startW - delta;
        setWidth(Math.min(max, Math.max(min, raw)));
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width, min, max, side]
  );

  const adjust = useCallback(
    (delta: number) => setWidth((w) => Math.min(max, Math.max(min, w + delta))),
    [min, max]
  );

  return { width, onPointerDown, adjust, min, max };
}

// Draggable + keyboard-operable column divider. Advertises proper separator
// semantics (aria-valuenow/min/max) and supports ←/→ (Shift = larger step) plus
// Home/End to size the adjacent column to its min/max.
export function ResizeHandle({
  onPointerDown,
  adjust,
  width,
  min,
  max,
  side,
  label,
  className,
}: {
  onPointerDown: (e: React.PointerEvent) => void;
  adjust: (delta: number) => void;
  width: number;
  min: number;
  max: number;
  side: "left" | "right";
  label: string;
  className?: string;
}) {
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    if (e.key === "Home") return adjust(min - width);
    if (e.key === "End") return adjust(max - width);
    const step = e.shiftKey ? 48 : 16;
    // The left column sits left of its handle, the right column sits right of
    // its handle, so arrow direction grows/shrinks each intuitively.
    const grow = (e.key === "ArrowRight") === (side === "left");
    adjust(grow ? step : -step);
  };
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(width)}
      aria-valuemin={min}
      aria-valuemax={max}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cn(
        "group relative z-20 w-px shrink-0 cursor-col-resize bg-border outline-none focus-visible:bg-foreground",
        className
      )}
    >
      <span className="absolute inset-y-0 -left-1.5 -right-1.5 transition-colors group-hover:bg-foreground/15 group-focus-visible:bg-foreground/20" />
    </div>
  );
}
