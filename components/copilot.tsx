"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCatalystStore } from "@/lib/store";
import { useCopilotSession } from "@/lib/copilot-session";
import { resolveContext } from "@/lib/agent/route-context";
import { apiUrl } from "@/lib/api-base";
import { coverageInfo, DATA_AS_OF } from "@/lib/data/fixtures";
import { ASSISTANT_NAME, buildInsightPrompts, buildQuickPrompts } from "@/lib/agent/assistant";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { VIEW_IDS } from "@/lib/agent/retrieval/types";
import type { ChatAnswer, SymbolCode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CitationDialog } from "@/components/citation-dialog";
import { Blobatar } from "@blobatar/react";
import { useGaze } from "@blobatar/react/gaze";
import { happy, sad, thinking } from "blobatar/expression";
import { IconAttention, IconCaretDown, IconClose, IconCollapse, IconExpand, IconSend } from "@/components/ui/icons";

/**
 * Which page the reader asked from.
 *
 * Sent as a ranking prior, never a filter: a reader on the dashboard asking
 * about the causal map still reaches it. Anything unrecognised is simply
 * omitted, so a new route adds no prior rather than an incorrect one.
 */
function viewFromPath(pathname: string): string | undefined {
  if (pathname === "/") return "dashboard";
  const first = pathname.split("/").filter(Boolean)[0];
  if (!first) return undefined;
  if (first === "cases") return pathname.split("/").filter(Boolean).length > 1 ? "case" : "cases";
  if (first === "companies") return pathname.split("/").filter(Boolean).length > 1 ? "company" : "companies";
  return VIEW_IDS.includes(first as (typeof VIEW_IDS)[number]) ? first : undefined;
}

const RECORD_SHORT = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(DATA_AS_OF));

/** One tone per kind of turn, fill and text together. The tail is a rotated
 *  square painted from the same classes as the bubble it hangs off, so the two
 *  can never disagree. */
const BUBBLE_TONE = {
  user: "bg-primary text-primary-foreground",
  assistant: "bg-muted text-foreground",
  failed: "bg-danger-soft text-danger",
} as const;

/** Answers arrive as one labelled line per fact. Rendering them as a single
 *  paragraph buried the audit trail in prose, so each label becomes its own
 *  block and the endpoint line keeps a monospaced, selectable value — that
 *  line is what a reader takes to the provider. */
const BLOCK_LABELS = ["Arti angka ini", "Dibaca dari", "Cara hitung", "Angka yang dimasukkan", "Rincian teknis untuk diperiksa"];

interface AnswerBlock { key: string; label?: string; body: string; technical?: boolean }

function answerBlocks(text: string): AnswerBlock[] {
  return text.split("\n").filter((line) => line.trim()).map((line, index) => {
    const matched = BLOCK_LABELS.find((label) => line.startsWith(label));
    const cut = line.indexOf(": ");
    if (!matched || cut < 0) return { key: `${index}`, body: line };
    return { key: `${index}`, label: line.slice(0, cut), body: line.slice(cut + 2), technical: matched === "Rincian teknis untuk diperiksa" };
  });
}

