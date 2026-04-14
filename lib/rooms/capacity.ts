import type { RoomExtraBeds } from "@/types";

export function extraBedBonus(extra: RoomExtraBeds | undefined): number {
  const e = extra ?? "none";
  if (e === "single") return 1;
  if (e === "double") return 2;
  return 0;
}

export function effectiveCapacity(
  baseOccupancy: number,
  extra: RoomExtraBeds | undefined,
): number {
  return Math.max(1, baseOccupancy) + extraBedBonus(extra);
}
