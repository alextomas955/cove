import { Plus, X } from "lucide-react";
import type { MetadataServer, MetadataServerEntityCandidate, MetadataServerVideoMatch, Video } from "../api/types";
import { videos } from "../api/client";
import { EntityReferenceMultiSelector, type EntityReferenceOption } from "./EntityReferenceSelector";
import { metadataServerLabel } from "./MetadataServerLinks";
import { relationKey, type ScrapeRelationActionMap } from "./ScrapeRelationChoices";
import type { CollectionMode } from "./videoScrapeUtils";
import { type DiffField, type DiffRecord, type DiffSelection } from "./MetadataDiff";

/**
 * Adapts the video tagger's decision state (per-field strategies, collection modes, per-item
 * exclusions, hand edits) to the generic review rows in `MetadataDiff`, so a scrape result is reviewed
 * with the same rows, pills and chips as a merge. The tagger's state model and apply request are
 * unchanged: this file only translates in both directions.
 */

export type TaggerFieldStrategy = "ignore" | "merge" | "overwrite";

export interface TaggerPerformerChoice {
  key: string;
  label: string;
  candidate: MetadataServerEntityCandidate;
}

/** Library items added through search, and current items taken off, beside the scrape. */
export interface TaggerRelationshipEdits {
  added: number[];
  removed: number[];
}

export type TaggerRelationshipKey = "tags" | "performers";

export interface TaggerReviewInput {
  video: Video;
  result: MetadataServerVideoMatch;
  /** The name of the source as it reads in a sentence, e.g. "StashDB" or "the scraper". */
  sourceName: string;
  metadataServers?: Pick<MetadataServer, "endpoint" | "name">[];
  fieldStrategies: Record<string, TaggerFieldStrategy>;
  imageReplace: boolean;
  collectionModes: Record<string, CollectionMode>;
  showStudio: boolean;
  showTags: boolean;
  showPerformers: boolean;
  currentTagNames: string[];
  existingTagNames: string[];
  tagActions: ScrapeRelationActionMap;
  /** Which existing entity a scraped name resolved to, when it matched through an alias. */
  tagMatchInfo?: Record<string, string>;
  performerChoices: TaggerPerformerChoice[];
  currentPerformerChoiceKeys: string[];
  performerActions: ScrapeRelationActionMap;
  performerMatchInfo?: Record<string, string>;
  tagEdits?: TaggerRelationshipEdits;
  performerEdits?: TaggerRelationshipEdits;
}

export interface TaggerReviewHandlers {
  onFieldStrategyChange?: (field: string, strategy: TaggerFieldStrategy) => void;
  onCollectionModeChange?: (field: string, mode: CollectionMode) => void;
  /** Every changed tag of one action, by name, in one call. */
  onToggleTag?: (names: string[]) => void;
  /** Every changed performer of one action, by choice key, in one call. */
  onTogglePerformer?: (choiceKeys: string[]) => void;
  /** The complete hand edits of one relationship after a change. */
  onRelationshipEditsChange?: (key: TaggerRelationshipKey, edits: TaggerRelationshipEdits) => void;
}

export interface ReviewItem {
  id: string;
  label: string;
  isNew: boolean;
  /** "matched to X" when the scraped name resolved to a differently named existing entity. */
  hint?: string;
  /** The library entity behind this item, when known: the selector edits it by this id. */
  localId?: number;
  /** On the current side (a matched scraped item is on both). */
  inTarget?: boolean;
  /** A current item the edit form would not let go either: derived or managed by an extension. */
  locked?: boolean;
}

