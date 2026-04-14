"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GuestWelcome({
  guestName,
  weddingName,
  weddingDate,
}: {
  guestName: string;
  weddingName: string;
  weddingDate: string;
}) {
  const prettyDate = weddingDate
    ? new Date(weddingDate).toLocaleDateString(undefined, { dateStyle: "full" })
    : "Date to be announced";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Welcome, {guestName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>You are viewing your personalized wedding space for {weddingName}.</p>
        <p className="font-medium text-foreground">{prettyDate}</p>
      </CardContent>
    </Card>
  );
}
