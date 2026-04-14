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
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/wedding/${weddingId}/guests`} className="underline">
          All groups
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground">{group.name}</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Families</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Households inside <span className="font-medium">{group.name}</span>
          </p>
        </div>
        <AddFamilyDialog weddingId={weddingId} groupId={groupId} onDone={load} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Families" value={stats.families} />
        <StatCard label="Guests" value={stats.guests} />
        <StatCard label="Confirmed" value={stats.rsvp.confirmed} />
        <StatCard label="Pending" value={stats.rsvp.pending} />
      </div>
      <p className="text-sm text-muted-foreground">{formatRsvpSummary(stats.rsvp)}</p>

      <div className="space-y-3">
        {families.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No families in this group yet. Add a family to start adding guests.
            </CardContent>
          </Card>
        ) : (
          families.map((f) => {
            const members = byFamily.get(f.id) ?? [];
            const rsvp = countByRsvp(members);
            return (
              <Card key={f.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <Link
                      href={`/wedding/${weddingId}/guests/${groupId}/${f.id}`}
                      className="group block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <CardTitle className="text-xl">{f.family_name}</CardTitle>
                      <CardDescription className="mt-1 text-base transition-colors group-hover:text-foreground">
                        {members.length} member{members.length === 1 ? "" : "s"}{" "}
                        · {formatRsvpSummary(rsvp)}
                        {f.contact_phone ? (
                          <>
                            {" "}
                            ·{" "}
                            <span className="tabular-nums">
                              {f.contact_phone}
                            </span>
                          </>
                        ) : null}
                      </CardDescription>
                    </Link>
                    <FamilyActionsMenu family={f} onDone={load} />
                  </div>
                </CardHeader>
                <CardContent className="sr-only">Open family</CardContent>
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
