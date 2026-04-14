"use client";

import type { ReactNode } from "react";

export function GuestShell({
  weddingName,
  children,
}: {
  weddingName: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 to-background">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:py-10">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Cherish Guest Space
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {weddingName}
          </h1>
        </header>
        {children}
      </div>
    </main>
  );
}
