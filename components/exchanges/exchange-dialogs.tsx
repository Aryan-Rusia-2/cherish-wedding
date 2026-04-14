"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  createExchange,
  deleteExchange,
  updateExchange,
} from "@/lib/firebase/mutations";
import type { EntityType, Exchange } from "@/types";

type EntityOption = {
  id: string;
  label: string;
};

type ExchangeEntityOptions = {
  groups: EntityOption[];
  families: EntityOption[];
  people: EntityOption[];
};

type ExchangeFormState = {
  fromType: EntityType;
  fromId: string;
  toType: EntityType;
  toId: string;
  type: Exchange["type"];
  itemName: string;
  quantity: string;
  estimatedValue: string;
  status: Exchange["status"];
  notes: string;
};

type AddExchangeDialogProps = {
  weddingId: string;
  eventId: string;
  options: ExchangeEntityOptions;
  onDone: () => void;
};

type EditExchangeDialogProps = {
  exchange: Exchange;
  options: ExchangeEntityOptions;
  onDone: () => void;
};

type DeleteExchangeDialogProps = {
  exchange: Exchange;
  onDone: () => void;
};

const DEFAULT_EXCHANGE_FORM: ExchangeFormState = {
  fromType: "group",
  fromId: "",
  toType: "group",
  toId: "",
  type: "gift",
  itemName: "",
  quantity: "1",
  estimatedValue: "",
  status: "planned",
  notes: "",
};

function buildStateFromExchange(exchange: Exchange): ExchangeFormState {
  return {
    fromType: exchange.from_entity_type,
    fromId: exchange.from_entity_id,
    toType: exchange.to_entity_type,
    toId: exchange.to_entity_id,
    type: exchange.type,
    itemName: exchange.item_name,
    quantity: String(exchange.quantity),
    estimatedValue:
      typeof exchange.estimated_value === "number"
        ? String(exchange.estimated_value)
        : "",
    status: exchange.status,
    notes: exchange.notes ?? "",
  };
}

function getEntityOptions(
  entityType: EntityType,
  options: ExchangeEntityOptions,
): EntityOption[] {
  if (entityType === "group") return options.groups;
  if (entityType === "family") return options.families;
  return options.people;
}

