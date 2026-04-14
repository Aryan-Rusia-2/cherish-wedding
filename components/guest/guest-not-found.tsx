"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GuestNotFound({ message }: { message?: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Guest Link Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            {message ||
              "This guest link is invalid or has expired. Please ask your wedding host for a new link."}
          </p>
          <Link href="/" className="font-medium text-foreground underline">
            Go to home page
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
