import { describe, expect, it } from "vitest";
import { getResolutionBucketLabel } from "../utils/resolutionBuckets";

describe("getResolutionBucketLabel", () => {
  // Cove stores display dimensions, so a rotation-flagged file's width and height are transposed
  // relative to its coded grid. The badge is derived from the long and short edges, so it must not
  // notice. Pinned because that symmetry is incidental to Math.max/Math.min: reintroducing an
  // orientation-dependent read here would rebucket every rotated video in the library.
  it.each([
    [1920, 1080],
    [3840, 2160],
    [1280, 720],
    [854, 480],
  ])("gives a rotated %ix%i file the same badge as an unrotated one", (long, short) => {
    expect(getResolutionBucketLabel(short, long)).toBe(getResolutionBucketLabel(long, short));
  });

  it("still reports the familiar labels for the orientations either way round", () => {
    expect(getResolutionBucketLabel(1920, 1080)).toBe("1080p");
    expect(getResolutionBucketLabel(1080, 1920)).toBe("1080p");
    expect(getResolutionBucketLabel(3840, 2160)).toBe("4K");
    expect(getResolutionBucketLabel(2160, 3840)).toBe("4K");
  });

  it("returns null for dimensions that cannot describe a picture", () => {
    expect(getResolutionBucketLabel(0, 1080)).toBeNull();
    expect(getResolutionBucketLabel(1920, -1)).toBeNull();
    expect(getResolutionBucketLabel(Number.NaN, 1080)).toBeNull();
  });
});
