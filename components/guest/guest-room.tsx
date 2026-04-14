"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GuestRoomDetails = {
  id: string;
  label: string;
  extra_beds: string;
} | null;

type GuestContact = {
  family_name?: string;
  contact_phone?: string;
} | null;

export function GuestRoom({
  room,
  contact,
}: {
  room: GuestRoomDetails;
  contact: GuestContact;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Stay Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {room ? (
          <>
            <p>
              Room: <span className="font-medium">{room.label}</span>
            </p>
            <p className="text-muted-foreground">
              Extra beds: <span className="text-foreground">{room.extra_beds}</span>
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">
            Room details are not assigned yet. Please check back later.
          </p>
        )}
        {contact?.contact_phone ? (
          <p className="text-muted-foreground">
            Need help? Contact {contact.family_name || "your family coordinator"} at{" "}
            <span className="text-foreground">{contact.contact_phone}</span>.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
