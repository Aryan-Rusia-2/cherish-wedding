import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { DevotionHero } from "@/components/devotion-hero";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/80 via-background to-background">
      <DevotionHero variant="full" />
      <div className="mx-auto flex max-w-lg flex-col gap-10 px-6 pb-24 pt-10 text-center sm:pt-14">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Wedding OS
        </p>
        <h1 className="text-balance font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
          Your wedding, organized — beautifully.
        </h1>
        <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
          One calm place for guests, events, and updates. Built for real families
          and real timelines — share a link when you&apos;re ready, without losing
          the warmth of how you celebrate.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "inline-flex min-h-14 w-full items-center justify-center text-base shadow-sm sm:w-auto sm:min-w-[200px]",
            )}
          >
            Create your wedding
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "inline-flex min-h-14 w-full items-center justify-center border-primary/35 text-base sm:w-auto sm:min-w-[200px]",
            )}
          >
            Sign in
          </Link>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/90 p-6 text-left shadow-sm backdrop-blur-sm">
          <p className="text-sm font-semibold text-foreground">For guests</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Open the personal link your hosts send you — you&apos;ll see your
            schedule, RSVP in a tap, and stay in the loop without digging through
            group chats.
          </p>
        </div>
      </div>
    </div>
  );
}
