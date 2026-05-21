# Contributing

Thanks for considering a contribution. This project grows by adding new recruiting research reports, so the most useful PR is usually a fresh report dropped into [reports/](reports/) with the right frontmatter.

## Adding a new report

1. Save the report as markdown in [reports/](reports/) using the naming convention `<source>-<slug>-<year>.md` (e.g. `gem-recruiting-benchmarks-2026.md`). Use kebab-case, lowercase.

2. Add a YAML frontmatter block at the top of the file:

   ```yaml
   ---
   title: "Gem — 2026 Recruiting Benchmarks Report"
   source: Gem
   year: 2026
   published: 2026-03-15           # optional, ISO date
   topics: [funnel-metrics, recruiter-productivity, sourcing]
   url: https://www.gem.com/...    # optional
   author: Jane Smith              # optional
   data_period_start: 2024-01      # optional
   data_period_end: 2025-12        # optional
   sample_size: "165M applications, 1.2M hires"   # optional, free text
   best_for: "Recruiter workload benchmarks, ..."  # optional, one-line use-case hint
   ---
   ```

3. Regenerate the index and run tests:

   ```bash
   npm run build-index
   npm test
   ```

4. Open a PR. CI runs the tests and verifies the committed index is current.

If your report came with prose-style metadata at the top (`**Source:** ...`, `**Published:** ...`) rather than frontmatter, you can run `npm run extract-frontmatter` to auto-convert it — re-running the script on already-converted files is a no-op.

## Frontmatter schema

| Field | Required | Type | Notes |
|---|---|---|---|
| `title` | yes | string | Full title of the report. |
| `source` | yes | string | Canonical vendor/publisher name. Must match an entry in the source vocabulary below. |
| `year` | yes | int | The report's *edition* year (cover year), not data range. Use `data_period_*` for ranges. |
| `topics` | yes | string[] | Non-empty list. Every tag must be in the topic taxonomy below. |
| `published` | no | ISO date | `YYYY-MM-DD`. Leave out if only the year is known. |
| `url` | no | string | Canonical link to the source. |
| `author` | no | string | Free text. |
| `data_period_start` | no | `YYYY-MM` | For longitudinal reports. |
| `data_period_end` | no | `YYYY-MM` | For longitudinal reports. |
| `sample_size` | no | string | Free text — these vary too much to structure. |
| `best_for` | no | string | One-line description of what the report is useful for. |

### Canonical sources

Ashby · Bullhorn · Criteria Corp · Employ · Gem · Greenhouse · HireVue · iCIMS · Josh Bersin Company · Korn Ferry · LinkedIn · Mercer · Phenom · SHRM · SignalFire

If you need to add a new source, update `VALID_SOURCES` in [test/frontmatter.test.mjs](test/frontmatter.test.mjs) and the `SOURCE_MAP` in [scripts/extract-frontmatter.mjs](scripts/extract-frontmatter.mjs).

### Topic taxonomy

`ai-adoption` · `ai-tools` · `application-volume` · `candidate-experience` · `coordination` · `executive-priorities` · `funnel-metrics` · `ghost-jobs` · `labor-market` · `offer-acceptance` · `outreach` · `recruiter-productivity` · `referrals` · `source-of-hire` · `sourcing` · `startup-hiring` · `time-to-fill` · `time-to-hire`

Prefer reusing existing tags over inventing new ones — controlled vocabulary is what makes `filter_reports` useful. If you genuinely need a new tag, add it to `VALID_TOPICS` in [test/frontmatter.test.mjs](test/frontmatter.test.mjs).

## Running locally

```bash
npm install
npm run dev   # stdio mode, suitable for ~/.claude/mcp.json
```

Add to `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "recruiting-reports": {
      "command": "node",
      "args": ["/absolute/path/to/recruiting-reports-mcp/server.js", "stdio"]
    }
  }
}
```

## Running tests

```bash
npm test
```

Tests use Node's built-in test runner (`node --test`) — no extra dependencies. The suite validates that every report's frontmatter is well-formed, that the filter logic returns expected results, and that the server spawns and responds over stdio.
