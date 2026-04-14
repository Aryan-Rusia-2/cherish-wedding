"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "./config";
import {
  col,
  generateInviteToken,
  listEventParticipants,
  listExchangesForEvent,
  listPeople,
  listRooms,
} from "./firestore";
import type {
  Assignment,
  EventParticipant,
  Exchange,
  ExchangeStatus,
  HostRole,
  Person,
  RoomExtraBeds,
  TaskStatus,
  TimelineItem,
  WeddingEvent,
  WeddingAccess,
} from "@/types";

const db = () => getFirebaseDb();

export async function createWedding(input: {
  name: string;
  wedding_date: string;
  created_by: string;
  created_by_email?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db(), col.weddings), {
    name: input.name,
    wedding_date: input.wedding_date,
    created_by: input.created_by,
    created_at: serverTimestamp(),
  });
  if (input.created_by_email?.trim()) {
    await ensureOwnerWeddingAccess(
      ref.id,
      input.created_by,
      input.created_by_email.trim(),
    );
  }
  return ref.id;
}

async function getWeddingAccessRecord(
  weddingId: string,
  userId: string,
): Promise<WeddingAccess | null> {
  const accessId = `${weddingId}_${userId}`;
  const snap = await getDoc(doc(db(), col.weddingAccess, accessId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WeddingAccess;
}

export async function createWeddingAccess(input: {
  wedding_id: string;
  user_id: string;
  email: string;
  role: HostRole;
  invited_by: string;
  invite_token?: string;
}): Promise<string> {
  const accessId = `${input.wedding_id}_${input.user_id}`;
  const existing = await getWeddingAccessRecord(input.wedding_id, input.user_id);
  if (existing) return existing.id;
  await setDoc(doc(db(), col.weddingAccess, accessId), {
    wedding_id: input.wedding_id,
    user_id: input.user_id,
    email: input.email,
    role: input.role,
    invited_by: input.invited_by,
    ...(input.invite_token ? { invite_token: input.invite_token } : {}),
    created_at: serverTimestamp(),
  });
  return accessId;
}

export async function ensureOwnerWeddingAccess(
  weddingId: string,
  userId: string,
  email: string,
): Promise<string> {
  return createWeddingAccess({
    wedding_id: weddingId,
    user_id: userId,
    email,
    role: "owner",
    invited_by: userId,
  });
}

export async function createHostInvite(input: {
  wedding_id: string;
  invited_by: string;
  invited_email?: string;
}): Promise<{ id: string; invite_token: string }> {
  const invite_token = generateInviteToken();
  await setDoc(doc(db(), col.hostInvites, invite_token), {
    wedding_id: input.wedding_id,
    invite_token,
    invited_by: input.invited_by,
    invited_email: input.invited_email?.trim() || null,
    used: false,
    created_at: serverTimestamp(),
  });
  return { id: invite_token, invite_token };
}

export async function acceptHostInvite(input: {
  invite_token: string;
  user_id: string;
  email: string;
}): Promise<{ wedding_id: string }> {
  const inviteDoc = await getDoc(doc(db(), col.hostInvites, input.invite_token));
  if (!inviteDoc.exists()) {
    throw new Error("Invite not found or expired.");
  }

  const inviteData = inviteDoc.data();
  const wedding_id = inviteData.wedding_id as string;
  const invited_email = (inviteData.invited_email as string | null | undefined) ?? "";
  const used = inviteData.used === true;
  const used_by = (inviteData.used_by as string | undefined) ?? "";

  if (
    invited_email &&
    input.email &&
    invited_email.toLowerCase() !== input.email.toLowerCase()
  ) {
    throw new Error("This invite is tied to a different email address.");
  }
  if (used && used_by && used_by !== input.user_id) {
    throw new Error("This invite has already been used.");
  }

  await createWeddingAccess({
    wedding_id,
    user_id: input.user_id,
    email: input.email,
    role: "collaborator",
    invited_by: (inviteData.invited_by as string) || input.user_id,
    invite_token: input.invite_token,
  });

  if (!used) {
    await updateDoc(inviteDoc.ref, {
      used: true,
      used_by: input.user_id,
      used_at: serverTimestamp(),
    });
  }

  return { wedding_id };
}

export async function createGroup(weddingId: string, name: string) {
  const ref = await addDoc(collection(db(), col.groups), {
    wedding_id: weddingId,
    name,
  });
  return ref.id;
}

export async function updateGroup(groupId: string, name: string) {
  await updateDoc(doc(db(), col.groups, groupId), { name });
}

export async function deleteGroup(groupId: string) {
  await deleteDoc(doc(db(), col.groups, groupId));
}

export async function createFamily(
  weddingId: string,
  groupId: string,
  family_name: string,
  contact_phone?: string,
) {
  const ref = await addDoc(collection(db(), col.families), {
    wedding_id: weddingId,
    group_id: groupId,
    family_name,
    ...(contact_phone?.trim()
      ? { contact_phone: contact_phone.trim() }
      : {}),
  });
  return ref.id;
}

export async function updateFamily(
  familyId: string,
  patch: { family_name?: string; contact_phone?: string | null },
) {
  const payload: Record<string, unknown> = {};
  if (patch.family_name !== undefined) {
    payload.family_name = patch.family_name;
  }
  if (patch.contact_phone === null || patch.contact_phone === "") {
    payload.contact_phone = deleteField();
  } else if (patch.contact_phone !== undefined) {
    payload.contact_phone = patch.contact_phone.trim();
  }
  if (Object.keys(payload).length === 0) return;
  await updateDoc(doc(db(), col.families, familyId), payload);
}

export async function deleteFamily(familyId: string) {
  await deleteDoc(doc(db(), col.families, familyId));
}

export async function createPerson(
  input: Omit<Person, "id" | "invite_token" | "phone" | "created_at" | "sort_key">,
) {
  const existing = await listPeople(input.wedding_id);
  let maxSort = -1;
  for (const p of existing) {
    if (
      p.family_id === input.family_id &&
      typeof p.sort_key === "number" &&
      Number.isFinite(p.sort_key)
    ) {
      maxSort = Math.max(maxSort, p.sort_key);
    }
  }
  const sort_key = maxSort + 1;

  const invite_token = generateInviteToken();
  const ref = await addDoc(collection(db(), col.people), {
    wedding_id: input.wedding_id,
    name: input.name,
    group_id: input.group_id,
    family_id: input.family_id,
    role: input.role,
    rsvp_status: input.rsvp_status,
    is_kid: input.is_kid === true,
    ...(input.arrival_date ? { arrival_date: input.arrival_date } : {}),
    invite_token,
    created_at: serverTimestamp(),
    sort_key,
  });
  return { id: ref.id, invite_token } as const;
}

export async function updatePerson(
  personId: string,
  patch: Partial<
    Pick<
      Person,
      | "name"
      | "rsvp_status"
      | "is_kid"
      | "arrival_date"
      | "role"
      | "group_id"
      | "family_id"
    >
  >,
) {
  await updateDoc(doc(db(), col.people, personId), patch);
}

export async function deletePerson(personId: string) {
  await deleteDoc(doc(db(), col.people, personId));
}

export async function createTimelineItem(
  input: Omit<TimelineItem, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db(), col.timelineItems), input);
  return ref.id;
}

