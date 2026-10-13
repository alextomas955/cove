import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentTitleScope, useDocumentTitle } from "../hooks/useDocumentTitle";

vi.mock("../state/AppConfigContext", () => ({
  useAppConfig: () => ({ config: { ui: { title: "Cove" } } }),
}));

function Titled({ title, children }: { title?: string; children?: ReactNode }) {
  useDocumentTitle(title);
  return <>{children}</>;
}

describe("useDocumentTitle", () => {
  afterEach(() => {
    document.title = "";
    delete document.body.dataset.covePageTitle;
  });

  it("names the page in front of the app title and restores the app title on unmount", () => {
    const { unmount } = render(<Titled title="Videos" />);
    expect(document.title).toBe("Videos | Cove");
    expect(document.body.dataset.covePageTitle).toBe("Videos");

    unmount();
    expect(document.title).toBe("Cove");
    expect(document.body.dataset.covePageTitle).toBeUndefined();
  });

  it("titles a scope with its own name until something inside claims the title", () => {
    const { rerender } = render(
      <DocumentTitleScope title="Segment Studio">
        <Titled />
      </DocumentTitleScope>,
    );
    expect(document.title).toBe("Segment Studio | Cove");

    rerender(
      <DocumentTitleScope title="Segment Studio">
        <Titled title="A video" />
      </DocumentTitleScope>,
    );
    expect(document.title).toBe("A video | Segment Studio | Cove");
    expect(document.body.dataset.covePageTitle).toBe("A video | Segment Studio");
  });

  it("lets the innermost claim win and falls back outward as claims unmount", () => {
    const { rerender } = render(
      <DocumentTitleScope title="Segment Studio">
        <Titled title="Segments">
          <Titled title="A video" />
        </Titled>
      </DocumentTitleScope>,
    );
    expect(document.title).toBe("A video | Segment Studio | Cove");

    rerender(
      <DocumentTitleScope title="Segment Studio">
        <Titled title="Segments" />
      </DocumentTitleScope>,
    );
    expect(document.title).toBe("Segments | Segment Studio | Cove");

    rerender(<DocumentTitleScope title="Segment Studio" />);
    expect(document.title).toBe("Segment Studio | Cove");
  });

  it("gives a later-mounted sibling the title over one already showing", () => {
    const { rerender } = render(
      <DocumentTitleScope title="Segment Studio">
        <Titled key="list" title="Videos" />
      </DocumentTitleScope>,
    );
    rerender(
      <DocumentTitleScope title="Segment Studio">
        <Titled key="list" title="Videos" />
        <Titled key="editor" title="A video" />
      </DocumentTitleScope>,
    );
    expect(document.title).toBe("A video | Segment Studio | Cove");
  });

  it("leaves the title to the enclosing component while disabled", () => {
    function Disabled() {
      useDocumentTitle("Videos", false);
      return null;
    }
    render(
      <DocumentTitleScope title="Segment Studio">
        <Disabled />
      </DocumentTitleScope>,
    );
    expect(document.title).toBe("Segment Studio | Cove");
  });

  it("does not let a title mounted outside the page override the page's own", () => {
    render(
      <>
        <Titled title="Floating" />
        <DocumentTitleScope title="Segment Studio" />
      </>,
    );
    expect(document.title).toBe("Segment Studio | Cove");
  });

  it("keeps the claim's place when its title changes", () => {
    const { rerender } = render(
      <Titled title="Outer">
        <Titled title="Inner" />
      </Titled>,
    );
    rerender(
      <Titled title="Outer, renamed">
        <Titled title="Inner" />
      </Titled>,
    );
    expect(document.title).toBe("Inner | Cove");
  });
});
