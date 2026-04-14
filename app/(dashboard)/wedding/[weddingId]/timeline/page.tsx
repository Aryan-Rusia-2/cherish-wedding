"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TimelineManager } from "@/components/timeline/timeline-manager";
import { getWedding } from "@/lib/firebase/firestore";
import type { Wedding } from "@/types";

export default function WeddingTimelinePage() {
  const params = useParams();
  const weddingId = params.weddingId as string;
  const [wedding, setWedding] = useState<Wedding | null | undefined>(undefined);

  useEffect(() => {
    void getWedding(weddingId).then(setWedding);
  }, [weddingId]);

  if (wedding === undefined) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!wedding) {
    return <p className="text-muted-foreground">Wedding not found.</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        <Link href={`/wedding/${weddingId}`} className="underline">
          ← Back to overview
        </Link>
      </p>
      <TimelineManager weddingId={weddingId} weddingDateIso={wedding.wedding_date} />
    </div>
  );
}
