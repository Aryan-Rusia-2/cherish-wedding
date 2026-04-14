"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatsRow } from "@/components/dashboard/stats-row";
import {
  AddTaskDialog,
  buildTaskDialogOptions,
  DeleteTaskDialog,
  EditTaskDialog,
} from "@/components/tasks/task-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getWedding,
  listEvents,
  listTasks,
  listWeddingHosts,
} from "@/lib/firebase/firestore";
import { setTaskStatus } from "@/lib/firebase/mutations";
import type { Task, Wedding, WeddingAccess, WeddingEvent } from "@/types";
import { toast } from "sonner";

type TaskFilter = "all" | "upcoming" | "completed";

function startOfToday(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

function endOfToday(): number {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.getTime();
}

function getDeadlineTime(task: Task): number | null {
  if (!task.deadline) return null;
  return task.deadline.toDate().getTime();
}

function getDeadlineLabel(task: Task): {
  text: string;
  variant: "destructive" | "secondary" | "outline";
} {
  const deadline = getDeadlineTime(task);
  if (!deadline) {
    return { text: "No deadline", variant: "outline" };
  }
  const now = Date.now();
  const dateText = new Date(deadline).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (deadline < now) {
    return { text: `Overdue · ${dateText}`, variant: "destructive" };
  }
  if (deadline <= endOfToday()) {
    return { text: `Due today · ${dateText}`, variant: "secondary" };
  }
  return { text: `Due ${dateText}`, variant: "outline" };
}

function sortTasksByUrgency(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDeadline = getDeadlineTime(a);
    const bDeadline = getDeadlineTime(b);
    if (aDeadline === null && bDeadline === null) return 0;
    if (aDeadline === null) return 1;
    if (bDeadline === null) return -1;
    return aDeadline - bDeadline;
  });
}

export default function WeddingTasksPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [hosts, setHosts] = useState<WeddingAccess[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, taskList, eventList, hostList] = await Promise.all([
        getWedding(weddingId),
        listTasks(weddingId),
        listEvents(weddingId),
        listWeddingHosts(weddingId),
      ]);
      setWedding(w);
      setTasks(taskList);
      setEvents(eventList);
      setHosts(hostList);
    } finally {
      setLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const pendingTasks = tasks.filter((task) => task.status === "pending");
    const dueToday = pendingTasks.filter((task) => {
      const deadline = getDeadlineTime(task);
      return deadline !== null && deadline >= todayStart && deadline <= todayEnd;
    }).length;
    const upcoming = pendingTasks.filter((task) => {
      const deadline = getDeadlineTime(task);
      return deadline !== null && deadline > todayEnd;
    }).length;
    const completed = tasks.filter((task) => task.status === "completed").length;
    return {
      total: tasks.length,
      dueToday,
      upcoming,
      completed,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const sorted = sortTasksByUrgency(tasks);
    const today = startOfToday();
    if (filter === "all") return sorted;
    if (filter === "completed") {
      return sorted.filter((task) => task.status === "completed");
    }
    return sorted.filter((task) => {
      if (task.status !== "pending") return false;
      const deadline = getDeadlineTime(task);
      if (deadline === null) return false;
      return deadline >= today;
    });
  }, [filter, tasks]);

  const eventById = useMemo(() => {
    return new Map(events.map((event) => [event.id, event]));
  }, [events]);

  const hostLabelByUserId = useMemo(() => {
    return new Map(hosts.map((host) => [host.user_id, host.email || host.user_id]));
  }, [hosts]);

  const dialogOptions = useMemo(
    () => buildTaskDialogOptions({ events, hosts }),
    [events, hosts],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!wedding) {
    return <p className="text-muted-foreground">Wedding not found.</p>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[
          { label: "Wedding overview", href: `/wedding/${weddingId}` },
          { label: "Tasks" },
        ]}
        title="Tasks"
        description="Track what needs to be done, when it is due, and who owns it."
        action={
          user ? (
            <AddTaskDialog
              weddingId={weddingId}
              userId={user.uid}
              events={dialogOptions.events}
              hosts={dialogOptions.hosts}
              onDone={load}
            />
          ) : null
        }
      />

      <StatsRow
        stats={[
          { label: "Total tasks", value: stats.total },
          { label: "Due today", value: stats.dueToday },
          { label: "Upcoming", value: stats.upcoming },
          { label: "Completed", value: stats.completed },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={filter === "all" ? "default" : "outline"}
          className="min-h-11"
          onClick={() => setFilter("all")}
        >
          All tasks
        </Button>
        <Button
          type="button"
          variant={filter === "upcoming" ? "default" : "outline"}
          className="min-h-11"
          onClick={() => setFilter("upcoming")}
        >
          Upcoming
        </Button>
        <Button
          type="button"
          variant={filter === "completed" ? "default" : "outline"}
          className="min-h-11"
          onClick={() => setFilter("completed")}
        >
          Completed
        </Button>
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyStateCard
          title="No tasks in this view"
          description="Create a task or switch filters to see your full list."
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const deadline = getDeadlineLabel(task);
            const linkedEvent = task.linked_event_id
              ? eventById.get(task.linked_event_id)
              : null;
            const assignee = task.assigned_to
              ? hostLabelByUserId.get(task.assigned_to)
              : null;

            return (
              <Card key={task.id}>
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={deadline.variant}>{deadline.text}</Badge>
                        <Badge
                          variant={task.status === "completed" ? "secondary" : "outline"}
                        >
                          {task.status}
                        </Badge>
                        {linkedEvent ? (
                          <Badge variant="outline">Event: {linkedEvent.title}</Badge>
                        ) : null}
                        {assignee ? (
                          <Badge variant="outline">Owner: {assignee}</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={task.status === "completed" ? "outline" : "secondary"}
                        size="sm"
                        className="min-h-11"
                        disabled={updatingTaskId === task.id}
                        onClick={async () => {
                          setUpdatingTaskId(task.id);
                          try {
                            await setTaskStatus(
                              task.id,
                              task.status === "completed" ? "pending" : "completed",
                            );
                            toast.success(
                              task.status === "completed"
                                ? "Task marked pending"
                                : "Task marked completed",
                            );
                            await load();
                          } catch (err: unknown) {
                            toast.error(
                              err instanceof Error ? err.message : "Failed to update task",
                            );
                          } finally {
                            setUpdatingTaskId(null);
                          }
                        }}
                      >
                        {task.status === "completed" ? "Mark pending" : "Mark complete"}
                      </Button>
                      <EditTaskDialog
                        task={task}
                        events={dialogOptions.events}
                        hosts={dialogOptions.hosts}
                        onDone={load}
                      />
                      <DeleteTaskDialog task={task} onDone={load} />
                    </div>
                  </div>
                </CardHeader>
                {task.notes ? (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">{task.notes}</p>
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
