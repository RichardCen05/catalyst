"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { GraduationCap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LAYERS, type Teacher } from "@/lib/learning-layers";

/**
 * Beginner-facing explainer for the three learning layers.
 *
 * The page shows *what* Catalyst remembered; this says *why* there are
 * different kinds of memory at all, and — the part readers get wrong — which
 * of them can move without the user.
 *
 * It opens from a button in the page header rather than sitting in the flow:
 * it answers a question a reader asks once, and three columns of prose in the
 * middle of the page pushed the thing they came for below the fold.
 *
 * Layer 3 carries a caveat rather than a plain "on": the measuring half runs
 * (claims are issued and scored against the recording, see the "Belajar dari
 * pasar" section) but nothing is corrected automatically. Calling that
 * "belajar" without qualification would overstate it by exactly the distance
 * between noticing an error and fixing it.
 *
 * Written for someone who does not follow the market. Every term that is not
 * everyday Indonesian ("sesi", "idiosinkratik") is either avoided or spelled
 * out in the sentence that uses it.
 */

function TeacherBadge({ teacher }: { teacher: Teacher }) {
  return (
    <span
      className={cn(
        "rounded-lg border px-1.5 py-0.5 text-xs",
        teacher === "Pasar" ? "border-positive/35 bg-positive/10 text-positive" : "border-primary/35 bg-primary/10 text-primary",
      )}
    >
      guru: {teacher}
    </span>
  );
}

export function LearningLayers() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="secondary" size="sm">
          <GraduationCap aria-hidden="true" className="size-4" />
          Tiga cara Catalyst belajar
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-100 bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-3 top-1/2 z-100 mx-auto flex max-h-[90dvh] w-auto max-w-3xl -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-2xl focus:outline-none sm:inset-x-6">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="editorial text-xl text-foreground">Tiga cara Catalyst belajar</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-muted-foreground">
                Perilaku Catalyst berubah dari tiga arah. Dua butuh Anda, satu berjalan sendiri.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Tutup penjelasan">
                <X aria-hidden="true" className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* One row per layer, not three columns: the layers carry different
              amounts of prose, so columns ended at three different heights
              with one stray caveat box hanging off the last of them. */}
          <div className="divide-y divide-border overflow-y-auto">
            {LAYERS.map((layer) => (
              <article key={layer.index} className="grid gap-x-5 gap-y-3 px-5 py-4 sm:grid-cols-[168px_minmax(0,1fr)]">
                <div className="flex flex-wrap items-center gap-2 sm:block">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-xs font-semibold text-muted-foreground font-medium">
                      {layer.index}
                    </span>
                    <h3 className="font-semibold">{layer.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:mt-2">
                    <TeacherBadge teacher={layer.teacher} />
                    {layer.caveat ? (
                      <span className="rounded-lg border border-attention/35 bg-attention/10 px-1.5 py-0.5 text-xs text-attention-foreground">
                        {layer.caveat.badge}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium">{layer.question}</p>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{layer.analogy}</p>

                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-positive/25 bg-positive/6 p-3">
                      <dt className=" text-xs text-positive">Yang berubah</dt>
                      <dd className="mt-1 text-xs leading-5">{layer.changes}</dd>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                      <dt className=" text-xs text-muted-foreground">Yang tidak berubah</dt>
                      <dd className="mt-1 text-xs leading-5 text-muted-foreground">{layer.keeps}</dd>
                    </div>
                  </dl>

                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    <span className=" text-xs">Contoh · </span>
                    {layer.example}
                  </p>

                  {layer.caveat ? (
                    <p className="mt-2 text-xs leading-5 text-attention-foreground">{layer.caveat.detail}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="border-t border-border bg-background px-5 py-4">
            <p className="text-sm leading-6">
              <strong>Ringkasnya:</strong> Lapis 1 dan 2 mengajari Catalyst apa yang penting bagi Anda. Lapis 3 mengajari
              Catalyst seberapa sering tebakannya sendiri tepat, dan itu tidak butuh siapa-siapa.
            </p>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              Catalyst tidak pernah menyimpulkan bahwa sebuah berita <em>menyebabkan</em> pergerakan harga. Yang bisa
              diperiksa hanya seberapa sering keduanya berbarengan.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
