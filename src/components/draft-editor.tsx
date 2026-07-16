"use client";

// In-app review draft editor (BUI-242): Obsidian-style live-preview markdown
// (CodeMirror 6 via @atomic-editor/editor) over the versioned draft API.
//
// Save model: debounced autosave sends {content, baseVersion}. The server
// auto-merges non-overlapping concurrent edits (returns "merged"); a true
// overlap returns 409 and we surface a take-theirs / keep-mine choice with a
// word diff. Unsaved text is mirrored to localStorage so a dropped connection
// or closed tab loses nothing.
//
// The CM6 view is the source of truth after mount (markdownSource is
// mount-only); we remount via `documentId` when adopting remote content
// (take-theirs, restore-version, clean merge adoption).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { diffWords } from "diff";
import { Home, History, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import "@atomic-editor/editor/styles.css";

const AtomicCodeMirrorEditor = dynamic(
  () => import("@atomic-editor/editor").then((m) => m.AtomicCodeMirrorEditor),
  { ssr: false, loading: () => <div className="px-3 py-6 font-mono text-xs text-muted-foreground">loading editor…</div> }
);

type SaveState = "loading" | "locked" | "saved" | "dirty" | "saving" | "offline" | "conflict" | "error";

interface VersionMeta {
  version: number;
  author: string;
  merged: boolean;
  parentVersion: number | null;
  createdAt: string;
}

const lsKey = (id: string) => `draft:${id}`;

function StatusChip({ state }: { state: SaveState }) {
  const map: Record<SaveState, { text: string; cls: string }> = {
    loading: { text: "loading", cls: "text-muted-foreground" },
    locked: { text: "locked", cls: "text-muted-foreground" },
    saved: { text: "saved", cls: "text-emerald-600 dark:text-emerald-400" },
    dirty: { text: "unsaved", cls: "text-amber-500" },
    saving: { text: "saving…", cls: "text-amber-500" },
    offline: { text: "offline — will retry", cls: "text-amber-500" },
    conflict: { text: "conflict", cls: "text-destructive" },
    error: { text: "save failed", cls: "text-destructive" },
  };
  const m = map[state];
  return (
    <span className={cn("font-mono text-[0.7rem] font-bold uppercase tracking-wide", m.cls)}>{m.text}</span>
  );
}

// Word-level diff between two texts, rendered inline (green additions, red
// struck removals). Used by the conflict panel and history drawer.
function WordDiff({ from, to }: { from: string; to: string }) {
  const parts = useMemo(() => diffWords(from, to), [from, to]);
  return (
    <pre className="whitespace-pre-wrap break-words border border-border bg-muted/40 p-2 font-mono text-xs leading-relaxed">
      {parts.map((p, i) =>
        p.added ? (
          <span key={i} className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">{p.value}</span>
        ) : p.removed ? (
          <span key={i} className="bg-destructive/20 text-destructive line-through">{p.value}</span>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </pre>
  );
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function DraftEditor({ proposalId }: { proposalId: string }) {
  const [state, setState] = useState<SaveState>("loading");
  const [docId, setDocId] = useState(""); // CM6 identity — bump to remount with new content
  const [initialContent, setInitialContent] = useState("");
  const contentRef = useRef(""); // live editor text (editor is source of truth)
  const baseVersionRef = useRef(0); // head version our edits are based on
  const inFlightRef = useRef<string | null>(null); // content of the in-flight PUT
  const [conflict, setConflict] = useState<{ headVersion: number; headContent: string } | null>(null);
  const [mergeNote, setMergeNote] = useState<string | null>(null);
  const [restoreOffer, setRestoreOffer] = useState<{ content: string; at: number } | null>(null);

  // History drawer
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<VersionMeta[] | null>(null);
  const [diffView, setDiffView] = useState<{ version: number; from: string; to: string } | null>(null);

  const mount = useCallback((content: string, version: number) => {
    contentRef.current = content;
    baseVersionRef.current = version;
    setInitialContent(content);
    setDocId(`${proposalId}@v${version}@${Date.now()}`);
  }, [proposalId]);

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/reviews/${proposalId}/draft`);
        if (res.status === 401) {
          if (!cancelled) setState("locked");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        mount(data.content, data.headVersion);
        setState("saved");
        // Offer any newer local copy (e.g. tab closed while offline).
        try {
          const stored = localStorage.getItem(lsKey(proposalId));
          if (stored) {
            const parsed = JSON.parse(stored) as { content: string; at: number };
            if (parsed.content !== data.content) setRestoreOffer(parsed);
            else localStorage.removeItem(lsKey(proposalId));
          }
        } catch { /* localStorage unavailable */ }
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [proposalId, mount]);

  // Debounced autosave.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useCallback(async () => {
    const content = contentRef.current;
    if (inFlightRef.current !== null) return; // one save at a time; timer re-fires
    inFlightRef.current = content;
    setState("saving");
    try {
      const res = await fetch(`/api/reviews/${proposalId}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, baseVersion: baseVersionRef.current }),
      });
      if (res.status === 401) { setState("locked"); return; }
      if (res.status === 409) {
        const data = await res.json();
        setConflict({ headVersion: data.headVersion, headContent: data.headContent });
        setState("conflict");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.outcome === "merged") {
        if (contentRef.current === content) {
          // Nothing typed since — adopt the merged text (remount) so the user sees it.
          mount(data.content, data.version);
          setMergeNote("Merged with remote changes.");
        } else {
          // Typed meanwhile: keep the stale base so the next save re-merges.
          setMergeNote("Remote changes were merged into the saved copy; keep typing — saves re-merge.");
        }
      } else if (contentRef.current === content) {
        baseVersionRef.current = data.version;
      } else {
        baseVersionRef.current = data.version; // saved snapshot is the new head; our extra typing saves next
      }
      if (contentRef.current === content) {
        setState("saved");
        try { localStorage.removeItem(lsKey(proposalId)); } catch { /* noop */ }
      } else {
        setState("dirty");
      }
    } catch {
      setState(navigator.onLine === false ? "offline" : "error");
    } finally {
      inFlightRef.current = null;
      // If more typing happened during the request, schedule another save.
      if (contentRef.current !== content && saveTimer.current === null) {
        saveTimer.current = setTimeout(() => { saveTimer.current = null; void save(); }, 1500);
      }
    }
  }, [proposalId, mount]);

  const onChange = useCallback((markdown: string) => {
    contentRef.current = markdown;
    setState((s) => (s === "conflict" || s === "locked" ? s : "dirty"));
    try {
      localStorage.setItem(lsKey(proposalId), JSON.stringify({ content: markdown, at: Date.now() }));
    } catch { /* noop */ }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveTimer.current = null; void save(); }, 2000);
  }, [proposalId, save]);

  // Flush pending work when the tab hides (best effort).
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void save();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [save]);

  const loadHistory = useCallback(async () => {
    setHistoryOpen(true);
    setDiffView(null);
    const res = await fetch(`/api/reviews/${proposalId}/draft/versions`);
    if (res.ok) setVersions((await res.json()).versions);
  }, [proposalId]);

  const showVersionDiff = useCallback(async (v: VersionMeta, list: VersionMeta[]) => {
    const cur = await fetch(`/api/reviews/${proposalId}/draft/versions?version=${v.version}`);
    if (!cur.ok) return;
    const curContent = (await cur.json()).content as string;
    const prevMeta = list.find((x) => x.version === v.version - 1);
    let prevContent = "";
    if (prevMeta) {
      const prev = await fetch(`/api/reviews/${proposalId}/draft/versions?version=${prevMeta.version}`);
      if (prev.ok) prevContent = (await prev.json()).content as string;
    }
    setDiffView({ version: v.version, from: prevContent, to: curContent });
  }, [proposalId]);

  const resolveConflict = useCallback((choice: "theirs" | "mine") => {
    if (!conflict) return;
    if (choice === "theirs") {
      mount(conflict.headContent, conflict.headVersion);
      setState("saved");
    } else {
      // Keep mine: rebase onto head so the next save wins cleanly.
      baseVersionRef.current = conflict.headVersion;
      setState("dirty");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => { saveTimer.current = null; void save(); }, 100);
    }
    setConflict(null);
  }, [conflict, mount, save]);

  return (
    <div className="min-h-screen bg-background">
      <article className="mx-auto flex min-h-screen w-full max-w-2xl flex-col overflow-x-clip bg-background text-foreground lg:max-w-4xl">
        {/* Top bar */}
        <header className="h-[38px] shrink-0">
          <div className="fixed left-1/2 top-0 z-30 flex h-[38px] w-full max-w-2xl -translate-x-1/2 items-stretch border-y border-border bg-background lg:max-w-4xl">
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-stretch font-mono text-xs text-muted-foreground">
              <Link
                href="/"
                aria-label="Back to proposals"
                className="flex items-center px-4 hover:bg-muted hover:text-foreground"
              >
                <Home className="h-4 w-4" aria-hidden />
              </Link>
              <span className="flex items-center pr-2 text-muted-foreground/60" aria-hidden>/</span>
              <Link href={`/proposals/${proposalId}`} className="flex items-center pr-2 text-foreground hover:underline">
                #{proposalId}
              </Link>
              <span className="flex items-center pr-3 text-muted-foreground/60" aria-hidden>/ draft</span>
            </nav>
            <span className="ml-auto flex items-center pr-3">
              <StatusChip state={state} />
            </span>
            <button
              type="button"
              onClick={() => (historyOpen ? setHistoryOpen(false) : void loadHistory())}
              aria-label="Version history"
              title="Version history"
              className={cn(
                "flex w-9 shrink-0 items-center justify-center border-l border-border hover:bg-muted",
                historyOpen ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <History className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </header>

        {/* Banners */}
        {state === "locked" && (
          <div className="border-b border-border bg-muted/40 px-3 py-3 font-mono text-xs text-muted-foreground">
            This device isn&apos;t unlocked for editing. Visit <span className="font-bold text-foreground">/unlock?key=&lt;EDIT_SECRET&gt;</span> once
            on this device (the secret is in Vercel env / .env.local), then reload.
          </div>
        )}
        {restoreOffer && (
          <div className="flex items-center gap-2 border-b border-amber-500/60 bg-amber-500/10 px-3 py-2 font-mono text-xs">
            <span className="min-w-0 flex-1 text-amber-700 dark:text-amber-400">
              Unsaved local copy from {relTime(new Date(restoreOffer.at).toISOString())} on this device.
            </span>
            <button
              type="button"
              className="border border-border px-2 py-0.5 font-bold uppercase hover:bg-muted"
              onClick={() => {
                mount(restoreOffer.content, baseVersionRef.current);
                setRestoreOffer(null);
                setState("dirty");
                if (saveTimer.current) clearTimeout(saveTimer.current);
                saveTimer.current = setTimeout(() => { saveTimer.current = null; void save(); }, 500);
              }}
            >
              Restore
            </button>
            <button
              type="button"
              className="border border-border px-2 py-0.5 uppercase text-muted-foreground hover:bg-muted"
              onClick={() => {
                try { localStorage.removeItem(lsKey(proposalId)); } catch { /* noop */ }
                setRestoreOffer(null);
              }}
            >
              Discard
            </button>
          </div>
        )}
        {mergeNote && (
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
            <span className="min-w-0 flex-1">{mergeNote}</span>
            <button type="button" aria-label="Dismiss" className="hover:text-foreground" onClick={() => setMergeNote(null)}>
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )}

        {/* Conflict resolver */}
        {conflict && (
          <div className="border-b border-destructive/60 bg-destructive/10 px-3 py-3">
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-destructive">
              Conflicting edits — v{conflict.headVersion} changed the same lines
            </p>
            <div className="mt-2 max-h-64 overflow-y-auto">
              <WordDiff from={contentRef.current} to={conflict.headContent} />
            </div>
            <div className="mt-2 flex gap-2 font-mono text-xs">
              <button
                type="button"
                className="border border-border px-2 py-1 font-bold uppercase hover:bg-muted"
                onClick={() => resolveConflict("theirs")}
              >
                Take theirs
              </button>
              <button
                type="button"
                className="border border-border px-2 py-1 font-bold uppercase hover:bg-muted"
                onClick={() => resolveConflict("mine")}
              >
                Keep mine
              </button>
            </div>
          </div>
        )}

        {/* History drawer */}
        {historyOpen && (
          <div className="border-b border-border">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                History
              </span>
              <button type="button" aria-label="Close history" className="text-muted-foreground hover:text-foreground" onClick={() => setHistoryOpen(false)}>
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            {!versions ? (
              <p className="px-3 pb-3 font-mono text-xs text-muted-foreground">loading…</p>
            ) : (
              <ul className="max-h-72 overflow-y-auto">
                {versions.map((v) => (
                  <li key={v.version} className="flex items-center gap-2 border-t border-border px-3 py-2 font-mono text-xs">
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left hover:underline"
                      onClick={() => void showVersionDiff(v, versions)}
                      title="Show changes in this version"
                    >
                      <span className="font-bold tabular-nums">v{v.version}</span>{" "}
                      <span className={v.author.startsWith("agent") ? "text-sky-500" : "text-emerald-600 dark:text-emerald-400"}>
                        {v.author}
                      </span>
                      {v.merged && <span className="text-muted-foreground/60"> · merged</span>}
                      <span className="text-muted-foreground/60"> · {relTime(v.createdAt)}</span>
                    </button>
                    {v.version !== baseVersionRef.current && (
                      <button
                        type="button"
                        aria-label={`Restore v${v.version}`}
                        title={`Restore v${v.version}`}
                        className="text-muted-foreground hover:text-foreground"
                        onClick={async () => {
                          const res = await fetch(`/api/reviews/${proposalId}/draft/versions?version=${v.version}`);
                          if (!res.ok) return;
                          const content = (await res.json()).content as string;
                          mount(content, baseVersionRef.current); // old content on current base → saves as a new version
                          setHistoryOpen(false);
                          setState("dirty");
                          if (saveTimer.current) clearTimeout(saveTimer.current);
                          saveTimer.current = setTimeout(() => { saveTimer.current = null; void save(); }, 500);
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {diffView && (
              <div className="border-t border-border px-3 py-2">
                <p className="mb-1 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  v{diffView.version} changes
                </p>
                <div className="max-h-64 overflow-y-auto">
                  <WordDiff from={diffView.from} to={diffView.to} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Editor */}
        {state !== "loading" && state !== "locked" && docId && (
          <div className="min-h-0 flex-1 px-1 py-2 [&_.cm-editor]:bg-transparent [&_.cm-editor]:outline-none">
            <AtomicCodeMirrorEditor documentId={docId} markdownSource={initialContent} onMarkdownChange={onChange} />
          </div>
        )}
        {state === "loading" && (
          <p className="px-3 py-6 font-mono text-xs text-muted-foreground">loading draft…</p>
        )}
      </article>
    </div>
  );
}
