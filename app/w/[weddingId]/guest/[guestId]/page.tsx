"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getFirebaseDb } from "@/lib/firebase/config";
import {
  col,
  getPerson,
  getWedding,
  listAssignmentsForPerson,
  listTimelineItems,
} from "@/lib/firebase/firestore";
import { formatTimelineLabel, timelineSortKey } from "@/lib/dates";
import type { Announcement, Person, TimelineItem, Wedding } from "@/types";

export default function GuestExperiencePage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const guestId = params.guestId as string;

  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState<Person | null>(null);
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [myIds, setMyIds] = useState<Set<string>>(new Set());
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubAnnouncements: (() => void) | undefined;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [p, w] = await Promise.all([
          getPerson(guestId),
          getWedding(weddingId),
        ]);
        if (cancelled) return;
        if (!p || p.wedding_id !== weddingId) {
          setPerson(null);
          setError("This guest link doesn’t match this wedding.");
          return;
        }
        if (!w) {
          setError("Wedding not found.");
          return;
        }

        const [items, assigns] = await Promise.all([
          listTimelineItems(weddingId),
          listAssignmentsForPerson(guestId),
        ]);
        if (cancelled) return;
        setPerson(p);
        setWedding(w);
        setTimeline(items);
        setMyIds(new Set(assigns.map((a) => a.timeline_item_id)));

        const db = getFirebaseDb();
        const qAnn = query(
          collection(db, col.announcements),
          where("wedding_id", "==", weddingId),
        );
        unsubAnnouncements = onSnapshot(qAnn, (snap) => {
          const list = snap.docs.map(
            (d) => ({ id: d.id, ...d.data() } as Announcement),
          );
          list.sort(
            (a, b) =>
              (b.created_at?.toMillis?.() ?? 0) -
              (a.created_at?.toMillis?.() ?? 0),
          );
          setAnnouncements(list);
        });
      } catch (e: unknown) {
        if (!cancelled) {
          const code =
            typeof e === "object" &&
            e !== null &&
            "code" in e &&
            typeof (e as { code: unknown }).code === "string"
              ? (e as { code: string }).code
              : "";
          if (code === "permission-denied") {
            setError(
              "Ask your hosts to enable guest links, then open your invite again.",
            );
          } else {
            setError(e instanceof Error ? e.message : "Something went wrong.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
      unsubAnnouncements?.();
    };
  }, [weddingId, guestId]);

  const sortedTimeline = useMemo(() => {
    if (!wedding) return [];
    return [...timeline].sort(
      (a, b) =>
        timelineSortKey(a, wedding.wedding_date) -
        timelineSortKey(b, wedding.wedding_date),
    );
  }, [timeline, wedding]);

  const myEvents = useMemo(
    () => sortedTimeline.filter((t) => myIds.has(t.id)),
    [sortedTimeline, myIds],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center gap-4 px-6 py-16 text-center">
        <p className="text-lg text-muted-foreground leading-relaxed">
          {error ?? "We couldn’t find this guest page."}
        </p>
        <Link href="/" className="text-sm font-medium underline">
          Go home
        </Link>
      </div>
    );
  }

  if (!wedding) {
    return null;
  }

  const locked = (wedding.visibility ?? "private") !== "guest_link";

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 to-background pb-16 pt-10">
      <div className="mx-auto max-w-lg space-y-8 px-4">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            {wedding.name}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome, {person.name.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            This is your space for the celebration — schedule, notes, and updates
            in one place.
          </p>
        </header>

        {locked && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">Almost ready</CardTitle>
              <CardDescription>
                Ask your hosts to enable guest links from their dashboard when
                they&apos;re ready to share details.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {person.rsvp_status === "confirmed" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attendance</CardTitle>
              <CardDescription>Your attendance is confirmed.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {myEvents.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">For you</h2>
            <ul className="space-y-3">
              {myEvents.map((item) => (
                <li key={item.id}>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription>
                        {formatTimelineLabel(item, wedding.wedding_date)}
                        {item.location ? ` · ${item.location}` : ""}
                      </CardDescription>
                    </CardHeader>
                    {item.notes && (
                      <CardContent className="text-sm leading-relaxed text-muted-foreground">
                        {item.notes}
                      </CardContent>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Schedule</h2>
          {sortedTimeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Your hosts are still shaping the timeline.
            </p>
          ) : (
            <ul className="space-y-3">
              {sortedTimeline.map((item) => (
                <li key={item.id}>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription>
                        {formatTimelineLabel(item, wedding.wedding_date)}
                        {item.location ? ` · ${item.location}` : ""}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Updates</h2>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates yet.</p>
          ) : (
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border bg-card px-4 py-3 text-sm leading-relaxed shadow-sm"
                >
                  {a.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
