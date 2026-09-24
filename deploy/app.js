const RECOMMENDED_RESPONDENTS = 10;
const WARNING_RESPONDENTS = 15;
// Kept as a compatibility export for callers that imported the old constant.
const MAX_RESPONDENTS = Number.POSITIVE_INFINITY;
const CRITERIA_COUNT = 5;
const COLLECTOR_HEADERS = [
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
const MASS_TEMPLATE_HEADERS = [
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

function normalizeText(value) {
  return String(value ?? "")
    .replace(/[\u00a0\u2007\u202f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLocaleLowerCase("en-US");
}

function normalizeLanguage(value) {
  return normalizeText(value).toUpperCase();
}

function isValidEmail(value) {
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

function normalizeCollector(data) {
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

function validateCollector(data) {
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
    if (!isValidEmail(row.email) && index > 0) add("respondent-email", `${prefix}.email`, "Completează un email valid.", "Enter a valid email.");
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

function buildCollectorRows(data) {
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

function createCollectorWorkbook(XLSX, data, uiLanguage = "RO") {
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

function createMassTemplateWorkbook(XLSX, uiLanguage = "RO") {
  const rows = [
    ["BHB360_MASS_RELATIONS_V1", uiLanguage],
    ["Instrucțiuni / Instructions", "Completează câte un rând pentru fiecare relație participant–respondent. Nu adăuga rândul de autoevaluare; instrumentul îl creează automat. / Add one row for each participant–respondent relationship. Do not add the self-evaluation row; the tool creates it automatically."],
    ["Roluri / Roles", "Folosește Manager, Peer, Subordonat sau Stakeholder. Managerul este obligatoriu pentru fiecare participant. / Use Manager, Peer, Subordonat or Stakeholder. Each participant must have a Manager."],
    MASS_TEMPLATE_HEADERS,
  ];
  const sheet = {};
  rows.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
    sheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })] = literalCell(value);
  }));
  const headerRow = 3;
  sheet["!ref"] = `A1:${XLSX.utils.encode_col(MASS_TEMPLATE_HEADERS.length - 1)}${rows.length}`;
  sheet["!autofilter"] = { ref: `A${headerRow + 1}:${XLSX.utils.encode_col(MASS_TEMPLATE_HEADERS.length - 1)}${headerRow + 1}` };
  sheet["!freeze"] = { xSplit: 0, ySplit: headerRow + 1, topLeftCell: `A${headerRow + 2}`, activePane: "bottomLeft", state: "frozen" };
  sheet["!cols"] = [{ wch: 26 }, { wch: 32 }, { wch: 26 }, { wch: 32 }, { wch: 18 }, { wch: 12 }, ...Array.from({ length: CRITERIA_COUNT }, () => ({ wch: 16 }))];
  const workbook = XLSX.utils.book_new();
  workbook.Props = { Title: "BHB 360 mass respondent relations template", Author: "Business Health Bar", Comments: "Blank local template; no client data included." };
  XLSX.utils.book_append_sheet(workbook, sheet, "Relatii");
  return workbook;
}

function safeFilePart(value) {
  const normalized = normalizeText(value).normalize("NFD").replace(/[\u0300-\u036f]/gu, "");
  return normalized.replace(/[^a-z0-9_-]+/giu, "-").replace(/^-+|-+$/gu, "").slice(0, 60) || "participant";
}

const translations = {
  ro: {
    skip: "Sari la formular", eyebrow: "Leadership Profiler 360", title: "Alege oamenii care îți pot oferi o perspectivă sinceră.", lead: "Completează lista o singură dată. Noi verificăm datele înainte să creezi fișierul pentru consultant.", hero1: "Tu + managerul tău sunt suficiente pentru a începe", hero2: "respondenți recomandați, nu obligatorii", hero3: "peste 15 = verifică dacă sunt necesari", privateTitle: "Datele rămân pe dispozitivul tău.", privateText: "Formularul funcționează local în browser. Nimic nu este trimis sau salvat online.", understand: "Înainte să începi", rolesTitle: "Pe cine poți invita?", rolesLead: "Alege oameni care au observat direct felul în care lucrezi. Categoriile descriu relația lor profesională cu tine.", selfRole: "Autoevaluare", selfDesc: "Perspectiva ta. Este inclusă automat și nu trebuie adăugată în listă.", managerDesc: "Superiorul tău ierarhic direct. Este necesar cel puțin un manager.", peerDesc: "Un coleg cu care colaborezi la un nivel similar.", subRole: "Subordonat", subDesc: "O persoană din echipa ta sau care îți raportează direct.", stakeDesc: "Client, partener sau colaborator extern care îți vede munca.", yourList: "Lista ta", formTitle: "Începe cu datele tale", formLead: "Autoevaluarea va fi inclusă automat. Alege separat limba în care vrei să primești chestionarul.", aboutYou: "Despre tine", aboutLead: "Datele tale stau la baza autoevaluării și a raportului individual.", fullName: "Nume complet", selfLanguage: "Limba autoevaluării", languageHelp: "Folosește codul din două litere: RO, EN etc.", optionalCriteria: "Adaugă criterii opționale", criteriaHelp: "Completează până la cinci criterii pentru acest participant. Vor fi trecute în coloanele Criteriu 1–5 ale importului.", criterion1: "Criteriu 1", criterion2: "Criteriu 2", criterion3: "Criteriu 3", criterion4: "Criteriu 4", criterion5: "Criteriu 5", managerTitle: "Manager", managerLead: "Acest rând este obligatoriu și rămâne separat de ceilalți respondenți în raportul individual.", respondentsTitle: "Alți respondenți", respondentsLead: "Adaugă colegi, subordonați sau stakeholderi. Recomandarea generală este de maximum 10 respondenți în total.", add: "Adaugă respondent", recommendedCount: "recomandați", readyTitle: "Verificare înainte de descărcare", readyEmpty: "Completează datele și vom arăta exact ce trebuie corectat.", readyGood: "Lista este completă și gata pentru consultant.", clear: "Șterge tot", download: "Descarcă fișierul pentru consultant", template: "Descarcă șablon pentru listă mare", handoff: "După descărcare, atașează fișierul într-un email către consultantul tău.", footer: "Un instrument local pentru colectarea respondenților 360.", respondentName: "Nume complet", relationship: "Relația cu tine", questionnaireLanguage: "Limba chestionarului", remove: "Elimină respondentul", respondent: "Respondent", confirmClear: "Ștergi toate datele introduse?", downloaded: "Fișierul este pregătit. Trimite-l consultantului tău.", templateDownloaded: "Șablonul este pregătit. Completează-l și trimite-l consultantului pentru import.", errorIntro: "Corectează următoarele înainte de descărcare:", warningIntro: "Recomandări pentru această listă:", recoveryTitle: "Dacă ceva nu merge", recoveryText: "Corectează câmpurile marcate și încearcă din nou. Dacă închizi sau reîncarci pagina, datele din formular se pierd și trebuie completate din nou.", recoveryDownloaded: "Fișierul descărcat rămâne pe dispozitivul tău chiar dacă ștergi sau închizi formularul. Trimite consultantului doar ultima versiune corectă.",
  },
  en: {
    skip: "Skip to form", eyebrow: "Leadership Profiler 360", title: "Choose the people who can offer you an honest perspective.", lead: "Complete the list once. We check the details before creating the file for your consultant.", hero1: "You + your manager are enough to begin", hero2: "respondents recommended, not required", hero3: "over 15 = check whether all are needed", privateTitle: "Your data stays on your device.", privateText: "The form works locally in your browser. Nothing is sent or saved online.", understand: "Before you begin", rolesTitle: "Who can you invite?", rolesLead: "Choose people who have directly observed how you work. The categories describe their professional relationship with you.", selfRole: "Self-evaluation", selfDesc: "Your perspective. It is included automatically and should not be added to the list.", managerDesc: "Your direct line manager. At least one manager is required.", peerDesc: "A colleague who works with you at a similar level.", subRole: "Direct report", subDesc: "Someone on your team or who reports directly to you.", stakeDesc: "A client, partner or external collaborator who sees your work.", yourList: "Your list", formTitle: "Start with your details", formLead: "Self-evaluation is included automatically. Choose separately which language you want for your questionnaire.", aboutYou: "About you", fullName: "Full name", selfLanguage: "Self-evaluation language", languageHelp: "Use the two-letter code: RO, EN, etc.", optionalCriteria: "Add optional criteria", criteriaHelp: "Enter up to five criteria for this participant. They will populate the import's Criteriu 1–5 columns.", criterion1: "Criterion 1", criterion2: "Criterion 2", criterion3: "Criterion 3", criterion4: "Criterion 4", criterion5: "Criterion 5", managerTitle: "Manager", managerLead: "This required row stays separate from the other respondents.", respondentsTitle: "Other respondents", respondentsLead: "Add peers, direct reports or stakeholders. The general recommendation is no more than 10 respondents in total.", add: "Add respondent", recommendedCount: "recommended", readyTitle: "Check before download", readyEmpty: "Complete the details and we will show exactly what needs attention.", readyGood: "The list is complete and ready for your consultant.", clear: "Clear all", download: "Download file for consultant", template: "Download large-list template", handoff: "After downloading, attach the file to an email to your consultant.", footer: "A local tool for collecting 360 respondents.", respondentName: "Full name", relationship: "Relationship to you", questionnaireLanguage: "Questionnaire language", remove: "Remove respondent", respondent: "Respondent", confirmClear: "Clear all entered data?", downloaded: "Your file is ready. Send it to your consultant.", templateDownloaded: "The template is ready. Complete it and send it to your consultant for import.", errorIntro: "Fix the following before downloading:", warningIntro: "Guidance for this list:", recoveryTitle: "If something goes wrong", recoveryText: "Correct the marked fields and try again. Closing or reloading the page clears the form, so the details must be entered again.", recoveryDownloaded: "A downloaded file stays on your device even after you clear or close the form. Send your consultant only the latest correct version.",
  },
};

let language = "ro";
let nextId = 1;
const list = document.querySelector("#respondent-list");
const form = document.querySelector("#collector-form");

function t(key) { return translations[language][key] || key; }

function setLanguage(next) {
  language = next;
  document.documentElement.lang = next;
  document.querySelectorAll("[data-language]").forEach((button) => {
    const active = button.dataset.language === next;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => { node.setAttribute("aria-label", t(node.dataset.i18nAria)); });
  list.querySelectorAll(".respondent-card").forEach((card, index) => {
    card.querySelector(".respondent-label").textContent = `${t("respondent")} ${index + 1}`;
  });
  updateCounter();
  validateAndRender(false);
}

function addRespondent(seed = { role: "Peer", name: "", email: "", language: "RO" }) {
  const fragment = document.querySelector("#respondent-template").content.cloneNode(true);
  const card = fragment.querySelector(".respondent-card");
  card.dataset.rowId = String(nextId++);
  card.querySelector(".row-name").value = seed.name;
  card.querySelector(".row-email").value = seed.email;
  card.querySelector(".row-role").value = seed.role;
  card.querySelector(".row-language").value = seed.language;
  card.querySelector(".remove-button").addEventListener("click", () => { card.remove(); renumber(); validateAndRender(false); });
  card.querySelectorAll("input,select").forEach((control) => control.addEventListener("input", () => {
    if (control.classList.contains("row-language")) control.value = control.value.toUpperCase();
    updateRoleBadge(card);
    validateAndRender(false);
  }));
  list.append(fragment);
  renumber();
  updateRoleBadge(card);
  validateAndRender(false);
}

function updateRoleBadge(card) { card.querySelector(".respondent-role-label").textContent = card.querySelector(".row-role").value; }

function updateCounter() {
  const total = list.children.length + 1;
  document.querySelector("#respondent-count").textContent = String(total);
  document.querySelector("#respondent-recommendation").textContent = `${RECOMMENDED_RESPONDENTS} ${t("recommendedCount")}`;
}

function renumber() {
  [...list.children].forEach((card, index) => {
    card.querySelector(".respondent-index").textContent = String(index + 1);
    card.querySelector(".respondent-label").textContent = `${t("respondent")} ${index + 1}`;
  });
  updateCounter();
}

function readData() {
  return {
    participantName: document.querySelector("#participant-name").value,
    participantEmail: document.querySelector("#participant-email").value,
    selfLanguage: document.querySelector("#self-language").value,
    manager: {
      name: document.querySelector("#manager-name").value,
      email: document.querySelector("#manager-email").value,
      language: document.querySelector("#manager-language").value,
      role: "Manager",
    },
    criteria: [...document.querySelectorAll(".criterion-input")].map((input) => input.value),
    respondents: [...list.children].map((card) => ({
      name: card.querySelector(".row-name").value,
      email: card.querySelector(".row-email").value,
      role: card.querySelector(".row-role").value,
      language: card.querySelector(".row-language").value,
    })),
  };
}

function clearInvalid() { document.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute("aria-invalid")); }

function controlForPath(path) {
  if (path.startsWith("manager.")) return document.querySelector(`#manager-${path.split(".")[1]}`);
  if (!path.startsWith("respondents.")) return document.querySelector(`#${path.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`);
  const [, index, field] = path.split(".");
  return list.children[Number(index)]?.querySelector(`.row-${field}`) || null;
}

function validateAndRender(showAll) {
  const result = validateCollector(readData());
  clearInvalid();
  if (showAll) result.errors.forEach((error) => controlForPath(error.path)?.setAttribute("aria-invalid", "true"));
  const uniqueErrors = [...new Map(result.errors.map((error) => [error.code + error.path, error])).values()];
  const errorList = document.querySelector("#error-list");
  errorList.replaceChildren(...(showAll ? uniqueErrors.slice(0, 8).map((error) => { const item = document.createElement("li"); item.textContent = error[language]; return item; }) : []));
  const warningList = document.querySelector("#warning-list");
  warningList.replaceChildren(...result.warnings.map((warning) => { const item = document.createElement("li"); item.textContent = warning[language]; return item; }));
  const readiness = document.querySelector(".readiness");
  readiness.classList.toggle("is-ready", result.valid);
  document.querySelector("#ready-mark").textContent = result.valid ? "✓" : String(uniqueErrors.length || 1);
  document.querySelector("#ready-summary").textContent = result.valid ? t("readyGood") : (showAll ? t("errorIntro") : t("readyEmpty"));
  return result;
}

function resetForm() {
  form.reset();
  list.replaceChildren();
  document.querySelector("#self-language").value = "RO";
  document.querySelector("#manager-language").value = "RO";
  updateCounter();
  document.querySelector("#participant-name").focus();
  validateAndRender(false);
}

document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.language)));
document.querySelector("#add-respondent").addEventListener("click", () => { addRespondent(); list.lastElementChild?.querySelector("input")?.focus(); });
document.querySelector("#clear-form").addEventListener("click", () => { if (window.confirm(t("confirmClear"))) resetForm(); });
document.querySelector("#optional-criteria").addEventListener("click", () => {
  const panel = document.querySelector("#criteria-panel");
  const expanded = panel.hidden;
  panel.hidden = !expanded;
  document.querySelector("#optional-criteria").setAttribute("aria-expanded", String(expanded));
  if (expanded) panel.querySelector("input")?.focus();
});
document.querySelectorAll("#self-language,#manager-language").forEach((node) => node.addEventListener("input", (event) => { event.target.value = event.target.value.toUpperCase(); validateAndRender(false); }));
document.querySelectorAll("#participant-name,#participant-email,#manager-name,#manager-email,.criterion-input").forEach((node) => node.addEventListener("input", () => validateAndRender(false)));
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = validateAndRender(true);
  if (!result.valid) { document.querySelector('[aria-invalid="true"]')?.focus(); return; }
  const workbook = createCollectorWorkbook(window.XLSX, result.value, language.toUpperCase());
  window.XLSX.writeFile(workbook, `respondenti-360-${safeFilePart(result.value.participantName)}.xlsx`, { compression: true, bookType: "xlsx" });
  document.querySelector("#ready-summary").textContent = t("downloaded");
});
document.querySelector("#download-template").addEventListener("click", () => {
  const workbook = createMassTemplateWorkbook(window.XLSX, language.toUpperCase());
  window.XLSX.writeFile(workbook, "template-relatii-360.xlsx", { compression: true, bookType: "xlsx" });
  document.querySelector("#ready-summary").textContent = t("templateDownloaded");
});

updateCounter();
setLanguage("ro");
