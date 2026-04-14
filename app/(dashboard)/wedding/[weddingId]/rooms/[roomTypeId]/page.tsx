"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AddRoomDialog,
  AllocateGuestDialog,
  GenerateRoomsDialog,
  RemoveGuestFromRoomButton,
  RoomActionsMenu,
} from "@/components/rooms/room-dialogs";
import {
  listFamilies,
  listGroups,
  listPeople,
  listRoomTypes,
  listRoomsForType,
} from "@/lib/firebase/firestore";
import { updateRoomExtraBeds } from "@/lib/firebase/mutations";
import { effectiveCapacity } from "@/lib/rooms/capacity";
import type { Family, Group, Person, Room, RoomExtraBeds, RoomType } from "@/types";

function normExtra(e: RoomExtraBeds | undefined): RoomExtraBeds {
  return e ?? "none";
}

export default function WeddingRoomTypeDetailPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const roomTypeId = params.roomTypeId as string;

  const [loading, setLoading] = useState(true);
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);

  const load = useCallback(async () => {
    const [types, r, p, g, f] = await Promise.all([
      listRoomTypes(weddingId),
      listRoomsForType(weddingId, roomTypeId),
      listPeople(weddingId),
      listGroups(weddingId),
      listFamilies(weddingId),
    ]);
    const t = types.find((x) => x.id === roomTypeId) ?? null;
    setRoomType(t);
    setRooms(r.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })));
    setPeople(p);
    setGroups(g);
    setFamilies(f);
    setLoading(false);
  }, [weddingId, roomTypeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const familyNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of families) m.set(f.id, f.family_name);
    return m;
  }, [families]);

  const summary = useMemo(() => {
    if (!roomType) {
      return {
        totalRooms: 0,
        totalCap: 0,
        allocated: 0,
        available: 0,
      };
    }
    const typeRoomIds = new Set(rooms.map((x) => x.id));
    let totalCap = 0;
    for (const r of rooms) {
      totalCap += effectiveCapacity(
        roomType.base_occupancy,
        normExtra(r.extra_beds),
      );
    }
    const allocated = people.filter(
      (p) => p.room_id && typeRoomIds.has(p.room_id),
    ).length;
    return {
      totalRooms: rooms.length,
      totalCap,
      allocated,
      available: Math.max(0, totalCap - allocated),
    };
  }, [roomType, rooms, people]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!roomType) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">This room type wasn&apos;t found.</p>
        <Link
          href={`/wedding/${weddingId}/rooms`}
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          ← All rooms
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/wedding/${weddingId}`} className="underline">
          Overview
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/wedding/${weddingId}/rooms`} className="underline">
          Rooms
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground">{roomType.name}</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{roomType.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Base occupancy {roomType.base_occupancy} per room. Add extra beds on a
            room when you need more slots than the base.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <GenerateRoomsDialog
            weddingId={weddingId}
            roomTypeId={roomTypeId}
            onDone={load}
          />
          <AddRoomDialog
            weddingId={weddingId}
            roomTypeId={roomTypeId}
            onDone={load}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Rooms" value={summary.totalRooms} />
        <Stat label="Total capacity" value={summary.totalCap} />
        <Stat label="Assigned" value={summary.allocated} />
        <Stat label="Available slots" value={summary.available} />
      </div>

      <div className="space-y-3">
        {rooms.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No rooms of this type yet. Generate a batch or add a single room.
            </CardContent>
          </Card>
        ) : (
          rooms.map((room) => {
            const extra = normExtra(room.extra_beds);
            const cap = effectiveCapacity(roomType.base_occupancy, extra);
            const occupants = people.filter((p) => p.room_id === room.id);
            const overBase = occupants.length > roomType.base_occupancy;
            return (
              <Card key={room.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg">{room.label}</CardTitle>
                        {extra !== "none" ? (
                          <Badge variant="secondary">
                            Extra bed: {extra}
                          </Badge>
                        ) : null}
                      </div>
                      <CardDescription>
                        {occupants.length} / {cap} guests · base{" "}
                        {roomType.base_occupancy}
                        {overBase ? (
                          <span className="text-amber-700 dark:text-amber-400">
                            {" "}
                            (over base — extra bed recommended)
                          </span>
                        ) : null}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`bed-${room.id}`}>
                        Extra beds
                      </label>
                      <select
                        id={`bed-${room.id}`}
                        className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
                        value={extra}
                        onChange={async (e) => {
                          const v = e.target.value as RoomExtraBeds;
                          try {
                            await updateRoomExtraBeds(room.id, v);
                            toast.success("Extra bed updated");
                            await load();
                          } catch (err: unknown) {
                            toast.error(
                              err instanceof Error ? err.message : "Update failed",
                            );
                          }
                        }}
                      >
                        <option value="none">No extra bed</option>
                        <option value="single">Single extra (+1)</option>
                        <option value="double">Double extra (+2)</option>
                      </select>
                      <AllocateGuestDialog
                        roomId={room.id}
                        baseOccupancy={roomType.base_occupancy}
                        extraBeds={extra}
                        people={people}
                        groups={groups}
                        families={families}
                        onDone={load}
                      />
                      <RoomActionsMenu
                        weddingId={weddingId}
                        roomId={room.id}
                        disabled={occupants.length > 0}
                        onDone={load}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {occupants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No guests assigned.</p>
                  ) : (
                    <ul className="space-y-2">
                      {occupants.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                        >
                          <span>
                            <span className="font-medium">{p.name}</span>
                            <span className="text-muted-foreground">
                              {" "}
                              · {familyNameById.get(p.family_id) ?? "Family"}
                            </span>
                          </span>
                          <RemoveGuestFromRoomButton personId={p.id} onDone={load} />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          {label}
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