export async function updateTimelineItem(
  itemId: string,
  patch: Partial<Omit<TimelineItem, "id">>,
) {
  await updateDoc(doc(db(), col.timelineItems, itemId), patch);
}

export async function updateTimelineItemFull(
  itemId: string,
  input: {
    title: string;
    type: TimelineItem["type"];
    location?: string;
    notes?: string;
    visible_to_guests: boolean;
    mode: "fixed" | "relative";
    startLocal?: string;
    offsetDays?: number;
  },
) {
  const loc = input.location?.trim();
  const notes = input.notes?.trim();
  const base = {
    title: input.title,
    type: input.type,
    location: loc ? loc : deleteField(),
    notes: notes ? notes : deleteField(),
    visible_to_guests: input.visible_to_guests,
  };
  if (input.mode === "fixed") {
    await updateDoc(doc(db(), col.timelineItems, itemId), {
      ...base,
      start_time: input.startLocal
        ? new Date(input.startLocal).toISOString()
        : deleteField(),
      relative_to: deleteField(),
    });
  } else {
    await updateDoc(doc(db(), col.timelineItems, itemId), {
      ...base,
      start_time: deleteField(),
      relative_to: {
        anchor: "wedding_date" as const,
        offset_days: input.offsetDays ?? 0,
      },
    });
  }
}

