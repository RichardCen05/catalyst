import { EVENT_MARKER_LABEL, type EventMarker } from "@/lib/types";

/** The web-watch screen's markers on an accepted event, as labels. One
 *  component for every surface, so no view words a marker its own way. */
export function EventMarkers({ markers, className }: { markers?: EventMarker[]; className?: string }) {
  if (!markers?.length) return null;
  return (
    <span className={className}>
      {markers.map((marker) => (
        <span key={marker} className="mr-1 inline-flex rounded-full border border-attention-foreground/40 px-2 py-0.5 text-xs text-attention-foreground">
          {EVENT_MARKER_LABEL[marker] ?? marker}
        </span>
      ))}
    </span>
  );
}
