import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

vi.mock("../hooks/useEntityEngagement", () => ({
  useEntityEngagement: () => ({
    engagement: { hostId: 152376, likeCount: 0, rating: null },
    rating: null,
    setRating: vi.fn(),
    ratingPending: false,
  }),
}));

vi.mock("../api/client", () => ({
  images: { incrementLike: vi.fn().mockResolvedValue(0) },
  playback: { recordIntervals: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("../utils/interactionTracking", () => ({
  createPlaybackSessionId: () => "session",
  trackInteraction: vi.fn(),
}));

import { Lightbox } from "../components/Lightbox";

function renderLightbox() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Lightbox
        images={[{ id: 152376, src: "/image.jpg", title: "001.jpg" }]}
        initialIndex={0}
        open
        onClose={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

function zoomControl(name: string) {
  return screen.getByRole("button", { name });
}

function iconClassesOf(name: string) {
  const icon = zoomControl(name).querySelector("svg");
  expect(icon).not.toBeNull();
  return Array.from(icon!.classList).filter((className) => className.startsWith("lucide-"));
}

describe("Lightbox zoom controls", () => {
  it("gives reset zoom its own icon so it is not mistaken for zoom out", () => {
    renderLightbox();

    expect(iconClassesOf("Zoom out")).toContain("lucide-zoom-out");
    expect(iconClassesOf("Zoom in")).toContain("lucide-zoom-in");
    expect(iconClassesOf("Reset zoom")).toContain("lucide-rotate-ccw");
  });

  it("labels every zoom control on hover", () => {
    renderLightbox();

    expect(zoomControl("Zoom out")).toHaveAttribute("title", "Zoom out");
    expect(zoomControl("Zoom in")).toHaveAttribute("title", "Zoom in");
    expect(zoomControl("Reset zoom")).toHaveAttribute("title", "Reset zoom");
  });

  it("returns the image to its unzoomed scale when reset zoom is used", () => {
    renderLightbox();
    const image = screen.getByRole("img", { name: "001.jpg" });

    fireEvent.click(zoomControl("Zoom in"));
    expect(image).toHaveStyle({ transform: "scale(1.5) translate(0px, 0px)" });

    fireEvent.click(zoomControl("Reset zoom"));
    expect(image).toHaveStyle({ transform: "scale(1) translate(0px, 0px)" });
  });
});
