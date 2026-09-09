const MAX_RESPONDENTS = 15;
const RECOMMENDED_RESPONDENTS = 10;
const COLLECTOR_HEADERS = [
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

function normalizeCollector(data) {
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

function validateCollector(data) {
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
    if (!isValidEmail(row.email)) add("respondent-email", `${prefix}.email`, "Completează o adresă de email validă.", "Enter a valid email address.");
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

function createCollectorWorkbook(XLSX, data, uiLanguage = "RO") {
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

function safeFilePart(value) {
  const normalized = normalizeText(value).normalize("NFD").replace(/[\u0300-\u036f]/gu, "");
  return normalized.replace(/[^a-z0-9_-]+/giu, "-").replace(/^-+|-+$/gu, "").slice(0, 60) || "participant";
}

const translations = {
  ro: {
    skip:"Sari la formular",eyebrow:"Leadership Profiler 360",title:"Alege oamenii care îți pot oferi o perspectivă sinceră.",lead:"Completează lista o singură dată. Noi verificăm datele înainte să creezi fișierul pentru consultant.",hero1:"Tu și managerul tău sunteți suficienți pentru a începe",hero2:"respondenți recomandați, nu obligatorii",hero3:"număr maxim de respondenți",privateTitle:"Datele rămân pe dispozitivul tău.",privateText:"Formularul funcționează local în browser. Nimic nu este trimis sau salvat online.",understand:"Înainte să începi",rolesTitle:"Pe cine poți invita?",rolesLead:"Alege oameni care au observat direct felul în care lucrezi. Categoriile descriu relația lor profesională cu tine.",selfRole:"Autoevaluare",selfDesc:"Perspectiva ta. Este inclusă automat și nu trebuie adăugată în listă.",managerDesc:"Superiorul tău ierarhic direct. Este necesar cel puțin un manager.",peerDesc:"Un coleg cu care colaborezi la un nivel similar.",subRole:"Subordonat",subDesc:"O persoană din echipa ta sau care îți raportează direct.",stakeDesc:"Client, partener sau colaborator extern care îți vede munca.",yourList:"Lista ta",formTitle:"Începe cu datele tale",formLead:"Autoevaluarea va fi inclusă automat. Alege separat limba în care vrei să primești chestionarul.",aboutYou:"Despre tine",fullName:"Nume complet",selfLanguage:"Limba autoevaluării",languageHelp:"Folosește codul din două litere: RO, EN etc.",respondentsTitle:"Respondenți",respondentsLead:"Adaugă managerul și pe oricine altcineva care poate oferi feedback util.",add:"Adaugă respondent",readyTitle:"Verificare înainte de descărcare",readyEmpty:"Completează datele și vom arăta exact ce trebuie corectat.",readyGood:"Lista este completă și gata pentru consultant.",clear:"Șterge tot",download:"Descarcă fișierul pentru consultant",handoff:"După descărcare, atașează fișierul unui email către consultantul tău.",footer:"Un instrument local pentru colectarea respondenților 360.",respondentName:"Nume complet",relationship:"Relația cu tine",questionnaireLanguage:"Limba chestionarului",remove:"Elimină respondentul",respondent:"Respondent",confirmClear:"Ștergi toate datele introduse?",downloaded:"Fișierul este pregătit. Trimite-l consultantului tău.",errorIntro:"Corectează următoarele înainte de descărcare:" },
  en: {
    skip:"Skip to form",eyebrow:"Leadership Profiler 360",title:"Choose the people who can offer you an honest perspective.",lead:"Complete the list once. We check the details before creating the file for your consultant.",hero1:"You and your manager are enough to begin",hero2:"respondents recommended, not required",hero3:"maximum allowed",privateTitle:"Your data stays on your device.",privateText:"The form works locally in your browser. Nothing is sent or saved online.",understand:"Before you begin",rolesTitle:"Who can you invite?",rolesLead:"Choose people who have directly observed how you work. The categories describe their professional relationship with you.",selfRole:"Self-evaluation",selfDesc:"Your perspective. It is included automatically and should not be added to the list.",managerDesc:"Your direct line manager. At least one manager is required.",peerDesc:"A colleague who works with you at a similar level.",subRole:"Direct report",subDesc:"Someone on your team or who reports directly to you.",stakeDesc:"A client, partner or external collaborator who sees your work.",yourList:"Your list",formTitle:"Start with your details",formLead:"Self-evaluation is included automatically. Choose the language you want for your questionnaire.",aboutYou:"About you",fullName:"Full name",selfLanguage:"Self-evaluation language",languageHelp:"Use the two-letter code: RO, EN, etc.",respondentsTitle:"Respondents",respondentsLead:"Add your manager and anyone else who can provide useful feedback.",add:"Add respondent",readyTitle:"Check before download",readyEmpty:"Complete the details and we will show exactly what needs attention.",readyGood:"The list is complete and ready for your consultant.",clear:"Clear all",download:"Download the file for your consultant",handoff:"After downloading, attach the file to an email for your consultant.",footer:"A local tool for collecting 360 respondents.",respondentName:"Full name",relationship:"Relationship to you",questionnaireLanguage:"Questionnaire language",remove:"Remove respondent",respondent:"Respondent",confirmClear:"Clear all entered data?",downloaded:"Your file is ready. Send it to your consultant.",errorIntro:"Fix the following before downloading:" }
};

Object.assign(translations.ro, {
  recoveryTitle: "Dacă ceva nu merge",
  recoveryText: "Corectează câmpurile marcate și încearcă din nou. Dacă închizi sau reîncarci pagina, datele din formular se pierd și trebuie completate din nou.",
  recoveryDownloaded: "Fișierul descărcat rămâne pe dispozitivul tău chiar dacă ștergi sau închizi formularul. Trimite consultantului doar ultima versiune corectă.",
});
Object.assign(translations.en, {
  recoveryTitle: "If something goes wrong",
  recoveryText: "Correct the marked fields and try again. Closing or reloading the page clears the form, so the details must be entered again.",
  recoveryDownloaded: "A downloaded file stays on your device even after you clear or close the form. Send your consultant only the latest correct version.",
});

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
  validateAndRender(false);
}

function addRespondent(seed = { role: "Peer", name: "", email: "", language: "RO" }) {
  if (list.children.length >= MAX_RESPONDENTS) return;
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

function updateRoleBadge(card) {
  card.querySelector(".respondent-role-label").textContent = card.querySelector(".row-role").value;
}

function renumber() {
  [...list.children].forEach((card, index) => {
    card.querySelector(".respondent-index").textContent = String(index + 1);
    card.querySelector(".respondent-label").textContent = `${t("respondent")} ${index + 1}`;
  });
  document.querySelector("#respondent-count").textContent = String(list.children.length);
  document.querySelector("#add-respondent").disabled = list.children.length >= MAX_RESPONDENTS;
}

function readData() {
  return {
    participantName: document.querySelector("#participant-name").value,
    participantEmail: document.querySelector("#participant-email").value,
    selfLanguage: document.querySelector("#self-language").value,
    respondents: [...list.children].map((card) => ({
      name: card.querySelector(".row-name").value,
      email: card.querySelector(".row-email").value,
      role: card.querySelector(".row-role").value,
      language: card.querySelector(".row-language").value,
    })),
  };
}

function clearInvalid() { document.querySelectorAll("[aria-invalid=true]").forEach((node) => node.removeAttribute("aria-invalid")); }
function controlForPath(path) {
  if (!path.startsWith("respondents.")) return document.querySelector(`#${path.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`);
  const [, index, field] = path.split(".");
  return list.children[Number(index)]?.querySelector(`.row-${field}`) || null;
}

function validateAndRender(showAll) {
  const result = validateCollector(readData());
  clearInvalid();
  if (showAll) result.errors.forEach((error) => controlForPath(error.path)?.setAttribute("aria-invalid", "true"));
  const unique = [...new Map(result.errors.map((error) => [error.code + error.path, error])).values()];
  const errorList = document.querySelector("#error-list");
  errorList.replaceChildren(...(showAll ? unique.slice(0, 8).map((error) => {
    const item = document.createElement("li"); item.textContent = error[language]; return item;
  }) : []));
  const readiness = document.querySelector(".readiness");
  readiness.classList.toggle("is-ready", result.valid);
  document.querySelector("#ready-mark").textContent = result.valid ? "✓" : String(unique.length || 1);
  document.querySelector("#ready-summary").textContent = result.valid ? t("readyGood") : (showAll ? t("errorIntro") : t("readyEmpty"));
  return result;
}

function resetForm() {
  form.reset();
  list.replaceChildren();
  document.querySelector("#self-language").value = "RO";
  addRespondent({ role: "Manager", name: "", email: "", language: "RO" });
  document.querySelector("#participant-name").focus();
}

document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.language)));
document.querySelector("#add-respondent").addEventListener("click", () => { addRespondent(); list.lastElementChild?.querySelector("input")?.focus(); });
document.querySelector("#clear-form").addEventListener("click", () => { if (window.confirm(t("confirmClear"))) resetForm(); });
document.querySelector("#self-language").addEventListener("input", (event) => { event.target.value = event.target.value.toUpperCase(); validateAndRender(false); });
document.querySelectorAll("#participant-name,#participant-email").forEach((node) => node.addEventListener("input", () => validateAndRender(false)));
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = validateAndRender(true);
  if (!result.valid) { document.querySelector("[aria-invalid=true]")?.focus(); return; }
  const workbook = createCollectorWorkbook(window.XLSX, result.value, language.toUpperCase());
  window.XLSX.writeFile(workbook, `respondenti-360-${safeFilePart(result.value.participantName)}.xlsx`, { compression: true, bookType: "xlsx" });
  document.querySelector("#ready-summary").textContent = t("downloaded");
});

addRespondent({ role: "Manager", name: "", email: "", language: "RO" });
setLanguage("ro");
