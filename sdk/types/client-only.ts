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
  FaceAppearance,
  FindFilter,
  Image,
  Video,
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
