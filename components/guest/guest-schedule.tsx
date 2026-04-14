"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GuestScheduleItem = {
  id: string;
  title: string;
  type: string;
  side: string;
  start_time: string;
  end_time?: string;
  location?: string;
  description?: string;
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time not set";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function GuestSchedule({ items }: { items: GuestScheduleItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Your personalized schedule will appear here soon.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-md border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <Badge variant="outline">{item.type}</Badge>
                  <Badge variant="secondary">{item.side}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(item.start_time)}
                  {item.end_time ? ` - ${formatDateTime(item.end_time)}` : ""}
                </p>
                {item.location ? (
                  <p className="text-sm text-muted-foreground">Location: {item.location}</p>
                ) : null}
                {item.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
