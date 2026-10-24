# Cove API benchmark

`cove_bench.py` times the requests Cove's pages make against a running instance, so we can see how
Cove behaves on real libraries — especially large ones — and compare versions.

**It only reads.** Every request is a `GET` or one of the `POST` query endpoints the UI uses to list and
count (`…/find`, `…/aggregate`, `segments/spans/search|count`, `engagement/batch`). The script refuses
to send anything else. It does not need, and should not be given, an admin token.

## Running it

Needs Python 3.8 or newer and nothing else — no packages to install. (Windows: install from
[python.org](https://www.python.org/downloads/) or the Microsoft Store; macOS and Linux usually have it.)

```bash
python cove_bench.py --url http://localhost:9999
```

If your Cove has login enabled, create an API token (Settings → API tokens) for a normal
user and pass it:

```bash
python cove_bench.py --url http://localhost:9999 --token cove_pat_...
```

Options:

| option | default | meaning |
|---|---|---|
| `--url` | `http://localhost:5073` | Cove's address |
| `--token` | `$COVE_TOKEN` | API token, when login is enabled |
| `--reps` | `3` | runs per case; the first is reported separately (it is the cold one) |
| `--timeout` | `120` | seconds before a request counts as `TIMEOUT` |
| `--quick` | off | fewer sorts per list — about a quarter of the cases |
| `--only` / `--skip` | | regex over `group: case` names, e.g. `--only segments` |
| `--out` | `cove-bench-<time>` | output file prefix |
| `--compare A.json B.json` | | print the median change per case between two runs, then exit |

A full run takes a few minutes on a small library and can take an hour on a very large one (the
slowest segment queries are given two minutes each). `--quick` is a good first run.

Run it while nothing else is busy — no scan, AI run, or generate job — so the numbers are about the
queries, not the contention.

## What to send back

The run writes two files: `cove-bench-<time>.md` (readable summary: your library's size, the slowest
25 cases, every result) and `cove-bench-<time>.json` (the same data, for comparing runs). Send both.

They contain your library's entity counts, Cove version, OS/CPU/RAM, and timings. They do not contain
titles, paths, names, or any other library content. The JSON also records the numeric ids of the
sample items used (for example the tag with the most videos), so we can rerun the same cases.

## Reading the numbers

- **first** — the first run of a case, often against a cold database cache. This is what you feel the
  first time you open a page.
- **median / max** — later runs. A large gap between first and median means the case is disk-bound.
- `⚠` marks a median over 5 s; `✗` a failed request. A `500` on a slow case is usually the server's
  30-second database command timeout.
- **ui page loads** fire the same requests at once that a page fires when it opens, and time how long
  until all of them finish.
