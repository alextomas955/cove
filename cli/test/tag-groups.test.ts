import { expect, test } from "bun:test";
import { json, page, runCli, useTestResources } from "./helpers";

const resources = useTestResources();

interface RecordedRequest {
  method: string;
  path: string;
  body?: unknown;
}

const season = { id: 7, name: "Season", description: null, color: "#6ee7b7", sortOrder: 10, tagCount: 2, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
const weather = { id: 8, name: "Weather", description: "Sky and weather", color: null, sortOrder: 20, tagCount: 0, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
const tags = [
  { id: 42, name: "Summer", aliases: ["Midsummer"], tagGroupId: null },
  { id: 43, name: "Winter", aliases: [], tagGroupId: 8 },
];

/** A Cove stand-in that records writes and answers the reads the tag-group commands make. */
async function fakeCove(write: (request: RecordedRequest) => Response = () => json({})): Promise<{ env: NodeJS.ProcessEnv; requests: RecordedRequest[] }> {
  const requests: RecordedRequest[] = [];
  const { url } = resources.startServer(async request => {
    const { pathname, searchParams } = new URL(request.url);
    const path = pathname.replace(/^\/api\//, "");
    if (request.method === "GET") {
      if (path === "taggroups") return json([season, weather]);
      const group = /^taggroups\/(\d+)$/.exec(path);
      if (group) {
        const match = [season, weather].find(item => item.id === Number(group[1]));
        return match ? json(match) : json({ message: "Not found" }, 404);
      }
      if (path === "tags") {
        const query = (searchParams.get("q") ?? "").toLowerCase();
        return json(page(tags.filter(tag => tag.name.toLowerCase().includes(query) || tag.aliases.some(alias => alias.toLowerCase().includes(query)))));
      }
      const tag = /^tags\/(\d+)$/.exec(path);
      if (tag) return json(tags.find(item => item.id === Number(tag[1])));
    }
    const recorded = { method: request.method, path, body: request.headers.get("content-type")?.includes("json") ? await request.json() : undefined };
    requests.push(recorded);
    return write(recorded);
  });
  return { env: await resources.cliEnvironment({ server: url, token: "test-token" }), requests };
}

test("tags set-group resolves the group and tags by name and moves them in one bulk update", async () => {
  const { env, requests } = await fakeCove(() => json({ updatedIds: [42, 43] }));

  const result = await runCli(["tags", "set-group", "season", "Midsummer", "43", "Summer", "--json"], { env });

  expect(result.stderr).toBe("");
  expect(result.exitCode).toBe(0);
  expect(requests).toEqual([{ method: "POST", path: "tags/bulk", body: { ids: [42, 43], tagGroupId: 7 } }]);
  expect(JSON.parse(result.stdout)).toEqual({ tagGroup: { id: 7, name: "Season" }, tags: [{ id: 42, name: "Summer" }, { id: 43, name: "Winter" }] });
});

test("tags set-group sends nothing when any tag or the group is unknown", async () => {
  const { env, requests } = await fakeCove();

  const unknownTag = await runCli(["tags", "set-group", "Season", "Summer", "Nowhere", "--json"], { env });
  expect(unknownTag.exitCode).toBe(1);
  expect(JSON.parse(unknownTag.stderr)).toMatchObject({ error: { code: "TAG_NOT_FOUND" } });

  const unknownGroup = await runCli(["tags", "set-group", "Seasons", "Summer", "--json"], { env });
  expect(unknownGroup.exitCode).toBe(1);
  expect(JSON.parse(unknownGroup.stderr)).toMatchObject({ error: { code: "TAG_GROUP_NOT_FOUND", details: { candidates: [{ id: 7, name: "Season" }, { id: 8, name: "Weather" }] } } });

  expect(requests).toEqual([]);
});

test("tags clear-group ungroups tags and confirms them by name", async () => {
  const { env, requests } = await fakeCove(() => json({ updatedIds: [43] }));

  const result = await runCli(["tags", "clear-group", "Winter", "--no-color"], { env });

  expect(result.exitCode).toBe(0);
  expect(requests).toEqual([{ method: "POST", path: "tags/bulk", body: { ids: [43], clearFields: ["tagGroupId"] } }]);
  expect(result.stdout).toContain("Removed 1 tag from their tag group");
  expect(result.stdout).toContain("Winter");
});

test("tag-groups list and show render groups and accept a name in place of an ID", async () => {
  const { env } = await fakeCove();

  const list = await runCli(["tag-groups", "list", "--no-color"], { env });
  expect(list.exitCode).toBe(0);
  expect(list.stdout).toContain("Tag groups · 2 tag groups");
  expect(list.stdout).toMatch(/● Season\s+2\s+#6ee7b7/);

  const machine = await runCli(["tag-groups", "list", "--json"], { env });
  expect(JSON.parse(machine.stdout)).toEqual([season, weather]);

  const show = await runCli(["tag-groups", "show", "weather", "--json"], { env });
  expect(show.exitCode).toBe(0);
  expect(JSON.parse(show.stdout)).toEqual(weather);
});

test("tag-groups create, update, and delete send the API's DTOs", async () => {
  const { env, requests } = await fakeCove(request => {
    if (request.method === "DELETE") return new Response(null, { status: 204 });
    return json({ ...season, ...(request.body as object), id: request.method === "POST" ? 9 : 7 });
  });

  const created = await runCli(["tag-groups", "create", " Places ", "--color", "#f59e0b", "--sort-order", "-5", "--json"], { env });
  expect(created.exitCode).toBe(0);
  expect(JSON.parse(created.stdout)).toMatchObject({ id: 9, name: "Places", color: "#f59e0b", sortOrder: -5 });

  const updated = await runCli(["tag-groups", "update", "Season", "--name", "Seasons", "--description", "", "--color", "", "--no-color"], { env });
  expect(updated.exitCode).toBe(0);
  expect(updated.stdout).toContain("Tag group updated");

  const deleted = await runCli(["tag-groups", "delete", "Season", "--yes", "--json"], { env });
  expect(deleted.exitCode).toBe(0);
  expect(JSON.parse(deleted.stdout)).toEqual({ id: 7, name: "Season", deleted: true, ungroupedTagCount: 2 });

  expect(requests).toEqual([
    { method: "POST", path: "taggroups", body: { name: "Places", color: "#f59e0b", sortOrder: -5 } },
    { method: "PUT", path: "taggroups/7", body: { name: "Seasons", description: "", color: "" } },
    { method: "DELETE", path: "taggroups/7", body: undefined },
  ]);
});

test("tag-group writes reject invalid input before contacting Cove", async () => {
  const { env, requests } = await fakeCove();

  const cases: Array<[string[], string]> = [
    [["tag-groups", "create", "Places", "--color", "orange"], "--color must be #RRGGBB or #RRGGBBAA."],
    [["tag-groups", "create", "Places", "--sort-order", "1.5"], "--sort-order must be a whole number."],
    [["tag-groups", "create", "  "], "The tag group name cannot be empty."],
    [["tag-groups", "update", "Season"], "Pass at least one of --name, --description, --color, or --sort-order."],
    [["tag-groups", "update", "Season", "--name", " "], "--name cannot be empty."],
  ];
  for (const [args, message] of cases) {
    const result = await runCli([...args, "--json"], { env });
    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stderr)).toMatchObject({ error: { code: "INVALID_ARGUMENT", message } });
  }

  const unconfirmed = await runCli(["tag-groups", "delete", "Season"], { env });
  expect(unconfirmed.exitCode).not.toBe(0);
  expect(requests).toEqual([]);
});

test("an all-digit reference is tried as a tag group ID first and then as a name", async () => {
  const year = { ...weather, id: 9, name: "2024" };
  const numbered = { ...weather, id: 10, name: "7" };
  const { url } = resources.startServer(request => {
    const path = new URL(request.url).pathname;
    if (path === "/api/taggroups") return json([season, year, numbered]);
    return json({ message: "Not found" }, 404);
  });
  const env = await resources.cliEnvironment({ server: url, token: "test-token" });

  const byName = await runCli(["tag-groups", "show", "2024", "--json"], { env });
  expect(byName.exitCode).toBe(0);
  expect(JSON.parse(byName.stdout)).toEqual(year);

  const byId = await runCli(["tag-groups", "show", "7", "--json"], { env });
  expect(byId.exitCode).toBe(0);
  expect(JSON.parse(byId.stdout)).toEqual(season);

  const missing = await runCli(["tag-groups", "show", "404", "--json"], { env });
  expect(missing.exitCode).toBe(1);
  expect(JSON.parse(missing.stderr)).toMatchObject({ error: { code: "TAG_GROUP_NOT_FOUND" } });
});
