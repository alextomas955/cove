import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { metadataServerEntityUrl } from "../components/MetadataServerLinks";

export interface SubmittedMetadataServerDraft {
  draftId: string | null;
  /** The draft's page on the metadata server, or null when the server returned no ID or the endpoint is not a stash-box GraphQL URL. */
  draftUrl: string | null;
}

interface DraftSubmission {
  endpoint: string | undefined;
  tab: Window | null;
}

/**
 * Submits a draft to a metadata server and shows it in a new tab once the server has accepted it.
 *
 * The tab is opened in the click itself and pointed at the draft when the response arrives: a
 * `window.open` made after awaiting the request has lost the click's user activation and is blocked
 * as a popup. The tab is handled inside the mutation rather than in per-call callbacks so it still
 * resolves if the component that started the submission unmounts first.
 */
export function useMetadataServerDraftSubmit(submit: (endpoint: string) => Promise<{ draftId: string | null }>) {
  const mutation = useMutation<SubmittedMetadataServerDraft, Error, DraftSubmission>({
    meta: { suppressGlobalError: true },
    mutationFn: async ({ endpoint, tab }) => {
      try {
        if (!endpoint) throw new Error("Select a metadata-server source first.");
        const { draftId } = await submit(endpoint);
        const draftUrl = draftId ? metadataServerDraftUrl(endpoint, draftId) : null;
        if (draftUrl && tab && !tab.closed) tab.location.replace(draftUrl);
        else tab?.close();
        return { draftId, draftUrl };
      } catch (error) {
        tab?.close();
        throw error;
      }
    },
  });

  const { mutate } = mutation;
  const submitDraft = useCallback(
    (endpoint: string | undefined) => {
      // An endpoint that cannot link to a draft page would only flash an empty tab open and shut.
      const canOpenDraft = Boolean(endpoint) && metadataServerDraftUrl(endpoint!, "draft") !== null;
      mutate({ endpoint, tab: canOpenDraft ? openPendingDraftTab() : null });
    },
    [mutate],
  );

  return { ...mutation, submitDraft };
}

function metadataServerDraftUrl(endpoint: string, draftId: string): string | null {
  return metadataServerEntityUrl(endpoint, "drafts", draftId);
}

function openPendingDraftTab(): Window | null {
  const tab = window.open("", "_blank");
  if (!tab) return null;
  // The draft page is another site; it gets no handle back to Cove once the tab navigates there.
  tab.opener = null;
  try {
    tab.document.title = "Submitting draft…";
    tab.document.body.textContent = "Submitting draft…";
  } catch {
    // The placeholder is cosmetic; the tab is still navigated or closed when the request settles.
  }
  return tab;
}
