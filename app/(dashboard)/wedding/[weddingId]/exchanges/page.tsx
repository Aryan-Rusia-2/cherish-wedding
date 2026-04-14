"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatsRow } from "@/components/dashboard/stats-row";
import {
  DeleteExchangeDialog,
  EditExchangeDialog,
} from "@/components/exchanges/exchange-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listEvents,
  listExchanges,
  listFamilies,
  listGroups,
  listPeople,
} from "@/lib/firebase/firestore";
import { updateExchangeStatus } from "@/lib/firebase/mutations";
import type { EntityType, Exchange, Family, Group, Person, WeddingEvent } from "@/types";

type ViewMode = "all" | "byEvent" | "planned" | "purchased" | "delivered";

function resolveEntityName(
  entityType: EntityType,
  entityId: string,
  maps: {
    groups: Map<string, Group>;
    families: Map<string, Family>;
    people: Map<string, Person>;
  },
): string {
  if (entityType === "group") return maps.groups.get(entityId)?.name ?? "Unknown group";
  if (entityType === "family") return maps.families.get(entityId)?.family_name ?? "Unknown family";
  return maps.people.get(entityId)?.name ?? "Unknown person";
}

export default function ExchangesOverviewPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  const load = useCallback(async () => {
    const [eventList, exchangeList, groupList, familyList, peopleList] =
      await Promise.all([
        listEvents(weddingId),
        listExchanges(weddingId),
        listGroups(weddingId),
        listFamilies(weddingId),
        listPeople(weddingId),
      ]);
    setEvents(eventList);
    setExchanges(exchangeList);
    setGroups(groupList);
    setFamilies(familyList);
    setPeople(peopleList);
    setLoading(false);
  }, [weddingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const maps = useMemo(
    () => ({
      events: new Map(events.map((event) => [event.id, event])),
      groups: new Map(groups.map((group) => [group.id, group])),
      families: new Map(families.map((family) => [family.id, family])),
      people: new Map(people.map((person) => [person.id, person])),
    }),
    [events, groups, families, people],
  );

  const options = useMemo(
    () => ({
      groups: groups.map((group) => ({ id: group.id, label: group.name })),
      families: families.map((family) => ({
        id: family.id,
        label: family.family_name,
      })),
      people: people.map((person) => ({ id: person.id, label: person.name })),
    }),
    [groups, families, people],
  );

  const stats = useMemo(() => {
    const totalEstimatedCost = exchanges.reduce(
      (sum, exchange) => sum + (exchange.estimated_value ?? 0),
      0,
    );
    const pendingItems = exchanges.filter(
      (exchange) => exchange.status !== "delivered",
    ).length;
    const totalItems = exchanges.reduce(
      (sum, exchange) => sum + Math.max(0, exchange.quantity),
      0,
    );
    return {
      totalExchanges: exchanges.length,
      totalItems,
      totalEstimatedCost,
      pendingItems,
    };
  }, [exchanges]);

  const visibleExchanges = useMemo(() => {
    if (viewMode === "all" || viewMode === "byEvent") return exchanges;
    return exchanges.filter((exchange) => exchange.status === viewMode);
  }, [exchanges, viewMode]);

  const groupedByEvent = useMemo(() => {
    const map = new Map<string, Exchange[]>();
    for (const exchange of exchanges) {
      const current = map.get(exchange.event_id) ?? [];
      current.push(exchange);
      map.set(exchange.event_id, current);
    }
    return map;
  }, [exchanges]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Wedding overview", href: `/wedding/${weddingId}` },
          { label: "Exchanges overview" },
        ]}
        title="Exchange overview"
        description="Track all exchanges across events in one place."
      />

      <StatsRow
        stats={[
          { label: "Total exchanges", value: stats.totalExchanges },
          { label: "Total items", value: stats.totalItems },
          { label: "Estimated cost", value: stats.totalEstimatedCost },
          { label: "Pending items", value: stats.pendingItems },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Status tracking</CardTitle>
          <CardDescription>Filter by lifecycle stage or group by event.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {([
              { id: "all", label: "All" },
              { id: "byEvent", label: "By Event" },
              { id: "planned", label: "Planned" },
              { id: "purchased", label: "Purchased" },
              { id: "delivered", label: "Delivered" },
            ] as const).map((item) => (
              <Button
                key={item.id}
                type="button"
                variant={viewMode === item.id ? "default" : "outline"}
                size="sm"
                className="min-h-10"
                onClick={() => setViewMode(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {viewMode === "byEvent" ? (
        <div className="space-y-4">
          {Array.from(groupedByEvent.entries()).map(([eventId, items]) => {
            const eventName = maps.events.get(eventId)?.title ?? "Unknown event";
            return (
              <Card key={eventId}>
                <CardHeader>
                  <CardTitle>{eventName}</CardTitle>
                  <CardDescription>{items.length} exchange(s)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((exchange) => (
                    <p key={exchange.id} className="text-sm text-muted-foreground">
                      {resolveEntityName(exchange.from_entity_type, exchange.from_entity_id, maps)}{" "}
                      → {resolveEntityName(exchange.to_entity_type, exchange.to_entity_id, maps)}{" "}
                      ({exchange.item_name} x{exchange.quantity})
                    </p>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>List view</CardTitle>
            <CardDescription>
              {visibleExchanges.length} exchange(s) in this view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {visibleExchanges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No exchanges to show.</p>
            ) : (
              <ul className="space-y-3">
                {visibleExchanges.map((exchange) => {
                  const event = maps.events.get(exchange.event_id);
                  return (
                    <li key={exchange.id} className="space-y-2 rounded-md border p-3">
                      <p className="text-sm font-medium">
                        <Link
                          href={`/wedding/${weddingId}/events/${exchange.event_id}`}
                          className="underline underline-offset-2"
                        >
                          {event?.title ?? "Unknown event"}
                        </Link>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {resolveEntityName(exchange.from_entity_type, exchange.from_entity_id, maps)}{" "}
                        → {resolveEntityName(exchange.to_entity_type, exchange.to_entity_id, maps)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {exchange.item_name} x{exchange.quantity}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            exchange.status === "delivered"
                              ? "default"
                              : exchange.status === "purchased"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {exchange.status}
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="min-h-8"
                          onClick={async () => {
                            const nextStatus: Exchange["status"] =
                              exchange.status === "planned"
                                ? "purchased"
                                : exchange.status === "purchased"
                                  ? "delivered"
                                  : "planned";
                            await updateExchangeStatus(exchange.id, nextStatus);
                            await load();
                          }}
                        >
                          Advance status
                        </Button>
                        <EditExchangeDialog
                          exchange={exchange}
                          options={options}
                          onDone={load}
                        />
                        <DeleteExchangeDialog exchange={exchange} onDone={load} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
