#!/usr/bin/env node
/**
 * scripts/extract-frontmatter.mjs
 *
 * One-shot (but idempotent) script that parses the inconsistent prose headers
 * at the top of each report and rewrites the file with a YAML frontmatter
 * block. Re-running on a file that already has frontmatter is a no-op.
 *
 *   node scripts/extract-frontmatter.mjs            # write in place
 *   node scripts/extract-frontmatter.mjs --dry-run  # print diff to stdout
 *
 * Prints a summary at the end so missing fields can be filled in by hand.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPORTS_DIR = join(ROOT, "reports");
const DRY = process.argv.includes("--dry-run");

// ── Canonical vocabularies ───────────────────────────────────────────────────

const SOURCE_MAP = [
  // longest/most specific patterns first
  [/josh\s*bersin/i,          "Josh Bersin Company"],
  [/criteria\s*corp/i,        "Criteria Corp"],
  [/korn\s*ferry/i,           "Korn Ferry"],
  [/signal\s*fire/i,          "SignalFire"],
  [/greenhouse/i,             "Greenhouse"],
  [/bullhorn/i,               "Bullhorn"],
  [/hirevue/i,                "HireVue"],
  [/phenom/i,                 "Phenom"],
  [/mercer/i,                 "Mercer"],
  [/linkedin/i,               "LinkedIn"],
  [/icims/i,                  "iCIMS"],
  [/employ/i,                 "Employ"],
  [/shrm/i,                   "SHRM"],
  [/ashby/i,                  "Ashby"],
  [/\bgem\b/i,                "Gem"],
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function matchSource(text) {
  for (const [re, canonical] of SOURCE_MAP) {
    if (re.test(text)) return canonical;
  }
  return null;
}

const MONTHS = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

function parsePublishedDate(raw) {
  if (!raw) return { published: null, year: null };
  // "May 7, 2026" or "January 7, 2026"
  let m = raw.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    if (month) {
      const day = String(m[2]).padStart(2, "0");
      return { published: `${m[3]}-${month}-${day}`, year: parseInt(m[3], 10) };
    }
  }
  // "January 2026" or "January–March 2026"
  m = raw.match(/(\w+)[–-]?\w*\s+(\d{4})/);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    if (month) return { published: `${m[2]}-${month}-01`, year: parseInt(m[2], 10) };
  }
  // Bare year "2026" or "2025"
  m = raw.match(/\b(20\d{2})\b/);
  if (m) return { published: null, year: parseInt(m[1], 10) };
  return { published: null, year: null };
}

function parsePeriod(raw) {
  if (!raw) return { start: null, end: null };
  // "January 2021 – December 2024" or "Q1 2020 – Q2 2024" or "2024–2025"
  const months = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*";
  const part = `(?:Q[1-4]\\s+)?(?:${months}\\s+)?(\\d{4})`;
  const re = new RegExp(`${part}\\s*[–\\-to]+\\s*${part}`, "i");
  const m = raw.match(re);
  if (m) {
    return { start: `${m[1]}-01`, end: `${m[2]}-12` };
  }
  return { start: null, end: null };
}

function extractField(text, label) {
  // Matches **Label:** value, optionally with trailing two-space markdown line break
  const re = new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.+?)\\s*$`, "im");
  const m = text.match(re);
  return m ? m[1].trim().replace(/\s+$/, "") : null;
}

function extractUrl(sourceRaw, urlRaw) {
  if (urlRaw && /^https?:\/\//.test(urlRaw)) return urlRaw;
  if (sourceRaw && /^https?:\/\//.test(sourceRaw)) return sourceRaw;
  return null;
}

function yamlValue(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  const s = String(v);
  // Quote if it contains special YAML chars or starts with whitespace
  if (/[:#&*!|>%@`,\[\]{}'"]/.test(s) || /^[-?\s]/.test(s) || /^\d/.test(s)) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return s;
}

function buildFrontmatter(fm) {
  const lines = ["---"];
  const orderedKeys = [
    "title", "source", "year", "published",
    "url", "author", "data_period_start", "data_period_end",
    "sample_size", "best_for",
  ];
  for (const k of orderedKeys) {
    if (fm[k] === undefined || fm[k] === null || fm[k] === "") continue;
    if (Array.isArray(fm[k]) && fm[k].length === 0) continue;
    lines.push(`${k}: ${yamlValue(fm[k])}`);
  }
  lines.push("---");
  return lines.join("\n");
}

function stripProseHeader(body) {
  // Remove **Label:** value lines and any single trailing `---` separator
  // immediately after them. Preserves the # Title line.
  const lines = body.split("\n");
  const out = [];
  let i = 0;

  // Keep title (first non-blank line, should start with `# `)
  while (i < lines.length && lines[i].trim() === "") { out.push(lines[i]); i++; }
  if (i < lines.length && lines[i].startsWith("# ")) {
    out.push(lines[i]);
    i++;
  }

  // Skip the prose header block: blank lines + **Label:** lines + optional ---
  let inHeaderBlock = true;
  while (i < lines.length && inHeaderBlock) {
    const line = lines[i];
    const stripped = line.trim();
    if (stripped === "") { i++; continue; }
    if (/^\*\*[A-Za-z][\w\s]*:\*\*/.test(stripped)) { i++; continue; }
    if (stripped === "---") { i++; continue; }
    inHeaderBlock = false;
  }
  // Ensure exactly one blank line between title and first body content
  while (out.length && out[out.length - 1].trim() === "") out.pop();
  out.push("");
  for (; i < lines.length; i++) out.push(lines[i]);
  return out.join("\n");
}

