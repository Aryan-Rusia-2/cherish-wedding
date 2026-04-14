import type { Person, RsvpStatus } from "@/types";

function hasSortKey(p: Person): boolean {
  return typeof p.sort_key === "number" && Number.isFinite(p.sort_key);
}

/**
 * Family member list order: first added at top, newest at bottom.
 * Uses `sort_key` when present (set on create / import); legacy rows without it
 * sort by `created_at`, then document id (never by name).
 */
export function sortPeopleFamilyDisplayOrder(people: Person[]): Person[] {
  return [...people].sort((a, b) => {
    const aKey = hasSortKey(a);
    const bKey = hasSortKey(b);
    if (aKey && bKey) return a.sort_key! - b.sort_key!;
    if (aKey && !bKey) return 1;
    if (!aKey && bKey) return -1;
    const ta =
      typeof a.created_at?.toMillis === "function"
        ? a.created_at.toMillis()
        : 0;
    const tb =
      typeof b.created_at?.toMillis === "function"
        ? b.created_at.toMillis()
        : 0;
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
}

export function countByRsvp(people: Person[]): Record<RsvpStatus, number> {
  const out: Record<RsvpStatus, number> = {
    pending: 0,
    confirmed: 0,
  };
  for (const p of people) {
    out[p.rsvp_status] = (out[p.rsvp_status] ?? 0) + 1;
  }
  return out;
}

export function formatRsvpSummary(counts: Record<RsvpStatus, number>): string {
  if (counts.confirmed > 0) {
    return `${counts.confirmed} confirmed`;
  }
  return "None confirmed yet";
}
