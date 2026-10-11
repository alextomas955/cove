import { CliError } from "./errors";
import type { CoveClient } from "./client";
import type { TagGroup } from "./types";

const HEX_COLOR = /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i;

function isTagGroup(value: unknown): value is TagGroup {
  const candidate = value as Partial<TagGroup> | undefined;
  return !!candidate && typeof candidate.id === "number" && typeof candidate.name === "string" && typeof candidate.tagCount === "number";
}

export function assertTagGroup(value: unknown): TagGroup {
  if (!isTagGroup(value)) throw new CliError("INVALID_RESPONSE", "Cove returned an invalid tag group response.");
  return value;
}

export async function listTagGroups(client: CoveClient): Promise<TagGroup[]> {
  const groups = await client.get<unknown>("taggroups");
  if (!Array.isArray(groups) || !groups.every(isTagGroup)) throw new CliError("INVALID_RESPONSE", "Cove returned an invalid tag group list response.");
  return groups;
}

/**
 * Resolves a tag group by ID or by name. An all-digit reference is tried as an ID first and then
 * as a name, so a group named "2024" stays reachable. Cove keeps names unique only
 * case-sensitively, so an exact match wins and a case-insensitive one is used only when it is the
 * sole candidate.
 */
export async function resolveTagGroup(client: CoveClient, reference: string): Promise<TagGroup> {
  const value = reference.trim();
  const groups = await listTagGroups(client);
  const byId = /^\d+$/.test(value) ? groups.find(group => group.id === Number(value)) : undefined;
  if (byId) return byId;
  const exact = groups.find(group => group.name === value);
  if (exact) return exact;
  const matches = groups.filter(group => group.name.toLowerCase() === value.toLowerCase());
  if (matches.length > 1) {
    throw new CliError("TAG_GROUP_AMBIGUOUS", `More than one tag group matches “${value}” ignoring case. Use the exact name or a tag group ID.`, {
      details: { candidates: matches.map(group => ({ id: group.id, name: group.name })) },
    });
  }
  const match = matches[0];
  if (!match) {
    throw new CliError("TAG_GROUP_NOT_FOUND", `No tag group is named “${value}”. Run \`cove-cli tag-groups list\` to see the available groups.`, {
      details: { candidates: groups.map(group => ({ id: group.id, name: group.name })) },
    });
  }
  return match;
}

/** Cove accepts #RRGGBB or #RRGGBBAA; an empty value clears the color. */
export function tagGroupColor(value: string): string {
  const trimmed = value.trim();
  if (trimmed && !HEX_COLOR.test(trimmed)) throw new CliError("INVALID_ARGUMENT", "--color must be #RRGGBB or #RRGGBBAA.");
  return trimmed;
}
