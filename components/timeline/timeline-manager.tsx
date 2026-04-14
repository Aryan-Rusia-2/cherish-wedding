"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listAssignmentsForWedding,
  listPeople,
  listTimelineItems,
} from "@/lib/firebase/firestore";
import {
  createAssignment,
  createTimelineItem,
  deleteAssignment,
  deleteTimelineItem,
  updateTimelineItemFull,
} from "@/lib/firebase/mutations";
import { formatTimelineLabel, timelineSortKey } from "@/lib/dates";
import type { Assignment, Person, TimelineItem, TimelineItemType } from "@/types";

type Props = { weddingId: string; weddingDateIso: string };

export function TimelineManager({ weddingId, weddingDateIso }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  const load = useCallback(async () => {
    const [t, a, p] = await Promise.all([
      listTimelineItems(weddingId),
      listAssignmentsForWedding(weddingId),
      listPeople(weddingId),
    ]);
    setItems(
      [...t].sort(
        (x, y) =>
          timelineSortKey(x, weddingDateIso) - timelineSortKey(y, weddingDateIso),
      ),
    );
    setAssignments(a);
    setPeople(p);
    setLoading(false);
  }, [weddingId, weddingDateIso]);

  useEffect(() => {
    void load();
  }, [load]);

  const assignmentsByItem = useMemo(() => {
    const m = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const list = m.get(a.timeline_item_id) ?? [];
      list.push(a);
      m.set(a.timeline_item_id, list);
    }
    return m;
  }, [assignments]);

  async function removeItem(item: TimelineItem) {
    if (!confirm(`Delete “${item.title}”?`)) return;
    const related = assignments.filter((a) => a.timeline_item_id === item.id);
    for (const a of related) {
      await deleteAssignment(a.id);
    }
    await deleteTimelineItem(item.id);
    toast.success("Removed");
    void load();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Timeline</h2>
          <p className="text-sm text-muted-foreground">
            Events with fixed dates or relative to your wedding day. Guests only
            see items marked “visible”.
          </p>
        </div>
        <AddTimelineDialog
          weddingId={weddingId}
          weddingDateIso={weddingDateIso}
          people={people}
          onDone={load}
        />
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        )}
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {formatTimelineLabel(item, weddingDateIso)}
                    {item.location ? ` · ${item.location}` : ""}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AssignDialog
                    weddingId={weddingId}
                    item={item}
                    people={people}
                    existing={assignmentsByItem.get(item.id) ?? []}
                    onDone={load}
                  />
                  <EditTimelineDialog
                    item={item}
                    weddingDateIso={weddingDateIso}
                    onDone={load}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => removeItem(item)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            {(item.notes || item.visible_to_guests !== false) && (
              <CardContent className="space-y-2 text-sm">
                {item.visible_to_guests && (
                  <p className="text-muted-foreground">Visible on guest schedule</p>
                )}
                {item.notes && (
                  <p className="whitespace-pre-wrap leading-relaxed">{item.notes}</p>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function AddTimelineDialog({
  weddingId,
  weddingDateIso,
  people,
  onDone,
}: {
  weddingId: string;
  weddingDateIso: string;
  people: Person[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TimelineItemType>("event");
  const [mode, setMode] = useState<"fixed" | "relative">("fixed");
  const [startLocal, setStartLocal] = useState("");
  const [offsetDays, setOffsetDays] = useState(-2);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: Omit<TimelineItem, "id"> = {
        wedding_id: weddingId,
        title: title.trim(),
        type,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        visible_to_guests: visible,
        start_time:
          mode === "fixed" && startLocal
            ? new Date(startLocal).toISOString()
            : undefined,
        relative_to:
          mode === "relative"
            ? { anchor: "wedding_date", offset_days: offsetDays }
            : null,
      };
      if (mode === "fixed" && !startLocal) {
        toast.error("Pick a date and time");
        setBusy(false);
        return;
      }
      const id = await createTimelineItem(payload);
      setOpen(false);
      setTitle("");
      setStartLocal("");
      setLocation("");
      setNotes("");
      setVisible(true);
      setMode("fixed");
      setOffsetDays(-2);
      setType("event");
      toast.success("Event added");
      onDone();
      // optional: open assign dialog - skip
      void id;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: "default", size: "default" }),
          "min-h-12 w-full sm:w-auto",
        )}
      >
        Add timeline item
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New timeline item</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ttitle">Title</Label>
            <Input
              id="ttitle"
              required
              className="min-h-12"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as TimelineItemType)}
            >
              <SelectTrigger className="min-h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="ritual">Ritual</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Schedule</Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as "fixed" | "relative")}
            >
              <SelectTrigger className="min-h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed date & time</SelectItem>
                <SelectItem value="relative">
                  Relative to wedding ({new Date(weddingDateIso).toLocaleDateString()})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "fixed" ? (
            <div className="space-y-2">
              <Label htmlFor="tstart">Start</Label>
              <Input
                id="tstart"
                type="datetime-local"
                required
                className="min-h-12"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="toffset">Days from wedding (negative = before)</Label>
              <Input
                id="toffset"
                type="number"
                required
                className="min-h-12"
                value={offsetDays}
                onChange={(e) => setOffsetDays(Number(e.target.value))}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="tloc">Location (optional)</Label>
            <Input
              id="tloc"
              className="min-h-12"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tnotes">Notes (optional)</Label>
            <Textarea
              id="tnotes"
              className="min-h-24"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Checkbox
              id="tvis"
              checked={visible}
              onCheckedChange={(c) => setVisible(c === true)}
            />
            <Label htmlFor="tvis" className="text-sm font-normal leading-snug">
              Show on guest schedule (only when guest links are enabled)
            </Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
        {people.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Add guests first to assign them to events.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditTimelineDialog({
  item,
  weddingDateIso,
  onDone,
}: {
  item: TimelineItem;
  weddingDateIso: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [type, setType] = useState<TimelineItemType>(item.type);
  const [mode, setMode] = useState<"fixed" | "relative">(
    item.relative_to ? "relative" : "fixed",
  );
  const [startLocal, setStartLocal] = useState(() =>
    item.start_time ? toLocalInput(item.start_time) : "",
  );
  const [offsetDays, setOffsetDays] = useState(
    item.relative_to?.offset_days ?? -2,
  );
  const [location, setLocation] = useState(item.location ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [visible, setVisible] = useState(item.visible_to_guests !== false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(item.title);
    setType(item.type);
    setMode(item.relative_to ? "relative" : "fixed");
    setStartLocal(item.start_time ? toLocalInput(item.start_time) : "");
    setOffsetDays(item.relative_to?.offset_days ?? -2);
    setLocation(item.location ?? "");
    setNotes(item.notes ?? "");
    setVisible(item.visible_to_guests !== false);
  }, [open, item]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateTimelineItemFull(item.id, {
        title: title.trim(),
        type,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        visible_to_guests: visible,
        mode,
        startLocal: mode === "fixed" ? startLocal : undefined,
        offsetDays: mode === "relative" ? offsetDays : undefined,
      });
      setOpen(false);
      toast.success("Updated");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: "secondary", size: "default" }),
          "min-h-11",
        )}
      >
        Edit
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="etitle">Title</Label>
            <Input
              id="etitle"
              required
              className="min-h-12"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as TimelineItemType)}
            >
              <SelectTrigger className="min-h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="ritual">Ritual</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Schedule</Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as "fixed" | "relative")}
            >
              <SelectTrigger className="min-h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed date & time</SelectItem>
                <SelectItem value="relative">
                  Relative to wedding (
                  {new Date(weddingDateIso).toLocaleDateString()})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "fixed" ? (
            <div className="space-y-2">
              <Label htmlFor="estart">Start</Label>
              <Input
                id="estart"
                type="datetime-local"
                required
                className="min-h-12"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="eoffset">Days from wedding</Label>
              <Input
                id="eoffset"
                type="number"
                required
                className="min-h-12"
                value={offsetDays}
                onChange={(e) => setOffsetDays(Number(e.target.value))}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="eloc">Location (optional)</Label>
            <Input
              id="eloc"
              className="min-h-12"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="enotes">Notes (optional)</Label>
            <Textarea
              id="enotes"
              className="min-h-24"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Checkbox
              id="evis"
              checked={visible}
              onCheckedChange={(c) => setVisible(c === true)}
            />
            <Label htmlFor="evis" className="text-sm font-normal leading-snug">
              Visible on guest schedule
            </Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({
  weddingId,
  item,
  people,
  existing,
  onDone,
}: {
  weddingId: string;
  item: TimelineItem;
  people: Person[];
  existing: Assignment[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(existing.map((a) => a.person_id)),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setSelected(new Set(existing.map((a) => a.person_id)));
  }, [open, existing]);

  function toggle(pid: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(pid);
      else next.delete(pid);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    try {
      const want = selected;
      const have = new Map(existing.map((a) => [a.person_id, a.id]));
      for (const [pid, aid] of Array.from(have.entries())) {
        if (!want.has(pid)) await deleteAssignment(aid);
      }
      for (const pid of Array.from(want)) {
        if (!have.has(pid)) {
          await createAssignment({
            wedding_id: weddingId,
            timeline_item_id: item.id,
            person_id: pid,
          });
        }
      }
      setOpen(false);
      toast.success("Assignments saved");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: "outline", size: "default" }),
          "min-h-11",
        )}
      >
        Assign guests
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Who is involved?</DialogTitle>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {people.length === 0 && (
            <p className="text-sm text-muted-foreground">No guests yet.</p>
          )}
          {people.map((p) => (
            <label
              key={p.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2"
            >
              <Checkbox
                checked={selected.has(p.id)}
                onCheckedChange={(c) => toggle(p.id, c === true)}
              />
              <span className="text-sm font-medium">{p.name}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" className="min-h-11 w-full" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
