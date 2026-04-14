"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatsRow } from "@/components/dashboard/stats-row";
import {
  AddTaskDialog,
  buildTaskDialogOptions,
} from "@/components/tasks/task-dialogs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getWedding, listEvents, listTasks, listWeddingHosts } from "@/lib/firebase/firestore";
import { setTaskStatus } from "@/lib/firebase/mutations";
import type { Task, Wedding, WeddingAccess, WeddingEvent } from "@/types";
import { toast } from "sonner";

function deadlineTime(task: Task): number | null {
  if (!task.deadline) return null;
  return task.deadline.toDate().getTime();
}

function formatDateTime(iso: string): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "No deadline";
  return value.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function endOfToday(): number {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today.getTime();
}

export default function WeddingDashboardPage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [hosts, setHosts] = useState<WeddingAccess[]>([]);
  const [taskUpdateBusyId, setTaskUpdateBusyId] = useState<string | null>(null);

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

  const pending = useMemo(
    () => tasks.filter((task) => task.status === "pending"),
    [tasks],
  );
  const overdue = useMemo(
    () =>
      pending.filter((task) => {
        const deadline = deadlineTime(task);
        return deadline !== null && deadline < Date.now();
      }),
    [pending],
  );
  const dueToday = useMemo(
    () =>
      pending.filter((task) => {
        const deadline = deadlineTime(task);
        return deadline !== null && deadline >= Date.now() && deadline <= endOfToday();
      }),
    [pending],
  );
  const upcoming = useMemo(
    () =>
      pending
        .filter((task) => {
          const deadline = deadlineTime(task);
          return deadline !== null && deadline > endOfToday();
        })
        .sort((a, b) => (deadlineTime(a) ?? Number.MAX_SAFE_INTEGER) - (deadlineTime(b) ?? Number.MAX_SAFE_INTEGER)),
    [pending],
  );
  const completed = useMemo(
    () => tasks.filter((task) => task.status === "completed").length,
    [tasks],
  );
  const taskDialogOptions = useMemo(
    () => buildTaskDialogOptions({ events, hosts }),
    [events, hosts],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
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
          { label: "Dashboard" },
        ]}
        title="Dashboard"
        description="Task-focused command center for what needs attention right now."
        action={
          user ? (
            <AddTaskDialog
              weddingId={weddingId}
              userId={user.uid}
              events={taskDialogOptions.events}
              hosts={taskDialogOptions.hosts}
              onDone={load}
            />
          ) : null
        }
      />

      <StatsRow
        stats={[
          { label: "Pending", value: pending.length },
          { label: "Due today", value: dueToday.length },
          { label: "Overdue", value: overdue.length },
          { label: "Completed", value: completed },
        ]}
      />

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Tasks needing attention</CardTitle>
            <Button type="button" variant="outline" asChild>
              <Link href={`/wedding/${weddingId}/tasks`}>View all tasks</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Due today</p>
            {dueToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks due today.</p>
            ) : (
              dueToday.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.deadline ? formatDateTime(task.deadline.toDate().toISOString()) : "No deadline"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11"
                    disabled={taskUpdateBusyId === task.id}
                    onClick={async () => {
                      setTaskUpdateBusyId(task.id);
                      try {
                        await setTaskStatus(task.id, "completed");
                        toast.success("Task marked completed");
                        await load();
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : "Could not update task.");
                      } finally {
                        setTaskUpdateBusyId(null);
                      }
                    }}
                  >
                    Mark complete
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Upcoming</p>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming tasks.</p>
            ) : (
              upcoming.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.deadline ? formatDateTime(task.deadline.toDate().toISOString()) : "No deadline"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    disabled={taskUpdateBusyId === task.id}
                    onClick={async () => {
                      setTaskUpdateBusyId(task.id);
                      try {
                        await setTaskStatus(task.id, "completed");
                        toast.success("Task marked completed");
                        await load();
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : "Could not update task.");
                      } finally {
                        setTaskUpdateBusyId(null);
                      }
                    }}
                  >
                    Done
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