function ExchangeFormFields({
  state,
  setState,
  options,
}: {
  state: ExchangeFormState;
  setState: React.Dispatch<React.SetStateAction<ExchangeFormState>>;
  options: ExchangeEntityOptions;
}) {
  const fromOptions = useMemo(
    () => getEntityOptions(state.fromType, options),
    [state.fromType, options],
  );
  const toOptions = useMemo(
    () => getEntityOptions(state.toType, options),
    [state.toType, options],
  );

  useEffect(() => {
    if (!fromOptions.some((option) => option.id === state.fromId)) {
      setState((prev) => ({ ...prev, fromId: "" }));
    }
  }, [fromOptions, state.fromId, setState]);

  useEffect(() => {
    if (!toOptions.some((option) => option.id === state.toId)) {
      setState((prev) => ({ ...prev, toId: "" }));
    }
  }, [toOptions, state.toId, setState]);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="exchange-from-type">From type</Label>
          <select
            id="exchange-from-type"
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={state.fromType}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                fromType: e.target.value as EntityType,
                fromId: "",
              }))
            }
          >
            <option value="group">Group</option>
            <option value="family">Family</option>
            <option value="person">Person</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="exchange-from-id">From</Label>
          <select
            id="exchange-from-id"
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={state.fromId}
            onChange={(e) =>
              setState((prev) => ({ ...prev, fromId: e.target.value }))
            }
            required
          >
            <option value="">Choose...</option>
            {fromOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="exchange-to-type">To type</Label>
          <select
            id="exchange-to-type"
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={state.toType}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                toType: e.target.value as EntityType,
                toId: "",
              }))
            }
          >
            <option value="group">Group</option>
            <option value="family">Family</option>
            <option value="person">Person</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="exchange-to-id">To</Label>
          <select
            id="exchange-to-id"
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={state.toId}
            onChange={(e) =>
              setState((prev) => ({ ...prev, toId: e.target.value }))
            }
            required
          >
            <option value="">Choose...</option>
            {toOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="exchange-type">Exchange type</Label>
          <select
            id="exchange-type"
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={state.type}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                type: e.target.value as Exchange["type"],
              }))
            }
          >
            <option value="gift">Gift</option>
            <option value="money">Money</option>
            <option value="item">Item</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="exchange-status">Status</Label>
          <select
            id="exchange-status"
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={state.status}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                status: e.target.value as Exchange["status"],
              }))
            }
          >
            <option value="planned">Planned</option>
            <option value="purchased">Purchased</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="exchange-item-name">Item name</Label>
        <Input
          id="exchange-item-name"
          required
          className="min-h-12"
          value={state.itemName}
          onChange={(e) =>
            setState((prev) => ({ ...prev, itemName: e.target.value }))
          }
          placeholder="Clothes set"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="exchange-quantity">Quantity</Label>
          <Input
            id="exchange-quantity"
            type="number"
            min={1}
            required
            className="min-h-12"
            value={state.quantity}
            onChange={(e) =>
              setState((prev) => ({ ...prev, quantity: e.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exchange-estimated-value">Estimated value (optional)</Label>
          <Input
            id="exchange-estimated-value"
            type="number"
            min={0}
            step="0.01"
            className="min-h-12"
            value={state.estimatedValue}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                estimatedValue: e.target.value,
              }))
            }
            placeholder="2500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="exchange-notes">Notes (optional)</Label>
        <Textarea
          id="exchange-notes"
          value={state.notes}
          onChange={(e) => setState((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Vendor, handover instructions, reminders..."
        />
      </div>
    </>
  );
}

export function AddExchangeDialog({
  weddingId,
  eventId,
  options,
  onDone,
}: AddExchangeDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ExchangeFormState>(DEFAULT_EXCHANGE_FORM);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createExchange({
        wedding_id: weddingId,
        event_id: eventId,
        from_entity_type: state.fromType,
        from_entity_id: state.fromId,
        to_entity_type: state.toType,
        to_entity_id: state.toId,
        type: state.type,
        item_name: state.itemName.trim(),
        quantity: Number(state.quantity) || 1,
        estimated_value: state.estimatedValue
          ? Number(state.estimatedValue)
          : undefined,
        status: state.status,
        notes: state.notes.trim() || undefined,
      });
      setState(DEFAULT_EXCHANGE_FORM);
      setOpen(false);
      toast.success("Exchange added");
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
          buttonVariants({ variant: "secondary", size: "sm" }),
          "min-h-11",
        )}
      >
        Add exchange
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New exchange</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <ExchangeFormFields state={state} setState={setState} options={options} />
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditExchangeDialog({
  exchange,
  options,
  onDone,
}: EditExchangeDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ExchangeFormState>(
    buildStateFromExchange(exchange),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setState(buildStateFromExchange(exchange));
  }, [open, exchange]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateExchange(exchange.id, {
        from_entity_type: state.fromType,
        from_entity_id: state.fromId,
        to_entity_type: state.toType,
        to_entity_id: state.toId,
        type: state.type,
        item_name: state.itemName.trim(),
        quantity: Number(state.quantity) || 1,
        estimated_value: state.estimatedValue
          ? Number(state.estimatedValue)
          : undefined,
        status: state.status,
        notes: state.notes,
      });
      setOpen(false);
      toast.success("Exchange updated");
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit exchange</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <ExchangeFormFields state={state} setState={setState} options={options} />
          <DialogFooter>
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteExchangeDialog({
  exchange,
  onDone,
}: DeleteExchangeDialogProps) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11"
      disabled={busy}
      onClick={async () => {
        if (!confirm(`Delete exchange "${exchange.item_name}"?`)) return;
        setBusy(true);
        try {
          await deleteExchange(exchange.id);
          toast.success("Exchange deleted");
          onDone();
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      Delete
    </Button>
  );
}
