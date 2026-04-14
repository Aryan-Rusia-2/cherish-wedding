"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GuestNotFound } from "@/components/guest/guest-not-found";
import { GuestRoom } from "@/components/guest/guest-room";
import { GuestSchedule } from "@/components/guest/guest-schedule";
import { GuestShell } from "@/components/guest/guest-shell";
import { GuestWelcome } from "@/components/guest/guest-welcome";
import { Skeleton } from "@/components/ui/skeleton";

type GuestPayload = {
  wedding: {
    id: string;
    name: string;
    wedding_date: string;
  };
  guest: {
    id: string;
    name: string;
    rsvp_status: string;
    arrival_date?: string;
  };
  room: {
    id: string;
    label: string;
    extra_beds: string;
  } | null;
  contact: {
    family_name?: string;
    contact_phone?: string;
  } | null;
  schedule: Array<{
    id: string;
    title: string;
    type: string;
    side: string;
    start_time: string;
    end_time?: string;
    location?: string;
    description?: string;
  }>;
};

export default function GuestExperiencePage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GuestPayload | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/guest/resolve?weddingId=${encodeURIComponent(weddingId)}&token=${encodeURIComponent(token)}`,
        );
        const body = (await res.json()) as GuestPayload & { error?: string };
        if (!res.ok) {
          throw new Error(body.error || "Could not load guest experience.");
        }
        if (active) {
          setData(body);
        }
      } catch (err: unknown) {
        if (active) {
          setData(null);
          setError(err instanceof Error ? err.message : "Could not load link.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [token, weddingId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-xl space-y-4 px-4 py-8">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-36 w-full" />
      </main>
    );
  }

  if (!data) {
    return <GuestNotFound message={error} />;
  }

  return (
    <GuestShell weddingName={data.wedding.name}>
      <GuestWelcome
        guestName={data.guest.name}
        weddingName={data.wedding.name}
        weddingDate={data.wedding.wedding_date}
      />
      <GuestSchedule items={data.schedule} />
      <GuestRoom room={data.room} contact={data.contact} />
    </GuestShell>
  );
}
