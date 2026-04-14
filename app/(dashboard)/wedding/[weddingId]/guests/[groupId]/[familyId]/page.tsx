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

  const guestLinkBase =
    typeof window !== "undefined" ? window.location.origin : "";

  async function copyInvite(person: Person) {
    const url = `${guestLinkBase}/w/${weddingId}/guest/${person.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

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
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/wedding/${weddingId}/guests`} className="underline">
          All groups
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/wedding/${weddingId}/guests/${groupId}`}
          className="underline"
        >
          {group.name}
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground">{family.family_name}</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {family.family_name} · {group.name}
          </p>
          {family.contact_phone ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Household contact:{" "}
              <span className="font-medium tabular-nums text-foreground">
                {family.contact_phone}
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <EditFamilyDialog family={family} onDone={load} />
          <AddPersonDialog
            weddingId={weddingId}
            groupId={groupId}
            familyId={familyId}
            onDone={load}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Members" value={members.length} />
        <StatCard label="Confirmed" value={stats.confirmed} />
        <StatCard label="Not confirmed" value={stats.pending} />
      </div>

      <div className="space-y-3">
        {membersSorted.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No members yet. Add guests to this family.
            </CardContent>
          </Card>
        ) : (
          membersSorted.map((p) => (
            <Card
              key={p.id}
              className={cn(
                p.rsvp_status === "confirmed" &&
                  "border-emerald-300/70 bg-emerald-50/60 dark:border-emerald-500/50 dark:bg-emerald-950/20",
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">{p.name}</CardTitle>
                      {p.is_kid === true ? <Badge variant="secondary">Kid</Badge> : null}
                      <RsvpBadge status={p.rsvp_status} />
                    </div>
                  </div>
                  <PersonActionsMenu
                    person={p}
                    onDone={load}
                    onCopyInvite={() => copyInvite(p)}
                  />
                </div>
              </CardHeader>
              <CardContent className="sr-only">Member actions</CardContent>
            </Card>
          ))
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