const SCALAR_KEYS = ["title", "code", "details", "director", "date"] as const;
const HAND_EDITED_SOURCES = new Set(["user", "manual"]);
/** A selection id for a library item added through search, outside both compared sides. */
const LIBRARY_PREFIX = "library:";
export const libraryItemId = (id: number) => `${LIBRARY_PREFIX}${id}`;
const libraryIdOf = (selectionId: string) => {
  if (!selectionId.startsWith(LIBRARY_PREFIX)) return undefined;
  const id = Number(selectionId.slice(LIBRARY_PREFIX.length));
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

/** True when the person set this field by hand, so a scrape should not silently overwrite it. */
export function isHandEdited(video: Video, fieldKey: string) {
  return (video.fieldProvenance ?? []).some(
    (entry) => entry.fieldKey === fieldKey && HAND_EDITED_SOURCES.has(entry.sourceKey.trim().toLowerCase()),
  );
}

const provenanceLabel = (sourceKey: string, servers: Pick<MetadataServer, "endpoint" | "name">[]) =>
  HAND_EDITED_SOURCES.has(sourceKey.trim().toLowerCase()) ? "Edited by you" : metadataServerLabel(sourceKey, servers);

const normalize = (value?: string | null) => (value ?? "").trim();
const byLabel = <T extends { label: string }>(items: T[]) =>
  [...items].sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base" }));

const item = (id: string, label: string, isNew = false, hint?: string, localId?: number): ReviewItem => ({
  id,
  label,
  isNew,
  hint,
  localId,
});
const itemKey = (value: unknown) => (value as ReviewItem).id;
const itemLabel = (value: unknown) => (value as ReviewItem).label;
const itemIsNew = (value: unknown) => (value as ReviewItem).isNew;
const renderItem = (value: unknown) => {
  const entry = value as ReviewItem;
  return entry.hint ? (
    <span className="inline-flex items-center gap-1">
      {entry.label}
      <span className="text-muted">· matched to {entry.hint}</span>
    </span>
  ) : (
    entry.label
  );
};
const matchHint = (info: Record<string, string> | undefined, id: string, label: string) => {
  const matched = info?.[id];
  return matched && relationKey(matched) !== relationKey(label) ? matched : undefined;
};

/** The ids a collection mode selects, given what each side has. */
function idsForMode(mode: CollectionMode, current: string[], incoming: string[]) {
  if (mode === "skip") return current;
  if (mode === "replace") return incoming;
  return [...new Set([...current, ...incoming])];
}

const sameSet = (left: Iterable<string>, right: Iterable<string>) => {
  const a = new Set(left);
  const b = new Set(right);
  return a.size === b.size && [...a].every((id) => b.has(id));
};

/**
 * The collection mode a selection expresses. The three presets are recognised by their exact id
 * sets, so a scraped item that is also current (one id on both sides) cannot mask them; anything else
 * is a per-item change that keeps the current mode.
 */
function modeForSelection(
  selected: Iterable<string>,
  current: string[],
  incoming: string[],
  previous: CollectionMode,
): CollectionMode {
  const combined = [...new Set([...current, ...incoming])];
  if (sameSet(selected, combined)) return "merge";
  if (sameSet(selected, current)) return "skip";
  if (sameSet(selected, incoming)) return "replace";
  return previous === "skip" ? "merge" : previous;
}

function tagItems(input: TaggerReviewInput) {
  const localTags = new Map(input.video.tags.map((tag) => [relationKey(tag.name), tag]));
  const localIds = new Map([...localTags].map(([key, tag]) => [key, tag.id]));
  const current = byLabel(
    input.currentTagNames.map((name) => {
      const tag = localTags.get(relationKey(name));
      return {
        ...item(relationKey(name), name, false, undefined, tag?.id),
        inTarget: true,
        locked: tag?.canRemove === false || tag?.isDerived === true,
      };
    }),
  );
  const currentIds = new Set(current.map((tag) => tag.id));
  const existing = new Set(input.existingTagNames.map(relationKey));
  const candidates = new Map(input.result.tagCandidates.map((candidate) => [relationKey(candidate.name), candidate]));
  const incoming = byLabel(
    input.result.tagNames.map((name) => {
      const id = relationKey(name);
      const candidate = candidates.get(id);
      return item(
        id,
        name,
        !currentIds.has(id) && !existing.has(id),
        matchHint(input.tagMatchInfo, id, name),
        candidate?.localId ?? localIds.get(id),
      );
    }),
  );
  const included = incoming.filter((tag) => input.tagActions[tag.id] !== "exclude").map((tag) => tag.id);
  return { current, incoming, included, names: new Map(incoming.map((tag) => [tag.id, tag.label])) };
}

const performerIdentity = (performer: { name: string; disambiguation?: string | null }) =>
  performer.disambiguation?.trim() ? `${performer.name} (${performer.disambiguation.trim()})` : performer.name;

function performerItems(input: TaggerReviewInput) {
  const matched = new Set(input.currentPerformerChoiceKeys.map(relationKey));
  const byIdentity = new Map(
    input.video.performers.map((performer) => [relationKey(performerIdentity(performer)), performer.id]),
  );
  const choices = input.performerChoices.map((choice) => ({
    ...item(
      relationKey(choice.key),
      choice.label,
      !choice.candidate.existsLocally,
      matchHint(input.performerMatchInfo, relationKey(choice.key), choice.label),
      choice.candidate.localId ?? byIdentity.get(relationKey(performerIdentity(choice.candidate))),
    ),
    choiceKey: choice.key,
    candidate: choice.candidate,
  }));
  const matchedChoices = choices.filter((choice) => matched.has(choice.id));
  // A current performer is represented by its scraped counterpart when one matched it, whether the
  // match came through a local id or through the same name.
  const linkedIds = new Set(matchedChoices.map((choice) => choice.localId).filter((id) => id != null));
  const linkedNames = new Set(matchedChoices.map((choice) => relationKey(performerIdentity(choice.candidate))));
  const current = byLabel([
    ...matchedChoices.map((choice) => ({
      ...item(choice.id, choice.label, false, undefined, choice.localId),
      inTarget: true,
    })),
    ...input.video.performers
      .filter(
        (performer) => !linkedIds.has(performer.id) && !linkedNames.has(relationKey(performerIdentity(performer))),
      )
      .map((performer) => ({
        ...item(`local:${performer.id}`, performerIdentity(performer), false, undefined, performer.id),
        inTarget: true,
      })),
  ]);
  const included = choices
    .filter((choice) => input.performerActions[choice.id] !== "exclude")
    .map((choice) => choice.id);
  return {
    current,
    incoming: byLabel(choices),
    included,
    choiceKeys: new Map(choices.map((choice) => [choice.id, choice.choiceKey])),
  };
}

const urlItems = (input: TaggerReviewInput) => ({
  current: input.video.urls.map((url) => item(url, url)),
  incoming: input.result.urls.map((url) => item(url, url)),
});

/** The selection of a relationship: the mode's ids, minus hand removals, plus library additions. */
function relationshipSelection(
  mode: CollectionMode,
  current: ReviewItem[],
  included: string[],
  edits: TaggerRelationshipEdits | undefined,
) {
  const removed = new Set(edits?.removed ?? []);
  const ids = idsForMode(
    mode,
    current.map((entry) => entry.id),
    included,
  ).filter((id) => {
    const localId = [...current].find((entry) => entry.id === id)?.localId;
    return localId == null || !removed.has(localId);
  });
  return [...ids, ...(edits?.added ?? []).map(libraryItemId)];
}

/**
 * Maps the selector's id list back to a selection. The selector owns the current side and the
 * search additions; scraped items keep their own chips, so an id that matches a scraped item selects
 * that item while the incoming side is shown and is a plain library addition while it is switched off.
 */
export function selectorChange(items: ReviewItem[], selected: string[], ids: number[], incomingHidden: boolean) {
  const current = items.filter((entry) => entry.inTarget && entry.localId != null);
  const incomingByLocalId = new Map(
    items.filter((entry) => !entry.inTarget && entry.localId != null).map((entry) => [entry.localId!, entry.id]),
  );
  const next = new Set(selected.filter((id) => libraryIdOf(id) == null && !current.some((entry) => entry.id === id)));
  for (const entry of current) if (ids.includes(entry.localId!)) next.add(entry.id);
  for (const id of ids) {
    if (current.some((entry) => entry.localId === id)) continue;
    const incomingId = incomingHidden ? undefined : incomingByLocalId.get(id);
    if (incomingId != null) next.add(incomingId);
    else next.add(libraryItemId(id));
  }
  return [...next];
}

/**
 * The relationship row as the video's edit form shows it: the app's selector with chips, x buttons
 * and search-to-add for the current items and anything added through search, and a chip strip for
 * the scraped items (green when they exist in the library, amber when they would be created, struck
 * through when left out). While the collection is switched off the scraped strip is hidden.
 */
function RelationshipEditor({
  entityType,
  label,
  placeholder,
  items,
  selected,
  onChange,
  disabled,
  incomingHidden,
}: {
  entityType: "tag" | "performer";
  label: string;
  placeholder: string;
  items: ReviewItem[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled: boolean;
  incomingHidden: boolean;
}) {
  const chosen = new Set(selected);
  const current = items.filter((entry) => entry.inTarget && entry.localId != null);
  const libraryIds = selected
    .map(libraryIdOf)
    .filter((id): id is number => id != null && !current.some((entry) => entry.localId === id));
  const seedOptions: EntityReferenceOption[] = current.map((entry) => ({ id: entry.localId!, label: entry.label }));
  const labelOf = new Map(seedOptions.map((option) => [option.id, option.label]));
  const values = [
    ...new Set([...current.filter((entry) => chosen.has(entry.id)).map((entry) => entry.localId!), ...libraryIds]),
  ].sort((left, right) =>
    (labelOf.get(left) ?? "￿").localeCompare(labelOf.get(right) ?? "￿", undefined, { sensitivity: "base" }),
  );
  const lockedIds = current.filter((entry) => entry.locked).map((entry) => entry.localId!);
  const scraped = incomingHidden ? [] : items.filter((entry) => !entry.inTarget);
  const toggle = (entry: ReviewItem) =>
    onChange(chosen.has(entry.id) ? selected.filter((id) => id !== entry.id) : [...selected, entry.id]);
  return (
    <div className="flex flex-col gap-2">
      {scraped.length ? (
        <div className="flex flex-wrap gap-1.5">
          {scraped.map((entry) => {
            const included = chosen.has(entry.id);
            const state = !included ? "excluded" : entry.isNew ? "new" : "added";
            const chipClass =
              state === "new"
                ? "border-amber-400/50 bg-card text-amber-300"
                : state === "added"
                  ? "border-green-400/50 bg-card text-green-300"
                  : "border-dashed border-border bg-transparent text-muted line-through";
            return (
              <span
                key={entry.id}
                data-state={state}
                title={entry.isNew ? "Not in your library yet; will be created" : undefined}
                className={`inline-flex max-w-full items-center gap-1.5 rounded border py-0.5 pl-2 pr-1 text-xs ${chipClass}`}
              >
                {included ? <Plus className="h-3 w-3 shrink-0" /> : null}
                <span className="min-w-0 truncate">{renderItem(entry)}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(entry)}
                  aria-label={`${included ? "Remove" : "Add"} ${label}: ${entry.label}`}
                  className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                >
                  {included ? <X className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
                </button>
              </span>
            );
          })}
        </div>
      ) : null}
      <EntityReferenceMultiSelector
        entityType={entityType}
        values={values}
        lockedIds={lockedIds}
        onChange={(ids) => onChange(selectorChange(items, selected, ids, incomingHidden))}
        placeholder={placeholder}
        seedOptions={seedOptions}
        disabled={disabled}
      />
    </div>
  );
}

export function buildTaggerReview(input: TaggerReviewInput) {
  const { video, result } = input;
  const servers = input.metadataServers ?? [];
  const fields: DiffField[] = [];
  const sourceValues: Record<string, unknown> = {};
  const targetValues: Record<string, unknown> = {};
  const selection: DiffSelection = {};
  const provenance = Object.fromEntries(
    (video.fieldProvenance ?? []).map((entry) => [entry.fieldKey, provenanceLabel(entry.sourceKey, servers)]),
  );

  for (const key of SCALAR_KEYS) {
    if (!normalize(result[key])) continue;
    fields.push({ key, label: key === "details" ? "Details" : key[0].toUpperCase() + key.slice(1) });
    sourceValues[key] = result[key];
    targetValues[key] = video[key] ?? null;
    selection[key] = input.fieldStrategies[key] === "overwrite" ? "source" : "target";
  }
  if (result.imageUrl) {
    fields.push({
      key: "image",
      label: "Cover",
      alwaysVisible: true,
      render: (value) => (
        <img src={String(value)} alt="Video cover" className="max-h-40 w-full rounded object-contain" />
      ),
    });
    sourceValues.image = result.imageUrl;
    targetValues.image = video.imagePath || videos.screenshotUrl(video.id, video.updatedAt);
    selection.image = input.imageReplace ? "source" : "target";
  }
  if (result.studioName && input.showStudio) {
    fields.push({ key: "studio", label: "Studio" });
    sourceValues.studio = result.studioName;
    targetValues.studio = video.studioName ?? null;
    selection.studio = input.collectionModes.studio === "replace" ? "source" : "target";
  }
  // With a collection switched off, its chips are not the way back in: the presets are.
  const listField = (key: string, label: string, mode: CollectionMode, modesOnly = false): DiffField => ({
    key,
    label,
    kind: "list",
    itemKey,
    itemLabel,
    renderItem,
    itemIsNew,
    modesOnly: modesOnly || mode === "skip",
    lockKeptItems: true,
  });
  if (result.urls.length > 0) {
    const urls = urlItems(input);
    const mode = input.collectionModes.urls ?? "merge";
    fields.push(listField("urls", "URLs", mode, true));
    sourceValues.urls = urls.incoming;
    targetValues.urls = urls.current;
    selection.urls = idsForMode(
      mode,
      urls.current.map((url) => url.id),
      urls.incoming.map((url) => url.id),
    );
  }
  // Tags and performers are edited the way the video's edit form edits them, so a library item can
  // be added and a current one taken off beside the scrape; the amber chips stay for new items.
  const relationship = (
    key: TaggerRelationshipKey,
    label: string,
    entityType: "tag" | "performer",
    placeholder: string,
    current: ReviewItem[],
    incoming: ReviewItem[],
    included: string[],
    edits: TaggerRelationshipEdits | undefined,
  ) => {
    const mode = input.collectionModes[key] ?? "merge";
    const field = listField(key, label, mode);
    field.lockKeptItems = false;
    field.renderList = (selected, onChange, disabled) => (
      <RelationshipEditor
        entityType={entityType}
        label={label}
        placeholder={placeholder}
        items={[...current, ...incoming.filter((entry) => !current.some((known) => known.id === entry.id))]}
        selected={selected}
        onChange={onChange}
        disabled={disabled}
        incomingHidden={mode === "skip"}
      />
    );
    fields.push(field);
    sourceValues[key] = incoming;
    targetValues[key] = current;
    selection[key] = relationshipSelection(mode, current, included, edits);
  };
  // Always present when the collection is on, as in the edit form: there is something to add even
  // when neither side has an item yet.
  if (input.showPerformers) {
    const performers = performerItems(input);
    relationship(
      "performers",
      "Performers",
      "performer",
      "Search performers...",
      performers.current,
      performers.incoming,
      performers.included,
      input.performerEdits,
    );
  }
  if (input.showTags) {
    const tags = tagItems(input);
    relationship("tags", "Tags", "tag", "Search tags...", tags.current, tags.incoming, tags.included, input.tagEdits);
  }

  const source: DiffRecord = {
    label: `From ${input.sourceName}`,
    sentenceLabel: input.sourceName,
    values: sourceValues,
  };
  const target: DiffRecord = { label: "Current", sentenceLabel: "current", values: targetValues, provenance };
  return { fields, source, target, selection };
}

/**
 * Translates a changed selection back into the tagger's callbacks. Scalars flip a field strategy;
 * a list first checks whether the selection is one of the presets (which sets the collection mode)
 * and then toggles, in one call, every incoming-only item whose inclusion changed. Library ids
 * outside both sides and current items taken off are hand edits and go to their own callback.
 */
export function applyTaggerSelectionChange(
  input: TaggerReviewInput,
  previous: DiffSelection,
  next: DiffSelection,
  handlers: TaggerReviewHandlers,
) {
  for (const key of SCALAR_KEYS) {
    if (next[key] !== previous[key] && next[key] != null)
      handlers.onFieldStrategyChange?.(key, next[key] === "source" ? "overwrite" : "ignore");
  }
  if (next.image !== previous.image && next.image != null)
    handlers.onFieldStrategyChange?.("image", next.image === "source" ? "overwrite" : "ignore");
  if (next.studio !== previous.studio && next.studio != null)
    handlers.onCollectionModeChange?.("studio", next.studio === "source" ? "replace" : "skip");

  const listChange = (
    key: "urls" | TaggerRelationshipKey,
    current: ReviewItem[],
    incoming: ReviewItem[],
    onToggle?: (ids: string[]) => void,
    edits?: TaggerRelationshipEdits,
  ) => {
    const rawSelected = next[key];
    if (!Array.isArray(rawSelected) || sameSet(rawSelected, (previous[key] as string[] | undefined) ?? [])) return;
    const currentIds = current.map((entry) => entry.id);
    const incomingIds = incoming.map((entry) => entry.id);
    const sideIds = rawSelected.filter((id) => libraryIdOf(id) == null);
    // A preset names the whole sides; anything else that drops a current item is a hand removal,
    // which does not touch the collection mode.
    // Taking the last current-only item off looks exactly like "Only incoming" and comes out the same,
    // so it reads as that preset.
    const isPreset =
      sameSet(sideIds, currentIds) ||
      sameSet(sideIds, incomingIds) ||
      sameSet(sideIds, [...new Set([...currentIds, ...incomingIds])]);
    if (key !== "urls") {
      const added = rawSelected.map(libraryIdOf).filter((id): id is number => id != null);
      const removed = isPreset
        ? []
        : current
            .filter((entry) => entry.localId != null && !sideIds.includes(entry.id))
            .map((entry) => entry.localId!);
      const nextEdits = { added: [...new Set(added)], removed: [...new Set(removed)] };
      const same = (left: number[], right: number[]) => sameSet(left.map(String), right.map(String));
      if (!same(nextEdits.added, edits?.added ?? []) || !same(nextEdits.removed, edits?.removed ?? []))
        handlers.onRelationshipEditsChange?.(key, nextEdits);
    }
    const selected = isPreset ? sideIds : [...new Set([...sideIds, ...currentIds])];
    const wasSelected = new Set([
      ...((previous[key] as string[] | undefined) ?? []).filter((id) => libraryIdOf(id) == null),
      ...(isPreset ? [] : currentIds),
    ]);
    if (sameSet(selected, wasSelected)) return;
    const chosen = new Set(selected);
    const previousMode = input.collectionModes[key] ?? "merge";
    const currentSet = new Set(currentIds);
    const changed = incomingIds.filter((id) => !currentSet.has(id) && chosen.has(id) !== wasSelected.has(id));
    const currentChanged = currentIds.some((id) => chosen.has(id) !== wasSelected.has(id));
    // One incoming chip flipped is a per-item choice even when the result happens to look like a
    // preset (dropping the last incoming item leaves exactly the current side).
    const singleChip = Boolean(onToggle) && changed.length === 1 && !currentChanged && previousMode !== "skip";
    const mode = singleChip ? previousMode : modeForSelection(chosen, currentIds, incomingIds, previousMode);
    if (mode !== previousMode) handlers.onCollectionModeChange?.(key, mode);
    // Switched off, or just switched back on: the incoming side is taken as a whole and exclusions
    // stay as they were.
    if (mode === "skip" || previousMode === "skip" || !onToggle) return;
    if (changed.length > 0) onToggle(changed);
  };

  const urls = urlItems(input);
  listChange("urls", urls.current, urls.incoming);
  const tags = tagItems(input);
  listChange(
    "tags",
    tags.current,
    tags.incoming,
    (ids) =>
      handlers.onToggleTag?.(ids.map((id) => tags.names.get(id)).filter((name): name is string => Boolean(name))),
    input.tagEdits,
  );
  const performers = performerItems(input);
  listChange(
    "performers",
    performers.current,
    performers.incoming,
    (ids) =>
      handlers.onTogglePerformer?.(
        ids.map((id) => performers.choiceKeys.get(id)).filter((key): key is string => Boolean(key)),
      ),
    input.performerEdits,
  );
}
