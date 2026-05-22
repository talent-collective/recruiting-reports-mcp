/**
 * 2026 Recruiting Reports — MCP Server
 *
 * Exposes 7 industry recruiting benchmark reports as searchable MCP tools + resources.
 * Run locally with stdio or deploy to Railway/Render for public HTTP access.
 *
 * Usage:
 *   node server.js            → HTTP server on port 3000 (or $PORT)
 *   node server.js stdio      → stdio transport (for local Claude Code config)
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const REPORTS_DIR = join(ROOT, "reports");

// ── Helpers ───────────────────────────────────────────────────────────────────

function allReports() {
  const files = {};
  // root-level MDs (exclude meta files)
  const EXCLUDE = new Set(["README", "MEMORY"]);
  for (const f of readdirSync(ROOT)) {
    if (f.endsWith(".md")) {
      const stem = basename(f, ".md");
      if (!EXCLUDE.has(stem)) files[stem] = join(ROOT, f);
    }
  }
  // reports subfolder (skip the index)
  if (existsSync(REPORTS_DIR)) {
    for (const f of readdirSync(REPORTS_DIR)) {
      if (f.endsWith(".md") && f !== "00-INDEX.md") {
        const stem = basename(f, ".md");
        files[stem] = join(REPORTS_DIR, f);
      }
    }
  }
  return files;
}

function readIndex() {
  return readFileSync(join(REPORTS_DIR, "00-INDEX.md"), "utf-8");
}

// Matches blockquotes (> "...") and inline attributions (Per Name: "...")
const QUOTE_RE = /^>\s*"(.+)"|"([^"]{30,})"/;

function extractQuotes(filter) {
  const reports = allReports();
  const f = filter?.toLowerCase();
  const hits = [];

  for (const [name, path] of Object.entries(reports).sort()) {
    const lines = readFileSync(path, "utf-8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trimStart().startsWith("#")) continue; // skip headings
      if (!QUOTE_RE.test(line)) continue;
      if (f && !line.toLowerCase().includes(f)) continue;

      // grab one line of context before for attribution clues
      const context = i > 0 ? lines[i - 1].trim() : "";
      const entry = context ? `${context}\n${line.trim()}` : line.trim();
      hits.push(`**${name}**\n${entry}`);
    }
  }

  return hits;
}

function searchAcrossReports(query) {
  const reports = allReports();
  const q = query.toLowerCase();
  const results = [];

  for (const [name, path] of Object.entries(reports).sort()) {
    const lines = readFileSync(path, "utf-8").split("\n");
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

// ── Claude API (webapp) ───────────────────────────────────────────────────────

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const CHAT_SYSTEM = `You are the Talent Collective Recruiting Intelligence assistant — built by former Heads of Talent at Vercel, Airbnb, DoorDash, and Netflix.

You have access to 40 recruiting industry benchmark reports spanning 2015–2026. Use the data below to answer questions with specific numbers. Always cite which report your data comes from.

MANDATORY: Before sharing specific benchmarks, always confirm two things:
1. What year or time period they care about (data spans 2015–2026)
2. What funding stage the company is at: Pre-seed/Seed, Series A, Series B, Series C+, Late-stage, or Enterprise

If the user hasn't specified both, ask before answering. If they have, briefly confirm then give the data. Be direct. Lead with numbers. No filler.`;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function buildContext(query) {
  const index   = readIndex();
  const results = query ? searchAcrossReports(query) : '';
  return `REPORT INDEX:\n${index}\n\nRELEVANT DATA:\n${results}`;
}

// ── Usage logging ─────────────────────────────────────────────────────────────

function log(tool, params) {
  const ts = new Date().toISOString();
  const detail = Object.entries(params).map(([k, v]) => `${k}="${v}"`).join(" ");
  console.error(`[usage] ${ts} tool=${tool} ${detail}`);
}

// ── Server setup ──────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "Recruiting Reports",
  version: "1.0.0",
  instructions: `You have access to 40 recruiting industry benchmark reports spanning 2015–2026 from Ashby, SHRM, LinkedIn, Deloitte, ManpowerGroup, WEF, Jobvite, Talent Board, Glassdoor, Korn Ferry, PwC, McKinsey, Mercer, iCIMS, CareerBuilder, Indeed, Bersin, Gem, HireVue, and more.

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

Use list_reports to see all available reports with their data periods before searching.`,
});

// Resources
server.resource(
  "index",
  "reports://index",
  { description: "Master index of all 2026 recruiting benchmark reports" },
  async () => ({
    contents: [{ uri: "reports://index", text: readIndex(), mimeType: "text/markdown" }],
  })
);

server.resource(
  "report",
  new ResourceTemplate("reports://{name}", { list: undefined }),
  { description: "Full content of a specific report by filename stem" },
  async (uri, { name }) => {
    const reports = allReports();
    const text = reports[name]
      ? readFileSync(reports[name], "utf-8")
      : `Report '${name}' not found. Available: ${Object.keys(reports).sort().join(", ")}`;
    return { contents: [{ uri: uri.href, text, mimeType: "text/markdown" }] };
  }
);

// Tools
server.tool(
  "list_reports",
  "List all available 2026 recruiting industry reports with a summary of what data each covers.",
  {},
  async () => {
    log("list_reports", {});
    return { content: [{ type: "text", text: readIndex() }] };
  }
);

server.tool(
  "read_report",
  "Read the full content of a specific report. Use list_reports first to see available names.",
  { name: z.string().describe("Filename stem, e.g. 'ashby-startup-hiring-2026'") },
  async ({ name }) => {
    log("read_report", { name });
    const reports = allReports();
    const text = reports[name]
      ? readFileSync(reports[name], "utf-8")
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

// ── Transport ─────────────────────────────────────────────────────────────────

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

    // ── Webapp ──────────────────────────────────────────────────────
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
      try {
        const html = readFileSync(join(ROOT, "public", "index.html"), "utf-8");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
      } catch {
        res.writeHead(404); res.end("Not found");
      }
      return;
    }

    if (req.method === "POST" && req.url === "/chat") {
      if (!anthropic) {
        res.writeHead(503, { "Content-Type": "text/plain" });
        res.end("ANTHROPIC_API_KEY is not configured");
        return;
      }
      try {
        const { messages } = await parseBody(req);
        const lastUser = [...messages].reverse().find(m => m.role === "user")?.content ?? "";
        const context  = buildContext(lastUser);
        const system   = `${CHAT_SYSTEM}\n\n${context}`;

        res.writeHead(200, {
          "Content-Type":  "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection":    "keep-alive",
        });

        const stream = anthropic.messages.stream({
          model:      "claude-sonnet-4-6",
          max_tokens: 2048,
          system,
          messages,
        });

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
          }
        }

        res.write("data: [DONE]\n\n");
        res.end();
        log("chat", { query: lastUser.slice(0, 100) });

      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end(err.message);
        }
      }
      return;
    }
    if (req.method === "POST" && req.url === "/mcp") {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      });
      res.on("close", () => transport.close());
      await server.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }
    if ((req.method === "GET" || req.method === "DELETE") && req.url?.startsWith("/mcp")) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
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
