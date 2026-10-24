import { lazy, Suspense, type ComponentProps } from "react";
import type ReactMarkdownComponent from "react-markdown";

// react-markdown and its parser are a large share of the shared bundle but only render for viewers who
// turned Markdown on, text documents, and the manual. They load the first time one renders.
const ReactMarkdown = lazy(() => import("react-markdown"));

/** react-markdown, loaded on first use; until it arrives the text shows as written. */
export function LazyMarkdown(props: ComponentProps<typeof ReactMarkdownComponent>) {
  return (
    <Suspense fallback={<div className="whitespace-pre-wrap">{props.children}</div>}>
      <ReactMarkdown {...props} />
    </Suspense>
  );
}

const SAFE_LINK_PROTOCOL = /^(https?|ircs?|mailto|xmpp)$/i;

/**
 * react-markdown's link rule (its `defaultUrlTransform`), kept here so checking a link does not load the
 * parser: a relative URL, or one whose protocol is http(s), irc(s), mailto or xmpp; otherwise undefined.
 */
export function safeMarkdownLinkHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const colon = href.indexOf(":");
  const questionMark = href.indexOf("?");
  const numberSign = href.indexOf("#");
  const slash = href.indexOf("/");
  const isRelative =
    colon === -1 ||
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign);
  return isRelative || SAFE_LINK_PROTOCOL.test(href.slice(0, colon)) ? href : undefined;
}
