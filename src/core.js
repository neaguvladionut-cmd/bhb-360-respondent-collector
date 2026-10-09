export const RECOMMENDED_RESPONDENTS = 10;
export const WARNING_RESPONDENTS = 15;
// Kept as a compatibility export for callers that imported the old constant.
export const MAX_RESPONDENTS = Number.POSITIVE_INFINITY;
export const CRITERIA_COUNT = 5;
export const COLLECTOR_HEADERS = [
  "ParticipantName",
  "ParticipantEmail",
  "EvaluatorName",
  "EvaluatorEmail",
  "Relationship",
  "Language",
  "IsSelf",
  "Criteriu1",
  "Criteriu2",
  "Criteriu3",
  "Criteriu4",
  "Criteriu5",
];
export const MASS_TEMPLATE_HEADERS = [
  "ParticipantName",
  "ParticipantEmail",
  "EvaluatorName",
  "EvaluatorEmail",
  "Relationship",
  "Language",
  "Criteriu1",
  "Criteriu2",
  "Criteriu3",
  "Criteriu4",
  "Criteriu5",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const LANGUAGE_RE = /^[A-Z]{2}$/u;
const VALID_ROLES = new Set(["Manager", "Peer", "Subordonat", "Stakeholder"]);

export function normalizeText(value) {
  return String(value ?? "")
    .replace(/[\u00a0\u2007\u202f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function normalizeEmail(value) {
  return normalizeText(value).toLocaleLowerCase("en-US");
}

export function normalizeLanguage(value) {
  return normalizeText(value).toUpperCase();
}

export function isValidEmail(value) {
  return EMAIL_RE.test(normalizeEmail(value));
}

function normalizeCriteria(data) {
  const supplied = Array.isArray(data.criteria)
    ? data.criteria
    : Array.from({ length: CRITERIA_COUNT }, (_, index) => data[`criterion${index + 1}`] ?? data[`criteria${index + 1}`]);
  return Array.from({ length: CRITERIA_COUNT }, (_, index) => normalizeText(supplied[index]));
}

function normalizePerson(row, fallbackLanguage = "RO") {
  return {
    name: normalizeText(row?.name),
    email: normalizeEmail(row?.email),
    role: normalizeText(row?.role),
    language: normalizeLanguage(row?.language || fallbackLanguage),
  };
}

export function normalizeCollector(data) {
  const legacyRespondents = Array.isArray(data.respondents) ? data.respondents : [];
  const suppliedManager = data.manager || legacyRespondents.find((row) => normalizeText(row.role) === "Manager");
  const optionalRespondents = data.manager
    ? legacyRespondents
    : legacyRespondents.filter((row) => row !== suppliedManager);
  return {
    participantName: normalizeText(data.participantName),
    participantEmail: normalizeEmail(data.participantEmail),
    selfLanguage: normalizeLanguage(data.selfLanguage || "RO"),
    criteria: normalizeCriteria(data),
    manager: normalizePerson(suppliedManager, "RO"),
    respondents: optionalRespondents.map((row) => normalizePerson(row, "RO")),
  };
}

export function validateCollector(data) {
  const value = normalizeCollector(data);
  const errors = [];
  const warnings = [];
  const add = (code, path, ro, en) => errors.push({ code, path, ro, en });
  const warn = (code, ro, en) => warnings.push({ code, ro, en });

  if (!value.participantName) add("participant-name", "participantName", "Completează numele tău.", "Enter your name.");
  if (!isValidEmail(value.participantEmail)) add("participant-email", "participantEmail", "Completează o adresă de email validă.", "Enter a valid email address.");
  if (!LANGUAGE_RE.test(value.selfLanguage)) add("self-language", "selfLanguage", "Limba pentru autoevaluare trebuie să aibă două litere.", "The self-evaluation language must use two letters.");

  const manager = value.manager;
  if (!manager.name && !manager.email) add("manager-required", "manager", "Adaugă managerul obligatoriu.", "Add the required manager.");
  if (!manager.name) add("manager-name", "manager.name", "Completează numele managerului.", "Enter the manager's name.");
  if (!isValidEmail(manager.email)) add("manager-email", "manager.email", "Completează emailul managerului.", "Enter the manager's email address.");
  if (!LANGUAGE_RE.test(manager.language)) add("manager-language", "manager.language", "Limba managerului trebuie să aibă două litere.", "The manager's language must use two letters.");
  if (manager.email && manager.email === value.participantEmail) add("manager-is-self", "manager.email", "Managerul trebuie să fie o altă persoană decât tine.", "The manager must be someone other than you.");

  const people = [manager, ...value.respondents];
  const seen = new Set();
  people.forEach((row, index) => {
    const prefix = index === 0 ? "manager" : `respondents.${index - 1}`;
    if (index > 0 && !VALID_ROLES.has(row.role)) add("respondent-role", `${prefix}.role`, "Alege relația profesională.", "Choose the professional relationship.");
    if (!row.name && index > 0) add("respondent-name", `${prefix}.name`, "Completează numele respondentului.", "Enter the respondent's name.");
    if (!isValidEmail(row.email) && index > 0) add("respondent-email", `${prefix}.email`, "Completează o adresă de email validă.", "Enter a valid email address.");
    if (!LANGUAGE_RE.test(row.language) && index > 0) add("respondent-language", `${prefix}.language`, "Limba trebuie să aibă exact două litere.", "Language must use exactly two letters.");
    if (index > 0 && row.email && row.email === value.participantEmail) add("respondent-is-self", `${prefix}.email`, "Autoevaluarea este inclusă deja. Folosește o altă adresă.", "Self-evaluation is already included. Use a different address.");
    if (row.email && seen.has(row.email)) add("duplicate-email", `${prefix}.email`, "Acest respondent a fost adăugat deja.", "This respondent was already added.");
    if (row.email) seen.add(row.email);
  });

  const respondentCount = people.length;
  if (respondentCount > RECOMMENDED_RESPONDENTS) {
    warn("respondent-recommendation", `Ai adăugat ${respondentCount} respondenți. Recomandarea generală este de maximum ${RECOMMENDED_RESPONDENTS}; poți continua dacă acest grup este necesar.`, `You have added ${respondentCount} respondents. The general recommendation is at most ${RECOMMENDED_RESPONDENTS}; you can continue if this cohort is necessary.`);
  }
  if (respondentCount > WARNING_RESPONDENTS) {
    warn("respondent-cohort-warning", `Acest grup depășește ${WARNING_RESPONDENTS} respondenți. Verifică dacă toți sunt necesari; limita este o recomandare, nu un blocaj.`, `This cohort exceeds ${WARNING_RESPONDENTS} respondents. Check that everyone is necessary; this is guidance, not a blocker.`);
  }
  return { value, errors, warnings, valid: errors.length === 0 };
}

function rowsForValue(value) {
  return [
    { ...value.manager, participantName: value.participantName, participantEmail: value.participantEmail, isSelf: "NU" },
    ...value.respondents.map((row) => ({ ...row, participantName: value.participantName, participantEmail: value.participantEmail, isSelf: "NU" })),
  ];
}

export function buildCollectorRows(data) {
  const result = validateCollector(data);
  if (!result.valid) throw new Error("Collector data is not valid");
  const value = result.value;
  return [
    {
      participantName: value.participantName,
      participantEmail: value.participantEmail,
      evaluatorName: value.participantName,
      evaluatorEmail: value.participantEmail,
      relationship: "Autoevaluare",
      language: value.selfLanguage,
      isSelf: "DA",
      criteria: value.criteria,
    },
    ...rowsForValue(value).map((row) => ({
      participantName: row.participantName,
      participantEmail: row.participantEmail,
      evaluatorName: row.name,
      evaluatorEmail: row.email,
      relationship: row.role,
      language: row.language,
      isSelf: row.isSelf,
      criteria: value.criteria,
    })),
  ];
}

function literalCell(value) {
  return { t: "s", v: String(value ?? "") };
}

function sheetFromRows(XLSX, headers, rows) {
  const sheet = { "!ref": `A1:${XLSX.utils.encode_col(headers.length - 1)}${rows.length + 1}` };
  headers.forEach((header, column) => {
    sheet[XLSX.utils.encode_cell({ r: 0, c: column })] = literalCell(header);
  });
  rows.forEach((row, rowIndex) => {
    row.forEach((value, column) => {
      sheet[XLSX.utils.encode_cell({ r: rowIndex + 1, c: column })] = literalCell(value);
    });
  });
  return sheet;
}

export function createCollectorWorkbook(XLSX, data, uiLanguage = "RO") {
  const rows = buildCollectorRows(data).map((row) => [
    row.participantName, row.participantEmail, row.evaluatorName, row.evaluatorEmail,
    row.relationship, row.language, row.isSelf, ...row.criteria,
  ]);
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: "BHB 360 Respondent Collection",
    Subject: "Structurally validated participant handoff",
    Author: "Business Health Bar",
    Comments: "Generated locally in the participant browser.",
  };
  const instructions = sheetFromRows(XLSX, ["BHB360_COLLECTOR_V2", uiLanguage], [
    ["Instrucțiuni / Instructions", "Trimite acest fișier consultantului. Nu modifica foaia Respondenti. / Email this file to your consultant. Do not edit the Respondenti sheet."],
    ["Criterii / Criteria", "Criteriile opționale sunt repetate pe fiecare rând pentru participant. / Optional criteria are repeated on every row for the participant."],
    ["Confidențialitate / Privacy", "Datele au fost procesate local în browser. / Data was processed locally in the browser."],
  ]);
  instructions["!cols"] = [{ wch: 30 }, { wch: 105 }];
  instructions["!rows"] = [{ hpt: 24 }, { hpt: 36 }, { hpt: 36 }, { hpt: 36 }];
  const respondentSheet = sheetFromRows(XLSX, COLLECTOR_HEADERS, rows);
  respondentSheet["!cols"] = [
    { wch: 26 }, { wch: 32 }, { wch: 26 }, { wch: 32 }, { wch: 18 }, { wch: 12 }, { wch: 10 },
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
  ];
  respondentSheet["!autofilter"] = { ref: `A1:L${rows.length + 1}` };
  respondentSheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
  XLSX.utils.book_append_sheet(workbook, instructions, "Instrucțiuni");
  XLSX.utils.book_append_sheet(workbook, respondentSheet, "Respondenti");
  return workbook;
}

export function createMassTemplateWorkbook(XLSX, uiLanguage = "RO") {
  const isEnglish = String(uiLanguage).toUpperCase() === "EN";
  const copy = isEnglish
    ? {
        instructions: "Instructions",
        instructionText: "One row = one person who evaluates one participant. Repeat the participant's name and email on every row. Language: RO or EN. Criteriu1–5: optional; if used, the same values on all rows of a participant. Do not change row 4 (the header row).",
        roles: "Roles",
        rolesText: "Manager = direct manager (required, at least one per participant); Peer = colleague at a similar level; Subordonat = reports to the participant; Stakeholder = partner from another department or outside the company. Recommended: about 10 evaluators per participant.",
        exampleTitle: "Filled-in example — for guidance only. Fill in your list on the Relatii sheet.",
        exampleLabel: "Example",
        sheetName: "Example",
      }
    : {
        instructions: "Instrucțiuni",
        instructionText: "Un rând = o persoană care evaluează un participant. Repetați numele și emailul participantului pe fiecare rând. Language: RO sau EN. Criteriu1–5: opțional; dacă le folosiți, aceleași valori pe toate rândurile unui participant. Nu modificați rândul 4 (capul de tabel).",
        roles: "Roluri",
        rolesText: "Manager = șeful direct (obligatoriu, cel puțin unul per participant); Peer = coleg de nivel similar; Subordonat = îi raportează participantului; Stakeholder = partener din alt departament sau din afara firmei. Recomandat: circa 10 evaluatori per participant.",
        exampleTitle: "Exemplu completat — doar pentru orientare. Completați lista în foaia Relatii.",
        exampleLabel: "Exemplu",
        sheetName: "Exemplu",
      };
  const sheet = {};
  [
    ["BHB360_MASS_RELATIONS_V1", uiLanguage],
    [copy.instructions, copy.instructionText],
    [copy.roles, copy.rolesText],
    MASS_TEMPLATE_HEADERS,
  ].forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
    sheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })] = literalCell(value);
  }));
  const headerRow = 3;
  sheet["!ref"] = `A1:${XLSX.utils.encode_col(MASS_TEMPLATE_HEADERS.length - 1)}4`;
  sheet["!autofilter"] = { ref: `A${headerRow + 1}:${XLSX.utils.encode_col(MASS_TEMPLATE_HEADERS.length - 1)}${headerRow + 1}` };
  sheet["!freeze"] = { xSplit: 0, ySplit: headerRow + 1, topLeftCell: `A${headerRow + 2}`, activePane: "bottomLeft", state: "frozen" };
  const columnWidths = [{ wch: 26 }, { wch: 32 }, { wch: 26 }, { wch: 32 }, { wch: 18 }, { wch: 12 }, ...Array.from({ length: CRITERIA_COUNT }, () => ({ wch: 16 }))];
  sheet["!cols"] = columnWidths;
  const exampleRows = [
    ["Ana Popescu", "ana.popescu@example.com", "Mihai Ionescu", "mihai.ionescu@example.com", "Manager", "RO", "", "", "", "", ""],
    ["Ana Popescu", "ana.popescu@example.com", "Ioana Dobre", "ioana.dobre@example.com", "Peer", "RO", "", "", "", "", ""],
    ["Ana Popescu", "ana.popescu@example.com", "Radu Stan", "radu.stan@example.com", "Subordonat", "RO", "", "", "", "", ""],
    ["Ana Popescu", "ana.popescu@example.com", "John Smith", "john.smith@example.com", "Stakeholder", "EN", "", "", "", "", ""],
    ["Mihai Ionescu", "mihai.ionescu@example.com", "Elena Marin", "elena.marin@example.com", "Manager", "RO", "", "", "", "", ""],
    ["Mihai Ionescu", "mihai.ionescu@example.com", "Ana Popescu", "ana.popescu@example.com", "Subordonat", "RO", "", "", "", "", ""],
  ];
  const example = {};
  example["A1"] = literalCell(copy.exampleTitle);
  example["!ref"] = "A1:L9";
  [copy.exampleLabel, ...MASS_TEMPLATE_HEADERS].forEach((value, columnIndex) => {
    example[XLSX.utils.encode_cell({ r: 2, c: columnIndex })] = literalCell(value);
  });
  exampleRows.forEach((row, rowIndex) => {
    example[XLSX.utils.encode_cell({ r: rowIndex + 3, c: 0 })] = literalCell("");
    row.forEach((value, columnIndex) => {
      example[XLSX.utils.encode_cell({ r: rowIndex + 3, c: columnIndex + 1 })] = literalCell(value);
    });
  });
  example["!cols"] = [{ wch: 26 }, ...columnWidths];
  const workbook = XLSX.utils.book_new();
  workbook.Props = { Title: "BHB 360 mass respondent relations template", Author: "Business Health Bar", Comments: "Blank local template; no client data included." };
  XLSX.utils.book_append_sheet(workbook, sheet, "Relatii");
  XLSX.utils.book_append_sheet(workbook, example, copy.sheetName);
  return workbook;
}

export function safeFilePart(value) {
  const normalized = normalizeText(value).normalize("NFD").replace(/[\u0300-\u036f]/gu, "");
  return normalized.replace(/[^a-z0-9_-]+/giu, "-").replace(/^-+|-+$/gu, "").slice(0, 60) || "participant";
}
