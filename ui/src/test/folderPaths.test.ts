import { describe, expect, it } from "vitest";
import { isFolderAncestorOf, normalizeFolderPath } from "../utils/folderPaths";

describe("normalizeFolderPath", () => {
  it("unifies separators and drops trailing ones but keeps filesystem roots", () => {
    expect(normalizeFolderPath("C:\\Media\\Shows\\")).toBe("C:/Media/Shows");
    expect(normalizeFolderPath("/media/a//")).toBe("/media/a");
    expect(normalizeFolderPath("/")).toBe("/");
    expect(normalizeFolderPath("C:\\")).toBe("C:/");
  });
});

describe("isFolderAncestorOf", () => {
  it("matches folders strictly beneath the ancestor", () => {
    expect(isFolderAncestorOf("/media", "/media/a")).toBe(true);
    expect(isFolderAncestorOf("/media", "/media/a/b/c")).toBe(true);
    expect(isFolderAncestorOf("/media/a", "/media/a")).toBe(false);
    expect(isFolderAncestorOf("/media/a/b", "/media/a")).toBe(false);
    expect(isFolderAncestorOf("/other", "/media/a")).toBe(false);
  });

  it("compares whole path segments", () => {
    expect(isFolderAncestorOf("/media/a", "/media/ab")).toBe(false);
    expect(isFolderAncestorOf("/media/a", "/media/ab/c")).toBe(false);
    expect(isFolderAncestorOf("C:\\Media\\a", "C:\\Media\\ab")).toBe(false);
  });

  it("accepts either separator and trailing separators on both sides", () => {
    expect(isFolderAncestorOf("/media/", "/media/a/")).toBe(true);
    expect(isFolderAncestorOf("/media/a/", "/media/a")).toBe(false);
    expect(isFolderAncestorOf("C:/Media", "C:\\Media\\Shows")).toBe(true);
    expect(isFolderAncestorOf("C:\\Media\\", "C:/Media/Shows/")).toBe(true);
  });

  it("handles filesystem and drive roots", () => {
    expect(isFolderAncestorOf("/", "/media")).toBe(true);
    expect(isFolderAncestorOf("/", "/")).toBe(false);
    expect(isFolderAncestorOf("C:\\", "C:\\Media")).toBe(true);
    expect(isFolderAncestorOf("C:/", "C:\\")).toBe(false);
    expect(isFolderAncestorOf("C:\\", "D:\\Media")).toBe(false);
  });

  it("follows the filesystem case policy", () => {
    expect(isFolderAncestorOf("/Media", "/media/a")).toBe(false);
    expect(isFolderAncestorOf("/Media", "/media/a", true)).toBe(false);
    expect(isFolderAncestorOf("/Media", "/media/a", false)).toBe(true);
    expect(isFolderAncestorOf("c:\\media", "C:\\Media\\Shows", false)).toBe(true);
    expect(isFolderAncestorOf("/Media/a", "/media/AB", false)).toBe(false);
  });

  it("never treats an empty path as an ancestor", () => {
    expect(isFolderAncestorOf("", "/media")).toBe(false);
    expect(isFolderAncestorOf("  ", "/media")).toBe(false);
  });
});
