import Link from "next/link";

/** Small ceremonial brand link for auth screens. */
export function BrandMark() {
  return (
    <Link
      href="/"
      className="group mb-8 flex flex-col items-center gap-1 text-center"
    >
      <span className="font-display text-2xl font-semibold tracking-tight text-primary group-hover:opacity-90">
        Cherish
      </span>
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Wedding OS
      </span>
    </Link>
  );
}
