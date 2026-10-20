import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "../components/Navbar";

vi.mock("../components/JobDrawer", () => ({
  JobDrawer: () => null,
  useJobCount: () => 0,
}));

vi.mock("../components/GlobalSearch", () => ({
  GlobalSearch: () => null,
}));

vi.mock("../router/RouteRegistry", () => ({
  useRouteRegistry: () => ({ routes: [] }),
}));

vi.mock("../state/AppConfigContext", () => ({
  useAppConfig: () => ({ config: undefined }),
}));

vi.mock("../extensions/ExtensionLoader", () => ({
  useExtensions: () => ({ manifest: null }),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    authEnabled: false,
    user: null,
    hasPermission: () => true,
  }),
}));

describe("Navbar mobile menu", () => {
  it("closes without consuming a click outside the navigation", async () => {
    const handleOutsideClick = vi.fn();
    const user = userEvent.setup();
    render(
      <>
        <Navbar currentPage="images" navigate={vi.fn()} />
        <button onClick={handleOutsideClick}>Open image</button>
      </>,
    );

    const toggle = screen.getByRole("button", { name: "Toggle navigation menu" });
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Videos" })).toBeInTheDocument();

    const outsideButton = screen.getByRole("button", { name: "Open image" });
    fireEvent.pointerDown(outsideButton);

    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(outsideButton);

    expect(handleOutsideClick).toHaveBeenCalledOnce();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Videos" })).not.toBeInTheDocument();
  });

  it("closes when the outside target stops click propagation", async () => {
    const handleOutsideClick = vi.fn();
    const user = userEvent.setup();
    render(
      <>
        <Navbar currentPage="images" navigate={vi.fn()} />
        <button
          onClick={(event) => {
            event.stopPropagation();
            handleOutsideClick();
          }}
        >
          Select image
        </button>
      </>,
    );

    const toggle = screen.getByRole("button", { name: "Toggle navigation menu" });
    fireEvent.click(toggle);
    await user.click(screen.getByRole("button", { name: "Select image" }));

    expect(handleOutsideClick).toHaveBeenCalledOnce();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Navbar desktop overflow menu", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // jsdom does no layout, so give every measured link 100px and the link row 450px: with an 100px
  // More button only Videos, Audios and Texts fit inline.
  function stubLayout() {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("navbar-desktop-links") ? 450 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ x: 0, y: 0, top: 0, left: 0, bottom: 32, right: 100, width: 100, height: 32 }) as DOMRect,
    );
  }

  it("shows every link inline when nothing has been measured", () => {
    render(<Navbar currentPage="groups" navigate={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Groups" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: /More navigation/ })).not.toBeInTheDocument();
  });

  it("moves links that do not fit into a More menu and marks it active for an overflowed page", async () => {
    stubLayout();
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(<Navbar currentPage="gallery" navigate={navigate} />);

    expect(screen.getByRole("link", { name: "Videos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Texts" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Segments" })).not.toBeInTheDocument();

    const more = screen.getByRole("button", { name: "More navigation, current page included" });
    expect(more).toHaveClass("text-accent");
    expect(more).toHaveAttribute("aria-haspopup", "menu");
    expect(more).toHaveAttribute("aria-expanded", "false");

    await user.click(more);
    const menu = await screen.findByRole("menu");
    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Segments", "Images", "Faces", "Galleries", "Performers", "Studios", "Tags", "Groups"]);

    // Focus lands on the current page; arrow keys move through the items.
    const galleries = within(menu).getByRole("menuitem", { name: "Galleries" });
    expect(galleries).toHaveAttribute("aria-current", "page");
    expect(galleries).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(within(menu).getByRole("menuitem", { name: "Performers" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(within(menu).getByRole("menuitem", { name: "Groups" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(within(menu).getByRole("menuitem", { name: "Segments" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(more).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    await user.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: "Studios" }));
    expect(navigate).toHaveBeenCalledWith({ page: "studios" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("does not mark More active when the current page is inline", () => {
    stubLayout();
    render(<Navbar currentPage="videos" navigate={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Videos" })).toHaveAttribute("aria-current", "page");
    const more = screen.getByRole("button", { name: "More navigation" });
    expect(more).not.toHaveClass("text-accent");
  });
});
