"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AddGroupDialog,
  GroupActionsMenu,
} from "@/components/guests/guest-dialogs";
import { countByRsvp } from "@/components/guests/guest-stats";
import { listFamilies, listGroups, listPeople } from "@/lib/firebase/firestore";
import type { Family, Group, Person } from "@/types";

export default function WeddingGuestsGroupsPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  const load = useCallback(async () => {
    const [g, f, p] = await Promise.all([
      listGroups(weddingId),
      listFamilies(weddingId),
      listPeople(weddingId),
    ]);
    setGroups(g);
    setFamilies(f);
    setPeople(p);
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const rsvp = countByRsvp(people);
    return {
      groups: groups.length,
      families: families.length,
      guests: people.length,
      rsvpConfirmed: rsvp.confirmed,
    };
  }, [groups.length, families.length, people]);

  const byGroup = useMemo(() => {
    const map = new Map<
      string,
      { families: number; guests: number; rsvpConfirmed: number }
    >();
    for (const g of groups) {
      map.set(g.id, { families: 0, guests: 0, rsvpConfirmed: 0 });
    }
    for (const f of families) {
      const cur = map.get(f.group_id);
      if (cur) cur.families += 1;
    }
    for (const p of people) {
      const cur = map.get(p.group_id);
      if (cur) {
        cur.guests += 1;
        if (p.rsvp_status === "confirmed") cur.rsvpConfirmed += 1;
      }
    }
    return map;
  }, [groups, families, people]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/wedding/${weddingId}`} className="underline">
              ← Back to overview
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Groups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize by side or circle, then open a group to manage families and
            guests.
          </p>
        </div>
        <AddGroupDialog weddingId={weddingId} onDone={load} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Groups" value={stats.groups} />
        <StatCard label="Families" value={stats.families} />
        <StatCard label="Guests" value={stats.guests} />
        <StatCard label="Confirmed" value={stats.rsvpConfirmed} />
      </div>

      <div className="space-y-3">
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No groups yet. Add your first group (e.g. Bride side, Groom side).
            </CardContent>
          </Card>
        ) : (
          groups.map((g) => {
            const s = byGroup.get(g.id) ?? {
              families: 0,
              guests: 0,
              rsvpConfirmed: 0,
            };
            return (
              <Card key={g.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <Link
                      href={`/wedding/${weddingId}/guests/${g.id}`}
                      className="group block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <CardTitle className="text-xl">{g.name}</CardTitle>
                      <CardDescription className="mt-1 text-base transition-colors group-hover:text-foreground">
                        {s.families} famil{s.families === 1 ? "y" : "ies"} ·{" "}
                        {s.guests} guest{s.guests === 1 ? "" : "s"}
                        {s.rsvpConfirmed > 0
                          ? ` · ${s.rsvpConfirmed} confirmed`
                          : ""}
                      </CardDescription>
                    </Link>
                    <GroupActionsMenu group={g} onDone={load} />
                  </div>
                </CardHeader>
                <CardContent className="sr-only">Open group</CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
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
