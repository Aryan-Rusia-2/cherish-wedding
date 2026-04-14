"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

type EmptyStateCardProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyStateCard({ title, description, action }: EmptyStateCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3 py-10 text-center">
        <p className="font-display text-xl font-semibold">{title}</p>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        {action ? <div className="pt-1">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
