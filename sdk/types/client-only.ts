// Hand-maintained client-only types for the Cove API surface.
//
// Every declaration here is a convenience shape used only by API clients (the web UI and
// extension authors). None of these has a wire/DTO counterpart in the OpenAPI document:
// they are either UI-side unions, projections returned inline from otherwise-untyped
// endpoints, or structural generics over the monomorphized paginated/filtered instances
// that the generated surface already carries. This file is intentionally NOT produced by
// the codegen (the generator only overwrites ./openapi.ts) and must never re-mirror a
// schema that exists in ./openapi.ts — anything with a wire counterpart belongs there.
//
// The few shapes that reference a real wire type import it from the generated surface so
// there is a single source of truth for those fields.

import type {
  AffinityHostType,
  ApplyVideoScrapeAttempt,
  CustomFieldCriterion as CustomFieldCriterionWire,
  CustomFieldDefinition as CustomFieldDefinitionWire,
  DownloaderBatchItem as DownloaderBatchItemWire,
  DownloaderStartRequest as DownloaderStartRequestWire,
  EngagementInteraction as EngagementInteractionWire,
  EngagementInteractionWrite as EngagementInteractionWriteWire,
  FaceAppearance,
  FindFilter,
  Image,
  Segment as SegmentWire,
  Tag as TagWire,
  TagList,
  Video,
  VideoFilter as VideoFilterWire,
} from "./openapi";

// ===== Client-side unions (no wire enum) =====

/** Host kinds the client records engagement/interaction against, widened beyond the wire
 *  affinity hosts with UI-only surfaces (search, collection). */
export type InteractionHostType = AffinityHostType | "segment" | "search" | "collection";

export type AiDataKind = "embedding" | "detection" | "segment" | "tagApplication" | "face";

export type AuthUserKind = "user" | "shareLink" | "apiToken" | "system" | "anonymous";

export type CustomFieldEntityType =
  | "video" | "audio" | "text" | "performer" | "tag" | "studio" | "gallery" | "image" | "group" | "face";

export type CustomFieldType =
  | "text" | "longText" | "number" | "boolean" | "date" | "timestamp" | "duration" | "percent"
  | "url" | "enum" | "tag" | "performer" | "studio" | "video" | "gallery" | "image" | "group";

export type ScrapeCollectionItemAction = "include" | "create" | "exclude";

export type SegmentSpanOperator = "union" | "intersection" | "difference";

export type FingerprintAlgorithm = "md5" | "oshash" | "phash";

// ===== Client-side aliases and inline projections (no named wire DTO) =====

/** Client alias kept for call sites that apply a scrape attempt without the "Video" qualifier. */
export type ApplyScrapeAttemptRequest = ApplyVideoScrapeAttempt;

/** Inline projection returned by the visual/audio similarity endpoints (no named server DTO). */
export interface VisualSimilarVideo {
  video: Video;
  distance: number;
  sectionIndex: number;
  startSec?: number;
  endSec?: number;
}

export interface AudioSimilarVideo {
  video: Video;
  distance: number;
  sectionIndex: number;
  startSec?: number;
  endSec?: number;
}

export interface VisualSimilarImage {
  image: Image;
  distance: number;
}

/** Query-string options the client sends when deleting an entity. */
export interface DeleteEntityOptions {
  deleteFile?: boolean;
  deleteGenerated?: boolean;
}

export interface SegmentDerivedQueryOperandDescriptor {
  sourceKey?: string;
  kind?: string;
  tagIds?: number[];
  performerIds?: number[];
  faceIds?: number[];
  minConfidence?: number;
}

export interface SegmentDerivedQueryDescriptor {
  operator: SegmentSpanOperator;
  operands: SegmentDerivedQueryOperandDescriptor[];
  mergeGapSec?: number;
  minDurationSec?: number;
}

