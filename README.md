# Recruiting Reports MCP

A free, always-on knowledge base of 22+ recruiting industry benchmark reports — queryable through Claude using natural language.

Sources include Ashby, Gem, LinkedIn, SHRM, iCIMS, Korn Ferry, HireVue, and more. A weekly agent adds new credible reports automatically.

---

## What you can ask it

- *"What's the average time-to-fill for a 500-person company?"*
- *"What are benchmarks for offer acceptance rates at Series B startups?"*
- *"Find quotes on AI in hiring from 2026 reports"*
- *"How does recruiter capacity compare across company sizes?"*
- *"What does Gem's data say about outreach reply rates?"*

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

| Source | Report |
|--------|--------|
| Ashby | Recruiting Operations Benchmarks 2026 |
| Ashby | Recruiter Productivity 2025 |
| Ashby | State of Startup Hiring 2026 |
| Ashby | 12 deep-dive topic reports (sourcing, coordination, offers, ghosting, referrals, AI notetaking, and more) |
| Gem | Recruiting Benchmarks 2026 |
| Gem | Email Outreach Benchmarks 2026 |
| LinkedIn | Global Talent Report 2026 |
| SHRM | Recruiting Executives Priorities & Perspectives 2026 |
| Employ Inc. | Hiring Benchmarks 2026 |
| iCIMS | Workforce Reports 2026 |
| Korn Ferry | TA Trends 2026 |
| HireVue | AI in Hiring 2026 |

New reports are added weekly via an automated agent.

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

---

Questions or suggestions? Open an issue or reach out at [viet@talentcollective.io](mailto:viet@talentcollective.io).