export async function deleteTimelineItem(itemId: string) {
  await deleteDoc(doc(db(), col.timelineItems, itemId));
}

export async function createAssignment(input: Omit<Assignment, "id">) {
  const ref = await addDoc(collection(db(), col.assignments), input);
  return ref.id;
}

export async function deleteAssignment(assignmentId: string) {
  await deleteDoc(doc(db(), col.assignments, assignmentId));
}

export async function createEvent(
  input: Omit<WeddingEvent, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db(), col.events), {
    wedding_id: input.wedding_id,
    title: input.title.trim(),
    type: input.type,
    side: input.side,
    start_time: input.start_time,
    ...(input.end_time ? { end_time: input.end_time } : {}),
    ...(input.location?.trim() ? { location: input.location.trim() } : {}),
    ...(input.description?.trim()
      ? { description: input.description.trim() }
      : {}),
    ...(input.image_url?.trim() ? { image_url: input.image_url.trim() } : {}),
  });
  return ref.id;
}

export async function updateEvent(
  eventId: string,
  patch: Partial<Omit<WeddingEvent, "id" | "wedding_id">>,
) {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title.trim();
  if (patch.type !== undefined) payload.type = patch.type;
  if (patch.side !== undefined) payload.side = patch.side;
  if (patch.start_time !== undefined) payload.start_time = patch.start_time;
  if (patch.end_time !== undefined) {
    payload.end_time = patch.end_time ? patch.end_time : deleteField();
  }
  if (patch.location !== undefined) {
    const location = patch.location.trim();
    payload.location = location ? location : deleteField();
  }
  if (patch.description !== undefined) {
    const description = patch.description.trim();
    payload.description = description ? description : deleteField();
  }
  if (patch.image_url !== undefined) {
    const imageUrl = patch.image_url.trim();
    payload.image_url = imageUrl ? imageUrl : deleteField();
  }
  if (Object.keys(payload).length === 0) return;
  await updateDoc(doc(db(), col.events, eventId), payload);
}

export async function deleteEvent(weddingId: string, eventId: string) {
  const [participants, exchanges] = await Promise.all([
    listEventParticipants(weddingId, eventId),
    listExchangesForEvent(weddingId, eventId),
  ]);

  const linkedIds = [
    ...participants.map((item) => ({ collection: col.eventParticipants, id: item.id })),
    ...exchanges.map((item) => ({ collection: col.exchanges, id: item.id })),
  ];

  for (let i = 0; i < linkedIds.length; i += FIRESTORE_BATCH_MAX) {
    const batch = writeBatch(db());
    const slice = linkedIds.slice(i, i + FIRESTORE_BATCH_MAX);
    for (const item of slice) {
      batch.delete(doc(db(), item.collection, item.id));
    }
    await batch.commit();
  }

  await deleteDoc(doc(db(), col.events, eventId));
}

export async function addEventParticipant(
  input: Omit<EventParticipant, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db(), col.eventParticipants), input);
  return ref.id;
}

export async function removeEventParticipant(participantId: string) {
  await deleteDoc(doc(db(), col.eventParticipants, participantId));
}

export async function createExchange(
  input: Omit<Exchange, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db(), col.exchanges), {
    wedding_id: input.wedding_id,
    event_id: input.event_id,
    from_entity_type: input.from_entity_type,
    from_entity_id: input.from_entity_id,
    to_entity_type: input.to_entity_type,
    to_entity_id: input.to_entity_id,
    type: input.type,
    item_name: input.item_name.trim(),
    quantity: Math.max(1, Math.floor(input.quantity)),
    ...(typeof input.estimated_value === "number" && Number.isFinite(input.estimated_value)
      ? { estimated_value: input.estimated_value }
      : {}),
    status: input.status,
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  });
  return ref.id;
}

