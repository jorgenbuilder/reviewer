import Link from "next/link";

// Local-only index for the draft voice-control exploration: talking to the AI
// over the phone draft view, with the conversation as a second sheet and the
// draft (the artifact) visible underneath. Carries the JTBD analysis the
// three mockups were designed against. Additive; not linked from the live app.

export const dynamic = "force-static";

const VARIANTS = [
  {
    v: "a",
    name: "Detent sheet",
    hyp: "The conversation is a place you visit: Maps-style peek / half / full snap points give enough control to balance reading and commanding.",
  },
  {
    v: "b",
    name: "Caption strip",
    hyp: "The conversation never needs to be a destination: a talk pill plus a two-line caption keeps the draft at least 70% visible; transcript only on demand.",
  },
  {
    v: "c",
    name: "Inverted (conversation-primary)",
    hyp: "For multi-step instructions the dialogue should own the screen while the draft peeks; diff chips deep-link back into the touched blocks.",
  },
];

const TENSIONS = [
  {
    name: "Reading vs commanding",
    t: "The same screen must serve two modes, reading the draft and driving the AI, and they compete for the same pixels.",
    p: "The draft is the resting state; the conversation is a transient layer that gets out of the way the moment it has done its job.",
  },
  {
    name: "Occlusion vs payoff",
    t: "A conversation UI wants space, but the whole point of the job is watching the draft change underneath.",
    p: "When an edit lands, the conversation collapses on its own: the visible change in the draft is the confirmation, not the AI's prose.",
  },
  {
    name: "Voice in, text out",
    t: "Speaking is faster than typing, but listening to spoken replies is slower than skimming.",
    p: "Voice in, glanceable text out: a one-line status or summary is always visible, the full transcript only on demand.",
  },
  {
    name: "One-handed reach",
    t: "Immersive reading wants a chromeless full screen, but every control must sit in the thumb arc.",
    p: "All interactive chrome (talk, detents, chips) lives in the bottom third; nothing critical sits above mid-screen.",
  },
  {
    name: "Trust in the edit",
    t: "An invisible AI edit to the artifact you are about to submit is scary, yet a full diff-review gate is too heavy for “change the vote”.",
    p: "Persistent in-place edit markers on the touched blocks, with the existing server-side versioning as the undo net; no modal approval step.",
  },
  {
    name: "Interruption and state",
    t: "Phone sessions get interrupted constantly, and listening / thinking / done states are invisible unless shown.",
    p: "One always-visible status glyph (pulse, dots, check) and a session that collapses to a peek instead of dying, resumable with one tap.",
  },
];

export default function DraftVoiceIndex() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-md">
        <header className="border-b border-border px-4 py-3 font-mono text-xs sm:border-x">
          <span className="font-bold uppercase tracking-wide">Draft voice control</span>
          <span className="ml-2 text-muted-foreground/60">open on a phone (~390px)</span>
        </header>

        <section className="border-b border-border px-4 py-4 sm:border-x">
          <h2 className="font-mono text-xs font-bold uppercase tracking-wide">The job</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">
            When I spot something to change while reading a review draft on my phone, I
            want to <em>say the change and watch it land in the draft</em>, so I can
            finish the review one-handed, without a keyboard and without losing my place.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The draft is the artifact: AI edits land in the versioned draft itself, so
            the draft visibly updating underneath the conversation is the payoff, not a
            side effect. The interaction is hired for command-and-verify, not for chat.
          </p>
        </section>

        <section className="border-b border-border px-4 py-4 sm:border-x">
          <h2 className="font-mono text-xs font-bold uppercase tracking-wide">
            Design tensions
          </h2>
          <ol className="mt-3 space-y-3">
            {TENSIONS.map((t, i) => (
              <li key={t.name} className="text-sm leading-snug">
                <p className="font-medium text-foreground">
                  {i + 1}. {t.name}
                </p>
                <p className="mt-0.5 text-muted-foreground">{t.t}</p>
                <p className="mt-0.5 text-foreground/90">
                  <span className="font-mono text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    position{" "}
                  </span>
                  {t.p}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-b border-border sm:border-x">
          <h2 className="border-b border-border px-4 py-3 font-mono text-xs font-bold uppercase tracking-wide">
            Variants
          </h2>
          {VARIANTS.map((it) => (
            <Link
              key={it.v}
              href={`/design/draft-voice/${it.v}`}
              className="block border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex items-baseline gap-3">
                <span className="font-mono text-xs font-bold uppercase text-muted-foreground">
                  {it.v}
                </span>
                <span className="text-[15px] font-medium text-foreground">{it.name}</span>
              </span>
              <p className="mt-1 pl-6 text-sm leading-snug text-muted-foreground">
                {it.hyp}
              </p>
            </Link>
          ))}
        </section>

        <p className="px-4 py-4 text-sm leading-relaxed text-muted-foreground">
          All three variants play the same canned script: tap the mic, and exchange 1
          (&ldquo;change the vote to reject&hellip;&rdquo;) edits the draft in place,
          while exchange 2 (&ldquo;verify the fee math&rdquo;) answers without editing.
          The circular-arrow icon in each header replays from scratch. Everything is
          simulated client-side; nothing is wired to the live app.
        </p>
      </div>
    </div>
  );
}
