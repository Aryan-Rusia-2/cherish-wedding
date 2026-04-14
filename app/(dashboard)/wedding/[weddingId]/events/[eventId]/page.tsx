"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  AddParticipantDialog,
  DeleteEventDialog,
  EditEventDialog,
} from "@/components/events/event-dialogs";
import { AddExchangeDialog } from "@/components/exchanges/exchange-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  getEvent,
  listEventParticipants,
  listExchangesForEvent,
  listFamilies,
  listGroups,
  listPeople,
} from "@/lib/firebase/firestore";
import {
  deleteExchange,
  removeEventParticipant,
  updateEvent,
  updateExchange,
  updateExchangeStatus,
} from "@/lib/firebase/mutations";
import type {
  EntityType,
  EventParticipant,
  Exchange,
  Family,
  Group,
  Person,
  WeddingEvent,
} from "@/types";

type LoadState = {
  event: WeddingEvent | null;
  participants: EventParticipant[];
  exchanges: Exchange[];
  groups: Group[];
  families: Family[];
  people: Person[];
};

type ExchangeEditForm = {
  item_name: string;
  quantity: string;
  status: Exchange["status"];
  estimated_value: string;
  notes: string;
};

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "Not set";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateRange(startIso: string, endIso?: string): string {
  const start = formatDateTime(startIso);
  if (!endIso) return start;
  return `${start} - ${formatDateTime(endIso)}`;
}

function sideLabel(side: WeddingEvent["side"]): string {
  if (side === "bride") return "Bride";
  if (side === "groom") return "Groom";
  return "Both";
}

function resolveEntityName(
  type: EntityType,
  id: string,
  lookups: {
    groups: Map<string, Group>;
    families: Map<string, Family>;
    people: Map<string, Person>;
  },
): string {
  if (type === "group") return lookups.groups.get(id)?.name ?? "Unknown group";
  if (type === "family") return lookups.families.get(id)?.family_name ?? "Unknown family";
  return lookups.people.get(id)?.name ?? "Unknown person";
}

