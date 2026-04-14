"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { EntityCard } from "@/components/dashboard/entity-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatsRow } from "@/components/dashboard/stats-row";
import { CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AddPersonDialog,
  EditFamilyDialog,
  PersonActionsMenu,
} from "@/components/guests/guest-dialogs";
import {
  countByRsvp,
  sortPeopleFamilyDisplayOrder,
} from "@/components/guests/guest-stats";
import { RsvpBadge } from "@/components/guests/rsvp-badge";
import { listFamilies, listGroups, listPeople } from "@/lib/firebase/firestore";
import type { Family, Group, Person } from "@/types";

export default function WeddingGuestsMembersPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const groupId = params.groupId as string;
  const familyId = params.familyId as string;

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<Person[]>([]);

  const load = useCallback(async () => {
    const [gList, fList, pList] = await Promise.all([
      listGroups(weddingId),
      listFamilies(weddingId),
      listPeople(weddingId),
    ]);
    const g = gList.find((x) => x.id === groupId) ?? null;
    const fam =
      fList.find((x) => x.id === familyId && x.group_id === groupId) ?? null;
    setGroup(g);
    setFamily(fam);
    setMembers(pList.filter((p) => p.family_id === familyId));
    setLoading(false);
  }, [weddingId, groupId, familyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => countByRsvp(members), [members]);

  const membersSorted = useMemo(
    () => sortPeopleFamilyDisplayOrder(members),
    [members],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!group || !family) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">This family wasn&apos;t found.</p>
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
          { label: group.name, href: `/wedding/${weddingId}/guests/${groupId}` },
          { label: family.family_name },
        ]}
        title={`Members in ${family.family_name}`}
        description={`${group.name} household`}
        meta={
          family.contact_phone ? (
            <p className="text-sm text-muted-foreground">
              Household contact:{" "}
              <span className="font-medium tabular-nums text-foreground">
                {family.contact_phone}
              </span>
            </p>
          ) : undefined
        }
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <EditFamilyDialog family={family} onDone={load} />
            <AddPersonDialog
              weddingId={weddingId}
              groupId={groupId}
              familyId={familyId}
              onDone={load}
            />
          </div>
        }
      />

      <StatsRow
        stats={[
          { label: "Members", value: members.length },
          { label: "Confirmed", value: stats.confirmed },
          { label: "Not confirmed", value: stats.pending },
        ]}
      />

      <div className="space-y-3">
        {membersSorted.length === 0 ? (
          <EmptyStateCard
            title="No members yet"
            description="Add guests to this family, then mark confirmations when needed."
          />
        ) : (
          membersSorted.map((p) => (
            <EntityCard
              key={p.id}
              title={p.name}
              description=""
              action={<PersonActionsMenu person={p} onDone={load} />}
              className={cn(
                p.rsvp_status === "confirmed" &&
                  "border-emerald-300/70 bg-emerald-50/60 dark:border-emerald-500/50 dark:bg-emerald-950/20",
              )}
              footer={
                <div className="flex flex-wrap items-center gap-2">
                  {p.is_kid === true ? <Badge variant="secondary">Kid</Badge> : null}
                  <RsvpBadge status={p.rsvp_status} />
                  {p.rsvp_status !== "confirmed" ? (
                    <CardDescription>Not confirmed yet</CardDescription>
                  ) : null}
                </div>
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
