# Recruiting Reports MCP

A free, always-on knowledge base of 30+ recruiting industry benchmark reports — queryable through Claude using natural language.

Sources include Ashby, Gem, LinkedIn, SHRM, iCIMS, Korn Ferry, HireVue, Greenhouse, Bullhorn, Mercer, Phenom, SignalFire, Criteria Corp, Employ, and Josh Bersin Company. A weekly agent adds new credible reports automatically.

---

## What you can ask it

- *"What's the average time-to-fill for a 500-person company?"*
- *"What are benchmarks for offer acceptance rates at Series B startups?"*
- *"Find quotes on AI in hiring from 2026 reports"*
- *"How does recruiter capacity compare across company sizes?"*
- *"What does Gem's data say about outreach reply rates?"*
- *"Show me all Ashby reports from 2024"* (uses the structured `filter_reports` tool)

---

## How to install

### Option A — Claude.ai (easiest, no installs required)

Works with any paid Claude plan directly in your browser.

1. Go to [claude.ai](https://claude.ai) and open **Settings → Customize → Connectors**
2. Click **+** next to Connectors, then choose **Add custom connector**
3. Give it a name (e.g. `Recruiting Reports`) and paste in the URL:
   ```
   https://two026-recruiting-reports.onrender.com/mcp
   ```
4. Click **Add**

To use it in a conversation, click the **+** button in the chat input, go to **Connectors**, and toggle it on.

### Option B — Claude Code (CLI)

If you use Claude Code, add this to `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "recruiting-reports": {
      "type": "http",
      "url": "https://two026-recruiting-reports.onrender.com/mcp"
    }
  }
}
```

Restart Claude Code — the server connects automatically.

### Start asking questions

In any session with the connector enabled, ask questions about recruiting benchmarks. Claude will pull data directly from the reports.

---

## Reports included

See [reports/00-INDEX.md](reports/00-INDEX.md) for the full list — organized by source and year, with sample sizes and a Quick Reference table of headline benchmarks.

New reports are added weekly via an automated agent. To contribute one, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## For developers

**Run locally (stdio mode):**

```bash
npm install
node server.js stdio
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

**Run as HTTP server:**

```bash
npm install
node server.js         # starts on port 3000
PORT=8080 node server.js
```

Test: `curl http://localhost:3000/health`

**Run tests:**

```bash
npm test
```

**Add a new report:** see [CONTRIBUTING.md](CONTRIBUTING.md) for the frontmatter schema and the canonical source vocabulary.

---

Questions or suggestions? Open an issue or reach out at [viet@talentcollective.io](mailto:viet@talentcollective.io).
