import Link from "next/link";

export default function GuestLandingPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">You&apos;re almost there</h1>
      <p className="text-muted-foreground leading-relaxed">
        Ask your hosts for your personal link. Each guest has a private page for
        this wedding.
      </p>
      <ButtonLink href="/">Go home</ButtonLink>
    </div>
  );
}

function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground"
    >
      {children}
    </Link>
  );
}
