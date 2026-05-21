/**
 * Recruiting Reports — MCP Server
 *
 * Exposes 30+ industry recruiting benchmark reports as searchable MCP tools.
 * Reports have YAML frontmatter (see CONTRIBUTING.md) so they can be filtered
 * structurally (source / year / topic) as well as full-text searched.
 *
 * Usage:
 *   node server.js            → HTTP server on port 3000 (or $PORT)
 *   node server.js stdio      → stdio transport (for local Claude Code config)
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const REPORTS_DIR = join(ROOT, "reports");

// ── Frontmatter parser ───────────────────────────────────────────────────────
// Hand-rolled to avoid a `js-yaml` dependency. Supports the flat scalar / int /
// array shapes used by this project's frontmatter schema (see CONTRIBUTING.md).
// Doesn't handle nested objects, multi-line strings, or anchors — none needed.

export function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return { frontmatter: {}, body: text };
  const end = text.indexOf("\n---", 4);
  if (end === -1) return { frontmatter: {}, body: text };
  const yaml = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\n+/, "");
  const fm = {};
  for (const line of yaml.split("\n")) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!m) continue;
    const [, key, rawVal] = m;
    const val = rawVal.trim();
    if (val === "" || val === "null") {
      fm[key] = null;
    } else if (val.startsWith("[") && val.endsWith("]")) {
      fm[key] = val.slice(1, -1)
        .split(",")
        .map(s => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else if (/^-?\d+$/.test(val)) {
      fm[key] = parseInt(val, 10);
    } else {
      fm[key] = val.replace(/^["']|["']$/g, "").replace(/\\"/g, '"');
    }
  }
  return { frontmatter: fm, body };
}

// ── Report discovery + cache ─────────────────────────────────────────────────

const SKIP_AT_ROOT = new Set(["README.md", "CONTRIBUTING.md", "substack-post.md"]);

function discoverReportFiles() {
  const files = {};
  for (const f of readdirSync(ROOT)) {
    if (!f.endsWith(".md")) continue;
    if (SKIP_AT_ROOT.has(f)) continue;
    files[basename(f, ".md")] = join(ROOT, f);
  }
  if (existsSync(REPORTS_DIR)) {
    for (const f of readdirSync(REPORTS_DIR)) {
      if (!f.endsWith(".md") || f === "00-INDEX.md") continue;
      files[basename(f, ".md")] = join(REPORTS_DIR, f);
    }
  }
  return files;
}

let _cache = null;
export function parsedReports() {
  if (_cache) return _cache;
  _cache = {};
  for (const [name, path] of Object.entries(discoverReportFiles())) {
    const raw = readFileSync(path, "utf-8");
    const { frontmatter, body } = parseFrontmatter(raw);
    _cache[name] = { name, path, frontmatter, body };
  }
  return _cache;
}

// Only used by tests that mutate the working directory between cases.
export function _resetCache() { _cache = null; }

// ── Tool implementations ─────────────────────────────────────────────────────

// Matches blockquotes (> "...") and inline attributions (Per Name: "...")
const QUOTE_RE = /^>\s*"(.+)"|"([^"]{30,})"/;

export function extractQuotes(filter) {
  const f = filter?.toLowerCase();
  const hits = [];
  for (const [name, report] of Object.entries(parsedReports()).sort()) {
    const lines = report.body.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trimStart().startsWith("#")) continue;
      if (!QUOTE_RE.test(line)) continue;
      if (f && !line.toLowerCase().includes(f)) continue;
      const context = i > 0 ? lines[i - 1].trim() : "";
      const entry = context ? `${context}\n${line.trim()}` : line.trim();
      hits.push(`**${name}**\n${entry}`);
    }
  }
  return hits;
}

export function searchAcrossReports(query) {
  const q = query.toLowerCase();
  const results = [];
  const reports = parsedReports();
  for (const [name, report] of Object.entries(reports).sort()) {
    const lines = report.body.split("\n");
    const snippets = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(q)) {
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length, i + 3);
        snippets.push(lines.slice(start, end).join("\n"));
        if (snippets.length >= 4) break;
      }
    }
    if (snippets.length > 0) {
      results.push(`### ${name}\n\n${snippets.join("\n\n---\n\n")}`);
    }
  }
  if (results.length === 0) {
    return `No results found for '${query}' across ${Object.keys(reports).length} reports.`;
  }
  return `# Results for '${query}' (${results.length} report(s))\n\n${results.join("\n\n---\n\n")}`;
}

export function filterReports({ source, year, year_min, year_max, topic } = {}) {
  const reports = Object.values(parsedReports());
  return reports.filter(r => {
    const fm = r.frontmatter;
    if (source) {
      const s = source.toLowerCase();
      if (!fm.source || !fm.source.toLowerCase().includes(s)) return false;
    }
    if (year != null && fm.year !== year) return false;
    if (year_min != null && (fm.year == null || fm.year < year_min)) return false;
    if (year_max != null && (fm.year == null || fm.year > year_max)) return false;
    if (topic) {
      const t = topic.toLowerCase();
      if (!Array.isArray(fm.topics) || !fm.topics.map(x => x.toLowerCase()).includes(t)) return false;
    }
    return true;
  });
}

function describeFilters({ source, year, year_min, year_max, topic }) {
  const parts = [];
  if (source) parts.push(`source=${source}`);
  if (year != null) parts.push(`year=${year}`);
  if (year_min != null) parts.push(`year_min=${year_min}`);
  if (year_max != null) parts.push(`year_max=${year_max}`);
  if (topic) parts.push(`topic=${topic}`);
  return parts.length ? parts.join(", ") : "no filters";
}

function renderFilterResults(matches, filters) {
  if (matches.length === 0) {
    const reports = parsedReports();
    const sources = [...new Set(Object.values(reports).map(r => r.frontmatter.source).filter(Boolean))].sort();
    const topics = [...new Set(Object.values(reports).flatMap(r => r.frontmatter.topics || []))].sort();
    return `No reports match (${describeFilters(filters)}).\n\nAvailable sources: ${sources.join(", ")}\nAvailable topics: ${topics.join(", ")}`;
  }
  const rows = matches
    .sort((a, b) => (b.frontmatter.year || 0) - (a.frontmatter.year || 0) || a.name.localeCompare(b.name))
    .map(r => {
      const fm = r.frontmatter;
      const topics = (fm.topics || []).join(", ");
      const sample = (fm.sample_size || "").replace(/\|/g, "\\|");
      return `| ${r.name} | ${fm.title || r.name} | ${fm.source || ""} | ${fm.year ?? ""} | ${topics} | ${sample} |`;
    })
    .join("\n");
  return [
    `# ${matches.length} report(s) match (${describeFilters(filters)})`,
    "",
    "| Name | Title | Source | Year | Topics | Sample size |",
    "|------|-------|--------|------|--------|-------------|",
    rows,
    "",
    "Use `read_report` with one of these names to read the full report.",
  ].join("\n");
}

// ── Index rendering ──────────────────────────────────────────────────────────
// Renders the auto-generated section of reports/00-INDEX.md from frontmatter.
// The Quick Reference table after the END marker is preserved verbatim by
// `npm run build-index` and is not part of this output.

export function renderIndex() {
  const reports = Object.values(parsedReports());
  const ashby = reports.filter(r => r.frontmatter.source === "Ashby");
  const other = reports.filter(r => r.frontmatter.source !== "Ashby");

  // Flagship Ashby reports = year >= 2025 AND topics overlap with funnel-style
  // tags. Everything else goes in the deep-dive section.
  const FLAGSHIP_TOPICS = new Set([
    "funnel-metrics", "time-to-fill", "time-to-hire", "recruiter-productivity", "startup-hiring",
  ]);
  const ashbyFlagship = ashby.filter(r => {
    const y = r.frontmatter.year || 0;
    const topics = r.frontmatter.topics || [];
    return y >= 2025 && topics.some(t => FLAGSHIP_TOPICS.has(t));
  });
  const ashbyDeepDive = ashby.filter(r => !ashbyFlagship.includes(r));

  const core = [...other, ...ashbyFlagship];
  const sortFn = (a, b) =>
    (b.frontmatter.year || 0) - (a.frontmatter.year || 0)
    || (a.frontmatter.source || "").localeCompare(b.frontmatter.source || "")
    || a.name.localeCompare(b.name);
  core.sort(sortFn);
  ashbyDeepDive.sort(sortFn);

  const entry = (r) => {
    const fm = r.frontmatter;
    const lines = [`### ${fm.title || r.name}`];
    lines.push(`**File:** \`${basename(r.path)}\`  `);
    if (fm.sample_size) lines.push(`**Data:** ${fm.sample_size}  `);
    if (fm.published) lines.push(`**Published:** ${fm.published}  `);
    if (fm.best_for) lines.push(`**Best for:** ${fm.best_for}`);
    return lines.join("\n");
  };

  const today = new Date().toISOString().slice(0, 10);
  const total = reports.length;
  const lines = [
    `**Compiled:** ${today}`,
    `**Reports:** ${total} (${core.length} core, ${ashbyDeepDive.length} Ashby deep-dives)`,
    "",
    "---",
    "",
    "## CORE REPORTS",
    "",
    core.map(entry).join("\n\n"),
    "",
    "---",
    "",
    "## ASHBY DEEP-DIVE REPORTS",
    "",
    ashbyDeepDive.map(entry).join("\n\n"),
  ];
  return lines.join("\n");
}

export function wrapIndex(rawIndex) {
  // Given the on-disk 00-INDEX.md, returns it with the autogenerated region
  // replaced by a fresh render. Falls back to returning raw if markers absent.
  const begin = rawIndex.indexOf("<!-- BEGIN AUTOGENERATED");
  const end = rawIndex.indexOf("<!-- END AUTOGENERATED");
  if (begin === -1 || end === -1) return rawIndex;
  const beginEnd = rawIndex.indexOf("-->", begin) + 3;
  return `${rawIndex.slice(0, beginEnd)}\n\n${renderIndex()}\n\n${rawIndex.slice(end)}`;
}

function readWrappedIndex() {
  const indexPath = join(REPORTS_DIR, "00-INDEX.md");
  if (!existsSync(indexPath)) return `# Recruiting Research Reports — Master Index\n\n${renderIndex()}`;
  return wrapIndex(readFileSync(indexPath, "utf-8"));
}

// ── Usage logging ────────────────────────────────────────────────────────────

function log(tool, params) {
  const ts = new Date().toISOString();
  const detail = Object.entries(params).map(([k, v]) => `${k}="${v}"`).join(" ");
  console.error(`[usage] ${ts} tool=${tool} ${detail}`);
}

// ── Instructions ─────────────────────────────────────────────────────────────

function buildInstructions() {
  const reports = parsedReports();
  const count = Object.keys(reports).length;
  const sources = [...new Set(Object.values(reports).map(r => r.frontmatter.source).filter(Boolean))].sort();
  const years = [...new Set(Object.values(reports).map(r => r.frontmatter.year).filter(Boolean))].sort();
  const yearRange = years.length ? `${years[0]}–${years[years.length - 1]}` : "";

  return `You have access to ${count} recruiting industry benchmark reports spanning ${yearRange} from ${sources.join(", ")}.

MANDATORY BEHAVIOR — always ask these two clarifying questions BEFORE sharing any insights, benchmarks, or data:

1. **What time period or year(s) are you interested in?**
   The knowledge base spans 2015–2026. Year context is critical — a metric like "time-to-fill" was 52 days in 2014, 42 days in 2015–2022, and 63.5 days in 2026. Giving the wrong year gives the wrong answer.
   Ask: "What year or time period are you focused on? Or would you like to see how this metric has trended over time?"

2. **What is the company's funding stage?**
   Benchmarks vary significantly by company size and stage. Ask which applies:
   - Pre-seed / Seed
   - Series A
   - Series B
   - Series C+
   - Late-stage / Pre-IPO
   - Public company / Enterprise
   Ask: "What funding stage is the company at? This helps me pull the most relevant benchmarks."

Only after getting this context should you search reports and share data. If the user's question is already specific enough on both dimensions, you may proceed — but confirm your interpretation before answering.

Tools:
- list_reports: master index with every report grouped by source.
- filter_reports: structured filter by source / year / year range / topic — use this when the user asks for a slice ("everything from Ashby 2024", "all AI-adoption reports").
- read_report: full text of a single report.
- search_reports / get_stat: keyword search across all reports.
- search_quotes: extract direct quotes, optionally filtered by keyword.`;
}

// ── Server setup ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "Recruiting Reports",
  version: "1.1.0",
  instructions: buildInstructions(),
});

server.resource(
  "index",
  "reports://index",
  { description: "Master index of all recruiting benchmark reports, grouped by source." },
  async () => ({
    contents: [{ uri: "reports://index", text: readWrappedIndex(), mimeType: "text/markdown" }],
  })
);

server.resource(
  "report",
  new ResourceTemplate("reports://{name}", { list: undefined }),
  { description: "Full content of a specific report by filename stem." },
  async (uri, { name }) => {
    const reports = parsedReports();
    const text = reports[name]
      ? reports[name].body
      : `Report '${name}' not found. Available: ${Object.keys(reports).sort().join(", ")}`;
    return { contents: [{ uri: uri.href, text, mimeType: "text/markdown" }] };
  }
);

server.tool(
  "list_reports",
  "List all available recruiting industry reports with a summary of what data each covers.",
  {},
  async () => {
    log("list_reports", {});
    return { content: [{ type: "text", text: readWrappedIndex() }] };
  }
);

server.tool(
  "read_report",
  "Read the full content of a specific report. Use list_reports first to see available names.",
  { name: z.string().describe("Filename stem, e.g. 'ashby-startup-hiring-2026'") },
  async ({ name }) => {
    log("read_report", { name });
    const reports = parsedReports();
    const text = reports[name]
      ? reports[name].body
      : `Report '${name}' not found.\n\nAvailable:\n${Object.keys(reports).sort().map(k => `  - ${k}`).join("\n")}`;
    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "search_reports",
  "Search across all reports for a keyword, metric, or topic. Returns matching excerpts with context.",
  { query: z.string().describe("Search term, e.g. 'time-to-fill', 'AI adoption', 'referral'") },
  async ({ query }) => {
    log("search_reports", { query });
    return { content: [{ type: "text", text: searchAcrossReports(query) }] };
  }
);

server.tool(
  "get_stat",
  "Look up a specific benchmark stat or metric across all reports. Returns all mentions with their source.",
  { metric: z.string().describe("Metric to look up, e.g. 'hires per recruiter', 'candidate NPS'") },
  async ({ metric }) => {
    log("get_stat", { metric });
    return { content: [{ type: "text", text: searchAcrossReports(metric) }] };
  }
);

server.tool(
  "search_quotes",
  "Find direct quotes from the reports. Optionally filter by a keyword or topic. Returns each quote with its source report and attribution context.",
  { filter: z.string().optional().describe("Optional keyword to narrow results, e.g. 'AI', 'candidate experience'. Omit to return all quotes.") },
  async ({ filter }) => {
    log("search_quotes", { filter: filter ?? "(all)" });
    const hits = extractQuotes(filter);
    if (hits.length === 0) {
      const scope = filter ? `matching '${filter}'` : "in any report";
      return { content: [{ type: "text", text: `No quotes found ${scope}.` }] };
    }
    const header = filter
      ? `# Quotes matching '${filter}' (${hits.length} found)\n\n`
      : `# All quotes across reports (${hits.length} found)\n\n`;
    return { content: [{ type: "text", text: header + hits.join("\n\n---\n\n") }] };
  }
);

server.tool(
  "filter_reports",
  "Filter reports structurally by source, publication year, year range, or topic. Use this when the user wants a slice of the knowledge base (e.g. 'all Ashby reports from 2024', 'every report about AI adoption') before drilling in with read_report or search_reports.",
  {
    source:   z.string().optional().describe("Canonical source name. Case-insensitive substring match (e.g. 'Ashby', 'gem', 'LinkedIn')."),
    year:     z.number().int().optional().describe("Exact publication year, e.g. 2026."),
    year_min: z.number().int().optional().describe("Minimum publication year (inclusive)."),
    year_max: z.number().int().optional().describe("Maximum publication year (inclusive)."),
    topic:    z.string().optional().describe("Topic tag, e.g. 'time-to-fill', 'ai-adoption', 'source-of-hire'."),
  },
  async (filters) => {
    log("filter_reports", filters);
    const matches = filterReports(filters);
    return { content: [{ type: "text", text: renderFilterResults(matches, filters) }] };
  }
);

export { server };

// ── Transport ────────────────────────────────────────────────────────────────

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const mode = process.argv[2] || "http";

  if (mode === "stdio") {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } else {
    const port = parseInt(process.env.PORT || "3000", 10);
    const httpServer = createServer(async (req, res) => {
      if (req.url === "/health") {
        res.writeHead(200);
        res.end("ok");
        return;
      }
      if (req.method === "POST" && req.url === "/mcp") {
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        res.on("close", () => transport.close());
        await server.connect(transport);
        await transport.handleRequest(req, res);
        return;
      }
      if ((req.method === "GET" || req.method === "DELETE") && req.url?.startsWith("/mcp")) {
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        res.on("close", () => transport.close());
        await server.connect(transport);
        await transport.handleRequest(req, res);
        return;
      }
      res.writeHead(404);
      res.end("Not found");
    });

    httpServer.listen(port, () => {
      console.error(`MCP server running at http://0.0.0.0:${port}/mcp`);
    });
  }
}
