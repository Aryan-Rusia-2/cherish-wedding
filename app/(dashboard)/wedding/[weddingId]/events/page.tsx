"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { EntityCard } from "@/components/dashboard/entity-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatsRow } from "@/components/dashboard/stats-row";
import { AddEventDialog } from "@/components/events/event-dialogs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listEvents, listExchanges } from "@/lib/firebase/firestore";
import type { Exchange, WeddingEvent } from "@/types";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Time not set";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sideLabel(side: WeddingEvent["side"]): string {
  if (side === "bride") return "Bride";
  if (side === "groom") return "Groom";
  return "Both";
}

export default function WeddingEventsPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  const load = useCallback(async () => {
    const [eventList, exchangeList] = await Promise.all([
      listEvents(weddingId),
      listExchanges(weddingId),
    ]);
    setEvents(eventList);
    setExchanges(exchangeList);
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const now = Date.now();
    const upcoming = events.filter(
      (event) => new Date(event.start_time).getTime() >= now,
    ).length;
    const pending = exchanges.filter(
      (exchange) => exchange.status !== "delivered",
    ).length;
    return {
      total: events.length,
      upcoming,
      exchanges: exchanges.length,
      pending,
    };
  }, [events, exchanges]);

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
          { label: "Events" },
        ]}
        title="Events"
        description="Create event blocks, then open each event to manage participants and exchanges."
        action={<AddEventDialog weddingId={weddingId} onDone={load} />}
      />

      <StatsRow
        stats={[
          { label: "Total events", value: stats.total },
          { label: "Upcoming", value: stats.upcoming },
          { label: "Exchanges", value: stats.exchanges },
          { label: "Pending", value: stats.pending },
        ]}
      />

      <div className="space-y-3">
        {events.length === 0 ? (
          <EmptyStateCard
            title="No events yet"
            description="Add your first event to start planning time slots, participants, and exchanges."
          />
        ) : (
          events.map((event) => (
            <EntityCard
              key={event.id}
              href={`/wedding/${weddingId}/events/${event.id}`}
              title={event.title}
              description={`${formatDateTime(event.start_time)}${event.location ? ` · ${event.location}` : ""}`}
              footer={
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{sideLabel(event.side)}</Badge>
                  <Badge variant="secondary">{event.type}</Badge>
                </div>
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
