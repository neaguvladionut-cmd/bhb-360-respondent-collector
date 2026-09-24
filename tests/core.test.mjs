import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRequire } from "node:module";
import vm from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COLLECTOR_HEADERS, buildCollectorRows, createCollectorWorkbook, normalizeEmail, normalizeText, validateCollector } from "../src/core.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const vendorSource = await readFile(resolve(root, "src/assets/vendor/xlsx.full.min.js"), "utf8");
const sandbox = { exports: {}, module: { exports: {} }, require, Buffer, process, setTimeout, clearTimeout };
vm.runInNewContext(vendorSource, sandbox, { filename: "xlsx.full.min.js" });
const XLSX = sandbox.exports;
const fixture = JSON.parse(await readFile(resolve(root, "tests/fixtures/d210-participant.json"), "utf8"));

test("Unicode whitespace and email identity normalize deterministically", () => {
  assert.equal(normalizeText("  D210\u00a0 Ada\nExemplu  "), "D210 Ada Exemplu");
  assert.equal(normalizeEmail(" ADA@EXAMPLE.INVALID\n"), "ada@example.invalid");
});

test("minimum is self plus one distinct actual Manager", () => {
  const missing = validateCollector({ ...fixture, respondents: [] });
  assert.equal(missing.valid, false);
  assert(missing.errors.some((error) => error.code === "manager-required"));
  const selfAsManager = validateCollector({ ...fixture, respondents: [{ name: fixture.participantName, email: fixture.participantEmail, role: "Manager", language: "RO" }] });
  assert(selfAsManager.errors.some((error) => error.code === "manager-is-self"));
  assert(!selfAsManager.errors.some((error) => error.code === "manager-required"));
  assert.equal(validateCollector(fixture).valid, true);
});

test("zero optional roles is valid, 15 respondents is valid, and the 16th warns without blocking", () => {
  const respondents = Array.from({ length: 15 }, (_, index) => ({ name: `D210 Person ${index}`, email: `person${index}@example.invalid`, role: index === 0 ? "Manager" : "Peer", language: "ro" }));
  assert.equal(validateCollector({ ...fixture, respondents }).valid, true);
  respondents.push({ name: "D210 Sixteen", email: "sixteen@example.invalid", role: "Peer", language: "RO" });
  const result = validateCollector({ ...fixture, respondents });
  assert.equal(result.valid, true);
  assert(result.warnings.some((warning) => warning.code === "respondent-cohort-warning"));
});

test("languages uppercase, duplicates block, and formula-like names remain literal", () => {
  const value = { ...fixture, participantName: "=D210 literal", respondents: [...fixture.respondents, { ...fixture.respondents[0], name: "+D210 literal", language: "fr" }] };
  const result = validateCollector(value);
  assert(result.errors.some((error) => error.code === "duplicate-email"));
  assert.equal(result.value.respondents[1].language, "FR");
  assert.equal(result.value.participantName, "=D210 literal");
});

test("standard workbook contains self first and participant-facing relationship labels", () => {
  const rows = buildCollectorRows(fixture);
  assert.equal(rows[0].relationship, "Autoevaluare");
  assert.equal(rows[0].isSelf, "DA");
  assert.equal(rows[2].relationship, "Stakeholder");
  const workbook = createCollectorWorkbook(XLSX, fixture);
  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true, bookSST: true });
  const reopened = XLSX.read(bytes, { type: "buffer" });
  const data = XLSX.utils.sheet_to_json(reopened.Sheets.Respondenti, { header: 1, defval: "" });
  assert.equal(JSON.stringify(Array.from(data[0])), JSON.stringify(COLLECTOR_HEADERS));
  assert.equal(data[1][4], "Autoevaluare");
  assert.equal(data[3][4], "Stakeholder");
  assert.equal(reopened.Sheets.Respondenti.A2.t, "s");
});

test("optional criteria repeat on every collector row", () => {
  const workbook = createCollectorWorkbook(XLSX, { ...fixture, criteria: ["Leadership", "Integrity", "", "", ""] });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Respondenti, { header: 1, defval: "" });
  assert.equal(JSON.stringify(Array.from(rows[0].slice(-5))), JSON.stringify(["Criteriu1", "Criteriu2", "Criteriu3", "Criteriu4", "Criteriu5"]));
  assert.equal(JSON.stringify(Array.from(rows[1].slice(-5))), JSON.stringify(["Leadership", "Integrity", "", "", ""]));
  assert.equal(JSON.stringify(Array.from(rows[2].slice(-5))), JSON.stringify(["Leadership", "Integrity", "", "", ""]));
});
