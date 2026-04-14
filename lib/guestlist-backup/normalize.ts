/**
 * Maps the external "wedding guestlist backup" export into Cherish fields only:
 * group name → Group.name
 * familyName → Family.family_name
 * memberNames (newline-separated) → one Person per non-empty line
 *
 * Ignores: beds, rooms, kidFlags, extraFields, memberCount, entryType metadata, etc.
 */

export type NormalizedBackupFamily = {
  family_name: string;
  members: string[];
};

export type NormalizedBackupGroup = {
  name: string;
  families: NormalizedBackupFamily[];
};

export function normalizeGuestlistBackup(raw: unknown): NormalizedBackupGroup[] {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid JSON: expected an object.");
  }
  const root = raw as Record<string, unknown>;
  const groups = root.groups;
  if (!Array.isArray(groups)) {
    throw new Error('Invalid backup: expected top-level "groups" array.');
  }

  const mapped = groups.map((g, gi) => {
    if (!g || typeof g !== "object") {
      throw new Error(`Invalid group at index ${gi}.`);
    }
    const go = g as Record<string, unknown>;
    const name = typeof go.name === "string" ? go.name.trim() : "";
    if (!name) {
      throw new Error(`Group at index ${gi} is missing a name.`);
    }

    const fams = go.families;
    if (!Array.isArray(fams)) {
      return { name, families: [] };
    }

    const families: NormalizedBackupFamily[] = fams
      .map((f, fi) => {
        if (!f || typeof f !== "object") {
          throw new Error(`Invalid family at group "${name}", index ${fi}.`);
        }
        const fo = f as Record<string, unknown>;
        const familyName =
          typeof fo.familyName === "string" ? fo.familyName.trim() : "";
        const memberNamesRaw =
          typeof fo.memberNames === "string" ? fo.memberNames : "";
        const members = memberNamesRaw
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean);

        const family_name =
          familyName ||
          (members[0] ? members[0]! : `Imported family ${fi + 1}`);

        const membersFinal =
          members.length > 0 ? members : familyName ? [familyName] : [];

        return { family_name, members: membersFinal };
      })
      .filter((row) => row.members.length > 0);

    return { name, families };
  });

  return mapped.filter((g) => g.families.length > 0);
}
