import type { Timestamp } from "firebase/firestore";

export type WeddingVisibility = "private" | "guest_link";

export interface Wedding {
  id: string;
  name: string;
  wedding_date: string; // ISO date string
  created_by: string;
  slug?: string;
  /** Defaults to private if missing on older documents */
  visibility?: WeddingVisibility;
  created_at?: Timestamp;
}

export interface Group {
  id: string;
  wedding_id: string;
  name: string;
}

export interface Family {
  id: string;
  wedding_id: string;
  group_id: string;
  family_name: string;
  /** One contact number for the household (head of family), not per guest */
  contact_phone?: string;
}

export type PersonRole = "guest" | "host";
export type RsvpStatus = "pending" | "confirmed";

export type RoomExtraBeds = "none" | "single" | "double";

export interface RoomType {
  id: string;
  wedding_id: string;
  name: string;
  base_occupancy: number;
}

export interface Room {
  id: string;
  wedding_id: string;
  room_type_id: string;
  label: string;
  extra_beds: RoomExtraBeds;
}

export interface Person {
  id: string;
  wedding_id: string;
  name: string;
  /** @deprecated Use Family.contact_phone; kept for legacy documents only */
  phone?: string;
  group_id: string;
  family_id: string;
  role: PersonRole;
  rsvp_status: RsvpStatus;
  /** Optional flag; missing means not a kid (default false). */
  is_kid?: boolean;
  arrival_date?: string;
  invite_token: string;
  /** Assigned physical room for this wedding (if any) */
  room_id?: string;
  /** Set when the guest record was created */
  created_at?: Timestamp;
  /** Order within the family: 0 = first/top, each new member is +1 (bottom) */
  sort_key?: number;
}

export type TimelineItemType = "event" | "task" | "ritual" | "reminder";

export interface TimelineRelative {
  anchor: "wedding_date";
  offset_days: number;
}

export interface TimelineItem {
  id: string;
  wedding_id: string;
  title: string;
  type: TimelineItemType;
  /** ISO datetime when fixed; optional if relative only */
  start_time?: string;
  relative_to?: TimelineRelative | null;
  location?: string;
  notes?: string;
  /** When true, shown on public guest schedule */
  visible_to_guests: boolean;
}

export interface Assignment {
  id: string;
  wedding_id: string;
  timeline_item_id: string;
  person_id: string;
}

export interface Announcement {
  id: string;
  wedding_id: string;
  message: string;
  created_at: Timestamp;
}
