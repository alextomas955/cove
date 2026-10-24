#!/usr/bin/env python3
"""Read-only performance benchmark for a running Cove instance.

    python cove_bench.py --url http://localhost:5073 [--token cove_pat_...] [--reps 3] [--timeout 120]
                         [--only REGEX] [--skip REGEX] [--out PREFIX] [--quick]
    python cove_bench.py --compare before.json after.json

Every request this script sends is a read: GETs, plus the POST query endpoints the UI uses to list and
count (find/aggregate/search/count and engagement lookups). The allowlist below is enforced before any
request goes out. Standard library only; needs Python 3.8 or newer.

See README.md next to this file for what to send back.
"""

import argparse
import concurrent.futures
import copy
import datetime
import http.client
import json
import os
import platform
import random
import re
import sys
import threading
import time
import urllib.parse

# Only these POST endpoints may be called. Each is a pure query.
READ_ONLY_POSTS = [
    re.compile(r"^/api/[a-z]+/find$"),
    re.compile(r"^/api/[a-z]+/aggregate$"),
    re.compile(r"^/api/segments/spans/(search|count)$"),
    re.compile(r"^/api/engagement/batch$"),
]

SORTS = {
    "videos": ["updated_at", "created_at", "title", "date", "rating", "play_count", "last_played_at", "duration", "file_size", "file_mod_time", "path", "resolution", "bitrate", "tag_count", "performer_count", "studio", "organized", "random"],
    "images": ["updated_at", "created_at", "date", "file_mod_time", "file_size", "resolution", "path", "title", "rating", "like_counter", "performer_count", "tag_count", "random"],
    "faces": ["suggestion_confidence", "updated", "created", "label", "performer_name", "detection_count", "appearance_count", "video_count", "image_count", "random"],
    "segments": ["updated_at", "created_at", "title", "video_title", "start_sec", "duration", "confidence", "kind", "tag_name", "performer", "random"],
    "spans": ["updated_at", "created_at", "title", "start_sec", "duration", "random"],
    "performers": ["name", "rating", "video_count", "image_count", "latest_video_date", "total_file_size", "tag_count", "last_played_at", "play_count", "created_at", "random"],
    "tags": ["name", "rating", "tag_group", "video_count", "image_count", "performer_count", "latest_video_date", "total_file_size", "created_at", "random"],
    "studios": ["name", "rating", "video_count", "image_count", "latest_video_date", "total_file_size", "random"],
    "galleries": ["updated_at", "date", "path", "title", "rating", "like_counter", "image_count", "typical_resolution", "random"],
    "groups": ["sort_order", "name", "item_count", "random"],
}
QUICK_SORTS = {
    "videos": ["updated_at", "date", "random"], "images": ["updated_at", "title", "random"],
    "faces": ["suggestion_confidence", "updated"], "segments": ["updated_at", "created_at", "random"],
    "spans": ["updated_at", "duration"], "performers": ["name", "video_count"], "tags": ["name", "video_count"],
    "studios": ["name"], "galleries": ["updated_at", "typical_resolution"], "groups": ["name"],
}


