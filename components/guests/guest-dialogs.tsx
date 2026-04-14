"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createFamily,
  createGroup,
  createPerson,
  deleteFamily,
  deleteGroup,
  deletePerson,
  updateGroup,
  updateFamily,
  updatePerson,
} from "@/lib/firebase/mutations";
import { MoreHorizontal } from "lucide-react";
import type { Family, Group, Person } from "@/types";

export function AddGroupDialog({
  weddingId,
  onDone,
}: {
  weddingId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createGroup(weddingId, name.trim());
      setName("");
      setOpen(false);
      toast.success("Group added");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: "default", size: "default" }),
          "min-h-12 w-full sm:w-auto",
        )}
      >
        Add group
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New group</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gname">Name</Label>
            <Input
              id="gname"
              required
              className="min-h-12"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bride side"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditGroupDialog({
  group,
  onDone,
}: {
  group: Group;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(group.name);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateGroup(group.id, name.trim());
      setOpen(false);
      toast.success("Updated");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "min-h-11",
        )}
      >
        Rename
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename group</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="egname">Name</Label>
            <Input
              id="egname"
              required
              className="min-h-12"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteGroupButton({
  groupId,
  onDone,
}: {
  groupId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11"
      disabled={busy}
      onClick={async () => {
        if (
          !confirm(
            "Delete this group? Remove families and guests under it first when possible.",
          )
        )
          return;
        setBusy(true);
        try {
          await deleteGroup(groupId);
          toast.success("Group removed");
          onDone();
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      Delete
    </Button>
  );
}

export function GroupActionsMenu({
  group,
  onDone,
}: {
  group: Group;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(group.name);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(group.name);
  }, [open, group]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateGroup(group.id, name.trim());
      setOpen(false);
      toast.success("Updated");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !confirm(
        "Delete this group? Remove families and guests under it first when possible.",
      )
    )
      return;
    setBusy(true);
    try {
      await deleteGroup(group.id);
      toast.success("Group removed");
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "min-h-11 min-w-11",
          )}
          aria-label={`Actions for ${group.name}`}
          disabled={busy}
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setOpen(true)}>Rename</DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
            onClick={remove}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename group</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`group-name-${group.id}`}>Name</Label>
              <Input
                id={`group-name-${group.id}`}
                required
                className="min-h-12"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy} className="min-h-11 w-full">
                {busy ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AddFamilyDialog({
  weddingId,
  groupId,
  onDone,
}: {
  weddingId: string;
  groupId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createFamily(
        weddingId,
        groupId,
        name.trim(),
        contactPhone.trim() || undefined,
      );
      setName("");
      setContactPhone("");
      setOpen(false);
      toast.success("Family added");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: "default", size: "default" }),
          "min-h-12 w-full sm:w-auto",
        )}
      >
        Add family
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New family</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fname">Family name</Label>
            <Input
              id="fname"
              required
              className="min-h-12"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sharma family"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fphone">Family contact phone (optional)</Label>
            <p className="text-xs text-muted-foreground">
              One number for this household — not stored on each guest.
            </p>
            <Input
              id="fphone"
              type="tel"
              className="min-h-12"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+1 …"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditFamilyDialog({
  family,
  onDone,
}: {
  family: Family;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(family.family_name);
  const [contactPhone, setContactPhone] = useState(
    family.contact_phone ?? "",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(family.family_name);
    setContactPhone(family.contact_phone ?? "");
  }, [open, family]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateFamily(family.id, {
        family_name: name.trim(),
        contact_phone: contactPhone.trim(),
      });
      setOpen(false);
      toast.success("Updated");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "min-h-11",
        )}
      >
        Edit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit family</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="efname">Family name</Label>
            <Input
              id="efname"
              required
              className="min-h-12"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="efphone">Family contact phone</Label>
            <p className="text-xs text-muted-foreground">
              One number for this household. Leave blank to remove.
            </p>
            <Input
              id="efphone"
              type="tel"
              className="min-h-12"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteFamilyButton({
  familyId,
  onDone,
}: {
  familyId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Delete this family?")) return;
        setBusy(true);
        try {
          await deleteFamily(familyId);
          toast.success("Family removed");
          onDone();
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      Delete
    </Button>
  );
}

export function FamilyActionsMenu({
  family,
  onDone,
}: {
  family: Family;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(family.family_name);
  const [contactPhone, setContactPhone] = useState(
    family.contact_phone ?? "",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(family.family_name);
    setContactPhone(family.contact_phone ?? "");
  }, [open, family]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateFamily(family.id, {
        family_name: name.trim(),
        contact_phone: contactPhone.trim(),
      });
      setOpen(false);
      toast.success("Updated");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this family?")) return;
    setBusy(true);
    try {
      await deleteFamily(family.id);
      toast.success("Family removed");
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "min-h-11 min-w-11",
          )}
          aria-label={`Actions for ${family.family_name}`}
          disabled={busy}
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
            onClick={remove}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit family</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`family-name-${family.id}`}>Family name</Label>
              <Input
                id={`family-name-${family.id}`}
                required
                className="min-h-12"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`family-phone-${family.id}`}>Family contact phone</Label>
              <p className="text-xs text-muted-foreground">
                One number for this household. Leave blank to remove.
              </p>
              <Input
                id={`family-phone-${family.id}`}
                type="tel"
                className="min-h-12"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy} className="min-h-11 w-full">
                {busy ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AddPersonDialog({
  weddingId,
  groupId,
  familyId,
  onDone,
}: {
  weddingId: string;
  groupId: string;
  familyId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isKid, setIsKid] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createPerson({
        wedding_id: weddingId,
        name: name.trim(),
        group_id: groupId,
        family_id: familyId,
        role: "guest",
        rsvp_status: "pending",
        is_kid: isKid,
      });
      setName("");
      setIsKid(false);
      setOpen(false);
      toast.success("Guest added");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: "default", size: "default" }),
          "min-h-12 w-full sm:w-auto",
        )}
      >
        Add member
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New guest</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pname">Name</Label>
            <Input
              id="pname"
              required
              className="min-h-12"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Checkbox
              id="pis-kid"
              checked={isKid}
              onCheckedChange={(c) => setIsKid(c === true)}
            />
            <Label htmlFor="pis-kid" className="text-sm font-normal">
              Mark as kid
            </Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditPersonDialog({
  person,
  onDone,
}: {
  person: Person;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(person.name);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(person.name);
  }, [open, person]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updatePerson(person.id, {
        name: name.trim(),
      });
      setOpen(false);
      toast.success("Updated");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "min-h-11",
        )}
      >
        Edit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit guest</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="epname">Name</Label>
            <Input
              id="epname"
              required
              className="min-h-12"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeletePersonButton({
  person,
  onDone,
}: {
  person: Person;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11"
      disabled={busy}
      onClick={async () => {
        if (!confirm(`Remove ${person.name}?`)) return;
        setBusy(true);
        try {
          await deletePerson(person.id);
          toast.success("Removed");
          onDone();
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      Remove
    </Button>
  );
}

export function PersonActionsMenu({
  person,
  onDone,
  onCopyInvite,
}: {
  person: Person;
  onDone: () => void;
  onCopyInvite: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(person.name);
  const [isKid, setIsKid] = useState(person.is_kid === true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(person.name);
    setIsKid(person.is_kid === true);
  }, [open, person]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updatePerson(person.id, {
        name: name.trim(),
        is_kid: isKid,
      });
      setOpen(false);
      toast.success("Updated");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Remove ${person.name}?`)) return;
    setBusy(true);
    try {
      await deletePerson(person.id);
      toast.success("Removed");
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleConfirmed() {
    const next = person.rsvp_status === "confirmed" ? "pending" : "confirmed";
    setBusy(true);
    try {
      await updatePerson(person.id, { rsvp_status: next });
      toast.success(
        next === "confirmed" ? "Marked confirmed" : "Confirmation removed",
      );
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleKid() {
    setBusy(true);
    try {
      await updatePerson(person.id, { is_kid: !(person.is_kid === true) });
      toast.success(person.is_kid === true ? "Marked as adult" : "Marked as kid");
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "min-h-11 min-w-11",
          )}
          aria-label={`Actions for ${person.name}`}
          disabled={busy}
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={toggleKid} disabled={busy}>
            {person.is_kid === true ? "Mark as adult" : "Mark as kid"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleConfirmed} disabled={busy}>
            {person.rsvp_status === "confirmed"
              ? "Remove confirmation"
              : "Confirm attendance"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCopyInvite}>Copy invite link</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
            onClick={remove}
          >
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit guest</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`person-name-${person.id}`}>Name</Label>
              <Input
                id={`person-name-${person.id}`}
                required
                className="min-h-12"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox
                id={`person-kid-${person.id}`}
                checked={isKid}
                onCheckedChange={(c) => setIsKid(c === true)}
              />
              <Label
                htmlFor={`person-kid-${person.id}`}
                className="text-sm font-normal"
              >
                Mark as kid
              </Label>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy} className="min-h-11 w-full">
                {busy ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
