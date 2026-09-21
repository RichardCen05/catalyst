"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCatalystStore } from "@/lib/store";
import { useCopilotSession } from "@/lib/copilot-session";
import { resolveContext } from "@/lib/agent/route-context";
import { apiUrl } from "@/lib/api-base";
import { coverageInfo, DATA_AS_OF } from "@/lib/data/fixtures";
import { ASSISTANT_NAME, buildQuickPrompts } from "@/lib/agent/assistant";
import type { ChatAnswer, SymbolCode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CitationDialog } from "@/components/citation-dialog";
import { Blobatar } from "@blobatar/react";
import { useGaze } from "@blobatar/react/gaze";
import { happy, sad, thinking } from "blobatar/expression";
import { IconAttention, IconCaretDown, IconClose, IconCollapse, IconExpand, IconExternal, IconGate, IconSend } from "@/components/ui/icons";

const RECORD_SHORT = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(DATA_AS_OF));

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
  // The context question prefills the composer, but only once per context —
  // retyping over it must not be undone by the next render.
  const prefilled = useRef<string | null>(null);
  const nextId = useRef(0);
  const openNotes = insights.filter((item) => item.status === "pending").length;
  const insightPrompts = insights.filter((item) => item.status === "pending").slice(0, 2).map((item) => `Periksa ulang catatan saya untuk ${item.symbol}.`);
  const prompts = useMemo(() => buildQuickPrompts(profile), [profile]);
  const quickPrompts = [...insightPrompts, ...prompts.filter((prompt) => !insightPrompts.some((item) => item === prompt))];
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

  // `bound` is the answer to a clarifying turn: the reader's choice must reach
  // the engine with the original question, before the store has settled.
  const submit = async (question: string, bound?: SymbolCode) => {
    if (!question.trim() || loading) return;
    const asked = question.trim();
    const symbol = bound ?? activeContext?.symbol;
    append({ id: `u-${(nextId.current += 1)}`, role: "user", text: asked });
    setInput("");
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/chat"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: asked, profile, contextSymbol: symbol, userInsights: insights, playbook, caseMandate: symbol ? caseMandates[symbol] : undefined }) });
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
      className={`flex h-full min-h-0 flex-col bg-surface focus:outline-none ${workspace ? "rounded-xl border border-border shadow-panel" : ""}`}
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Blobatar ref={faceRef} name={ASSISTANT_NAME} animate="always" expression={mood} background="squircle" size={36} aria-hidden="true" className="shrink-0" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{ASSISTANT_NAME}</p>
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
      <div className="relative flex items-center gap-1.5 border-b border-border bg-background px-4 py-2">
        <button type="button" onClick={() => setPickerOpen((open) => !open)} aria-expanded={pickerOpen} aria-haspopup="listbox" aria-label={`Ganti kasus, sekarang ${contextLabel}`} title={`${contextLabel} — klik untuk ganti kasus`} className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-left font-mono text-[11px] text-foreground transition-colors hover:border-foreground/35 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="shrink-0 uppercase tracking-wider text-muted-foreground">Kasus</span>
          <span className="min-w-0 flex-1 truncate">{contextLabel}</span>
          <IconCaretDown aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
        </button>
        {copilotContext ? <button type="button" onClick={clearCopilotContext} className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Hapus konteks"><IconClose aria-hidden="true" className="size-3.5" /></button> : null}
        {/* Coverage comes from the same table the compare picker reads, so a
            symbol without a full case says so here instead of being offered
            as if it had one. */}
        {pickerOpen ? <div role="listbox" aria-label="Pilih kasus" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setPickerOpen(false); } }} className="absolute inset-x-4 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-panel">
          <button type="button" role="option" aria-selected={!activeContext?.symbol} onClick={() => { setCopilotContext({ label: "Tanpa kasus", question: "" }); setPickerOpen(false); }} className="w-full cursor-pointer rounded-md px-2.5 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="block text-[13px] font-medium">Tanpa kasus</span><span className="block text-[11px] leading-4 text-muted-foreground">Hanya menjawab pertanyaan yang menyebut emitennya sendiri.</span></button>
          {profile.watchlist.map((symbol) => {
            const coverage = coverageInfo[symbol];
            return <button key={symbol} type="button" role="option" aria-selected={activeContext?.symbol === symbol} onClick={() => { bindTo(symbol); setPickerOpen(false); }} className="w-full cursor-pointer rounded-md px-2.5 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="block text-[13px] font-medium">{symbol}</span><span className="block text-[11px] leading-4 text-muted-foreground">{coverage?.analyzed ? "Kasus lengkap" : `Belum ada kasus lengkap — ${coverage?.missing.length ? `${coverage.missing.join(", ")} belum ada` : "rekaman belum lengkap"}`}</span></button>;
          })}
        </div> : null}
      </div>
      <div className="border-b border-border bg-background px-4 py-2.5 text-xs leading-5 text-muted-foreground"><IconGate aria-hidden="true" className="mr-1.5 inline size-3.5 text-positive" />Fakta, konflik, dan data kosong. Tidak menilai tindakan transaksi.</div>

      <div ref={streamRef} role="log" aria-live="polite" aria-label="Percakapan asisten" className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-medium">{activeContext?.symbol ? `Siap menjawab tentang ${activeContext.symbol}.` : "Sebut kode emiten, lalu tanyakan buktinya."}</p>
            <ul className="mt-2.5 space-y-1 text-xs leading-5 text-muted-foreground">
              <li>Kenapa emiten ini masuk daftar, dan apa yang berubah.</li>
              <li>Arti sebuah angka, asal rekamannya, dan cara hitungnya.</li>
              <li>Dampak sebuah peristiwa ke emiten pantauan Anda.</li>
              <li>Perbandingan dua emiten yang sama-sama berkasus lengkap.</li>
              <li>Data yang belum ada pada rekaman {RECORD_SHORT}.</li>
            </ul>
            {openNotes ? <p className="mt-2.5 text-xs leading-5 text-muted-foreground">{openNotes} catatan Anda masih terbuka dan dibaca sebagai hipotesis.</p> : null}
          </div>
        ) : null}
        {messages.map((message) => <div key={message.id} className={message.role === "user" ? "ml-7" : "mr-2"}>
          <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{message.role === "user"
              ? <Blobatar name={profile.name} animate="hover" background="circle" size={20} aria-hidden="true" className="shrink-0" />
              : <Blobatar name={ASSISTANT_NAME} animate="hover" background="circle" size={20} expression={message.failed ? sad : undefined} aria-hidden="true" className="shrink-0" />}{message.role === "user" ? "Anda" : "Asisten"}</div>
          <div className={`rounded-xl border p-3 text-sm leading-6 ${message.failed ? "border-danger/35 bg-danger-soft" : message.role === "user" ? "border-primary/25 bg-primary/10" : "border-border bg-background"}`}>
            {message.failed ? <p className="flex gap-2 text-danger"><IconAttention aria-hidden="true" className="mt-1 size-4 shrink-0" /><span>{message.text}</span></p>
              : message.role === "user" ? <p className="whitespace-pre-line">{message.text}</p>
              : <div className="space-y-2">
                  {answerBlocks(message.text).map((block) => block.label
                    ? <div key={block.key}>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{block.label}</p>
                        <p className={block.technical ? "mt-0.5 select-all break-all font-mono text-[11px] leading-5 text-foreground" : "mt-0.5 text-sm leading-6"}>{block.body}</p>
                      </div>
                    : <p key={block.key}>{block.body}</p>)}
                </div>}
            {message.answer?.clarification ? <div className="mt-3 flex flex-wrap gap-2">{message.answer.clarification.choices.map((symbol) => <button key={symbol} type="button" onClick={() => { const clarification = message.answer?.clarification; if (!clarification) return; bindTo(symbol); void submit(clarification.question, symbol); }} className="min-h-9 cursor-pointer rounded-full border border-border px-3.5 text-[12px] font-medium transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{symbol}</button>)}</div> : null}
            {message.answer?.llmFallbackNote ? <p className="mt-2 rounded border border-attention/30 bg-attention/8 p-2 text-xs leading-5 text-attention-foreground">{message.answer.llmFallbackNote}</p> : null}
            {message.answer ? <details className="mt-3 border-t border-border pt-2"><summary className="flex min-h-8 cursor-pointer items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-primary">Periksa jawaban<IconCaretDown aria-hidden="true" className="size-3" /></summary><p className="mt-2 text-xs leading-5 text-muted-foreground">{message.answer.preferenceNote}</p>{message.answer.hypotheses.some((item) => item.id.startsWith("insight-")) ? <p className="mt-2 rounded border border-attention/30 bg-attention/8 p-2 text-xs leading-5 text-attention-foreground">Catatan pengguna hanya dipakai sebagai hipotesis terbuka sampai sumber memverifikasinya.</p> : null}{message.answer.citations.length ? <div className="mt-3"><CitationDialog citations={message.answer.citations} label="Buka bukti jawaban" /></div> : null}</details> : null}
          </div>
        </div>)}
        {loading ? <div role="status" className="mr-8 rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground"><span className="inline-flex gap-1"><span className="animate-pulse">Rencana</span><span aria-hidden="true">→</span><span className="animate-pulse [animation-delay:120ms]">Cari</span><span aria-hidden="true">→</span><span className="animate-pulse [animation-delay:240ms]">Periksa</span></span><span className="sr-only">Asisten sedang memeriksa data</span></div> : null}
      </div>

      {/* The composer sits above the on-screen keyboard and above the home
          indicator; without the safe-area padding the send button is under
          the gesture bar on a fullscreen phone panel. */}
      <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] xl:pb-4">
        <div className="mb-2.5 flex gap-2 overflow-x-auto pb-1">
          {(workspace ? quickPrompts : quickPrompts.slice(0, 3)).map((prompt) => (
            <button key={prompt} onClick={() => void submit(prompt)} className="min-h-9 shrink-0 cursor-pointer rounded-full border border-border px-3.5 text-[12px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{prompt}</button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex items-end gap-2 rounded-[8px] border border-border bg-background p-2 transition-colors focus-within:border-foreground/35">
          <label htmlFor="copilot-input" className="sr-only">Tanya Catalyst</label>
          <textarea id="copilot-input" rows={2} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(input); } }} placeholder="Tanya bukti atau dampak..." className="min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-[13.5px] outline-none placeholder:text-muted-foreground" />
          <Button type="submit" size="icon" disabled={!input.trim() || loading} aria-label="Kirim pertanyaan"><IconSend className="size-4" /></Button>
        </form>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground"><IconExternal aria-hidden="true" className="size-3" />Jawaban menyertakan penyedia, data, dan waktu sumber bila tersedia.</p>
      </div>
    </div>
  );
}
