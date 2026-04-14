import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb } from "./config";
import type {
  Announcement,
  Assignment,
  Family,
  Group,
  Person,
  Room,
  RoomType,
  TimelineItem,
  Wedding,
} from "@/types";

const db = () => getFirebaseDb();

export const col = {
  weddings: "weddings",
  groups: "groups",
  families: "families",
  people: "people",
  timelineItems: "timeline_items",
  assignments: "assignments",
  announcements: "announcements",
  roomTypes: "room_types",
  rooms: "rooms",
} as const;

export function weddingRef(id: string) {
  return doc(db(), col.weddings, id);
}

export async function getWedding(id: string): Promise<Wedding | null> {
  const snap = await getDoc(weddingRef(id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    visibility: data.visibility ?? "private",
  } as Wedding;
}

export async function listWeddingsForUser(uid: string): Promise<Wedding[]> {
  const q = query(
    collection(db(), col.weddings),
    where("created_by", "==", uid),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      visibility: data.visibility ?? "private",
    } as Wedding;
  });
}

export async function listGroups(weddingId: string): Promise<Group[]> {
  const q = query(
    collection(db(), col.groups),
    where("wedding_id", "==", weddingId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
}

export async function listFamilies(weddingId: string): Promise<Family[]> {
  const q = query(
    collection(db(), col.families),
    where("wedding_id", "==", weddingId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Family));
}

export async function listPeople(weddingId: string): Promise<Person[]> {
  const q = query(
    collection(db(), col.people),
    where("wedding_id", "==", weddingId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Person));
}

export async function listRoomTypes(weddingId: string): Promise<RoomType[]> {
  const q = query(
    collection(db(), col.roomTypes),
    where("wedding_id", "==", weddingId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomType));
}

export async function listRooms(weddingId: string): Promise<Room[]> {
  const q = query(
    collection(db(), col.rooms),
    where("wedding_id", "==", weddingId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Room));
}

export async function listRoomsForType(
  weddingId: string,
  roomTypeId: string,
): Promise<Room[]> {
  const rooms = await listRooms(weddingId);
  return rooms.filter((r) => r.room_type_id === roomTypeId);
}

export async function getPerson(personId: string): Promise<Person | null> {
  const snap = await getDoc(doc(db(), col.people, personId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Person;
}

export async function getPersonByInviteToken(
  token: string,
): Promise<Person | null> {
  const q = query(
    collection(db(), col.people),
    where("invite_token", "==", token),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0]!;
  return { id: d.id, ...d.data() } as Person;
}

export async function listTimelineItems(
  weddingId: string,
): Promise<TimelineItem[]> {
  const q = query(
    collection(db(), col.timelineItems),
    where("wedding_id", "==", weddingId),
  );
  const snap = await getDocs(q);
  const items = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as TimelineItem),
  );
  return items.sort((a, b) => {
    const ta = resolveSortTime(a);
    const tb = resolveSortTime(b);
    return ta.localeCompare(tb);
  });
}

function resolveSortTime(item: TimelineItem): string {
  if (item.start_time) return item.start_time;
  return item.relative_to ? `rel:${item.relative_to.offset_days}` : "";
}

export async function listAssignmentsForWedding(
  weddingId: string,
): Promise<Assignment[]> {
  const q = query(
    collection(db(), col.assignments),
    where("wedding_id", "==", weddingId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Assignment));
}

export async function listAssignmentsForPerson(
  personId: string,
): Promise<Assignment[]> {
  const q = query(
    collection(db(), col.assignments),
    where("person_id", "==", personId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Assignment));
}

export async function listAnnouncements(
  weddingId: string,
): Promise<Announcement[]> {
  // Single-field query only — avoids long client timeouts when the composite
  // index (wedding_id + created_at) is missing. Sort in memory instead.
  const q = query(
    collection(db(), col.announcements),
    where("wedding_id", "==", weddingId),
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement));
  return list.sort((a, b) => {
    const ca = a.created_at?.toMillis?.() ?? 0;
    const cb = b.created_at?.toMillis?.() ?? 0;
    return cb - ca;
  });
}

/** Random invite token for guest URLs */
export function generateInviteToken(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
