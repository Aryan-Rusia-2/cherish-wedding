"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getHostInvite } from "@/lib/firebase/firestore";
import { acceptHostInvite } from "@/lib/firebase/mutations";
import type { HostInvite } from "@/types";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const token = params.token as string;
  const [invite, setInvite] = useState<HostInvite | null>(null);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
      return;
    }

    let active = true;
    async function loadInvite() {
      setInviteLoading(true);
      try {
        const data = await getHostInvite(token);
        if (active) setInvite(data);
      } finally {
        if (active) setInviteLoading(false);
      }
    }

    void loadInvite();
    return () => {
      active = false;
    };
  }, [loading, router, token, user]);

  async function onAccept() {
    if (!user) return;
    setAccepting(true);
    try {
      const result = await acceptHostInvite({
        invite_token: token,
        user_id: user.uid,
        email: user.email ?? "",
      });
      toast.success("Invite accepted. Welcome to the wedding workspace.");
      router.replace(`/wedding/${result.wedding_id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not accept invite.");
    } finally {
      setAccepting(false);
    }
  }

  if (loading || inviteLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Invite not found</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This invite link is invalid or has expired. Ask the host for a new invite.
          </CardContent>
        </Card>
      </div>
    );
  }

  const alreadyUsed = invite.used && invite.used_by && invite.used_by !== user?.uid;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Join Wedding Workspace</CardTitle>
          <CardDescription>
            This invite gives your account shared access to this wedding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Signed in as: {user?.email || "Unknown account"}</p>
          <p>Wedding ID: {invite.wedding_id}</p>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            className="min-h-11 w-full"
            onClick={() => void onAccept()}
            disabled={accepting || alreadyUsed}
          >
            {alreadyUsed
              ? "Invite already used"
              : accepting
                ? "Joining..."
                : "Accept invite"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
