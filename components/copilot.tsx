"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCatalystStore } from "@/lib/store";
import { useCopilotSession } from "@/lib/copilot-session";
import { apiUrl } from "@/lib/api-base";
import { coverageInfo, DATA_AS_OF, events } from "@/lib/data/fixtures";
import type { ChatAnswer, UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CitationDialog } from "@/components/citation-dialog";
import { IconAttention, IconCaretDown, IconClose, IconCollapse, IconCopilot, IconExpand, IconExternal, IconGate, IconSend, IconUser } from "@/components/ui/icons";

const RECORD_SHORT = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(DATA_AS_OF));

/** Quick prompts name a real recorded event touching the watchlist — never a
 *  topic the record does not contain. Falls back to generic prompts when the
 *  watchlist has no linked event. */
function buildQuickPrompts(profile: UserProfile): string[] {
  const first = profile.watchlist[0] ?? "ANTM";
  const watched = new Set(profile.watchlist);
  const top = events.find((event) => event.impactLinks.some((link) => watched.has(link.symbol) && link.direction !== "Unrelated"));
  const prompts = [`Kenapa ${first} masuk daftar hari ini?`];
  if (top) {
    const headline = top.title.length > 72 ? `${top.title.slice(0, 72)}…` : top.title;
    prompts.push(`${headline} — berdampak ke pantauan saya?`);
  } else {
    prompts.push("Peristiwa apa yang berdampak ke daftar pantauan saya?");
  }
  // Only symbols with a full case can be compared. The old prompt used
  // watchlist[1] blindly and suggested "Bandingkan ANTM dan INCO" — INCO has
  // no broker or quarterly recording, so the suggestion the app offered was
  // one it then had to refuse.
  const comparable = profile.watchlist.filter((symbol) => coverageInfo[symbol]?.analyzed && symbol !== first);
  prompts.push(comparable[0] ? `Bandingkan ${first} dan ${comparable[0]}.` : "Data apa yang belum diperiksa?");
  // A figure on screen is the question readers actually ask next.
  prompts.push(`Apa itu HHI dan dari mana angkanya untuk ${first}?`);
  prompts.push("Data apa yang belum diperiksa?");
  return [...new Set(prompts)].slice(0, 4);
}

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
  const { profile, insights, playbook, caseMandates, setCopilotOpen, copilotContext, clearCopilotContext } = useCatalystStore();
  const { messages, append, input, setInput, returnPath, setReturnPath } = useCopilotSession();
  const [loading, setLoading] = useState(false);
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
  const contextLabel = copilotContext?.label ?? "Tanpa konteks";

  useEffect(() => {
    const question = copilotContext?.question ?? "";
    if (!question || prefilled.current === question) return;
    prefilled.current = question;
    setInput(question);
  }, [copilotContext?.question, setInput]);

  useEffect(() => { if (dismissible) panelRef.current?.focus(); }, [dismissible]);

  useEffect(() => { streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight }); }, [messages.length, loading]);

  const submit = async (question: string) => {
    if (!question.trim() || loading) return;
    const asked = question.trim();
    append({ id: `u-${(nextId.current += 1)}`, role: "user", text: asked });
    setInput("");
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/chat"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: asked, profile, contextSymbol: copilotContext?.symbol, userInsights: insights, playbook, caseMandate: copilotContext?.symbol ? caseMandates[copilotContext.symbol] : undefined }) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      const answer = body.answer as ChatAnswer;
      append({ id: `a-${(nextId.current += 1)}`, role: "assistant", text: answer.text, answer });
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
      aria-label={dismissible ? "Asisten Catalyst" : undefined}
      onKeyDown={dismissible ? (event) => { if (event.key === "Escape") { event.stopPropagation(); setCopilotOpen(false); } } : undefined}
      className={`flex h-full min-h-0 flex-col bg-surface focus:outline-none ${workspace ? "rounded-xl border border-border shadow-panel" : ""}`}
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary"><IconCopilot aria-hidden="true" className="size-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Asisten Catalyst</p>
          {/* One line, truncated: what this answer set is bound to. Wrapping
              pushed the composer down on narrow panels. */}
          <p className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <span className="shrink-0">Rekaman {RECORD_SHORT}</span>
            <span aria-hidden="true" className="shrink-0 opacity-50">·</span>
            <span className="min-w-0 truncate" title={contextLabel}>{contextLabel}</span>
            {copilotContext ? <button type="button" onClick={clearCopilotContext} className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Hapus konteks"><IconClose aria-hidden="true" className="size-3" /></button> : null}
          </p>
        </div>
        {dismissible
          ? <Button variant="ghost" size="icon" onClick={expand} aria-label="Perbesar asisten ke halaman penuh"><IconExpand aria-hidden="true" className="size-4" /></Button>
          : <Button variant="ghost" size="icon" onClick={collapse} aria-label="Ciutkan asisten ke panel"><IconCollapse aria-hidden="true" className="size-4" /></Button>}
        {dismissible ? <Button variant="ghost" size="icon" onClick={() => setCopilotOpen(false)} aria-label="Tutup asisten"><IconClose aria-hidden="true" className="size-4" /></Button> : null}
      </div>
      <div className="border-b border-border bg-background px-4 py-2.5 text-xs leading-5 text-muted-foreground"><IconGate aria-hidden="true" className="mr-1.5 inline size-3.5 text-positive" />Fakta, konflik, dan data kosong. Tidak menilai tindakan transaksi.</div>

      <div ref={streamRef} role="log" aria-live="polite" aria-label="Percakapan asisten" className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-medium">{copilotContext?.symbol ? `Siap menjawab tentang ${copilotContext.symbol}.` : "Sebut kode emiten, lalu tanyakan buktinya."}</p>
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
          <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{message.role === "user" ? <IconUser aria-hidden="true" className="size-3" /> : <IconCopilot aria-hidden="true" className="size-3" />}{message.role === "user" ? "Anda" : "Asisten"}</div>
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
