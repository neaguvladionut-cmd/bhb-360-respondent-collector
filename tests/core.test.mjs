import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRequire } from "node:module";
import vm from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COLLECTOR_HEADERS, MASS_TEMPLATE_HEADERS, buildCollectorRows, createCollectorWorkbook, createMassTemplateWorkbook, normalizeEmail, normalizeText, validateCollector } from "../src/core.js";

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

test("mass template preserves the Relatii contract and uses exact Romanian copy by default", () => {
  const workbook = createMassTemplateWorkbook(XLSX);
  assert.equal(JSON.stringify(Array.from(workbook.SheetNames)), JSON.stringify(["Relatii", "Exemplu"]));
  const sheet = workbook.Sheets.Relatii;
  assert.equal(sheet.A1.v, "BHB360_MASS_RELATIONS_V1");
  assert.equal(sheet.B1.v, "RO");
  assert.equal(sheet.A2.v, "Instrucțiuni");
  assert.equal(sheet.B2.v, "Un rând = o persoană care evaluează un participant. Repetați numele și emailul participantului pe fiecare rând. Language: RO sau EN. Criteriu1–5: opțional; dacă le folosiți, aceleași valori pe toate rândurile unui participant. Nu modificați rândul 4 (capul de tabel).");
  assert.equal(sheet.A3.v, "Roluri");
  assert.equal(sheet.B3.v, "Manager = șeful direct (obligatoriu, cel puțin unul per participant); Peer = coleg de nivel similar; Subordonat = îi raportează participantului; Stakeholder = partener din alt departament sau din afara firmei. Recomandat: circa 10 evaluatori per participant.");
  assert.equal(JSON.stringify(Array.from(XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })[3])), JSON.stringify(MASS_TEMPLATE_HEADERS));
  assert.equal(sheet["!autofilter"].ref, "A4:K4");
  assert.equal(sheet["!freeze"].ySplit, 4);
  assert.deepEqual(sheet["!cols"], [{ wch: 26 }, { wch: 32 }, { wch: 26 }, { wch: 32 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }]);
  assert.equal(sheet["!ref"], "A1:K4");
});

test("mass template uses exact English copy and the example is not an importable near-neighbour", () => {
  const workbook = createMassTemplateWorkbook(XLSX, "EN");
  const sheet = workbook.Sheets.Relatii;
  assert.equal(sheet.B1.v, "EN");
  assert.equal(sheet.A2.v, "Instructions");
  assert.equal(sheet.B2.v, "One row = one person who evaluates one participant. Repeat the participant's name and email on every row. Language: RO or EN. Criteriu1–5: optional; if used, the same values on all rows of a participant. Do not change row 4 (the header row).");
  assert.equal(sheet.A3.v, "Roles");
  assert.equal(sheet.B3.v, "Manager = direct manager (required, at least one per participant); Peer = colleague at a similar level; Subordonat = reports to the participant; Stakeholder = partner from another department or outside the company. Recommended: about 10 evaluators per participant.");

  const example = workbook.Sheets.Example;
  assert.equal(example.A1.v, "Filled-in example — for guidance only. Fill in your list on the Relatii sheet.");
  assert.equal(JSON.stringify(Array.from(XLSX.utils.sheet_to_json(example, { header: 1, defval: "" })[2])), JSON.stringify(["Example", ...MASS_TEMPLATE_HEADERS]));
  assert.equal(JSON.stringify(Array.from(XLSX.utils.sheet_to_json(example, { header: 1, defval: "" }).slice(3), (row) => Array.from(row))), JSON.stringify([
    ["", "Ana Popescu", "ana.popescu@example.com", "Mihai Ionescu", "mihai.ionescu@example.com", "Manager", "RO", "", "", "", "", ""],
    ["", "Ana Popescu", "ana.popescu@example.com", "Ioana Dobre", "ioana.dobre@example.com", "Peer", "RO", "", "", "", "", ""],
    ["", "Ana Popescu", "ana.popescu@example.com", "Radu Stan", "radu.stan@example.com", "Subordonat", "RO", "", "", "", "", ""],
    ["", "Ana Popescu", "ana.popescu@example.com", "John Smith", "john.smith@example.com", "Stakeholder", "EN", "", "", "", "", ""],
    ["", "Mihai Ionescu", "mihai.ionescu@example.com", "Elena Marin", "elena.marin@example.com", "Manager", "RO", "", "", "", "", ""],
    ["", "Mihai Ionescu", "mihai.ionescu@example.com", "Ana Popescu", "ana.popescu@example.com", "Subordonat", "RO", "", "", "", "", ""],
  ]));
  assert.deepEqual(example["!cols"].slice(1), sheet["!cols"]);
  const exampleRows = XLSX.utils.sheet_to_json(example, { header: 1, defval: "" });
  assert.equal(example.A3.v, "Example");
  assert(exampleRows.every((row) => JSON.stringify(Array.from(row).slice(0, MASS_TEMPLATE_HEADERS.length)) !== JSON.stringify(MASS_TEMPLATE_HEADERS)));
  const text = workbook.SheetNames.flatMap((name) => Object.values(workbook.Sheets[name]))
    .filter((cell) => cell?.t === "s")
    .map((cell) => cell.v)
    .join("\n");
  assert.doesNotMatch(text, /autoevaluare|self-evaluation/iu);
});
