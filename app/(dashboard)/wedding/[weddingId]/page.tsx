"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  getWedding,
  listAnnouncements,
  listPeople,
  listRooms,
  listTimelineItems,
} from "@/lib/firebase/firestore";
import {
  addAnnouncement,
  updateWeddingVisibility,
} from "@/lib/firebase/mutations";
import type { Announcement, Wedding } from "@/types";

export default function WeddingOverviewPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const [wedding, setWedding] = useState<Wedding | null | undefined>(undefined);
  const [stats, setStats] = useState({ guests: 0, events: 0, rooms: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    const w = await getWedding(weddingId);
    setWedding(w);
    if (!w) return;
    const [people, items, ann, roomList] = await Promise.all([
      listPeople(weddingId),
      listTimelineItems(weddingId),
      listAnnouncements(weddingId),
      listRooms(weddingId),
    ]);
    setStats({
      guests: people.length,
      events: items.length,
      rooms: roomList.length,
    });
    setAnnouncements(ann);
  }, [weddingId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleGuestLink(checked: boolean) {
    if (!wedding) return;
    try {
      await updateWeddingVisibility(
        weddingId,
        checked ? "guest_link" : "private",
      );
      toast.success(checked ? "Guest links enabled" : "Guest links disabled");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function postAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setPosting(true);
    try {
      await addAnnouncement(weddingId, message.trim());
      setMessage("");
      toast.success("Posted");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not post");
    } finally {
      setPosting(false);
    }
  }

  if (wedding === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!wedding) {
    return <p className="text-muted-foreground">Wedding not found.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="underline">
            All weddings
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{wedding.name}</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {new Date(wedding.wedding_date).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Guests</CardDescription>
            <CardTitle className="text-3xl">{stats.guests}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/wedding/${weddingId}/guests`}
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "inline-flex min-h-11 w-full items-center justify-center",
              )}
            >
              Manage guests
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Events</CardDescription>
            <CardTitle className="text-3xl">{stats.events}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/wedding/${weddingId}/timeline`}
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "inline-flex min-h-11 w-full items-center justify-center",
              )}
            >
              Manage timeline
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rooms</CardDescription>
            <CardTitle className="text-3xl">{stats.rooms}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/wedding/${weddingId}/rooms`}
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "inline-flex min-h-11 w-full items-center justify-center",
              )}
            >
              Manage rooms
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guest experience</CardTitle>
          <CardDescription>
            When enabled, anyone with a guest link can see their schedule and RSVP
            without signing in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Switch
              id="guest-link"
              checked={(wedding.visibility ?? "private") === "guest_link"}
              onCheckedChange={toggleGuestLink}
            />
            <Label htmlFor="guest-link" className="text-base">
              Enable guest links
            </Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Status:{" "}
            <span className="font-medium text-foreground">
              {(wedding.visibility ?? "private") === "guest_link" ? "On" : "Off"}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Announcements</CardTitle>
          <CardDescription>Guests see these on their personal page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={postAnnouncement} className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Parking update, dress code, timing…"
              className="min-h-12 flex-1 text-base"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button
              type="submit"
              className="min-h-12 shrink-0"
              disabled={posting || !message.trim()}
            >
              {posting ? "Posting…" : "Post"}
            </Button>
          </form>
          <ul className="space-y-3">
            {announcements.length === 0 && (
              <li className="text-sm text-muted-foreground">No announcements yet.</li>
            )}
            {announcements.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border bg-card px-4 py-3 text-sm leading-relaxed"
              >
                {a.message}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