export interface FaceNotPresentResult {
  faceFound: boolean;
  hostHadFace: boolean;
  movedHostCount: number;
  targetFaceId?: number;
  createdNewFace: boolean;
  mergedIntoTarget: boolean;
  sourceFaceEmptied: boolean;
}

export interface AiFaceCoverRepairRequest {
  force?: boolean;
  faceIds?: number[];
}

export interface AiFaceCoverRepairResult {
  scannedCount: number;
  repairedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
}

export interface DownloaderBatchGenerateOptions {
  thumbnails?: boolean;
  previews?: boolean;
  sprites?: boolean;
  segments?: boolean;
  segmentThumbnails?: boolean;
  segmentPreviews?: boolean;
  phashes?: boolean;
  md5?: boolean;
  imageThumbnails?: boolean;
  imagePhashes?: boolean;
  overwrite?: boolean;
  videoIds?: number[];
  paths?: string[];
}

/** Aggregate returned inline by the face-appearances summary path; no producing wire DTO. */
export interface FaceAppearancesResponse {
  items: FaceAppearance[];
  totalVideos: number;
  totalImages: number;
}

// ===== Client views over wire types (base wire shape plus UI-held fields) =====
// Each of these is the generated wire type plus a few fields the UI carries but no single wire
// schema declares on that type. The added fields are all optional and either come from a sibling
// list schema (Tag counts) or are enrichments the UI attaches; they reference the generated types
// so field types stay in sync. These are client views, not DTO mirrors, and never re-declare the
// wire shape.

// Views whose name matches a wire type are suffixed here and re-exported under the public name by
// the client barrel, so the generated wire type keeps its own name in the package.

/** A tag as the UI holds it: the base tag plus the aggregate counts and image path that the
 *  list endpoints add (sourced from the tag-list wire schema). */
export type TagView = TagWire &
  Partial<
    Pick<
      TagList,
      | "videoCount"
      | "segmentCount"
      | "imageCount"
      | "galleryCount"
      | "groupCount"
      | "performerCount"
      | "studioCount"
      | "imagePath"
    >
  >;

/** A segment plus the reference/performer labels the UI resolves for display. */
export type SegmentView = SegmentWire & {
  refLabel?: string;
  performerId?: number;
  performerName?: string;
};

/** An engagement interaction plus the playback position/duration/session the UI tracks. */
export type EngagementInteractionView = EngagementInteractionWire & {
  positionSec?: number;
  durationSec?: number;
  sessionId?: string;
};

export type EngagementInteractionWriteView = EngagementInteractionWriteWire & {
  positionSec?: number;
  durationSec?: number;
  sessionId?: string;
};

/** Download requests the UI can flag to also hydrate performer metadata. */
export type DownloaderStartRequestView = DownloaderStartRequestWire & { hydratePerformers?: boolean };

export type DownloaderBatchItemView = DownloaderBatchItemWire & { hydratePerformers?: boolean };

/** The video filter plus the UI-only toggle for including compilation groups. */
export type VideoFilterCriteria = VideoFilterWire & { includeCompilationGroups?: boolean };

/** A custom-field definition whose `type` is narrowed to the known field kinds the UI switches on
 *  (the wire carries it as an open string). */
export type CustomFieldDefinitionView = Omit<CustomFieldDefinitionWire, "type"> & { type: CustomFieldType };

/** A custom-field filter criterion plus the display labels the UI resolves for reference values. */
export type CustomFieldCriterionView = CustomFieldCriterionWire & { displayValue?: string; displayValue2?: string };

// ===== Structural generics =====
// The generated surface carries monomorphized instantiations (PaginatedResponseOfVideo,
// FilteredQueryRequestOfVideoFilter, ...). These generics let client code stay parametric
// over the element/filter type; they are structural helpers, not DTO mirrors.

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  perPage: number;
}

export interface FilteredQueryRequest<T = Record<string, unknown>> {
  findFilter?: FindFilter;
  objectFilter?: T;
}