export default function EventDetailPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<LoadState>({
    event: null,
    participants: [],
    exchanges: [],
    groups: [],
    families: [],
    people: [],
  });
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [editing, setEditing] = useState(false);
  const [exchangeToEdit, setExchangeToEdit] = useState<Exchange | null>(null);
  const [exchangeEditBusy, setExchangeEditBusy] = useState(false);
  const [exchangeForm, setExchangeForm] = useState<ExchangeEditForm>({
    item_name: "",
    quantity: "1",
    status: "planned",
    estimated_value: "",
    notes: "",
  });

  const load = useCallback(async () => {
    const [event, participants, exchanges, groups, families, people] =
      await Promise.all([
        getEvent(eventId),
        listEventParticipants(weddingId, eventId),
        listExchangesForEvent(weddingId, eventId),
        listGroups(weddingId),
        listFamilies(weddingId),
        listPeople(weddingId),
      ]);
    setState({ event, participants, exchanges, groups, families, people });
    setNotes(event?.description ?? "");
    setLoading(false);
  }, [eventId, weddingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const lookups = useMemo(
    () => ({
      groups: new Map(state.groups.map((group) => [group.id, group])),
      families: new Map(state.families.map((family) => [family.id, family])),
      people: new Map(state.people.map((person) => [person.id, person])),
    }),
    [state.groups, state.families, state.people],
  );

  const participantOptions = useMemo(
    () => ({
      groups: state.groups.map((group) => ({ id: group.id, label: group.name })),
      families: state.families.map((family) => ({
        id: family.id,
        label: family.family_name,
      })),
      people: state.people.map((person) => ({ id: person.id, label: person.name })),
    }),
    [state.groups, state.families, state.people],
  );

  const exchangeOptions = participantOptions;

  useEffect(() => {
    if (!exchangeToEdit) return;
    setExchangeForm({
      item_name: exchangeToEdit.item_name,
      quantity: String(exchangeToEdit.quantity),
      status: exchangeToEdit.status,
      estimated_value:
        typeof exchangeToEdit.estimated_value === "number"
          ? String(exchangeToEdit.estimated_value)
          : "",
      notes: exchangeToEdit.notes ?? "",
    });
  }, [exchangeToEdit]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (!state.event) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">Event not found.</p>
        <Link href={`/wedding/${weddingId}/events`} className="text-sm underline">
          Back to events
        </Link>
      </div>
    );
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await updateEvent(state.event!.id, { description: notes });
      await load();
    } finally {
      setSavingNotes(false);
    }
  }

  async function submitExchangeEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!exchangeToEdit) return;
    setExchangeEditBusy(true);
    try {
      await updateExchange(exchangeToEdit.id, {
        item_name: exchangeForm.item_name.trim(),
        quantity: Number(exchangeForm.quantity) || 1,
        status: exchangeForm.status,
        estimated_value: exchangeForm.estimated_value
          ? Number(exchangeForm.estimated_value)
          : undefined,
        notes: exchangeForm.notes,
      });
      setExchangeToEdit(null);
      await load();
    } finally {
      setExchangeEditBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Wedding overview", href: `/wedding/${weddingId}` },
          { label: "Events", href: `/wedding/${weddingId}/events` },
          { label: state.event.title },
        ]}
        title={state.event.title}
        description={
          state.event.description?.trim() ||
          "Read event details. Switch to edit mode for management controls."
        }
        action={
          <Button
            type="button"
            variant={editing ? "secondary" : "outline"}
            className="min-h-11 w-full sm:w-auto"
            onClick={() => setEditing((prev) => !prev)}
          >
            {editing ? "Done" : "Edit"}
          </Button>
        }
      />

      {!editing ? (
        <article className="mx-auto max-w-3xl space-y-6">
          <section className="space-y-4">
            {state.event.image_url ? (
              <div
                className="h-48 w-full rounded-xl border bg-cover bg-center"
                style={{ backgroundImage: `url("${state.event.image_url}")` }}
                role="img"
                aria-label={`${state.event.title} cover image`}
              />
            ) : (
              <div className="h-40 w-full rounded-xl border bg-muted/30" />
            )}
            <div className="space-y-3">
              <h2 className="font-display text-3xl font-semibold tracking-tight">
                {state.event.title}
              </h2>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{sideLabel(state.event.side)}</Badge>
                <Badge variant="secondary">{state.event.type}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDateRange(state.event.start_time, state.event.end_time)}
                {state.event.location ? ` · ${state.event.location}` : ""}
              </p>
              {state.event.description?.trim() ? (
                <p className="text-[15px] leading-relaxed text-foreground">
                  {state.event.description}
                </p>
              ) : null}
            </div>
          </section>

          <hr className="border-border" />

          <section className="space-y-3">
            <h3 className="font-display text-2xl font-semibold">Who&apos;s invited</h3>
            {state.participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No participants added yet.</p>
            ) : (
              <ul className="space-y-2">
                {state.participants.map((participant) => (
                  <li key={participant.id} className="text-sm leading-relaxed text-foreground">
                    {resolveEntityName(participant.entity_type, participant.entity_id, lookups)}{" "}
                    <span className="text-muted-foreground capitalize">
                      ({participant.entity_type})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-2xl font-semibold">Exchanges</h3>
            {state.exchanges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No exchanges planned.</p>
            ) : (
              <ul className="space-y-2">
                {state.exchanges.map((exchange) => (
                  <li key={exchange.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-foreground">
                      {resolveEntityName(exchange.from_entity_type, exchange.from_entity_id, lookups)}{" "}
                      → {resolveEntityName(exchange.to_entity_type, exchange.to_entity_id, lookups)}{" "}
                      · {exchange.item_name} x{exchange.quantity}
                    </span>
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
                  </li>
                ))}
              </ul>
            )}
          </section>
        </article>
      ) : (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Update event details from edit controls.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{sideLabel(state.event.side)}</Badge>
                <Badge variant="secondary">{state.event.type}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground">
                  {formatDateRange(state.event.start_time, state.event.end_time)}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Location:{" "}
                <span className="text-foreground">{state.event.location || "Not set"}</span>
              </p>
            </CardContent>
            <CardFooter className="gap-2">
              <EditEventDialog event={state.event} onDone={load} />
              <DeleteEventDialog weddingId={weddingId} event={state.event} onDone={load} />
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Participants</CardTitle>
              <CardDescription>Invite at group, family, or person level.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.participants.length === 0 ? (
                <p className="text-sm text-muted-foreground">No participants added yet.</p>
              ) : (
                <ul className="space-y-2">
                  {state.participants.map((participant) => (
                    <li
                      key={participant.id}
                      className="flex items-center justify-between gap-3 rounded-md border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {resolveEntityName(
                            participant.entity_type,
                            participant.entity_id,
                            lookups,
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {participant.entity_type}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-9 text-muted-foreground"
                        onClick={async () => {
                          await removeEventParticipant(participant.id);
                          await load();
                        }}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
            <CardFooter>
              <AddParticipantDialog
                weddingId={weddingId}
                eventId={state.event.id}
                groups={participantOptions.groups}
                families={participantOptions.families}
                people={participantOptions.people}
                onDone={load}
              />
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exchanges</CardTitle>
              <CardDescription>Track who gives what to whom for this event.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.exchanges.length === 0 ? (
                <p className="text-sm text-muted-foreground">No exchanges added yet.</p>
              ) : (
                <ul className="space-y-2">
                  {state.exchanges.map((exchange) => (
                    <li key={exchange.id} className="space-y-2 rounded-md border p-3">
                      <p className="text-sm leading-relaxed">
                        {resolveEntityName(exchange.from_entity_type, exchange.from_entity_id, lookups)}{" "}
                        →{" "}
                        {resolveEntityName(exchange.to_entity_type, exchange.to_entity_id, lookups)}
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
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            type="button"
                            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-input bg-background px-2 text-muted-foreground"
                            aria-label="Exchange actions"
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
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
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setExchangeToEdit(exchange)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
                              onClick={async () => {
                                if (!confirm(`Delete exchange "${exchange.item_name}"?`)) return;
                                await deleteExchange(exchange.id);
                                await load();
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
            <CardFooter>
              <AddExchangeDialog
                weddingId={weddingId}
                eventId={state.event.id}
                options={exchangeOptions}
                onDone={load}
              />
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes / Instructions</CardTitle>
              <CardDescription>Custom notes specific to this event.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write timing instructions, tasks, reminders..."
              />
            </CardContent>
            <CardFooter>
              <Button
                type="button"
                onClick={() => void saveNotes()}
                disabled={savingNotes}
                className="min-h-11"
              >
                {savingNotes ? "Saving..." : "Save notes"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      <Dialog open={!!exchangeToEdit} onOpenChange={(open) => !open && setExchangeToEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit exchange</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitExchangeEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ed-item">Item name</Label>
              <Input
                id="ed-item"
                className="min-h-12"
                required
                value={exchangeForm.item_name}
                onChange={(e) =>
                  setExchangeForm((prev) => ({ ...prev, item_name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ed-qty">Quantity</Label>
                <Input
                  id="ed-qty"
                  type="number"
                  min={1}
                  className="min-h-12"
                  required
                  value={exchangeForm.quantity}
                  onChange={(e) =>
                    setExchangeForm((prev) => ({ ...prev, quantity: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-status">Status</Label>
                <select
                  id="ed-status"
                  className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={exchangeForm.status}
                  onChange={(e) =>
                    setExchangeForm((prev) => ({
                      ...prev,
                      status: e.target.value as Exchange["status"],
                    }))
                  }
                >
                  <option value="planned">Planned</option>
                  <option value="purchased">Purchased</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-est">Estimated value (optional)</Label>
              <Input
                id="ed-est"
                type="number"
                min={0}
                step="0.01"
                className="min-h-12"
                value={exchangeForm.estimated_value}
                onChange={(e) =>
                  setExchangeForm((prev) => ({
                    ...prev,
                    estimated_value: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-notes">Notes</Label>
              <Textarea
                id="ed-notes"
                value={exchangeForm.notes}
                onChange={(e) =>
                  setExchangeForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={exchangeEditBusy}
                className="min-h-11 w-full"
              >
                {exchangeEditBusy ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
