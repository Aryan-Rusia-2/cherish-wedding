import { cn } from "@/lib/utils";
import type { RsvpStatus } from "@/types";

const styles: Record<RsvpStatus, string> = {
  pending: "",
  confirmed: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
};

const labels: Record<RsvpStatus, string> = {
  pending: "",
  confirmed: "Confirmed",
};

export function RsvpBadge({ status }: { status: RsvpStatus }) {
  if (status === "pending") {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}
