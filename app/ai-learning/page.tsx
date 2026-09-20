import { Suspense } from "react";
import { LearningContent } from "@/app/ai-learning/learning-content";
import { PredictionPanel } from "@/components/prediction-panel";
import { Panel } from "@/components/ui/panel";
import { DATA_AS_OF } from "@/lib/data/fixtures";
import { runPredictionBacktest } from "@/lib/agent/prediction-run";

/**
 * Server component so Lapis 3 dapat dihitung tanpa perjalanan jaringan.
 *
 * `now` dikunci ke DATA_AS_OF, bukan waktu render: klaim di halaman ini dibuat
 * dari rekaman itu, dan menstempelnya dengan jam sekarang akan membuat halaman
 * mengaku tahu sesuatu yang lebih baru daripada datanya.
 */
export default function AiLearningPage() {
  const run = runPredictionBacktest({ now: DATA_AS_OF });
  return (
    <Suspense fallback={<Panel className="h-72 animate-pulse bg-muted" aria-label="Memuat AI Learning" />}>
      <LearningContent
        predictionSlot={<PredictionPanel claims={run.claims} outcomes={run.outcomes} report={run.report} />}
      />
    </Suspense>
  );
}
