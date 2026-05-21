/**
 * Validates that every report has correct, well-formed YAML frontmatter.
 * This enforces the controlled vocabularies — typos in `source` or `topics`
 * fail CI. See CONTRIBUTING.md for the schema.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsedReports } from "../server.js";

const VALID_SOURCES = new Set([
  "Ashby", "Gem", "LinkedIn", "SHRM", "Employ", "iCIMS",
  "Korn Ferry", "HireVue", "Greenhouse", "SignalFire",
  "Criteria Corp", "Bullhorn", "Mercer", "Josh Bersin Company", "Phenom",
]);

const VALID_TOPICS = new Set([
  "ai-adoption", "ai-tools", "time-to-fill", "time-to-hire",
  "funnel-metrics", "source-of-hire", "sourcing", "outreach",
  "referrals", "offer-acceptance", "recruiter-productivity",
  "coordination", "candidate-experience", "application-volume",
  "ghost-jobs", "startup-hiring", "labor-market", "executive-priorities",
]);

const reports = parsedReports();
const names = Object.keys(reports).sort();

test("at least 30 reports are discovered", () => {
  assert.ok(names.length >= 30, `expected 30+ reports, got ${names.length}`);
});

for (const name of names) {
  const fm = reports[name].frontmatter;

  test(`${name} — required fields present`, () => {
    assert.ok(fm.title, "missing title");
    assert.ok(fm.source, "missing source");
    assert.ok(fm.year, "missing year");
    assert.ok(Array.isArray(fm.topics) && fm.topics.length > 0, "missing or empty topics");
  });

  test(`${name} — source is in canonical vocabulary`, () => {
    assert.ok(
      VALID_SOURCES.has(fm.source),
      `'${fm.source}' is not in the canonical source list. Add it to VALID_SOURCES in test/frontmatter.test.mjs and CONTRIBUTING.md if intentional.`
    );
  });

  test(`${name} — year is a sensible int`, () => {
    assert.equal(typeof fm.year, "number");
    assert.ok(fm.year >= 2020 && fm.year <= 2030, `year ${fm.year} out of range`);
  });

  test(`${name} — every topic tag is in the canonical taxonomy`, () => {
    for (const t of fm.topics) {
      assert.ok(
        VALID_TOPICS.has(t),
        `'${t}' is not a valid topic tag. Add it to VALID_TOPICS in test/frontmatter.test.mjs and CONTRIBUTING.md if intentional.`
      );
    }
  });

  test(`${name} — published is null or ISO date`, () => {
    if (fm.published == null) return;
    assert.match(fm.published, /^\d{4}-\d{2}-\d{2}$/, `published='${fm.published}' is not ISO YYYY-MM-DD`);
  });

  test(`${name} — body is non-empty and frontmatter is stripped`, () => {
    const body = reports[name].body;
    assert.ok(body.length > 100, "body suspiciously short");
    assert.ok(!body.startsWith("---"), "frontmatter leaked into body");
  });
}