// ── Main processing ──────────────────────────────────────────────────────────

function processFile(path) {
  const raw = readFileSync(path, "utf-8");
  if (raw.startsWith("---\n")) {
    return { path, skipped: true, reason: "already has frontmatter" };
  }

  // Title from first H1
  const titleMatch = raw.match(/^#\s+(.+?)\s*$/m);
  const title = titleMatch ? titleMatch[1].trim() : null;

  const sourceRaw = extractField(raw, "Source");
  const urlRaw = extractField(raw, "URL");
  const publishedRaw = extractField(raw, "Published");
  const authorRaw = extractField(raw, "Author");
  const dataRaw = extractField(raw, "Data");
  const periodRaw = extractField(raw, "Period");
  const bestForRaw = extractField(raw, "Best for");
  const methodologyRaw = extractField(raw, "Methodology");

  const source = matchSource(sourceRaw || title || "") || matchSource(basename(path));

  const { published, year: publishedYear } = parsePublishedDate(publishedRaw);

  // Year: prefer Published, then filename suffix, then title year
  let year = publishedYear;
  if (!year) {
    const fname = basename(path);
    const fy = fname.match(/(20\d{2})/);
    if (fy) year = parseInt(fy[1], 10);
  }
  if (!year && title) {
    const ty = title.match(/\b(20\d{2})\b/);
    if (ty) year = parseInt(ty[1], 10);
  }

  const { start: dataStart, end: dataEnd } = parsePeriod(periodRaw);

  // Last-resort year fallback: use the data-period end year for multi-year
  // reports that have no Published date and no year in title/filename.
  if (!year && dataEnd) {
    const m = dataEnd.match(/^(\d{4})/);
    if (m) year = parseInt(m[1], 10);
  }

  // For SHRM file where "Methodology:" doubles as Data, prefer it as sample_size
  const sampleSize = dataRaw || methodologyRaw;

  const fm = {
    title,
    source,
    year,
    published,
    url: extractUrl(sourceRaw, urlRaw),
    author: authorRaw,
    data_period_start: dataStart,
    data_period_end: dataEnd,
    sample_size: sampleSize,
    best_for: bestForRaw,
  };

  const body = stripProseHeader(raw);
  const output = `${buildFrontmatter(fm)}\n\n${body.replace(/^\n+/, "")}`;

  const missing = [];
  if (!fm.title) missing.push("title");
  if (!fm.source) missing.push("source");
  if (!fm.year) missing.push("year");

  if (DRY) {
    console.log(`\n===== ${basename(path)} =====`);
    console.log(buildFrontmatter(fm));
    if (missing.length) console.log(`  ⚠️  MISSING REQUIRED: ${missing.join(", ")}`);
  } else {
    writeFileSync(path, output);
  }

  return { path, written: !DRY, missing, fm };
}

function discoverReports() {
  const paths = [];
  for (const f of readdirSync(ROOT)) {
    if (f.endsWith(".md") && !["README.md", "MEMORY.md", "substack-post.md"].includes(f)) {
      paths.push(join(ROOT, f));
    }
  }
  for (const f of readdirSync(REPORTS_DIR)) {
    if (f.endsWith(".md") && f !== "00-INDEX.md") {
      paths.push(join(REPORTS_DIR, f));
    }
  }
  return paths;
}

const paths = discoverReports();
const results = paths.map(processFile);

const skipped = results.filter(r => r.skipped);
const missingByField = {};
for (const r of results) {
  if (!r.missing) continue;
  for (const m of r.missing) {
    missingByField[m] = (missingByField[m] || 0) + 1;
  }
}

console.log(`\nProcessed ${results.length} files (${skipped.length} skipped, already had frontmatter).`);
if (Object.keys(missingByField).length) {
  console.log("\nReports missing required fields (need manual review):");
  for (const [field, count] of Object.entries(missingByField)) {
    console.log(`  ${field}: ${count}`);
  }
  for (const r of results) {
    if (r.missing && r.missing.length) {
      console.log(`  - ${basename(r.path)}: missing ${r.missing.join(", ")}`);
    }
  }
}