export function Copilot({ dismissible = false, workspace = false }: { dismissible?: boolean; workspace?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, insights, playbook, caseMandates, setCopilotOpen, copilotContext, setCopilotContext, clearCopilotContext } = useCatalystStore();
  const { messages, append, input, setInput, returnPath, setReturnPath, routeSymbol } = useCopilotSession();
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  // The context question prefills the composer, but only once per context —
  // retyping over it must not be undone by the next render.
  const prefilled = useRef<string | null>(null);
  const nextId = useRef(0);
  const openNotes = insights.filter((item) => item.status === "pending").length;
  const insightPrompts = useMemo(() => buildInsightPrompts(insights, DEFAULT_THRESHOLDS.copilotInsightPrompts), [insights]);
  const prompts = useMemo(() => buildQuickPrompts(profile), [profile]);
  // One chip per distinct question. Each chip's text is its key, so a repeat
  // is not merely redundant on screen — React cannot tell the two apart.
  const quickPrompts = useMemo(() => [...new Set([...insightPrompts, ...prompts])], [insightPrompts, prompts]);
  // The route is the default, not an override: a case the reader picked or
  // an evidence button they pressed stays until they clear it.
  const activeContext = resolveContext(copilotContext, routeSymbol);
  const contextLabel = activeContext?.label ?? "Tanpa kasus";
  const bindTo = (symbol: SymbolCode) => setCopilotContext({ label: symbol, question: "", symbol });
  // The face answers with the panel. It thinks while the engine works, and
  // afterwards it holds the outcome of the last turn — a refused question
  // keeps a sad face until the next one lands, so the state is visible
  // without re-reading the thread.
  const lastMessage = messages[messages.length - 1];
  const mood = loading ? thinking : lastMessage?.failed ? sad : lastMessage?.role === "assistant" && lastMessage.answer ? happy : undefined;
  // Only the header face is large enough for the eyes to read as eyes, so
  // it is the only one given the pointer-tracking layer.
  const { ref: faceRef } = useGaze({ travel: 3, lookAt: "pointer" });

  useEffect(() => {
    const question = copilotContext?.question ?? "";
    if (!question || prefilled.current === question) return;
    prefilled.current = question;
    setInput(question);
  }, [copilotContext?.question, setInput]);

  useEffect(() => { if (dismissible) panelRef.current?.focus(); }, [dismissible]);

  useEffect(() => { streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight }); }, [messages.length, loading]);

  // The composer grows with the question and stops at five lines, after which
  // it scrolls: past that the thread behind it is what disappears.
  useEffect(() => {
    const field = composerRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 132)}px`;
  }, [input]);

  // `bound` is the answer to a clarifying turn: the reader's choice must reach
  // the engine with the original question, before the store has settled.
  const submit = async (question: string, bound?: SymbolCode) => {
    // Below the schema's minimum there is nothing to answer, and sending it
    // anyway returned a 400 the reader read as the service refusing them.
    if (question.trim().length < DEFAULT_THRESHOLDS.copilotQuestionMinChars || loading) return;
    const asked = question.trim();
    const symbol = bound ?? activeContext?.symbol;
    append({ id: `u-${(nextId.current += 1)}`, role: "user", text: asked });
    setInput("");
    setLoading(true);
    try {
      // The turns already on screen, so a follow-up can resolve what "yang
      // tadi" refers to. Failed sends are excluded: an error notice is not a
      // conversational turn, and feeding it back would have the model explain
      // its own plumbing.
      const history = messages
        .filter((message) => !message.failed)
        .slice(-DEFAULT_THRESHOLDS.copilotHistoryTurns)
        // Trimmed here as well as at the route, so the request the panel sends
        // is already inside the bound the engine keeps. The server's cap is
        // then a guard against other callers, never something a reader meets.
        // The symbols an assistant turn named travel with it, so a follow-up
        // pointing at "yang satunya" has the list the reader is looking at.
        // Nothing else from the answer is sent: the turn is a pointer into
        // the reader's own screen, not a second source of figures.
        .map((message) => ({
          role: message.role,
          text: message.text.slice(0, DEFAULT_THRESHOLDS.copilotHistoryTurnChars),
          ...(message.answer?.relatedSymbols?.length
            ? { symbols: message.answer.relatedSymbols.slice(0, DEFAULT_THRESHOLDS.copilotHistorySymbols) }
            : {}),
        }));
      const response = await fetch(apiUrl("/api/chat"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: asked, profile, contextSymbol: symbol, userInsights: insights, playbook, caseMandate: symbol ? caseMandates[symbol] : undefined, history, view: viewFromPath(pathname) }) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      const answer = body.answer as ChatAnswer;
      append({ id: `a-${(nextId.current += 1)}`, role: "assistant", text: answer.text, answer });
      // A symbol named in the question outranks the chip inside the engine, so
      // the chip follows the answer rather than contradicting it.
      if (answer.questionSymbol && answer.questionSymbol !== symbol) bindTo(answer.questionSymbol);
    } catch (error) {
      // Name the failure. "Tidak merespons" covered a 500, an offline device
      // and a malformed body alike, so a reader could not tell whether to
      // retry or report it.
      const reason = error instanceof Error && error.message.startsWith("HTTP") ? `layanan menolak permintaan (${error.message})` : "jaringan atau layanan tidak terjangkau";
      append({ id: `e-${(nextId.current += 1)}`, role: "assistant", failed: true, text: `Pertanyaan tidak terkirim: ${reason}. Rekaman tidak berubah — coba kirim ulang.` });
    } finally { setLoading(false); }
  };

  const onSubmit = (event: FormEvent) => { event.preventDefault(); void submit(input); };

  const expand = () => { setReturnPath(pathname); setCopilotOpen(false); router.push("/copilot"); };
  const collapse = () => { setCopilotOpen(true); router.push(returnPath ?? "/"); setReturnPath(null); };

  return (
    <div
      ref={panelRef}
      tabIndex={dismissible ? -1 : undefined}
      role={dismissible ? "dialog" : undefined}
      aria-label={dismissible ? ASSISTANT_NAME : undefined}
      onKeyDown={dismissible ? (event) => { if (event.key === "Escape") { event.stopPropagation(); setCopilotOpen(false); } } : undefined}
      className={`flex h-full min-h-0 flex-col bg-surface focus:outline-none ${workspace ? "rounded-lg border border-border shadow-panel" : ""}`}
    >
      <div className="panel-chrome relative z-40 flex items-center gap-3 border-b border-border/60 bg-surface/85 px-4 py-2.5 backdrop-blur-xl">
        <Blobatar ref={faceRef} name={ASSISTANT_NAME} animate="always" expression={mood} background="squircle" size={36} aria-hidden="true" className="shrink-0" />
        <p className="min-w-0 flex-1 truncate text-base font-semibold tracking-[-0.01em]">{ASSISTANT_NAME}</p>
        {dismissible
          ? <Button variant="ghost" size="icon" onClick={expand} aria-label="Perbesar asisten ke halaman penuh"><IconExpand aria-hidden="true" className="size-4" /></Button>
          : <Button variant="ghost" size="icon" onClick={collapse} aria-label="Ciutkan asisten ke panel"><IconCollapse aria-hidden="true" className="size-4" /></Button>}
        {dismissible ? <Button variant="ghost" size="icon" onClick={() => setCopilotOpen(false)} aria-label="Tutup asisten"><IconClose aria-hidden="true" className="size-4" /></Button> : null}
      </div>

      {/* The picker gets a row of its own. Sharing the header line with the
          title and two icon buttons left it 63px for the case name on a 390px
          panel, so "ANTM · Konsentrasi" truncated to nothing readable — and
          before that, competing with the recording date, it collapsed to an
          empty circle. The date is on the banner at the top of every page. */}
      <div className="relative z-30 flex items-center gap-1.5 border-b border-border/60 bg-background/80 px-4 py-2 backdrop-blur-xl">
        <button type="button" onClick={() => setPickerOpen((open) => !open)} aria-expanded={pickerOpen} aria-haspopup="listbox" aria-label={`Ganti kasus, sekarang ${contextLabel}`} title={`${contextLabel} — klik untuk ganti kasus`} className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-full bg-muted px-3.5 text-left text-sm text-foreground transition-[transform,background-color] duration-100 hover:bg-surface-raised active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Kasus</span>
          <span className="min-w-0 flex-1 truncate font-medium">{contextLabel}</span>
          <IconCaretDown aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
        </button>
        {copilotContext ? <button type="button" onClick={clearCopilotContext} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-[transform,color] duration-100 hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Hapus konteks"><IconClose aria-hidden="true" className="size-3.5" /></button> : null}
        {/* Coverage comes from the same table the compare picker reads, so a
            symbol without a full case says so here instead of being offered
            as if it had one. */}
        {pickerOpen ? <div role="listbox" aria-label="Pilih kasus" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setPickerOpen(false); } }} className="absolute inset-x-4 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface p-1.5 shadow-2xl">
          <button type="button" role="option" aria-selected={!activeContext?.symbol} onClick={() => { setCopilotContext({ label: "Tanpa kasus", question: "" }); setPickerOpen(false); }} className="w-full cursor-pointer rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="block text-sm font-medium">Tanpa kasus</span><span className="mt-0.5 block text-xs leading-[1.35] text-muted-foreground">Hanya menjawab pertanyaan yang menyebut emitennya sendiri.</span></button>
          {profile.watchlist.map((symbol) => {
            const coverage = coverageInfo[symbol];
            return <button key={symbol} type="button" role="option" aria-selected={activeContext?.symbol === symbol} onClick={() => { bindTo(symbol); setPickerOpen(false); }} className="w-full cursor-pointer rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="block text-sm font-medium">{symbol}</span><span className="mt-0.5 block text-xs leading-[1.35] text-muted-foreground">{coverage?.analyzed ? "Kasus lengkap" : `Belum ada kasus lengkap — ${coverage?.missing.length ? `${coverage.missing.join(", ")} belum ada` : "rekaman belum lengkap"}`}</span></button>;
          })}
        </div> : null}
      </div>

      <div ref={streamRef} role="log" aria-live="polite" aria-label="Percakapan asisten" className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
        {messages.length === 0 ? (
          <div className="bubble-in flex items-end gap-2">
            <Blobatar name={ASSISTANT_NAME} animate="hover" background="circle" size={28} aria-hidden="true" className="mb-0.5 shrink-0" />
            <div className={`relative min-w-0 flex-1 rounded-lg rounded-bl-[6px] px-4 py-3 ${BUBBLE_TONE.assistant}`}>
              <span aria-hidden="true" className={`absolute -left-1 bottom-2.5 size-3 rotate-45 ${BUBBLE_TONE.assistant}`} />
              <p className="relative text-base font-semibold leading-[1.35] tracking-[-0.01em]">{activeContext?.symbol ? `Siap menjawab tentang ${activeContext.symbol}.` : "Sebut kode emiten, lalu tanyakan buktinya."}</p>
              <ul className="relative mt-2 space-y-1.5 text-sm leading-[1.45] text-muted-foreground">
                <li>Kenapa emiten ini masuk daftar, dan apa yang berubah.</li>
                <li>Arti sebuah angka, asal rekamannya, dan cara hitungnya.</li>
                <li>Dampak sebuah peristiwa ke emiten pantauan Anda.</li>
                <li>Perbandingan dua emiten yang sama-sama berkasus lengkap.</li>
                <li>Data yang belum ada pada rekaman {RECORD_SHORT}.</li>
              </ul>
              {openNotes ? <p className="relative mt-2 text-sm leading-[1.45] text-muted-foreground">{openNotes} catatan Anda masih terbuka dan dibaca sebagai hipotesis.</p> : null}
            </div>
          </div>
        ) : null}
        {messages.map((message, index) => {
          const mine = message.role === "user";
          const tone = message.failed ? BUBBLE_TONE.failed : mine ? BUBBLE_TONE.user : BUBBLE_TONE.assistant;
          // Proximity is the grouping: a second turn from the same speaker sits
          // close under the first and drops the repeated name and face, so a
          // thread reads as turns rather than as a list of labelled rows.
          const grouped = index > 0 && messages[index - 1].role === message.role;
          return (
            <div key={message.id} className={`bubble-in flex items-end gap-2 ${grouped ? "mt-1" : "mt-4 first:mt-0"} ${mine ? "flex-row-reverse" : ""}`}>
              {grouped
                ? <span aria-hidden="true" className="w-7 shrink-0" />
                : mine
                  ? <Blobatar name={profile.name} animate="hover" background="circle" size={28} aria-hidden="true" className="mb-0.5 shrink-0" />
                  : <Blobatar name={ASSISTANT_NAME} animate="hover" background="circle" size={28} expression={message.failed ? sad : undefined} aria-hidden="true" className="mb-0.5 shrink-0" />}
              {/* The speaker's name stays a real line of text rather than a
                  tooltip on the face: it is what a screen reader and the
                  production sweep both read to tell the turns apart. */}
              <div className={`flex min-w-0 max-w-[85%] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                {grouped ? null : <span className="px-1 text-xs font-medium leading-4 text-muted-foreground">{mine ? "Anda" : "Asisten"}</span>}
                <div className={`relative w-full rounded-lg px-4 py-2.5 text-base leading-[1.45] ${tone} ${mine ? "rounded-br-[6px]" : "rounded-bl-[6px]"}`}>
                  {grouped ? null : <span aria-hidden="true" className={`absolute bottom-2.5 size-3 rotate-45 ${tone} ${mine ? "-right-1" : "-left-1"}`} />}
                  {message.failed ? <p className="relative flex gap-2"><IconAttention aria-hidden="true" className="mt-1 size-4 shrink-0" /><span>{message.text}</span></p>
                    : mine ? <p className="relative whitespace-pre-line">{message.text}</p>
                    : <div className="relative space-y-2.5">
                        {answerBlocks(message.text).map((block) => block.label
                          ? <div key={block.key}>
                              <p className="text-xs font-semibold leading-4 text-muted-foreground">{block.label}</p>
                              <p className={block.technical ? "mt-1 select-all break-all font-mono text-xs leading-[1.5] text-foreground" : "mt-0.5 text-base leading-[1.45]"}>{block.body}</p>
                            </div>
                          : <p key={block.key}>{block.body}</p>)}
                      </div>}
                  {message.answer?.clarification ? <div className="relative mt-3 flex flex-wrap gap-2">{message.answer.clarification.choices.map((symbol) => <button key={symbol} type="button" onClick={() => { const clarification = message.answer?.clarification; if (!clarification) return; bindTo(symbol); void submit(clarification.question, symbol); }} className="min-h-11 cursor-pointer rounded-full bg-surface px-4 text-sm font-medium text-foreground transition-transform duration-100 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{symbol}</button>)}</div> : null}
                  {message.answer?.llmFallbackNote ? <p className="relative mt-2.5 rounded-lg bg-attention/12 px-3 py-2 text-xs leading-[1.45] text-attention-foreground">{message.answer.llmFallbackNote}</p> : null}
                  {message.answer ? <details className="relative mt-3 border-t border-foreground/10 pt-2"><summary className="flex min-h-8 cursor-pointer list-none items-center gap-1 text-sm font-medium text-primary">Periksa jawaban<IconCaretDown aria-hidden="true" className="size-3.5" /></summary><p className="mt-2 text-xs leading-[1.45] text-muted-foreground">{message.answer.preferenceNote}</p>{message.answer.hypotheses.some((item) => item.id.startsWith("insight-")) ? <p className="mt-2 rounded-lg bg-attention/12 px-3 py-2 text-xs leading-[1.45] text-attention-foreground">Catatan pengguna hanya dipakai sebagai hipotesis terbuka sampai sumber memverifikasinya.</p> : null}{message.answer.citations.length ? <div className="mt-2.5"><CitationDialog citations={message.answer.citations} label="Buka bukti jawaban" /></div> : null}</details> : null}
                </div>
              </div>
            </div>
          );
        })}
        {/* The waiting state is the assistant taking its turn, so it is drawn
            as one: the same face, the same bubble, three dots instead of a
            sentence. The spoken line stays for screen readers, which cannot
            read dots. */}
        {loading ? (
          <div role="status" className="bubble-in mt-4 flex items-end gap-2">
            <Blobatar name={ASSISTANT_NAME} animate="always" background="circle" size={28} expression={thinking} aria-hidden="true" className="mb-0.5 shrink-0" />
            <div className={`relative rounded-lg rounded-bl-[6px] px-4 py-3.5 ${BUBBLE_TONE.assistant}`}>
              <span aria-hidden="true" className={`absolute -left-1 bottom-2.5 size-3 rotate-45 ${BUBBLE_TONE.assistant}`} />
              <span aria-hidden="true" className="relative flex items-center gap-1.5">
                <span className="bubble-dot size-1.5 rounded-full bg-muted-foreground" />
                <span className="bubble-dot size-1.5 rounded-full bg-muted-foreground [animation-delay:160ms]" />
                <span className="bubble-dot size-1.5 rounded-full bg-muted-foreground [animation-delay:320ms]" />
              </span>
              <span className="sr-only">Asisten sedang memeriksa data</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* The composer sits above the on-screen keyboard and above the home
          indicator; without the safe-area padding the send button is under
          the gesture bar on a fullscreen phone panel. */}
      <div className="panel-chrome border-t border-border/60 bg-surface/85 px-4 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.5rem))] pt-3 backdrop-blur-xl xl:pb-8">
        <div className="mb-2.5 flex gap-2 overflow-x-auto pb-1">
          {(workspace ? quickPrompts : quickPrompts.slice(0, 3)).map((prompt) => (
            <button key={prompt} onClick={() => void submit(prompt)} className="min-h-10 max-w-[min(18rem,72%)] shrink-0 cursor-pointer truncate rounded-full bg-muted/70 px-3.5 text-sm leading-[1.35] text-muted-foreground transition-[transform,color,background-color] duration-100 hover:bg-muted hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{prompt}</button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex items-end gap-1.5 rounded-lg border border-border bg-background p-1 transition-colors focus-within:border-foreground/35">
          <label htmlFor="copilot-input" className="sr-only">Tanya Asisten</label>
          <textarea id="copilot-input" ref={composerRef} rows={1} maxLength={DEFAULT_THRESHOLDS.copilotQuestionChars} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(input); } }} placeholder="Tanya bukti atau dampak..." className="max-h-[132px] min-h-9 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-[7px] text-base leading-[1.45] outline-none placeholder:text-muted-foreground" />
          <button
            type="submit"
            disabled={input.trim().length < DEFAULT_THRESHOLDS.copilotQuestionMinChars || loading}
            aria-label="Kirim pertanyaan"
            className={`grid size-9 shrink-0 place-items-center rounded-full transition-[background-color,color,transform] duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${input.trim() && !loading ? "cursor-pointer bg-primary text-primary-foreground active:scale-90" : "bg-muted text-muted-foreground"}`}
          >
            <IconSend aria-hidden="true" className="size-[18px]" />
          </button>
        </form>
      </div>
    </div>
  );
}
