import type { TimelineItem } from "@/types";

export function parseWeddingDate(iso: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

/** Sort key for timeline (ISO or relative fallback) */
export function timelineSortKey(
  item: TimelineItem,
  weddingDateIso: string,
): number {
  if (item.start_time) {
    return new Date(item.start_time).getTime();
  }
  if (item.relative_to) {
    const w = parseWeddingDate(weddingDateIso);
    w.setDate(w.getDate() + item.relative_to.offset_days);
    w.setHours(12, 0, 0, 0);
    return w.getTime();
  }
  return Number.MAX_SAFE_INTEGER;
}

export function formatTimelineLabel(
  item: TimelineItem,
  weddingDateIso: string,
): string {
  if (item.start_time) {
    return new Date(item.start_time).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (item.relative_to) {
    const w = parseWeddingDate(weddingDateIso);
    w.setDate(w.getDate() + item.relative_to.offset_days);
    const day = w.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const sign = item.relative_to.offset_days >= 0 ? "+" : "";
    return `${day} (${sign}${item.relative_to.offset_days}d from wedding)`;
  }
  return "Time TBD";
}