class Client:
    def __init__(self, base, token, timeout):
        # On Windows "localhost" tries IPv6 first and Cove listens on IPv4, so every connection would
        # wait about two seconds before falling back — that would be all the benchmark measured.
        self.base = re.sub(r"^(https?://)localhost(?=[:/]|$)", r"\g<1>127.0.0.1", base.rstrip("/"), flags=re.I)
        self.token = token
        self.timeout = timeout
        # Seeds are Int32 on the server, so start small and stay small.
        self._nonce = random.randint(1, 1_000_000)
        self._prefix = urllib.parse.urlsplit(self.base).path.rstrip("/")
        self._local = threading.local()

    def _next_nonce(self):
        self._nonce += 1
        return self._nonce

    def request(self, method, path, body=None):
        path_only = path.split("?")[0]
        if method != "GET" and not (method == "POST" and any(p.match(path_only) for p in READ_ONLY_POSTS)):
            raise RuntimeError(f"refusing non-read request {method} {path}")
        # Vary every request so neither the HTTP output cache nor the server's per-query result caches
        # answer it: GETs get a throwaway query parameter, POST bodies a changing seed (which only
        # affects random ordering, so it never changes what a non-random query has to do).
        n = self._next_nonce()
        url = f"{self._prefix}{path}{'&' if '?' in path else '?'}bench_nonce={n}"
        headers = {"Accept": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        data = None
        if body is not None:
            b = copy.deepcopy(body)
            if "findFilter" in b:
                if b["findFilter"].get("sort") != "random":
                    b["findFilter"]["seed"] = n
            elif "page" in b and b.get("sort") != "random":
                b["seed"] = n
            data = json.dumps(b).encode("utf-8")
            headers["Content-Type"] = "application/json"
        start = time.perf_counter()
        try:
            conn = self._connection()
            conn.request(method, url, body=data, headers=headers)
            resp = conn.getresponse()
            raw = resp.read()
            ms = (time.perf_counter() - start) * 1000
            parsed = None
            if resp.status == 200 and raw:
                try:
                    parsed = json.loads(raw)
                except ValueError:
                    pass
            return {"ms": ms, "status": resp.status, "bytes": len(raw), "json": parsed}
        except (TimeoutError, OSError, http.client.HTTPException) as e:
            # The connection is in an unknown state after an error; the next request opens a new one.
            self._local.conn = None
            ms = (time.perf_counter() - start) * 1000
            timed_out = isinstance(e, TimeoutError) or "timed out" in str(e).lower()
            return {"ms": ms, "status": "TIMEOUT" if timed_out else f"ERR {e}", "bytes": 0, "json": None}

    def _connection(self):
        # One kept-alive connection per thread, as a browser would hold, so connection setup is not
        # counted against every request.
        conn = getattr(self._local, "conn", None)
        if conn is None:
            parts = urllib.parse.urlsplit(self.base)
            cls = http.client.HTTPSConnection if parts.scheme == "https" else http.client.HTTPConnection
            conn = cls(parts.hostname, parts.port, timeout=self.timeout)
            self._local.conn = conn
        return conn


def find_body(sort, page=1, per_page=40, object_filter=None, **find_extra):
    find = {"page": page, "perPage": per_page, "sort": sort, "direction": "desc"}
    find.update(find_extra)
    return {"findFilter": find, "objectFilter": object_filter or {}}


def total_of(r):
    j = r.get("json") if r else None
    if isinstance(j, dict):
        if isinstance(j.get("totalCount"), int):
            return j["totalCount"]
        if isinstance(j.get("count"), int):
            return j["count"]
    return None


def items_of(r):
    j = r.get("json") if r else None
    return j.get("items", []) if isinstance(j, dict) else []


def first_id(r):
    items = items_of(r)
    if not items:
        return None
    item = items[0]
    return item.get("id") or (item.get("segment") or {}).get("id")


def fmt(ms):
    return f"{ms / 1000:.2f}s" if ms >= 1000 else f"{round(ms)}ms"


def discover(client):
    probes = {
        "videos": ("POST", "/api/videos/find", find_body("date")),
        "images": ("GET", "/api/images?page=1&perPage=40&sort=updated_at&direction=desc", None),
        "segments": ("POST", "/api/segments/aggregate", {"objectFilter": {}, "findFilter": {"page": 1, "perPage": 1}}),
        "faces": ("GET", "/api/faces?page=1&perPage=1&sort=updated&direction=desc", None),
        "performers": ("GET", "/api/performers?page=1&perPage=40&sort=video_count&direction=desc", None),
        "tags": ("GET", "/api/tags?page=1&perPage=40&sort=video_count&direction=desc", None),
        "studios": ("GET", "/api/studios?page=1&perPage=1&sort=video_count&direction=desc", None),
        "galleries": ("GET", "/api/galleries?page=1&perPage=1&sort=image_count&direction=desc", None),
        "groups": ("GET", "/api/groups?page=1&perPage=40&sort=item_count&direction=desc", None),
        "audios": ("POST", "/api/audios/aggregate", {"findFilter": {"page": 1, "perPage": 0}}),
    }
    print("Discovering library size", end="", flush=True)
    results = {}
    for key, (method, path, body) in probes.items():
        results[key] = client.request(method, path, body)
        print(".", end="", flush=True)
    print()
    library = {k: total_of(r) for k, r in results.items()}
    groups = items_of(results["groups"])
    sample = {
        "videoIds": [i.get("id") for i in items_of(results["videos"])][:5],
        "videoPageIds": [i.get("id") for i in items_of(results["videos"])],
        "imageId": first_id(results["images"]),
        "performerId": first_id(results["performers"]),
        "tagId": first_id(results["tags"]),
        "groupId": next((g.get("id") for g in groups if (g.get("itemCount") or 0) > 0), first_id(results["groups"])),
    }
    sample["segmentId"] = first_id(client.request("POST", "/api/segments/find", {"objectFilter": {}, "findFilter": {"page": 1, "perPage": 1, "sort": "created_at", "direction": "desc"}}))
    sample["faceId"] = first_id(client.request("GET", "/api/faces?page=1&perPage=1&sort=appearance_count&direction=desc"))
    return library, sample


def build_cases(library, sample, quick):
    sorts_for = (lambda k: QUICK_SORTS[k]) if quick else (lambda k: SORTS[k])
    cases = []

    def add(group, name, method, path, body=None):
        cases.append({"group": group, "name": name, "requests": [(method, path, body)]})

    def add_page(name, reqs):
        # Fires the requests one UI page fires at once and times until all of them finish.
        cases.append({"group": "ui page loads", "name": name, "requests": reqs})

    seg_raw = {"objectFilter": {}, "findFilter": {"page": 1, "perPage": 24, "sort": "updated_at", "direction": "desc"}}
    spans = {"page": 1, "perPage": 24, "sort": "updated_at", "direction": "desc"}
    add_page("videos page", [("POST", "/api/videos/aggregate", {"findFilter": {"page": 1, "perPage": 0}, "objectFilter": {}}), ("POST", "/api/videos/find", find_body("date", skipCount=True))])
    add_page("images page", [("POST", "/api/images/aggregate", {"findFilter": {"page": 1, "perPage": 0}}), ("GET", "/api/images?page=1&perPage=40&sort=updated_at&direction=desc", None)])
    add_page("segments page (spans)", [("POST", "/api/segments/spans/search", spans), ("POST", "/api/segments/spans/count", spans), ("GET", "/api/segments/kinds/distinct", None), ("GET", "/api/segments/source-keys/distinct", None)])
    add_page("segments page (raw)", [("POST", "/api/segments/aggregate", {"objectFilter": {}, "findFilter": {"page": 1, "perPage": 1, "sort": "updated_at", "direction": "desc"}}), ("POST", "/api/segments/find", seg_raw)])
    add_page("faces page (unlinked)", [("GET", "/api/faces?page=1&perPage=40&linked=false&sort=suggestion_confidence&direction=desc", None)])
    add_page("performers page", [("GET", "/api/performers?page=1&perPage=40&sort=latest_video_date&direction=desc", None), ("GET", "/api/performers/countries", None)])
    add_page("tags page", [("GET", "/api/tags?page=1&perPage=40&sort=latest_video_date&direction=desc", None), ("GET", "/api/taggroups", None)])
    add_page("studios page", [("GET", "/api/studios?page=1&perPage=40&sort=latest_video_date&direction=desc", None)])
    add_page("galleries page", [("POST", "/api/galleries/aggregate", {"findFilter": {"page": 1, "perPage": 0}}), ("GET", "/api/galleries?page=1&perPage=40&sort=date&direction=desc", None)])
    add_page("home dashboard", [("GET", "/api/dashboards/view", None)])
    if sample["videoIds"]:
        vid = sample["videoIds"][0]
        add_page("video detail page", [("GET", f"/api/videos/{vid}", None), ("GET", f"/api/videos/{vid}/segments/spans", None)])

    for s in sorts_for("videos"):
        add("videos list", f"sort={s}", "POST", "/api/videos/find", find_body(s, skipCount=True))
    for s in sorts_for("images"):
        add("images list", f"sort={s}", "GET", f"/api/images?page=1&perPage=40&sort={s}&direction=desc&seed=1")
    for s in sorts_for("faces"):
        add("faces list", f"sort={s}", "GET", f"/api/faces?page=1&perPage=40&sort={s}&direction=desc&seed=1")
    for s in sorts_for("faces"):
        add("faces list (unlinked)", f"sort={s}", "GET", f"/api/faces?page=1&perPage=40&linked=false&sort={s}&direction=desc&seed=1")
    for s in sorts_for("segments"):
        add("segments list (raw)", f"sort={s}", "POST", "/api/segments/find", {"objectFilter": {}, "findFilter": {"page": 1, "perPage": 24, "sort": s, "direction": "desc", "seed": 1}})
    for s in sorts_for("spans"):
        add("segments list (spans)", f"sort={s}", "POST", "/api/segments/spans/search", {"page": 1, "perPage": 24, "sort": s, "direction": "desc", "seed": 1})
    for entity in ("performers", "tags", "studios", "galleries", "groups"):
        for s in sorts_for(entity):
            add(f"{entity} list", f"sort={s}", "GET", f"/api/{entity}?page=1&perPage=40&sort={s}&direction=desc&seed=1")

    # Deep pages: a quarter of the way into each list.
    def deep(n, per):
        return max(1, (n or 0) // per // 4)
    add("deep pages", f"videos page {deep(library.get('videos'), 40)}", "POST", "/api/videos/find", find_body("date", page=deep(library.get("videos"), 40), skipCount=True))
    add("deep pages", f"images page {deep(library.get('images'), 40)}", "GET", f"/api/images?page={deep(library.get('images'), 40)}&perPage=40&sort=updated_at&direction=desc")
    add("deep pages", f"segments page {deep(library.get('segments'), 24)}", "POST", "/api/segments/find", {"objectFilter": {}, "findFilter": {"page": deep(library.get("segments"), 24), "perPage": 24, "sort": "updated_at", "direction": "desc"}})
    add("deep pages", f"faces page {deep(library.get('faces'), 40)}", "GET", f"/api/faces?page={deep(library.get('faces'), 40)}&perPage=40&sort=updated&direction=desc")

    add("counts", "videos aggregate", "POST", "/api/videos/aggregate", {"findFilter": {"page": 1, "perPage": 0}, "objectFilter": {}})
    add("counts", "images aggregate", "POST", "/api/images/aggregate", {"findFilter": {"page": 1, "perPage": 0}})
    add("counts", "segments aggregate", "POST", "/api/segments/aggregate", {"objectFilter": {}, "findFilter": {"page": 1, "perPage": 1}})
    add("counts", "segments spans count", "POST", "/api/segments/spans/count", spans)
    add("counts", "segment kinds distinct", "GET", "/api/segments/kinds/distinct")
    add("counts", "segment source keys distinct", "GET", "/api/segments/source-keys/distinct")

    add("search", "global search", "GET", "/api/search/global?q=an&perType=8")
    add("search", "videos q", "POST", "/api/videos/find", find_body("updated_at", q="an"))
    add("search", "images q", "GET", "/api/images?page=1&perPage=40&q=an&sort=updated_at&direction=desc")
    add("search", "segments q", "POST", "/api/segments/find", {"objectFilter": {}, "findFilter": {"q": "an", "page": 1, "perPage": 24, "sort": "updated_at", "direction": "desc"}})
    add("search", "faces q", "GET", "/api/faces?page=1&perPage=40&q=an&sort=updated&direction=desc")
    if sample.get("tagId"):
        tag = {"tagsCriterion": {"value": [sample["tagId"]], "modifier": "INCLUDES", "depth": -1}}
        add("filters", "videos by top tag", "POST", "/api/videos/find", find_body("date", object_filter=tag))
        add("filters", "images by top tag", "POST", "/api/images/find", find_body("updated_at", object_filter=tag))
        add("filters", "segments by top tag", "POST", "/api/segments/find", {"objectFilter": {"tagsCriterion": {"value": [sample["tagId"]], "modifier": "INCLUDES"}}, "findFilter": {"page": 1, "perPage": 24, "sort": "updated_at", "direction": "desc"}})
    if sample.get("performerId"):
        perf = {"performersCriterion": {"value": [sample["performerId"]], "modifier": "INCLUDES"}}
        add("filters", "videos by top performer", "POST", "/api/videos/find", find_body("date", object_filter=perf))
        add("filters", "images by top performer", "POST", "/api/images/find", find_body("updated_at", object_filter=perf))
        add("filters", "segments by top performer", "POST", "/api/segments/find", {"objectFilter": perf, "findFilter": {"page": 1, "perPage": 24, "sort": "updated_at", "direction": "desc"}})

    for vid in sample["videoIds"][:3]:
        add("details", f"video {vid}", "GET", f"/api/videos/{vid}")
    if sample.get("imageId"):
        add("details", "image", "GET", f"/api/images/{sample['imageId']}")
    if sample.get("performerId"):
        add("details", "performer (most videos)", "GET", f"/api/performers/{sample['performerId']}")
    if sample.get("tagId"):
        add("details", "tag (most videos)", "GET", f"/api/tags/{sample['tagId']}")
    if sample.get("faceId"):
        add("details", "face (most appearances)", "GET", f"/api/faces/{sample['faceId']}")
    if sample.get("segmentId"):
        add("details", "segment", "GET", f"/api/segments/{sample['segmentId']}")
    if sample.get("groupId"):
        add("details", "group items page", "GET", f"/api/groups/{sample['groupId']}/items/page?page=1&perPage=25")
    if sample.get("videoPageIds"):
        add("details", "engagement batch (40)", "POST", "/api/engagement/batch", {"hostType": "video", "hostIds": sample["videoPageIds"]})
    for name, path in (("jobs", "/api/jobs"), ("jobs history", "/api/jobs/history"), ("system config", "/api/system/config"), ("extensions manifest", "/api/extensions/manifest")):
        add("app shell", name, "GET", path)
    return cases


def run_case(client, case):
    reqs = case["requests"]
    start = time.perf_counter()
    if len(reqs) == 1:
        results = [client.request(*reqs[0])]
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(reqs)) as pool:
            results = list(pool.map(lambda r: client.request(*r), reqs))
    ms = (time.perf_counter() - start) * 1000
    bad = next((r["status"] for r in results if r["status"] != 200), 200)
    return {"ms": ms, "status": bad, "bytes": sum(r["bytes"] for r in results)}


def write_markdown(path, report):
    env, library, results = report["env"], report["library"], report["results"]
    lines = [f"# Cove benchmark - {env.get('coveVersion') or 'unknown version'}", ""]
    lines += [f"- Started: {env['startedAt']}",
              f"- Client: {env['os']}, Python {env['python']}, {env['cpus']} CPUs{' (same machine as Cove)' if env['sameMachine'] else ''}",
              f"- Reps: {report['reps']}, timeout {report['timeoutSec']}s", ""]
    lines += ["## Library", "", "| entity | count |", "|---|---:|"]
    lines += [f"| {k} | {'?' if v is None else v} |" for k, v in library.items()]
    header = ["| case | first | median | max | size | status |", "|---|---:|---:|---:|---:|---|"]

    def row(r, name):
        return f"| {name} | {fmt(r['firstMs'])} | {fmt(r['medianMs'])} | {fmt(r['maxMs'])} | {r['kb']} KB | {r['status']} |"
    lines += ["", "## Slowest 25 (median)", ""] + header
    for r in sorted(results, key=lambda r: -r["medianMs"])[:25]:
        lines.append(row(r, f"{r['group']}: {r['name']}"))
    lines += ["", "## All results"]
    group = None
    for r in results:
        if r["group"] != group:
            group = r["group"]
            lines += ["", f"### {group}", ""] + header
        lines.append(row(r, r["name"]))
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def compare(before_path, after_path):
    with open(before_path, encoding="utf-8") as f:
        before = {f"{r['group']}: {r['name']}": r for r in json.load(f)["results"]}
    with open(after_path, encoding="utf-8") as f:
        after = {f"{r['group']}: {r['name']}": r for r in json.load(f)["results"]}
    print(f"{'before':>9} {'after':>9} {'change':>8}  case (median)")
    for key in sorted(set(before) & set(after), key=lambda k: -before[k]["medianMs"]):
        b, a = before[key], after[key]
        change = (a["medianMs"] - b["medianMs"]) / b["medianMs"] * 100 if b["medianMs"] else 0
        status = "" if a["status"] == b["status"] else f"  status {b['status']}->{a['status']}"
        print(f"{fmt(b['medianMs']):>9} {fmt(a['medianMs']):>9} {change:+7.0f}%  {key}{status}")


def main():
    parser = argparse.ArgumentParser(description="Read-only Cove API benchmark.")
    parser.add_argument("--url", default="http://localhost:5073")
    parser.add_argument("--token", default=os.environ.get("COVE_TOKEN"))
    parser.add_argument("--reps", type=int, default=3)
    parser.add_argument("--timeout", type=float, default=120)
    parser.add_argument("--only")
    parser.add_argument("--skip")
    parser.add_argument("--out", default=f"cove-bench-{datetime.datetime.now():%Y-%m-%dT%H-%M-%S}")
    parser.add_argument("--quick", action="store_true")
    parser.add_argument("--compare", nargs=2, metavar=("BEFORE_JSON", "AFTER_JSON"))
    args = parser.parse_args()

    if args.compare:
        compare(*args.compare)
        return

    client = Client(args.url, args.token, args.timeout)
    print(f"Cove benchmark -> {client.base}  (reps={args.reps}, timeout={args.timeout:g}s{', quick' if args.quick else ''})")
    status = client.request("GET", "/api/system/status")
    if status["status"] != 200:
        sys.exit(f"Cannot reach {client.base}/api/system/status (status {status['status']}). Is Cove running, and is a --token needed?")
    host = urllib.parse.urlparse(client.base).hostname or ""
    env = {
        "coveVersion": (status["json"] or {}).get("version"),
        "python": platform.python_version(),
        "os": f"{platform.system()} {platform.release()} {platform.machine()}",
        "cpus": os.cpu_count(),
        "startedAt": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "sameMachine": host in ("localhost", "127.0.0.1", "::1"),
    }
    library, sample = discover(client)
    print("Library:", json.dumps(library))

    only = re.compile(args.only, re.I) if args.only else None
    skip = re.compile(args.skip, re.I) if args.skip else None
    cases = [c for c in build_cases(library, sample, args.quick)
             if (not only or only.search(f"{c['group']}: {c['name']}")) and not (skip and skip.search(f"{c['group']}: {c['name']}"))]
    print(f"Running {len(cases)} cases x {args.reps} reps\n")
    print(f"{'first':>8} {'median':>8} {'max':>8}  {'size':>7}  status  case")

    results = []
    for case in cases:
        runs = []
        for _ in range(args.reps):
            r = run_case(client, case)
            runs.append(r)
            if r["status"] == "TIMEOUT":
                break  # one timeout is answer enough
        ms = sorted(r["ms"] for r in runs)
        res = {
            "group": case["group"], "name": case["name"],
            "firstMs": round(runs[0]["ms"]), "medianMs": round(ms[len(ms) // 2]), "maxMs": round(ms[-1]),
            "kb": round(runs[-1]["bytes"] / 1024),
            "status": next((r["status"] for r in runs if r["status"] != 200), 200),
        }
        results.append(res)
        flag = "  x" if res["status"] != 200 else ("  !" if res["medianMs"] >= 5000 else "")
        print(f"{fmt(res['firstMs']):>8} {fmt(res['medianMs']):>8} {fmt(res['maxMs']):>8}  {res['kb']:>5}kb  {str(res['status']):<6}  {case['group']}: {case['name']}{flag}", flush=True)

    sample.pop("videoPageIds", None)
    report = {"env": env, "library": library, "sample": sample, "reps": args.reps, "timeoutSec": args.timeout, "results": results}
    with open(f"{args.out}.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=1)
    write_markdown(f"{args.out}.md", report)
    print(f"\nWrote {args.out}.json and {args.out}.md")


if __name__ == "__main__":
    main()