export async function updateExchange(
  exchangeId: string,
  patch: Partial<Omit<Exchange, "id" | "wedding_id" | "event_id">>,
) {
  const payload: Record<string, unknown> = {};
  if (patch.from_entity_type !== undefined) {
    payload.from_entity_type = patch.from_entity_type;
  }
  if (patch.from_entity_id !== undefined) payload.from_entity_id = patch.from_entity_id;
  if (patch.to_entity_type !== undefined) payload.to_entity_type = patch.to_entity_type;
  if (patch.to_entity_id !== undefined) payload.to_entity_id = patch.to_entity_id;
  if (patch.type !== undefined) payload.type = patch.type;
  if (patch.item_name !== undefined) payload.item_name = patch.item_name.trim();
  if (patch.quantity !== undefined) {
    payload.quantity = Math.max(1, Math.floor(patch.quantity));
  }
  if (patch.estimated_value !== undefined) {
    payload.estimated_value =
      typeof patch.estimated_value === "number" && Number.isFinite(patch.estimated_value)
        ? patch.estimated_value
        : deleteField();
  }
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.notes !== undefined) {
    const notes = patch.notes.trim();
    payload.notes = notes ? notes : deleteField();
  }
  if (Object.keys(payload).length === 0) return;
  await updateDoc(doc(db(), col.exchanges, exchangeId), payload);
}

export async function updateExchangeStatus(
  exchangeId: string,
  status: ExchangeStatus,
) {
  await updateDoc(doc(db(), col.exchanges, exchangeId), { status });
}

export async function deleteExchange(exchangeId: string) {
  await deleteDoc(doc(db(), col.exchanges, exchangeId));
}

const FIRESTORE_BATCH_MAX = 500;

type TaskMutationInput = {
  title: string;
  deadline?: Date | null;
  notes?: string;
  linked_event_id?: string | null;
  assigned_to?: string | null;
};

