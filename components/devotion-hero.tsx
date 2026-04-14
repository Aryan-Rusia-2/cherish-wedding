"use client";

import Image from "next/image";

const figureLabel =
  "Shri Ganesha — line illustration in blessing pose, honouring the auspicious beginning";

type DevotionHeroProps = {
  variant: "full" | "compact";
  /** Shown under the mantra on the full hero (e.g. couple or city name). */
  tagline?: string;
};

export function DevotionHero({
  variant,
  tagline = "Cherish · Wedding OS",
}: DevotionHeroProps) {
  if (variant === "compact") {
    return (
      <header
        className="border-b border-border/80 bg-gradient-to-r from-[oklch(0.99_0.01_78)] via-background to-[oklch(0.96_0.02_78)]"
        role="banner"
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5">
          <figure
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-card shadow-sm"
            aria-label={figureLabel}
          >
            <Image
              src="/ganesha-hero.png"
              alt=""
              width={64}
              height={64}
              className="h-full w-full object-cover object-center"
              priority
            />
          </figure>
          <div className="min-w-0 text-left">
            <p
              className="font-display text-lg font-medium leading-tight text-foreground"
              lang="sa"
            >
              ॐ श्री गणेशाय नमः
            </p>
            <p className="font-display text-sm italic leading-snug text-muted-foreground">
              Om Shri Ganeshaya Namah
            </p>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className="relative border-b border-border/60 bg-gradient-to-br from-[oklch(0.99_0.012_78)] via-[oklch(0.97_0.015_78)] to-[oklch(0.93_0.02_78)] px-6 pb-10 pt-12 sm:pb-12 sm:pt-16"
      role="banner"
    >
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <figure
          className="relative mb-5 h-[220px] w-[220px] overflow-hidden rounded-full border-2 border-border bg-card shadow-md ring-1 ring-black/5"
          aria-label={figureLabel}
        >
          <Image
            src="/ganesha-hero.png"
            alt=""
            width={220}
            height={220}
            className="h-full w-full object-cover object-center"
            priority
          />
        </figure>
        <p
          className="font-display text-3xl font-medium tracking-wide text-foreground sm:text-4xl"
          lang="sa"
        >
          ॐ श्री गणेशाय नमः
        </p>
        <p className="mt-1 font-display text-lg italic text-muted-foreground sm:text-xl">
          Om Shri Ganeshaya Namah
        </p>
        <div
          className="mt-6 h-px w-24 max-w-[40%] bg-gradient-to-r from-transparent via-primary to-transparent"
          aria-hidden
        />
        <p className="mt-4 font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {tagline}
        </p>
      </div>
    </header>
  );
}
