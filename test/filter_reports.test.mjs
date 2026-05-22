/**
 * Tests for the filter_reports tool's filtering logic.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { filterReports, parsedReports, searchAcrossReports } from "../server.js";

const total = Object.keys(parsedReports()).length;

test("no filters returns every report", () => {
  assert.equal(filterReports().length, total);
  assert.equal(filterReports({}).length, total);
});

test("filter by exact source", () => {
  const matches = filterReports({ source: "Ashby" });
  assert.ok(matches.length >= 10, "expected several Ashby reports");
  for (const r of matches) assert.equal(r.frontmatter.source, "Ashby");
});

test("source match is case-insensitive substring", () => {
  const lower = filterReports({ source: "ashby" });
  const upper = filterReports({ source: "ASHBY" });
  assert.equal(lower.length, upper.length);
  assert.ok(lower.length > 0);
});

test("filter by year", () => {
  const matches = filterReports({ year: 2026 });
  assert.ok(matches.length >= 5);
  for (const r of matches) assert.equal(r.frontmatter.year, 2026);
});

test("filter by year_min and year_max", () => {
  const matches = filterReports({ year_min: 2025, year_max: 2026 });
  assert.ok(matches.length > 0);
  for (const r of matches) {
    assert.ok(r.frontmatter.year >= 2025 && r.frontmatter.year <= 2026);
  }
});

test("filters AND together", () => {
  const ashbyOnly = filterReports({ source: "Ashby" }).length;
  const ashby2024 = filterReports({ source: "Ashby", year: 2024 }).length;
  assert.ok(ashby2024 < ashbyOnly, "compound filter should narrow results");
  for (const r of filterReports({ source: "Ashby", year: 2024 })) {
    assert.equal(r.frontmatter.source, "Ashby");
    assert.equal(r.frontmatter.year, 2024);
  }
});

test("nonsense filters return empty result", () => {
  assert.equal(filterReports({ source: "DoesNotExist" }).length, 0);
  assert.equal(filterReports({ year: 1999 }).length, 0);
});

test("search_reports matches author from frontmatter (was a regression)", () => {
  const result = searchAcrossReports("Joel Westmark");
  assert.ok(!result.startsWith("No results"), "search should match an author from frontmatter");
  assert.match(result, /ashby-/);
});

test("search_reports matches best_for and sample_size from frontmatter", () => {
  assert.ok(!searchAcrossReports("autonomous agent trends").startsWith("No results"));
  assert.ok(!searchAcrossReports("1,674 global talent leaders").startsWith("No results"));
});
