import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { useAppConfig } from "../state/AppConfigContext";

function getAppTitle(configuredTitle: string | null | undefined) {
  const trimmedTitle = configuredTitle?.trim();
  return trimmedTitle ? trimmedTitle : "Cove";
}

// Several components can claim the title at once: an extension page's scope and the ListPage or
// editor it renders. The innermost claim wins. Parents render before their children, so the claim
// whose component first rendered last is the innermost; between siblings, the later-mounted wins.
interface TitleClaim {
  order: number;
  pageTitle: string;
}

const claims = new Map<number, TitleClaim>();
let nextClaimOrder = 0;

function applyDocumentTitle(appTitle: string) {
  let winner: TitleClaim | undefined;
  for (const claim of claims.values()) {
    if (!winner || claim.order > winner.order) {
      winner = claim;
    }
  }

  if (winner) {
    document.body.dataset.covePageTitle = winner.pageTitle;
    document.title = `${winner.pageTitle} | ${appTitle}`;
  } else {
    delete document.body.dataset.covePageTitle;
    document.title = appTitle;
  }
}

function useTitleClaim(pageTitle: string | undefined, enabled: boolean) {
  const { config } = useAppConfig();
  const appTitle = getAppTitle(config?.ui.title);
  const [order] = useState(() => nextClaimOrder++);

  useEffect(() => {
    if (!enabled) return;
    if (pageTitle) {
      claims.set(order, { order, pageTitle });
    }
    applyDocumentTitle(appTitle);

    return () => {
      claims.delete(order);
      applyDocumentTitle(appTitle);
    };
  }, [appTitle, enabled, order, pageTitle]);
}

const DocumentTitleScopeContext = createContext<string | undefined>(undefined);

/**
 * Names a section of the app, such as an extension page, in the browser title. The section's name
 * is the title until something inside it calls useDocumentTitle, which then reads
 * "<page> | <section> | <app>".
 */
export function DocumentTitleScope({ title, children }: { title?: string | null; children?: ReactNode }) {
  const parentScope = useContext(DocumentTitleScopeContext);
  const trimmedTitle = title?.trim();
  const scopeTitle = trimmedTitle ? (parentScope ? `${trimmedTitle} | ${parentScope}` : trimmedTitle) : parentScope;
  useTitleClaim(scopeTitle, true);
  return createElement(DocumentTitleScopeContext.Provider, { value: scopeTitle }, children);
}

/**
 * Sets the browser title to "<pageTitle> | <app>" while the calling component is mounted. Inside a
 * DocumentTitleScope, such as an extension-contributed page, it reads "<pageTitle> | <scope> | <app>";
 * elsewhere, such as a tab on a built-in detail page, it replaces that page's title. When several
 * components set a title, the innermost wins, and between siblings the later-mounted one. An empty
 * title leaves the title to the enclosing component.
 */
export function useDocumentTitle(pageTitle?: string | null, enabled = true) {
  const scopeTitle = useContext(DocumentTitleScopeContext);
  const trimmedPageTitle = pageTitle?.trim();
  const fullPageTitle = trimmedPageTitle && scopeTitle ? `${trimmedPageTitle} | ${scopeTitle}` : trimmedPageTitle;
  useTitleClaim(fullPageTitle, enabled);
}
