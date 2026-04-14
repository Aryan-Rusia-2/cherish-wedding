import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "./config";
import type {
  Assignment,
  EventParticipant,
  Exchange,
  Family,
  Group,
  HostInvite,
  Person,
  Room,
  RoomType,
  Task,
  TimelineItem,
  Wedding,
  WeddingAccess,
  WeddingEvent,
} from "@/types";

const db = () => getFirebaseDb();

export const col = {
  weddings: "weddings",
  groups: "groups",
  families: "families",
  people: "people",
  timelineItems: "timeline_items",
  assignments: "assignments",
  roomTypes: "room_types",
  rooms: "rooms",
  events: "events",
  eventParticipants: "event_participants",
  exchanges: "exchanges",
  tasks: "tasks",
  weddingAccess: "wedding_access",
  hostInvites: "host_invites",
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
  } as Wedding;
}

export async function listWeddingsForUser(uid: string): Promise<Wedding[]> {
  const ownerQuery = query(
    collection(db(), col.weddings),
    where("created_by", "==", uid),
  );
  const accessQuery = query(
    collection(db(), col.weddingAccess),
    where("user_id", "==", uid),
  );

  const [ownerSnap, accessSnap] = await Promise.all([
    getDocs(ownerQuery),
    getDocs(accessQuery),
  ]);

  const byId = new Map<string, Wedding>();
  for (const d of ownerSnap.docs) {
    const data = d.data();
    byId.set(d.id, {
      id: d.id,
      ...data,
    } as Wedding);
  }

  const accessibleWeddingIds = accessSnap.docs
    .map((d) => d.data().wedding_id)
    .filter((value): value is string => typeof value === "string");

  const missingIds = accessibleWeddingIds.filter((id) => !byId.has(id));
  if (missingIds.length > 0) {
    const snaps = await Promise.all(missingIds.map((id) => getDoc(weddingRef(id))));
    for (const snap of snaps) {
      if (!snap.exists()) continue;
      byId.set(snap.id, {
        id: snap.id,
        ...snap.data(),
      } as Wedding);
    }
  }

  return Array.from(byId.values());
}

export async function listWeddingHosts(
  weddingId: string,
): Promise<WeddingAccess[]> {
  const q = query(
    collection(db(), col.weddingAccess),
    where("wedding_id", "==", weddingId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WeddingAccess));
}

export async function getHostInvite(token: string): Promise<HostInvite | null> {
  const snap = await getDoc(doc(db(), col.hostInvites, token));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as HostInvite;
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

export async function getEvent(eventId: string): Promise<WeddingEvent | null> {
  const snap = await getDoc(doc(db(), col.events, eventId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WeddingEvent;
}

export async function listEvents(weddingId: string): Promise<WeddingEvent[]> {
  const q = query(
    collection(db(), col.events),
    where("wedding_id", "==", weddingId),
  );
  const snap = await getDocs(q);
  const items = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as WeddingEvent),
  );
  return items.sort((a, b) => a.start_time.localeCompare(b.start_time));
}

export async function listEventParticipants(
  weddingId: string,
  eventId: string,
): Promise<EventParticipant[]> {
  const q = query(
    collection(db(), col.eventParticipants),
    where("wedding_id", "==", weddingId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as EventParticipant))
    .filter((item) => item.event_id === eventId);
}

export async function listExchanges(weddingId: string): Promise<Exchange[]> {
  const q = query(
    collection(db(), col.exchanges),
    where("wedding_id", "==", weddingId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exchange));
}

export async function listExchangesForEvent(
  weddingId: string,
  eventId: string,
): Promise<Exchange[]> {
  const items = await listExchanges(weddingId);
  return items.filter((item) => item.event_id === eventId);
}

export async function getTask(taskId: string): Promise<Task | null> {
  const snap = await getDoc(doc(db(), col.tasks, taskId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Task;
}

export async function listTasks(weddingId: string): Promise<Task[]> {
  const q = query(
    collection(db(), col.tasks),
    where("wedding_id", "==", weddingId),
  );
  const snap = await getDocs(q);
  const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
  return tasks.sort((a, b) => {
    const aTime = taskDeadlineSortValue(a);
    const bTime = taskDeadlineSortValue(b);
    return aTime - bTime;
  });
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

function taskDeadlineSortValue(task: Task): number {
  if (!task.deadline) return Number.POSITIVE_INFINITY;
  const millis = task.deadline.toMillis();
  if (!Number.isFinite(millis)) return Number.POSITIVE_INFINITY;
  return millis;
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

/** Random invite token for guest URLs */
export function generateInviteToken(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
