"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { EntityCard } from "@/components/dashboard/entity-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatsRow } from "@/components/dashboard/stats-row";
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
      <PageHeader
        breadcrumbs={[
          { label: "Wedding overview", href: `/wedding/${weddingId}` },
          { label: "Rooms" },
        ]}
        title="Room planning"
        description="Define room types, inventory, and open each type to allocate guests."
        action={<AddRoomTypeDialog weddingId={weddingId} onDone={load} />}
      />

      <StatsRow
        stats={[
          { label: "Types", value: stats.types },
          { label: "Rooms", value: stats.rooms },
          { label: "Bed capacity", value: stats.totalCap },
          { label: "Assigned", value: stats.allocated, helper: `${stats.available} available` },
        ]}
      />

      <div className="space-y-3">
        {roomTypes.length === 0 ? (
          <EmptyStateCard
            title="No room types yet"
            description="Add a room type (for example Deluxe), then open it to generate rooms and allocate guests."
          />
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
              <EntityCard
                key={t.id}
                href={`/wedding/${weddingId}/rooms/${t.id}`}
                title={t.name}
                description={`Base occupancy ${t.base_occupancy} · ${typeRooms.length} room${typeRooms.length === 1 ? "" : "s"} · ${assigned} assigned${cap > 0 ? ` · capacity ${cap}` : ""}`}
                action={
                  <RoomTypeActionsMenu
                    weddingId={weddingId}
                    roomType={t}
                    onDone={load}
                  />
                }
              />
            );
          })
        )}
      </div>
    </div>
  );
}
