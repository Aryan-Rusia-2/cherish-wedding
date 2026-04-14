"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { EntityCard } from "@/components/dashboard/entity-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatsRow } from "@/components/dashboard/stats-row";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AddFamilyDialog,
  FamilyActionsMenu,
} from "@/components/guests/guest-dialogs";
import { countByRsvp, formatRsvpSummary } from "@/components/guests/guest-stats";
import { listFamilies, listGroups, listPeople } from "@/lib/firebase/firestore";
import type { Family, Group, Person } from "@/types";

export default function WeddingGuestsFamiliesPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const groupId = params.groupId as string;

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  const load = useCallback(async () => {
    const [gList, fList, pList] = await Promise.all([
      listGroups(weddingId),
      listFamilies(weddingId),
      listPeople(weddingId),
    ]);
    const g = gList.find((x) => x.id === groupId) ?? null;
    setGroup(g);
    setFamilies(fList.filter((x) => x.group_id === groupId));
    setPeople(pList.filter((x) => x.group_id === groupId));
    setLoading(false);
  }, [weddingId, groupId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const rsvp = countByRsvp(people);
    return {
      families: families.length,
      guests: people.length,
      rsvp,
    };
  }, [families.length, people]);

  const byFamily = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const f of families) {
      map.set(f.id, []);
    }
    for (const p of people) {
      const list = map.get(p.family_id);
      if (list) list.push(p);
    }
    return map;
  }, [families, people]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">This group doesn&apos;t exist.</p>
        <Link
          href={`/wedding/${weddingId}/guests`}
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          ← All groups
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Groups", href: `/wedding/${weddingId}/guests` },
          { label: group.name },
        ]}
        title={`Families in ${group.name}`}
        description="Each family is a household. Open one to manage members and attendance."
        action={<AddFamilyDialog weddingId={weddingId} groupId={groupId} onDone={load} />}
      />

      <StatsRow
        stats={[
          { label: "Families", value: stats.families },
          { label: "Guests", value: stats.guests },
          { label: "Confirmed", value: stats.rsvp.confirmed },
          { label: "Pending", value: stats.rsvp.pending, helper: formatRsvpSummary(stats.rsvp) },
        ]}
      />

      <div className="space-y-3">
        {families.length === 0 ? (
          <EmptyStateCard
            title="No families yet"
            description="Create the first family in this group, then add members inside it."
          />
        ) : (
          families.map((f) => {
            const members = byFamily.get(f.id) ?? [];
            const rsvp = countByRsvp(members);
            return (
              <EntityCard
                key={f.id}
                href={`/wedding/${weddingId}/guests/${groupId}/${f.id}`}
                title={f.family_name}
                description={`${members.length} member${members.length === 1 ? "" : "s"} · ${formatRsvpSummary(rsvp)}${f.contact_phone ? ` · ${f.contact_phone}` : ""}`}
                action={<FamilyActionsMenu family={f} onDone={load} />}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
