/**
 * End-to-end smoke test: spawn `node server.js stdio` as a subprocess, drive
 * it with JSON-RPC over its stdin/stdout, and assert each tool round-trips.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function startServer() {
  const child = spawn("node", ["server.js", "stdio"], {
    cwd: ROOT,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let buffer = "";
  const pending = new Map();
  let nextId = 1;

  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    let nl;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id && pending.has(msg.id)) {
          const { resolve } = pending.get(msg.id);
          pending.delete(msg.id);
          resolve(msg);
        }
      } catch { /* ignore non-JSON */ }
    }
  });

  function send(method, params) {
    const id = nextId++;
    const promise = new Promise((resolve, reject) => {
      pending.set(id, { resolve });
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`Timeout waiting for ${method}`));
        }
      }, 5000);
    });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    return promise;
  }

  function notify(method, params) {
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
  }

  return { child, send, notify };
}

test("server starts and exposes all 7 tools", async () => {
  const { child, send, notify } = startServer();
  try {
    const init = await send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test", version: "0.0.0" },
    });
    assert.ok(init.result, "initialize returned no result");
    notify("notifications/initialized");

    const tools = await send("tools/list");
    const names = tools.result.tools.map(t => t.name).sort();
    assert.deepEqual(names, [
      "filter_reports", "get_stat", "list_reports",
      "read_report", "search_quotes", "search_reports",
    ].sort());
  } finally {
    child.kill();
  }
});

test("filter_reports returns Ashby 2026 reports", async () => {
  const { child, send, notify } = startServer();
  try {
    await send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test", version: "0.0.0" },
    });
    notify("notifications/initialized");

    const res = await send("tools/call", {
      name: "filter_reports",
      arguments: { source: "Ashby", year: 2026 },
    });
    const text = res.result.content[0].text;
    assert.match(text, /Ashby/);
    assert.match(text, /ashby-startup-hiring-2026|ashby-recruiting-ops-benchmarks-2026/);
  } finally {
    child.kill();
  }
});

test("search_reports still returns hits after cache refactor", async () => {
  const { child, send, notify } = startServer();
  try {
    await send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test", version: "0.0.0" },
    });
    notify("notifications/initialized");

    const res = await send("tools/call", {
      name: "search_reports",
      arguments: { query: "time-to-fill" },
    });
    const text = res.result.content[0].text;
    assert.ok(!text.startsWith("No results"), "search returned no results — cache or body-stripping likely broke search");
  } finally {
    child.kill();
  }
});

test("read_report returns body without frontmatter", async () => {
  const { child, send, notify } = startServer();
  try {
    await send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test", version: "0.0.0" },
    });
    notify("notifications/initialized");

    const res = await send("tools/call", {
      name: "read_report",
      arguments: { name: "ashby-startup-hiring-2026" },
    });
    const text = res.result.content[0].text;
    assert.ok(!text.startsWith("---"), "read_report leaked frontmatter into body");
    assert.match(text, /^# /, "body should start with the H1 title");
  } finally {
    child.kill();
  }
});
