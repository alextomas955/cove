import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { CloudUpload, ExternalLink, Loader2, X } from "lucide-react";
import type { MetadataServer } from "../api/types";
import { useMetadataServerDraftSubmit } from "../hooks/useMetadataServerDraftSubmit";

interface Props {
  onClose: () => void;
  /** Lower-case singular noun for the entity being submitted, e.g. "video". */
  entityLabel: string;
  /** What the draft carries, as it reads after "Send this video's". */
  submittedContent?: string;
  metadataServers: Pick<MetadataServer, "endpoint" | "name">[];
  submit: (endpoint: string) => Promise<{ draftId: string | null }>;
}

/** Mount only while open: each mounting starts from the form rather than a previous submission's result. */
export function MetadataServerDraftDialog({
  onClose,
  entityLabel,
  submittedContent = "current metadata",
  metadataServers,
  submit,
}: Props) {
  const [endpoint, setEndpoint] = useState(() => metadataServers[0]?.endpoint ?? "");
  const draft = useMetadataServerDraftSubmit(submit);
  const titleId = useId();
  const serverSelectId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Every control is disabled while the request runs, so the dialog itself holds focus (keeping Escape
  // and the Tab trap working), then hands it to the control that fits the outcome: Close after a
  // success, Submit to retry after a failure.
  useEffect(() => {
    if (draft.status === "idle") {
      const initial = dialogRef.current?.querySelector<HTMLElement>("select") ?? submitButtonRef.current;
      initial?.focus();
    } else if (draft.status === "pending") {
      dialogRef.current?.focus();
    } else if (draft.status === "success") {
      closeButtonRef.current?.focus();
    } else if (draft.status === "error") {
      submitButtonRef.current?.focus();
    }
  }, [draft.status]);

  const serverName = (value: string) => {
    const server = metadataServers.find((item) => item.endpoint === value);
    return server?.name || value;
  };
  const close = () => {
    if (!draft.isPending) onClose();
  };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
      ),
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={close} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl"
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 id={titleId} className="flex items-center gap-2 text-lg font-semibold">
            <CloudUpload className="h-5 w-5 text-accent" />
            Submit Draft
          </h3>
          <button
            type="button"
            onClick={close}
            disabled={draft.isPending}
            className="text-muted hover:text-foreground disabled:opacity-60"
            aria-label="Close submit draft dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {draft.isSuccess ? (
          <div role="status" className="mb-4 space-y-2 text-sm text-secondary">
            <p>
              The {entityLabel} draft was submitted to {serverName(draft.variables.endpoint ?? "")}
              {draft.data.draftUrl || !draft.data.draftId ? "." : ` (${draft.data.draftId}).`}
            </p>
            {draft.data.draftUrl ? (
              <a
                href={draft.data.draftUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-accent hover:underline"
              >
                Open draft
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-secondary">
              Send this {entityLabel}&apos;s {submittedContent} to a metadata server as a draft. The draft opens in a
              new tab, where you can review and submit it.
            </p>
            {metadataServers.length === 0 ? (
              <p className="mb-4 rounded border border-dashed border-border px-3 py-3 text-sm text-muted">
                No metadata servers are configured. Add one in Settings before submitting a draft.
              </p>
            ) : metadataServers.length > 1 ? (
              <div className="mb-4 space-y-1">
                <label htmlFor={serverSelectId} className="block text-sm font-medium text-foreground">
                  Metadata server
                </label>
                <select
                  id={serverSelectId}
                  value={endpoint}
                  onChange={(event) => setEndpoint(event.target.value)}
                  disabled={draft.isPending}
                  className="w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  {metadataServers.map((server) => (
                    <option key={server.endpoint} value={server.endpoint}>
                      {server.name || server.endpoint}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="mb-4 text-sm text-secondary">
                Metadata server: <span className="text-foreground">{serverName(endpoint)}</span>
              </p>
            )}
          </>
        )}

        {draft.isError ? (
          <div role="alert" className="mb-4 rounded border border-red-700 bg-red-950/60 px-3 py-2 text-sm text-red-200">
            {draft.error.message}
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            ref={closeButtonRef}
            onClick={close}
            disabled={draft.isPending}
            className="px-4 py-2 text-sm text-secondary transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {draft.isSuccess ? "Close" : "Cancel"}
          </button>
          {draft.isSuccess ? null : (
            <button
              type="button"
              ref={submitButtonRef}
              onClick={() => draft.submitDraft(endpoint || undefined)}
              disabled={draft.isPending || !endpoint}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {draft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
              Submit draft
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
