"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  allocatePeopleToRoom,
  createRoom,
  createRoomType,
  deleteRoom,
  deleteRoomType,
  generateRooms,
  setPersonRoom,
  updateRoomType,
} from "@/lib/firebase/mutations";
import { sortPeopleFamilyDisplayOrder } from "@/components/guests/guest-stats";
import { effectiveCapacity } from "@/lib/rooms/capacity";
import { MoreHorizontal } from "lucide-react";
import type { Family, Group, Person, RoomExtraBeds, RoomType } from "@/types";

export function AddRoomTypeDialog({
  weddingId,
  onDone,
}: {
  weddingId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [baseOccupancy, setBaseOccupancy] = useState("2");
  const [roomCount, setRoomCount] = useState("");
  const [labelPrefix, setLabelPrefix] = useState("");
  const [labelStart, setLabelStart] = useState("1");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const roomTypeId = await createRoomType(
        weddingId,
        name.trim(),
        Number(baseOccupancy) || 1,
      );
      const n = Math.floor(Number(roomCount) || 0);
      if (n > 0) {
        await generateRooms(
          weddingId,
          roomTypeId,
          n,
          labelPrefix,
          Number(labelStart) || 1,
        );
      }
      setName("");
      setBaseOccupancy("2");
      setRoomCount("");
      setLabelPrefix("");
      setLabelStart("1");
      setOpen(false);
      toast.success(
        n > 0 ? "Room type added with rooms" : "Room type added",
      );
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
          buttonVariants({ variant: "default", size: "default" }),
          "min-h-12 w-full sm:w-auto",
        )}
      >
        Add room type
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New room type</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rt-name">Name</Label>
            <Input
              id="rt-name"
              required
              className="min-h-12"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Deluxe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rt-occ">Base occupancy</Label>
            <Input
              id="rt-occ"
              type="number"
              min={1}
              required
              className="min-h-12"
              value={baseOccupancy}
              onChange={(e) => setBaseOccupancy(e.target.value)}
            />
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <p className="text-sm font-medium text-foreground">
              How many rooms of this type?
            </p>
            <p className="text-xs text-muted-foreground">
              Optional. Leave blank or 0 to only create the type — you can add
              rooms later from the type page.
            </p>
            <div className="space-y-2">
              <Label htmlFor="rt-count">Number of rooms</Label>
              <Input
                id="rt-count"
                type="number"
                min={0}
                className="min-h-12"
                value={roomCount}
                onChange={(e) => setRoomCount(e.target.value)}
                placeholder="e.g. 20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rt-lprefix">Room label prefix (optional)</Label>
              <Input
                id="rt-lprefix"
                className="min-h-12"
                value={labelPrefix}
                onChange={(e) => setLabelPrefix(e.target.value)}
                placeholder="R or Room-"
                disabled={!roomCount || Number(roomCount) < 1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rt-lstart">Start number for labels</Label>
              <Input
                id="rt-lstart"
                type="number"
                min={0}
                className="min-h-12"
                value={labelStart}
                onChange={(e) => setLabelStart(e.target.value)}
                disabled={!roomCount || Number(roomCount) < 1}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Example: count 3, prefix &quot;R&quot;, start 1 → R1, R2, R3. Empty
              prefix and start 1 → 1, 2, 3.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditRoomTypeDialog({
  roomType,
  onDone,
}: {
  roomType: RoomType;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(roomType.name);
  const [baseOccupancy, setBaseOccupancy] = useState(
    String(roomType.base_occupancy),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(roomType.name);
    setBaseOccupancy(String(roomType.base_occupancy));
  }, [open, roomType]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateRoomType(roomType.id, {
        name: name.trim(),
        base_occupancy: Number(baseOccupancy) || 1,
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
          buttonVariants({ variant: "outline", size: "sm" }),
          "min-h-11",
        )}
      >
        Edit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit room type</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ert-name">Name</Label>
            <Input
              id="ert-name"
              required
              className="min-h-12"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ert-occ">Base occupancy</Label>
            <Input
              id="ert-occ"
              type="number"
              min={1}
              required
              className="min-h-12"
              value={baseOccupancy}
              onChange={(e) => setBaseOccupancy(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteRoomTypeButton({
  weddingId,
  roomTypeId,
  onDone,
}: {
  weddingId: string;
  roomTypeId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Delete this room type and all its rooms?")) return;
        setBusy(true);
        try {
          await deleteRoomType(weddingId, roomTypeId);
          toast.success("Room type removed");
          onDone();
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      Delete
    </Button>
  );
}

export function RoomTypeActionsMenu({
  weddingId,
  roomType,
  onDone,
}: {
  weddingId: string;
  roomType: RoomType;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(roomType.name);
  const [baseOccupancy, setBaseOccupancy] = useState(
    String(roomType.base_occupancy),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(roomType.name);
    setBaseOccupancy(String(roomType.base_occupancy));
  }, [open, roomType]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateRoomType(roomType.id, {
        name: name.trim(),
        base_occupancy: Number(baseOccupancy) || 1,
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

  async function remove() {
    if (!confirm("Delete this room type and all its rooms?")) return;
    setBusy(true);
    try {
      await deleteRoomType(weddingId, roomType.id);
      toast.success("Room type removed");
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "min-h-11 min-w-11",
          )}
          aria-label={`Actions for ${roomType.name}`}
          disabled={busy}
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
            onClick={remove}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit room type</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`rt-name-${roomType.id}`}>Name</Label>
              <Input
                id={`rt-name-${roomType.id}`}
                required
                className="min-h-12"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`rt-occ-${roomType.id}`}>Base occupancy</Label>
              <Input
                id={`rt-occ-${roomType.id}`}
                type="number"
                min={1}
                required
                className="min-h-12"
                value={baseOccupancy}
                onChange={(e) => setBaseOccupancy(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy} className="min-h-11 w-full">
                {busy ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function GenerateRoomsDialog({
  weddingId,
  roomTypeId,
  onDone,
}: {
  weddingId: string;
  roomTypeId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState("10");
  const [prefix, setPrefix] = useState("");
  const [startAt, setStartAt] = useState("1");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await generateRooms(
        weddingId,
        roomTypeId,
        Number(count) || 1,
        prefix,
        Number(startAt) || 1,
      );
      setOpen(false);
      toast.success("Rooms created");
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
        Generate rooms
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate rooms</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Labels will be{" "}
            <span className="font-mono text-foreground">
              {prefix || ""}
              {startAt || "1"}
            </span>
            … up to the count you set (e.g. prefix &quot;R&quot;, start 1, count 3
            → R1, R2, R3).
          </p>
          <div className="space-y-2">
            <Label htmlFor="gr-count">How many rooms</Label>
            <Input
              id="gr-count"
              type="number"
              min={1}
              required
              className="min-h-12"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gr-prefix">Label prefix (optional)</Label>
            <Input
              id="gr-prefix"
              className="min-h-12"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="R or Room-"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gr-start">Start number</Label>
            <Input
              id="gr-start"
              type="number"
              min={0}
              required
              className="min-h-12"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddRoomDialog({
  weddingId,
  roomTypeId,
  onDone,
}: {
  weddingId: string;
  roomTypeId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createRoom(weddingId, roomTypeId, label.trim());
      setLabel("");
      setOpen(false);
      toast.success("Room added");
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
        Add room
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add single room</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ar-label">Room label / number</Label>
            <Input
              id="ar-label"
              required
              className="min-h-12"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="101"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteRoomButton({
  weddingId,
  roomId,
  disabled,
  onDone,
}: {
  weddingId: string;
  roomId: string;
  disabled?: boolean;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11"
      disabled={busy || disabled}
      onClick={async () => {
        if (!confirm("Delete this room?")) return;
        setBusy(true);
        try {
          await deleteRoom(weddingId, roomId);
          toast.success("Room removed");
          onDone();
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      Delete room
    </Button>
  );
}

export function RoomActionsMenu({
  weddingId,
  roomId,
  disabled,
  onDone,
}: {
  weddingId: string;
  roomId: string;
  disabled?: boolean;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Delete this room?")) return;
    setBusy(true);
    try {
      await deleteRoom(weddingId, roomId);
      toast.success("Room removed");
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "min-h-11 min-w-11",
        )}
        aria-label="Room actions"
        disabled={busy || disabled}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          className="text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
          onClick={remove}
          disabled={disabled}
        >
          Delete room
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RemoveGuestFromRoomButton({
  personId,
  onDone,
}: {
  personId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="min-h-9 text-muted-foreground"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await setPersonRoom(personId, null);
          toast.success("Removed from room");
          onDone();
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      Remove
    </Button>
  );
}

export function AllocateGuestDialog({
  roomId,
  baseOccupancy,
  extraBeds,
  people,
  groups,
  families,
  onDone,
}: {
  roomId: string;
  baseOccupancy: number;
  extraBeds: RoomExtraBeds | undefined;
  people: Person[];
  groups: Group[];
  families: Family[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const cap = effectiveCapacity(baseOccupancy, extraBeds);
  const inThisRoom = useMemo(
    () => people.filter((p) => p.room_id === roomId),
    [people, roomId],
  );
  const currentCount = inThisRoom.length;

  const familiesInGroup = useMemo(() => {
    if (!groupId) return [];
    return families.filter((f) => f.group_id === groupId);
  }, [families, groupId]);

  const membersInFamily = useMemo(() => {
    if (!familyId) return [];
    return sortPeopleFamilyDisplayOrder(
      people.filter((p) => p.family_id === familyId),
    );
  }, [people, familyId]);

  useEffect(() => {
    if (!open) return;
    setGroupId("");
    setFamilyId("");
    setSelected(new Set());
  }, [open, roomId]);

  useEffect(() => {
    setFamilyId("");
    setSelected(new Set());
  }, [groupId]);

  useEffect(() => {
    setSelected(new Set());
  }, [familyId]);

  function togglePerson(id: string) {
    const p = membersInFamily.find((m) => m.id === id);
    if (!p) return;
    if (p.room_id && p.room_id !== roomId) return;
    if (p.room_id === roomId) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const wouldBe = currentCount + selected.size;
  const overCapacity = wouldBe > cap;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) {
      toast.error("Select at least one guest");
      return;
    }
    if (overCapacity) {
      toast.error(
        "Not enough capacity. Add an extra bed on the room or pick fewer guests.",
      );
      return;
    }
    setBusy(true);
    try {
      await allocatePeopleToRoom(Array.from(selected), roomId);
      setOpen(false);
      toast.success("Guests assigned");
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
          buttonVariants({ variant: "secondary", size: "sm" }),
          "min-h-11",
        )}
      >
        Allocate guest
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Allocate to this room</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            In room: {currentCount} / {cap} (base {baseOccupancy}
            {extraBeds && extraBeds !== "none"
              ? ` + extra (${extraBeds})`
              : ""}
            ). Guests already in another room cannot be selected here.
          </p>
          {overCapacity ? (
            <p className="text-sm font-medium text-destructive">
              Selection would exceed capacity ({wouldBe} &gt; {cap}). Add a single
              or double extra bed on this room, or select fewer guests.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="al-group">Group</Label>
            <select
              id="al-group"
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              required
            >
              <option value="">Choose group…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="al-family">Family</Label>
            <select
              id="al-family"
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              required
              disabled={!groupId}
            >
              <option value="">Choose family…</option>
              {familiesInGroup.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.family_name}
                </option>
              ))}
            </select>
          </div>

          {familyId ? (
            <div className="space-y-2">
              <Label>Guests to add</Label>
              <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {membersInFamily.map((p) => {
                  const elsewhere =
                    !!p.room_id && p.room_id !== roomId && p.room_id !== "";
                  const alreadyHere = p.room_id === roomId;
                  const disabled = elsewhere || alreadyHere;
                  return (
                    <li key={p.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`al-${p.id}`}
                        checked={selected.has(p.id)}
                        disabled={disabled}
                        onCheckedChange={() => togglePerson(p.id)}
                      />
                      <label
                        htmlFor={`al-${p.id}`}
                        className={cn(
                          "flex-1 text-sm",
                          disabled && "text-muted-foreground",
                        )}
                      >
                        {p.name}
                        {elsewhere ? " (in another room)" : null}
                        {alreadyHere ? " (already here)" : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="submit"
              disabled={busy || overCapacity || selected.size === 0}
              className="min-h-11 w-full"
            >
              {busy ? "Saving…" : "Assign to room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
