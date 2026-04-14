import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

function getRequiredParam(
  searchParams: URLSearchParams,
  key: string,
): string | null {
  const value = searchParams.get(key);
  if (!value || !value.trim()) return null;
  return value.trim();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const weddingId = getRequiredParam(url.searchParams, "weddingId");
  const token = getRequiredParam(url.searchParams, "token");

  if (!weddingId || !token) {
    return NextResponse.json(
      { error: "weddingId and token are required." },
      { status: 400 },
    );
  }

  try {
    const db = getFirebaseAdminDb();

    const personSnap = await db
      .collection("people")
      .where("wedding_id", "==", weddingId)
      .where("invite_token", "==", token)
      .limit(1)
      .get();

    if (personSnap.empty) {
      return NextResponse.json({ error: "Guest link is invalid." }, { status: 404 });
    }

    const personDoc = personSnap.docs[0]!;
    const personData = personDoc.data();
    const familyId = typeof personData.family_id === "string" ? personData.family_id : "";
    const groupId = typeof personData.group_id === "string" ? personData.group_id : "";
    const roomId = typeof personData.room_id === "string" ? personData.room_id : "";

    const [weddingDoc, participantsSnap, eventsSnap, familyDoc, roomDoc] =
      await Promise.all([
        db.collection("weddings").doc(weddingId).get(),
        db.collection("event_participants").where("wedding_id", "==", weddingId).get(),
        db.collection("events").where("wedding_id", "==", weddingId).get(),
        familyId ? db.collection("families").doc(familyId).get() : null,
        roomId ? db.collection("rooms").doc(roomId).get() : null,
      ]);

    const matchedEventIds = new Set<string>();
    for (const doc of participantsSnap.docs) {
      const data = doc.data();
      const entityType = data.entity_type;
      const entityId = data.entity_id;
      if (
        (entityType === "person" && entityId === personDoc.id) ||
        (entityType === "family" && entityId === familyId) ||
        (entityType === "group" && entityId === groupId)
      ) {
        const eventId = data.event_id;
        if (typeof eventId === "string") {
          matchedEventIds.add(eventId);
        }
      }
    }

    const schedule = eventsSnap.docs
      .filter((doc) => matchedEventIds.has(doc.id))
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: typeof data.title === "string" ? data.title : "Event",
          type: typeof data.type === "string" ? data.type : "event",
          side: typeof data.side === "string" ? data.side : "both",
          start_time: typeof data.start_time === "string" ? data.start_time : "",
          end_time: typeof data.end_time === "string" ? data.end_time : undefined,
          location: typeof data.location === "string" ? data.location : undefined,
          description:
            typeof data.description === "string" ? data.description : undefined,
        };
      })
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    const weddingData = weddingDoc.exists ? weddingDoc.data() : null;
    const familyData = familyDoc?.exists ? familyDoc.data() : null;
    const roomData = roomDoc?.exists ? roomDoc.data() : null;

    return NextResponse.json({
      wedding: {
        id: weddingId,
        name: weddingData?.name ?? "Wedding",
        wedding_date:
          typeof weddingData?.wedding_date === "string"
            ? weddingData.wedding_date
            : "",
      },
      guest: {
        id: personDoc.id,
        name: typeof personData.name === "string" ? personData.name : "Guest",
        rsvp_status:
          typeof personData.rsvp_status === "string" ? personData.rsvp_status : "pending",
        arrival_date:
          typeof personData.arrival_date === "string"
            ? personData.arrival_date
            : undefined,
      },
      room: roomData
        ? {
            id: roomDoc!.id,
            label: typeof roomData.label === "string" ? roomData.label : "Room",
            extra_beds:
              typeof roomData.extra_beds === "string" ? roomData.extra_beds : "none",
          }
        : null,
      contact: familyData
        ? {
            family_name:
              typeof familyData.family_name === "string"
                ? familyData.family_name
                : undefined,
            contact_phone:
              typeof familyData.contact_phone === "string"
                ? familyData.contact_phone
                : undefined,
          }
        : null,
      schedule,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resolve guest link.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
