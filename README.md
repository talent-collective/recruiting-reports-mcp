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

You'll need **Claude Code** (the command-line app from Anthropic). If you don't have it yet, install it at [claude.ai/code](https://claude.ai/code).

### Step 1 — Open your MCP config file

The config file lives at `~/.claude/mcp.json` on your computer. If it doesn't exist yet, you'll need to create it.

**On a Mac**, open Terminal and run:

```bash
open -a TextEdit ~/.claude/mcp.json
```

If you get a "No such file or directory" error, run this first to create it:

```bash
mkdir -p ~/.claude && echo '{}' > ~/.claude/mcp.json
```

Then try the `open` command again.

### Step 2 — Paste in the config

Replace the contents of the file with:

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

If you already have other MCP servers listed in the file, just add the `"recruiting-reports"` block inside the existing `"mcpServers"` section — don't replace the whole file.

### Step 3 — Restart Claude Code

Quit and reopen Claude Code. The server connects automatically on startup.

### Step 4 — Start asking questions

In any Claude Code session, ask questions about recruiting benchmarks. Claude will pull data directly from the reports.

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