export async function createTask(
  weddingId: string,
  data: TaskMutationInput,
  userId: string,
): Promise<string> {
  const title = data.title.trim();
  if (!title) {
    throw new Error("Task title is required.");
  }
  const ref = await addDoc(collection(db(), col.tasks), {
    wedding_id: weddingId,
    title,
    deadline: data.deadline ? Timestamp.fromDate(data.deadline) : null,
    status: "pending" as TaskStatus,
    notes: data.notes?.trim() ?? "",
    linked_event_id: data.linked_event_id ?? null,
    assigned_to: data.assigned_to ?? null,
    created_by: userId,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTask(
  taskId: string,
  patch: Partial<TaskMutationInput & { status: TaskStatus }>,
) {
  const payload: Record<string, unknown> = {
    updated_at: serverTimestamp(),
  };
  if (patch.title !== undefined) {
    payload.title = patch.title.trim();
  }
  if (patch.deadline !== undefined) {
    payload.deadline = patch.deadline ? Timestamp.fromDate(patch.deadline) : null;
  }
  if (patch.status !== undefined) {
    payload.status = patch.status;
  }
  if (patch.notes !== undefined) {
    payload.notes = patch.notes.trim();
  }
  if (patch.linked_event_id !== undefined) {
    payload.linked_event_id = patch.linked_event_id || null;
  }
  if (patch.assigned_to !== undefined) {
    payload.assigned_to = patch.assigned_to || null;
  }
  await updateDoc(doc(db(), col.tasks, taskId), payload);
}

export async function deleteTask(taskId: string) {
  await deleteDoc(doc(db(), col.tasks, taskId));
}

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  await updateDoc(doc(db(), col.tasks, taskId), {
    status,
    updated_at: serverTimestamp(),
  });
}

export async function createRoomType(
  weddingId: string,
  name: string,
  baseOccupancy: number,
) {
  const ref = await addDoc(collection(db(), col.roomTypes), {
    wedding_id: weddingId,
    name: name.trim(),
    base_occupancy: Math.max(1, Math.floor(baseOccupancy)),
  });
  return ref.id;
}

export async function updateRoomType(
  roomTypeId: string,
  patch: { name?: string; base_occupancy?: number },
) {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.base_occupancy !== undefined) {
    payload.base_occupancy = Math.max(1, Math.floor(patch.base_occupancy));
  }
  if (Object.keys(payload).length === 0) return;
  await updateDoc(doc(db(), col.roomTypes, roomTypeId), payload);
}

export async function deleteRoomType(weddingId: string, roomTypeId: string) {
  const [rooms, people] = await Promise.all([
    listRooms(weddingId),
    listPeople(weddingId),
  ]);
  const typeRooms = rooms.filter((r) => r.room_type_id === roomTypeId);
  const roomIds = new Set(typeRooms.map((r) => r.id));
  const occupied = people.filter((p) => p.room_id && roomIds.has(p.room_id));
  if (occupied.length > 0) {
    throw new Error(
      "Cannot delete this room type while guests are assigned to its rooms.",
    );
  }
  for (let i = 0; i < typeRooms.length; i += FIRESTORE_BATCH_MAX) {
    const batch = writeBatch(db());
    const slice = typeRooms.slice(i, i + FIRESTORE_BATCH_MAX);
    for (const r of slice) {
      batch.delete(doc(db(), col.rooms, r.id));
    }
    await batch.commit();
  }
  await deleteDoc(doc(db(), col.roomTypes, roomTypeId));
}

export async function createRoom(
  weddingId: string,
  roomTypeId: string,
  label: string,
) {
  const ref = await addDoc(collection(db(), col.rooms), {
    wedding_id: weddingId,
    room_type_id: roomTypeId,
    label: label.trim(),
    extra_beds: "none" as RoomExtraBeds,
  });
  return ref.id;
}

export async function generateRooms(
  weddingId: string,
  roomTypeId: string,
  count: number,
  prefix: string,
  startAt: number,
) {
  const total = Math.max(1, Math.floor(count));
  const start = Math.max(0, Math.floor(startAt));
  let created = 0;
  while (created < total) {
    const batch = writeBatch(db());
    const chunk = Math.min(FIRESTORE_BATCH_MAX, total - created);
    for (let i = 0; i < chunk; i++) {
      const label = `${prefix}${start + created + i}`;
      const ref = doc(collection(db(), col.rooms));
      batch.set(ref, {
        wedding_id: weddingId,
        room_type_id: roomTypeId,
        label,
        extra_beds: "none" as RoomExtraBeds,
      });
    }
    await batch.commit();
    created += chunk;
  }
}

export async function updateRoomExtraBeds(
  roomId: string,
  extraBeds: RoomExtraBeds,
) {
  await updateDoc(doc(db(), col.rooms, roomId), { extra_beds: extraBeds });
}

export async function deleteRoom(weddingId: string, roomId: string) {
  const people = await listPeople(weddingId);
  const occupied = people.filter((p) => p.room_id === roomId);
  if (occupied.length > 0) {
    throw new Error("Remove all guests from this room before deleting it.");
  }
  await deleteDoc(doc(db(), col.rooms, roomId));
}

export async function setPersonRoom(personId: string, roomId: string | null) {
  await updateDoc(
    doc(db(), col.people, personId),
    roomId ? { room_id: roomId } : { room_id: deleteField() },
  );
}

export async function allocatePeopleToRoom(
  personIds: string[],
  roomId: string,
) {
  if (personIds.length === 0) return;
  for (let i = 0; i < personIds.length; i += FIRESTORE_BATCH_MAX) {
    const batch = writeBatch(db());
    const slice = personIds.slice(i, i + FIRESTORE_BATCH_MAX);
    for (const id of slice) {
      batch.update(doc(db(), col.people, id), { room_id: roomId });
    }
    await batch.commit();
  }
}
