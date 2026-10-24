import type { TutorialOpenRequest } from "./ManualContext";

// Kept apart from the dialog so opening the tutorial, which the navbar and settings offer on every page,
// does not put the whole storyboard in the shared bundle; the dialog loads when it first opens.
export const TUTORIAL_STORYBOARD_STORAGE_KEY = "cove-tutorial-storyboard-complete";
export const TUTORIAL_STORYBOARD_EVENT = "cove:tutorial-storyboard-open";

export function hasCompletedTutorialStoryboard() {
  return localStorage.getItem(TUTORIAL_STORYBOARD_STORAGE_KEY) === "true";
}

export function openTutorialStoryboard(request?: TutorialOpenRequest | string) {
  const detail = typeof request === "string" ? { topicId: request } : request;
  window.dispatchEvent(new CustomEvent<TutorialOpenRequest | undefined>(TUTORIAL_STORYBOARD_EVENT, { detail }));
}
