"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { EntityCard } from "@/components/dashboard/entity-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatsRow } from "@/components/dashboard/stats-row";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getWedding,
  listEvents,
  listExchanges,
  listPeople,
  listRooms,
  listTasks,
} from "@/lib/firebase/firestore";
import type { Wedding } from "@/types";

export default function WeddingOverviewPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const [wedding, setWedding] = useState<Wedding | null | undefined>(undefined);
  const [stats, setStats] = useState({
    guests: 0,
    events: 0,
    rooms: 0,
    exchanges: 0,
    tasks: 0,
  });

  const load = useCallback(async () => {
    const w = await getWedding(weddingId);
    setWedding(w);
    if (!w) return;
    const [people, eventList, roomList, exchangeList, taskList] = await Promise.all([
      listPeople(weddingId),
      listEvents(weddingId),
      listRooms(weddingId),
      listExchanges(weddingId),
      listTasks(weddingId),
    ]);
    setStats({
      guests: people.length,
      events: eventList.length,
      rooms: roomList.length,
      exchanges: exchangeList.length,
      tasks: taskList.length,
    });
  }, [weddingId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const weddingDate = new Date(wedding.wedding_date);
  const dayDiff = Math.ceil(
    (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const countdown =
    dayDiff > 1
      ? `${dayDiff} days to go`
      : dayDiff === 1
        ? "Tomorrow"
        : dayDiff === 0
          ? "Today"
          : "Date passed";

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[{ label: "All weddings", href: "/dashboard" }]}
        title={wedding.name}
        description="Choose a section to manage this wedding."
        meta={
          <p className="text-sm text-muted-foreground">
            {weddingDate.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}{" "}
            · <span className="font-medium text-foreground">{countdown}</span>
          </p>
        }
      />

      <StatsRow
        stats={[
          { label: "Guests", value: stats.guests },
          { label: "Events", value: stats.events },
          { label: "Rooms", value: stats.rooms },
          { label: "Exchanges", value: stats.exchanges, helper: `${stats.tasks} tasks` },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <EntityCard
          href={`/wedding/${weddingId}/dashboard`}
          title="Dashboard"
          description="Task-focused dashboard with due and overdue work."
          footer="Open dashboard"
        />
        <EntityCard
          href={`/wedding/${weddingId}/guests`}
          title="Guests"
          description="Build groups, manage families, and keep attendance clean."
          footer="Open guest management"
        />
        <EntityCard
          href={`/wedding/${weddingId}/events`}
          title="Events"
          description="Define event flow, participants, and event-level exchanges."
          footer="Open events"
        />
        <EntityCard
          href={`/wedding/${weddingId}/rooms`}
          title="Rooms"
          description="Define inventory, assign guests, and track capacity."
          footer="Open room planning"
        />
        <EntityCard
          href={`/wedding/${weddingId}/exchanges`}
          title="Exchanges"
          description="Track all gifts, items, and money exchanges across events."
          footer="Open exchanges overview"
        />
        <EntityCard
          href={`/wedding/${weddingId}/tasks`}
          title="Tasks"
          description="Manage every task with owners, deadlines, and notes."
          footer="Open task management"
        />
      </div>
    </div>
  );
}
