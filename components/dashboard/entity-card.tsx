"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EntityCardProps = {
  href?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function EntityCard({
  href,
  title,
  description,
  action,
  footer,
  className,
}: EntityCardProps) {
  const TitleBlock = (
    <div className="min-w-0 flex-1">
      <CardTitle className="text-xl">{title}</CardTitle>
      {description ? (
        <CardDescription className="mt-1 text-base leading-relaxed">{description}</CardDescription>
      ) : null}
    </div>
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {href ? (
            <Link
              href={href}
              className="group min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="transition-colors group-hover:text-foreground">{TitleBlock}</div>
            </Link>
          ) : (
            TitleBlock
          )}
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={footer ? "pt-0" : "sr-only"}>
        {footer ?? "Open"}
      </CardContent>
    </Card>
  );
}
