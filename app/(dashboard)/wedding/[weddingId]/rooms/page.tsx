"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import {
  AddRoomTypeDialog,
  RoomTypeActionsMenu,
} from "@/components/rooms/room-dialogs";
import { listPeople, listRoomTypes, listRooms } from "@/lib/firebase/firestore";
import { effectiveCapacity } from "@/lib/rooms/capacity";
import type { Person, Room, RoomType } from "@/types";

export default function WeddingRoomsPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;

  const [loading, setLoading] = useState(true);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  const load = useCallback(async () => {
    const [rt, r, p] = await Promise.all([
      listRoomTypes(weddingId),
      listRooms(weddingId),
      listPeople(weddingId),
    ]);
    setRoomTypes(rt);
    setRooms(r);
    setPeople(p);
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const byType = useMemo(() => {
    const map = new Map<string, Room[]>();
    for (const t of roomTypes) map.set(t.id, []);
    for (const r of rooms) {
      const list = map.get(r.room_type_id);
      if (list) list.push(r);
    }
    return map;
  }, [roomTypes, rooms]);

  const stats = useMemo(() => {
    let totalCap = 0;
    for (const r of rooms) {
      const t = roomTypes.find((x) => x.id === r.room_type_id);
      if (!t) continue;
      totalCap += effectiveCapacity(
        t.base_occupancy,
        r.extra_beds ?? "none",
      );
    }
    const roomIds = new Set(rooms.map((r) => r.id));
    const allocated = people.filter(
      (p) => p.room_id && roomIds.has(p.room_id),
    ).length;
    return {
      types: roomTypes.length,
      rooms: rooms.length,
      totalCap,
      allocated,
      available: Math.max(0, totalCap - allocated),
    };
  }, [roomTypes, rooms, people]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/wedding/${weddingId}`} className="underline">
          Wedding overview
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground">Rooms</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rooms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define room types and inventory, then allocate guests on each type’s
            page.
          </p>
        </div>
        <AddRoomTypeDialog weddingId={weddingId} onDone={load} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Types" value={stats.types} />
        <Stat label="Rooms" value={stats.rooms} />
        <Stat label="Bed capacity" value={stats.totalCap} />
        <Stat label="Assigned guests" value={stats.allocated} />
      </div>
      <p className="text-sm text-muted-foreground">
        Available slots: {stats.available} (capacity minus assigned guests)
      </p>

      <div className="space-y-3">
        {roomTypes.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No room types yet. Add one (e.g. Deluxe) with a base occupancy, then
              open it to generate numbered rooms and assign guests.
            </CardContent>
          </Card>
        ) : (
          roomTypes.map((t) => {
            const typeRooms = byType.get(t.id) ?? [];
            const typeRoomIds = new Set(typeRooms.map((r) => r.id));
            const assigned = people.filter(
              (p) => p.room_id && typeRoomIds.has(p.room_id),
            ).length;
            const cap = typeRooms.reduce((sum, r) => {
              return (
                sum +
                effectiveCapacity(t.base_occupancy, r.extra_beds ?? "none")
              );
            }, 0);
            return (
              <Card key={t.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-xl">{t.name}</CardTitle>
                      <CardDescription className="mt-1 text-base">
                        Base occupancy {t.base_occupancy} · {typeRooms.length}{" "}
                        room{typeRooms.length === 1 ? "" : "s"} · {assigned}{" "}
                        guest{assigned === 1 ? "" : "s"} assigned
                        {cap > 0 ? (
                          <>
                            {" "}
                            · capacity {cap}
                          </>
                        ) : null}
                      </CardDescription>
                    </div>
                    <RoomTypeActionsMenu
                      weddingId={weddingId}
                      roomType={t}
                      onDone={load}
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link
                    href={`/wedding/${weddingId}/rooms/${t.id}`}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "default" }),
                      "inline-flex min-h-12 w-full items-center justify-center text-base",
                    )}
                  >
                    Manage rooms & allocation →
                  </Link>
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
