"use client";

import { useEffect, useMemo, useState } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  addEventParticipant,
  createEvent,
  deleteEvent,
  updateEvent,
} from "@/lib/firebase/mutations";
import { getFirebaseStorage } from "@/lib/firebase/config";
import type { EntityType, WeddingEvent } from "@/types";

type AddEventDialogProps = {
  weddingId: string;
  onDone: () => void;
};

type EditEventDialogProps = {
  event: WeddingEvent;
  onDone: () => void;
};

type DeleteEventDialogProps = {
  weddingId: string;
  event: WeddingEvent;
  onDone: () => void;
};

type EntityOption = {
  id: string;
  label: string;
};

type AddParticipantDialogProps = {
  weddingId: string;
  eventId: string;
  groups: EntityOption[];
  families: EntityOption[];
  people: EntityOption[];
  onDone: () => void;
};

type EventFormState = {
  title: string;
  type: WeddingEvent["type"];
  side: WeddingEvent["side"];
  startLocal: string;
  endLocal: string;
  location: string;
  description: string;
  image_url: string;
};

const DEFAULT_EVENT_FORM: EventFormState = {
  title: "",
  type: "event",
  side: "both",
  startLocal: "",
  endLocal: "",
  location: "",
  description: "",
  image_url: "",
};

function isoToLocal(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function localToIso(local: string): string {
  return new Date(local).toISOString();
}

async function uploadEventImage(file: File, weddingId: string): Promise<string> {
  const storage = getFirebaseStorage();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectRef = ref(
    storage,
    `weddings/${weddingId}/events/${Date.now()}-${safe}`,
  );
  await uploadBytes(objectRef, file, {
    contentType: file.type || "application/octet-stream",
  });
  return getDownloadURL(objectRef);
}

function EventFormFields({
  state,
  setState,
  imageFile,
  setImageFile,
}: {
  state: EventFormState;
  setState: React.Dispatch<React.SetStateAction<EventFormState>>;
  imageFile: File | null;
  setImageFile: React.Dispatch<React.SetStateAction<File | null>>;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="event-title">Title</Label>
        <Input
          id="event-title"
          required
          className="min-h-12"
          value={state.title}
          onChange={(e) =>
            setState((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Sangeet welcome"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="event-type">Type</Label>
          <select
            id="event-type"
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={state.type}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                type: e.target.value as WeddingEvent["type"],
              }))
            }
          >
            <option value="event">Event</option>
            <option value="ritual">Ritual</option>
            <option value="task">Task</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-side">Side</Label>
          <select
            id="event-side"
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={state.side}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                side: e.target.value as WeddingEvent["side"],
              }))
            }
          >
            <option value="both">Both</option>
            <option value="bride">Bride</option>
            <option value="groom">Groom</option>
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="event-start">Start time</Label>
          <Input
            id="event-start"
            type="datetime-local"
            required
            className="min-h-12"
            value={state.startLocal}
            onChange={(e) =>
              setState((prev) => ({ ...prev, startLocal: e.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-end">End time (optional)</Label>
          <Input
            id="event-end"
            type="datetime-local"
            className="min-h-12"
            value={state.endLocal}
            onChange={(e) =>
              setState((prev) => ({ ...prev, endLocal: e.target.value }))
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="event-location">Location (optional)</Label>
        <Input
          id="event-location"
          className="min-h-12"
          value={state.location}
          onChange={(e) =>
            setState((prev) => ({ ...prev, location: e.target.value }))
          }
          placeholder="Main lawn"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="event-image">Event cover image (optional)</Label>
        <Input
          id="event-image"
          type="file"
          accept="image/*"
          className="min-h-12"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
        {imageFile ? (
          <p className="text-xs text-muted-foreground">Selected: {imageFile.name}</p>
        ) : null}
        {state.image_url ? (
          <div
            className="h-40 w-full rounded-md border bg-cover bg-center"
            style={{ backgroundImage: `url("${state.image_url}")` }}
            role="img"
            aria-label="Event cover preview"
          />
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="event-description">Notes / instructions (optional)</Label>
        <Textarea
          id="event-description"
          value={state.description}
          onChange={(e) =>
            setState((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Arrival plan, sequence, special instructions..."
        />
      </div>
    </>
  );
}

export function AddEventDialog({ weddingId, onDone }: AddEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<EventFormState>(DEFAULT_EVENT_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadEventImage(imageFile, weddingId);
      }
      await createEvent({
        wedding_id: weddingId,
        title: state.title.trim(),
        type: state.type,
        side: state.side,
        start_time: localToIso(state.startLocal),
        end_time: state.endLocal ? localToIso(state.endLocal) : undefined,
        location: state.location.trim() || undefined,
        description: state.description.trim() || undefined,
        image_url: imageUrl,
      });
      setState(DEFAULT_EVENT_FORM);
      setImageFile(null);
      setOpen(false);
      toast.success("Event added");
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
        Add event
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <EventFormFields
            state={state}
            setState={setState}
            imageFile={imageFile}
            setImageFile={setImageFile}
          />
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditEventDialog({ event, onDone }: EditEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [state, setState] = useState<EventFormState>({
    title: event.title,
    type: event.type,
    side: event.side,
    startLocal: isoToLocal(event.start_time),
    endLocal: isoToLocal(event.end_time),
    location: event.location ?? "",
    description: event.description ?? "",
    image_url: event.image_url ?? "",
  });

  useEffect(() => {
    if (!open) return;
    setState({
      title: event.title,
      type: event.type,
      side: event.side,
      startLocal: isoToLocal(event.start_time),
      endLocal: isoToLocal(event.end_time),
      location: event.location ?? "",
      description: event.description ?? "",
      image_url: event.image_url ?? "",
    });
    setImageFile(null);
  }, [open, event]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let imageUrl = state.image_url;
      if (imageFile) {
        imageUrl = await uploadEventImage(imageFile, event.wedding_id);
      }
      await updateEvent(event.id, {
        title: state.title.trim(),
        type: state.type,
        side: state.side,
        start_time: localToIso(state.startLocal),
        end_time: state.endLocal ? localToIso(state.endLocal) : "",
        location: state.location,
        description: state.description,
        image_url: imageUrl,
      });
      setOpen(false);
      toast.success("Event updated");
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit event</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <EventFormFields
            state={state}
            setState={setState}
            imageFile={imageFile}
            setImageFile={setImageFile}
          />
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteEventDialog({
  weddingId,
  event,
  onDone,
}: DeleteEventDialogProps) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11"
      disabled={busy}
      onClick={async () => {
        if (!confirm(`Delete "${event.title}" and its exchanges?`)) return;
        setBusy(true);
        try {
          await deleteEvent(weddingId, event.id);
          toast.success("Event removed");
          onDone();
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      Delete
    </Button>
  );
}

export function AddParticipantDialog({
  weddingId,
  eventId,
  groups,
  families,
  people,
  onDone,
}: AddParticipantDialogProps) {
  const [open, setOpen] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>("group");
  const [entityId, setEntityId] = useState("");
  const [busy, setBusy] = useState(false);

  const options = useMemo(() => {
    if (entityType === "group") return groups;
    if (entityType === "family") return families;
    return people;
  }, [entityType, groups, families, people]);

  useEffect(() => {
    setEntityId("");
  }, [entityType]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!entityId) {
      toast.error("Select an entity");
      return;
    }
    setBusy(true);
    try {
      await addEventParticipant({
        wedding_id: weddingId,
        event_id: eventId,
        entity_type: entityType,
        entity_id: entityId,
      });
      setEntityId("");
      setOpen(false);
      toast.success("Participant added");
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
        Add participant
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add participant</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ep-etype">Entity type</Label>
            <select
              id="ep-etype"
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as EntityType)}
            >
              <option value="group">Group</option>
              <option value="family">Family</option>
              <option value="person">Person</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ep-entity">Select {entityType}</Label>
            <select
              id="ep-entity"
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              required
            >
              <option value="">Choose...</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
