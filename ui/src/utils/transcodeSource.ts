import { videos } from "../api/client";

export const HLS_MIME_TYPE = "application/vnd.apple.mpegurl";
export const PIPED_TRANSCODE_MIME_TYPE = "video/mp4";

// Safari (macOS and iOS) plays HLS natively but does not play Cove's live-piped fragmented MP4: its
// media stack expects a seekable, known-length resource, and treats a chunked, unseekable stream with
// no duration as broken. Chromium and Firefox tolerate the piped stream, so they keep the transcode
// endpoint. Chromium answers "maybe" to the HLS canPlayType probe yet never loads a playlist, so the
// probe is combined with a Blink/Gecko exclusion (every iOS browser is WebKit and lacks those tokens).
export function supportsNativeHls(): boolean {
  if (typeof document === "undefined" || typeof navigator === "undefined") return false;
  try {
    if (/(?:Chrome|Chromium|Firefox)\//.test(navigator.userAgent)) return false;
    const probe = document.createElement("video");
    return typeof probe.canPlayType === "function" && probe.canPlayType(HLS_MIME_TYPE) !== "";
  } catch {
    return false;
  }
}

export interface TranscodeSource {
  url: string;
  type: string;
}

/**
 * The media source for a server transcode of `videoId`, delivered as an HLS playlist on browsers with
 * native HLS support and as the piped MP4 stream elsewhere. Both start at `start` seconds of the
 * original, so the caller keeps treating media time 0 as `start` regardless of delivery.
 */
export function transcodeSource(
  videoId: number,
  resolution: string | undefined,
  start: number | undefined,
  fileId: number | undefined,
  nativeHls: boolean = supportsNativeHls(),
): TranscodeSource {
  const startParam = start != null && start > 0 ? start : undefined;
  return nativeHls
    ? { url: videos.hlsPlaylistUrl(videoId, resolution ?? "original", startParam, fileId), type: HLS_MIME_TYPE }
    : { url: videos.transcodeUrl(videoId, resolution, startParam, fileId), type: PIPED_TRANSCODE_MIME_TYPE };
}
