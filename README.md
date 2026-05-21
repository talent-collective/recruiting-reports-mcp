# 2026 Recruiting Reports — MCP Server

An MCP server that gives Claude (or any MCP client) access to 7 industry recruiting benchmark reports from 2026.

## Tools available

| Tool | What it does |
|------|-------------|
| `list_reports` | Shows all reports with summaries |
| `read_report` | Full text of a specific report |
| `search_reports` | Keyword search across all reports with context |
| `get_stat` | Look up a specific benchmark metric |

## Connect to it

### Option A — Use the hosted version (once deployed)

Add to your `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "recruiting-reports": {
      "type": "http",
      "url": "https://YOUR_DEPLOYED_URL/mcp"
    }
  }
}
```

### Option B — Run locally (stdio)

```bash
npm install
```

Add to your `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "recruiting-reports": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/this/folder/server.js", "stdio"]
    }
  }
}
```

## Deploy to Railway

1. Push this repo to GitHub
2. Create a new Railway project → Deploy from GitHub repo
3. Railway auto-detects the `Procfile` and deploys
4. Copy the public URL and use it in the config above

## Deploy to Render

1. Push to GitHub
2. New Web Service → connect repo → Render reads `render.yaml` automatically

## Local development / HTTP mode

```bash
npm install
node server.js          # starts HTTP server on port 3000
# or
PORT=8080 node server.js
```

Test it:
```bash
curl http://localhost:3000/health
```
