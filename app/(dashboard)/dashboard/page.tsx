"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getFirebaseAuth } from "@/lib/firebase/config";
import { listWeddingsForUser } from "@/lib/firebase/firestore";
import { createWedding, ensureOwnerWeddingAccess } from "@/lib/firebase/mutations";
import type { Wedding } from "@/types";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [weddings, setWeddings] = useState<Wedding[] | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [creating, setCreating] = useState(false);

  async function refresh() {
    if (!user) return;
    const list = await listWeddingsForUser(user.uid);
    if (user.email) {
      void Promise.all(
        list
          .filter((wedding) => wedding.created_by === user.uid)
          .map((wedding) =>
            ensureOwnerWeddingAccess(wedding.id, user.uid, user.email as string),
          ),
      ).catch((err: unknown) => {
        console.warn("Could not backfill owner access records.", err);
      });
    }
    setWeddings(list);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when user uid changes
  }, [user?.uid]);

  function formatFirestoreError(err: unknown): string {
    if (err instanceof Error) {
      const e = err as Error & { code?: string };
      const code = typeof e.code === "string" ? e.code : "";
      return code ? `${code}: ${err.message}` : err.message;
    }
    return "Could not create wedding";
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    try {
      // Ensure Auth has attached a token to Firestore requests (avoids rare hangs).
      await getFirebaseAuth().currentUser?.getIdToken();

      const timeoutMs = 25_000;
      const id = await Promise.race([
        createWedding({
          name: name.trim(),
          wedding_date: date,
          created_by: user.uid,
          created_by_email: user.email ?? undefined,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `No response after ${timeoutMs / 1000}s. Common causes: (1) browser extension blocking firestore.googleapis.com (ERR_BLOCKED_BY_CLIENT) — pause ad blockers for localhost; (2) Firestore not created in Firebase Console; (3) Firestore rules not deployed.`,
                ),
              ),
            timeoutMs,
          ),
        ),
      ]);
      setName("");
      setDate("");
      toast.success("Wedding created");
      router.push(`/wedding/${id}`);
      void refresh();
    } catch (err: unknown) {
      toast.error(formatFirestoreError(err));
    } finally {
      setCreating(false);
    }
  }

  if (!user) return null;

  if (weddings === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Your weddings</h1>
        <p className="mt-2 text-muted-foreground">
          One calm place for guests, events, and updates.
        </p>
      </div>

      {weddings.length > 0 && (
        <div className="space-y-3">
          {weddings.map((w) => (
            <Link key={w.id} href={`/wedding/${w.id}`}>
              <Card className="transition-colors hover:bg-muted/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{w.name}</CardTitle>
                  <CardDescription>
                    {new Date(w.wedding_date).toLocaleDateString(undefined, {
                      dateStyle: "long",
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Open wedding space →
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create a wedding</CardTitle>
          <CardDescription>Give it a working name — you can refine later.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wname">Wedding name</Label>
              <Input
                id="wname"
                required
                placeholder="Priya & Alex"
                className="min-h-12 text-base"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wdate">Wedding date</Label>
              <Input
                id="wdate"
                type="date"
                required
                className="min-h-12 text-base"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="min-h-12 w-full text-base sm:w-auto"
              disabled={creating}
            >
              {creating ? "Creating…" : "Create wedding"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
