"use client";

import { useEffect, useState } from "react";
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
import { createTask, deleteTask, updateTask } from "@/lib/firebase/mutations";
import type { Task, WeddingAccess, WeddingEvent } from "@/types";

type TaskOption = {
  id: string;
  label: string;
};

type AddTaskDialogProps = {
  weddingId: string;
  userId: string;
  events: TaskOption[];
  hosts: TaskOption[];
  onDone: () => void;
};

type EditTaskDialogProps = {
  task: Task;
  events: TaskOption[];
  hosts: TaskOption[];
  onDone: () => void;
};

type DeleteTaskDialogProps = {
  task: Task;
  onDone: () => void;
};

type TaskFormState = {
  title: string;
  deadlineLocal: string;
  notes: string;
  linkedEventId: string;
  assignedTo: string;
};

const DEFAULT_TASK_FORM: TaskFormState = {
  title: "",
  deadlineLocal: "",
  notes: "",
  linkedEventId: "",
  assignedTo: "",
};

export function buildTaskDialogOptions(input: {
  events: WeddingEvent[];
  hosts: WeddingAccess[];
}): { events: TaskOption[]; hosts: TaskOption[] } {
  const events = input.events.map((event) => ({
    id: event.id,
    label: event.title,
  }));
  const hosts = input.hosts.map((host) => ({
    id: host.user_id,
    label: host.email || host.user_id,
  }));
  return { events, hosts };
}

function timestampToLocal(value: Task["deadline"]): string {
  if (!value) return "";
  const date = value.toDate();
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function localToDate(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function buildStateFromTask(task: Task): TaskFormState {
  return {
    title: task.title,
    deadlineLocal: timestampToLocal(task.deadline),
    notes: task.notes ?? "",
    linkedEventId: task.linked_event_id ?? "",
    assignedTo: task.assigned_to ?? "",
  };
}

function TaskFormFields({
  state,
  setState,
  events,
  hosts,
}: {
  state: TaskFormState;
  setState: React.Dispatch<React.SetStateAction<TaskFormState>>;
  events: TaskOption[];
  hosts: TaskOption[];
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          required
          className="min-h-12"
          value={state.title}
          onChange={(e) => setState((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Confirm catering vendor"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="task-deadline">Deadline (optional)</Label>
        <Input
          id="task-deadline"
          type="datetime-local"
          className="min-h-12"
          value={state.deadlineLocal}
          onChange={(e) =>
            setState((prev) => ({ ...prev, deadlineLocal: e.target.value }))
          }
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="task-linked-event">Linked event (optional)</Label>
          <select
            id="task-linked-event"
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={state.linkedEventId}
            onChange={(e) =>
              setState((prev) => ({ ...prev, linkedEventId: e.target.value }))
            }
          >
            <option value="">None</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-assigned-to">Assigned host (optional)</Label>
          <select
            id="task-assigned-to"
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={state.assignedTo}
            onChange={(e) => setState((prev) => ({ ...prev, assignedTo: e.target.value }))}
          >
            <option value="">Unassigned</option>
            {hosts.map((host) => (
              <option key={host.id} value={host.id}>
                {host.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="task-notes">Notes (optional)</Label>
        <Textarea
          id="task-notes"
          value={state.notes}
          onChange={(e) => setState((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Anything important for this task..."
        />
      </div>
    </>
  );
}

export function AddTaskDialog({
  weddingId,
  userId,
  events,
  hosts,
  onDone,
}: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<TaskFormState>(DEFAULT_TASK_FORM);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createTask(
        weddingId,
        {
          title: state.title.trim(),
          deadline: localToDate(state.deadlineLocal),
          notes: state.notes,
          linked_event_id: state.linkedEventId || null,
          assigned_to: state.assignedTo || null,
        },
        userId,
      );
      setState(DEFAULT_TASK_FORM);
      setOpen(false);
      toast.success("Task added");
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
        Add task
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <TaskFormFields
            state={state}
            setState={setState}
            events={events}
            hosts={hosts}
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

export function EditTaskDialog({ task, events, hosts, onDone }: EditTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<TaskFormState>(buildStateFromTask(task));

  useEffect(() => {
    if (!open) return;
    setState(buildStateFromTask(task));
  }, [open, task]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateTask(task.id, {
        title: state.title.trim(),
        deadline: localToDate(state.deadlineLocal),
        notes: state.notes,
        linked_event_id: state.linkedEventId || null,
        assigned_to: state.assignedTo || null,
      });
      setOpen(false);
      toast.success("Task updated");
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
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <TaskFormFields
            state={state}
            setState={setState}
            events={events}
            hosts={hosts}
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

export function DeleteTaskDialog({ task, onDone }: DeleteTaskDialogProps) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11"
      disabled={busy}
      onClick={async () => {
        if (!confirm(`Delete task "${task.title}"?`)) return;
        setBusy(true);
        try {
          await deleteTask(task.id);
          toast.success("Task deleted");
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
