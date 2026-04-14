"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { EntityCard } from "@/components/dashboard/entity-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatsRow } from "@/components/dashboard/stats-row";
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
      <PageHeader
        breadcrumbs={[
          { label: "Wedding overview", href: `/wedding/${weddingId}` },
          { label: "Groups" },
        ]}
        title="Guest groups"
        description="Organize by side or circle, then open a group to manage families and members."
        action={<AddGroupDialog weddingId={weddingId} onDone={load} />}
      />

      <StatsRow
        stats={[
          { label: "Groups", value: stats.groups },
          { label: "Families", value: stats.families },
          { label: "Guests", value: stats.guests },
          { label: "Confirmed", value: stats.rsvpConfirmed },
        ]}
      />

      <div className="space-y-3">
        {groups.length === 0 ? (
          <EmptyStateCard
            title="No groups yet"
            description="Add your first group (for example Bride side, Groom side, friends, or family circles) to start organizing everyone."
          />
        ) : (
          groups.map((g) => {
            const s = byGroup.get(g.id) ?? {
              families: 0,
              guests: 0,
              rsvpConfirmed: 0,
            };
            return (
              <EntityCard
                key={g.id}
                href={`/wedding/${weddingId}/guests/${g.id}`}
                title={g.name}
                description={`${s.families} famil${s.families === 1 ? "y" : "ies"} · ${s.guests} guest${s.guests === 1 ? "" : "s"}${s.rsvpConfirmed > 0 ? ` · ${s.rsvpConfirmed} confirmed` : ""}`}
                action={<GroupActionsMenu group={g} onDone={load} />}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
