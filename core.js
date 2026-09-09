export const MAX_RESPONDENTS = 15;
export const RECOMMENDED_RESPONDENTS = 10;
export const COLLECTOR_HEADERS = [
  "ParticipantName",
  "ParticipantEmail",
  "EvaluatorName",
  "EvaluatorEmail",
  "Relationship",
  "Language",
  "IsSelf",
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

export function normalizeCollector(data) {
  return {
    participantName: normalizeText(data.participantName),
    participantEmail: normalizeEmail(data.participantEmail),
    selfLanguage: normalizeLanguage(data.selfLanguage || "RO"),
    respondents: (data.respondents || []).map((row) => ({
      name: normalizeText(row.name),
      email: normalizeEmail(row.email),
      role: normalizeText(row.role),
      language: normalizeLanguage(row.language || "RO"),
    })),
  };
}

export function validateCollector(data) {
  const value = normalizeCollector(data);
  const errors = [];
  const add = (code, path, ro, en) => errors.push({ code, path, ro, en });

  if (!value.participantName) {
    add("participant-name", "participantName", "Completează numele tău.", "Enter your name.");
  }
  if (!isValidEmail(value.participantEmail)) {
    add("participant-email", "participantEmail", "Completează o adresă de email validă.", "Enter a valid email address.");
  }
  if (!LANGUAGE_RE.test(value.selfLanguage)) {
    add("self-language", "selfLanguage", "Limba pentru autoevaluare trebuie să aibă două litere.", "The self-evaluation language must use two letters.");
  }
  if (value.respondents.length > MAX_RESPONDENTS) {
    add("too-many", "respondents", `Poți adăuga cel mult ${MAX_RESPONDENTS} respondenți.`, `You can add at most ${MAX_RESPONDENTS} respondents.`);
  }

  let managerCount = 0;
  const seen = new Set();
  value.respondents.forEach((row, index) => {
    const prefix = `respondents.${index}`;
    if (!row.name) add("respondent-name", `${prefix}.name`, "Completează numele respondentului.", "Enter the respondent's name.");
    if (!isValidEmail(row.email)) add("respondent-email", `${prefix}.email`, "Completează un email valid.", "Enter a valid email.");
    if (!VALID_ROLES.has(row.role)) add("respondent-role", `${prefix}.role`, "Alege relația profesională.", "Choose the professional relationship.");
    if (!LANGUAGE_RE.test(row.language)) add("respondent-language", `${prefix}.language`, "Limba trebuie să aibă exact două litere.", "Language must use exactly two letters.");
    if (row.role === "Manager" && row.email !== value.participantEmail) managerCount += 1;
    if (row.email && row.email === value.participantEmail) {
      add("respondent-is-self", `${prefix}.email`, "Autoevaluarea este inclusă deja. Folosește o altă adresă.", "Self-evaluation is already included. Use a different address.");
    }
    if (row.email && seen.has(row.email)) {
      add("duplicate-email", `${prefix}.email`, "Acest respondent a fost adăugat deja.", "This respondent was already added.");
    }
    if (row.email) seen.add(row.email);
  });

  if (managerCount === 0) {
    add("manager-required", "respondents", "Adaugă cel puțin un Manager distinct de tine.", "Add at least one Manager who is not you.");
  }
  return { value, errors, valid: errors.length === 0 };
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
    },
    ...value.respondents.map((row) => ({
      participantName: value.participantName,
      participantEmail: value.participantEmail,
      evaluatorName: row.name,
      evaluatorEmail: row.email,
      relationship: row.role,
      language: row.language,
      isSelf: "NU",
    })),
  ];
}

function literalCell(value) {
  return { t: "s", v: String(value ?? "") };
}

function sheetFromRows(XLSX, headers, rows) {
  const sheet = { "!ref": `A1:${String.fromCharCode(64 + headers.length)}${rows.length + 1}` };
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
    row.participantName,
    row.participantEmail,
    row.evaluatorName,
    row.evaluatorEmail,
    row.relationship,
    row.language,
    row.isSelf,
  ]);
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: "BHB 360 Respondent Collection",
    Subject: "Structurally validated participant handoff",
    Author: "Business Health Bar",
    Comments: "Generated locally in the participant browser.",
  };
  const instructions = sheetFromRows(XLSX, ["BHB360_COLLECTOR_V1", uiLanguage], [
    ["Instrucțiuni / Instructions", "Trimite acest fișier consultantului. Nu modifica foaia Respondenti. / Email this file to your consultant. Do not edit the Respondenti sheet."],
    ["Confidențialitate / Privacy", "Datele au fost procesate local în browser. / Data was processed locally in the browser."],
  ]);
  instructions["!cols"] = [{ wch: 30 }, { wch: 105 }];
  instructions["!rows"] = [{ hpt: 24 }, { hpt: 36 }, { hpt: 36 }];
  const respondentSheet = sheetFromRows(XLSX, COLLECTOR_HEADERS, rows);
  respondentSheet["!cols"] = [
    { wch: 26 }, { wch: 32 }, { wch: 26 }, { wch: 32 }, { wch: 18 }, { wch: 12 }, { wch: 10 },
  ];
  respondentSheet["!autofilter"] = { ref: `A1:G${rows.length + 1}` };
  respondentSheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
  XLSX.utils.book_append_sheet(workbook, instructions, "Instrucțiuni");
  XLSX.utils.book_append_sheet(workbook, respondentSheet, "Respondenti");
  return workbook;
}

export function safeFilePart(value) {
  const normalized = normalizeText(value).normalize("NFD").replace(/[\u0300-\u036f]/gu, "");
  return normalized.replace(/[^a-z0-9_-]+/giu, "-").replace(/^-+|-+$/gu, "").slice(0, 60) || "participant";
}
