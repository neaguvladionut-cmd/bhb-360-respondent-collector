# 360 respondent tools — review note

## Councilor pre-flight

**Model fit:** high-complexity advisory work because public static hosting, personal data and an undocumented production import contract intersect. The current model is suitable for this pre-flight; efficiency would not justify moving down, and the required fresh Inspector pass remains the stronger safeguard for implementation. **Seat:** Councilor. **Scope:** advisory only; no product decision or specification is recorded here.

### Recommendation

Build two separate, static, GitHub Pages-ready tools that process everything in the browser:

1. A participant-facing collector that explains each relationship in plain Romanian, collects the participant's own details plus respondents, validates while they type, and downloads a standardized `.xlsx` for the consultant.
2. An internal importer that accepts multiple standardized collector files, accepts the supplied legacy collection format during the transition, optionally reads the production allocation export for a live project, reconciles people and identifiers, presents a blocking-error/warning summary, and downloads the exact A:N production workbook only when it is safe to import.

The participant tool should never expose the old application's quirks. It should say **Autoevaluare** and **Stakeholder**; the internal export layer should translate those concepts into the values the old production importer needs. The future platform should instead enroll respondents inside a live 360 project and use the communication engine for invitations, delivery status and reminders (D37/D93); this standalone importer is a bridge and future fallback, not the target architecture.

The tool-local review note is intentional for this isolated branch: Vlad authorized writes only under the two new standalone folders, while the wider project remains read-only. That differs from D226's normal `10-project/review-notes/` location and should be acknowledged in the packet rather than silently treated as the general precedent.

### Settled rules to preserve exactly

- The participant-facing label is **Stakeholder**; production output is `PartenerExtern`.
- The participant sees **Autoevaluare**. The exported self row is `Manager` and must be the first `Manager` row for that evaluated participant, because the old application treats that row as the self-evaluation sheet. At least one separate, actual Manager is required.
- Minimum: self plus one actual Manager. Recommend up to 10 respondents; permit at most 15 respondents, with no minimum for Peer, Subordonat or Stakeholder.
- Identifier identity is the normalized evaluator email, compared case-insensitively. Reuse one identifier for every occurrence of that email in the project. A new project allocates `1, 2, 3…`; an existing project allocates new identifiers from the highest imported identifier plus one.
- Language is chosen per respondent. A two-letter value such as `RO` or `EN` is valid; `EN` creates a visible consultant notice, not an error.

### Exact old-production export contract

The internal tool should emit one worksheet with these exact headers and order:

`Marca`, `PersoanaEvaluata`, `PersoanaEvaluataEmail`, `Evaluator`, `EvaluatorEmail`, `EvaluatorRol`, `NumeCampanie`, `Limba`, `Criteriu1`, `Criteriu2`, `Criteriu3`, `Criteriu4`, `Criteriu5`, `NumeInregistrare`.

- A:M are text cells, including `Marca`; blank criteria remain text-compatible blanks. Email cells have no hyperlink relationship or hyperlink styling.
- `EvaluatorRol` is exactly one of `Manager`, `Peer`, `Subordonat`, `PartenerExtern`.
- `Limba` is uppercase and exactly two letters.
- Every data row in N contains the row-relative formula `=CONCAT(Gn," - ",Bn," - ",Dn)`; there is no example row left in the file.
- Rows are grouped deterministically per evaluated participant, with that participant's self row before the actual Manager row(s).
- Project name populates `NumeCampanie`. `NumeInregistrare` is the formula result, not separately authored text.

The supplied production example contradicts its written contract by storing `Marca` numerically and contains at least one newline-padded email. The new tool should follow the stricter written rule (all text and fully trimmed) and verify actual acceptance by the old application; the example's defects are evidence to clean, not behavior to reproduce.

### Principal risks and safeguards

1. **Plausible but wrong identity merges.** Lowercase and trim email for matching, including non-breaking spaces and line breaks, but never guess corrections to the address itself. Block one normalized email mapped to multiple imported identifiers, or one identifier mapped to multiple normalized emails. Names may differ for the same email; surface that as a consultant review item and use one explicit canonical choice.
2. **Relationship duplicates.** The same person may validly be Manager for one participant and Peer for another. Block only duplicate evaluated-email + evaluator-email allocations, not cross-participant reuse. A self email may also validly evaluate someone else and must reuse its identifier.
3. **Self-row ordering.** A general sort by role or identifier can silently move an actual Manager ahead of self. Assert self-first separately for every participant in the generated workbook.
4. **Legacy ambiguity.** Normalize known labels explicitly (`Autoevaluare` to self/production `Manager`, `Coleg` to `Peer`, `Stakeholder` to `PartenerExtern`; unchanged `Manager` and `Subordonat`). Unknown labels, missing participant identity, malformed email, duplicated relationship or more than 15 non-self respondents should block that participant; do not infer.
5. **Mixed languages.** Different rows may legitimately select different languages. Summarize all non-`RO` rows, especially `EN`, in the consultant review without blocking them.
6. **Workbook fidelity.** A visually correct spreadsheet can still contain numeric cells, hyperlinks, a wrong formula dialect, missing formulas after the first row, or stale formula caches. Inspect workbook XML as well as reopening in Excel/LibreOffice, then perform a controlled import into the old production app before claiming compatibility.
7. **Public-code/privacy mismatch.** GitHub Pages makes code and packaged assets public, not user data. No uploaded workbook, participant detail, generated workbook or recent-file metadata should be transmitted, logged, placed in URLs, committed as a fixture, retained in `localStorage`/IndexedDB, or cached by a service worker. Use synthetic test data only. Provide a visible “processed locally in this browser” explanation and a clear/reset action.
8. **Formula injection.** Names, campaign text and generic criteria beginning with `=`, `+`, `-` or `@` must remain literal text rather than executable spreadsheet formulas. Column N is the only formula-bearing column.
9. **Static-host constraints.** The deliverables need relative asset paths and must work at a GitHub Pages repository subpath, without a server, auth, database, upload API, analytics or required CDN. Bundle the XLSX reader/writer locally. If offline/PWA caching is added, cache the app shell only and prove that imported/generated client data is never cached.

### Brand, illustrations and explanations

The brand manual wins; the agenda generator is the interaction baseline (D2/D3). Use the approved BHB palette—Aqua `#09BAD2`, Green `#39B54A`, Yellow `#F8EC32`, Ink `#231F20`, Red `#EF4136`—with Poppins for UI, calm white work surfaces and a restrained gradient/wash. Use the real BHB/Leadership Profiler marks and the existing 360/profilers illustration where appropriate. Illustrations should explain or orient: an opening “who to invite” panel, role explanations and a reassuring ready-to-send/download state are better than decorative artwork beside dense tables.

The collector should define Manager, Peer, Subordonat and Stakeholder in participant language, explain why self is included automatically, show progress and error recovery, and state the 10-person recommendation without presenting it as a requirement. The importer should explain errors in terms of a person and a corrective action, not spreadsheet coordinates alone.

Zona Pro is commercially licensed (D70). Do not put its font files in a public Pages repository until Vlad confirms a webfont/public-distribution license. Recommended safe default for these public packs: Poppins plus an appropriate system heading fallback, while retaining the brand's color, spacing, shape, logo and illustration grammar. Public redistribution permission for the chosen BHB logo/illustration assets should also be confirmed before publishing.

### Alternatives considered

- **Server submission instead of downloaded files:** better long-term experience and removes email handoff, but requires identity, project membership, storage, consent/retention and reliable notifications. This belongs in the future platform, not this static bridge.
- **CSV-only output:** simpler and easier to inspect, but it cannot guarantee the required N formulas, cell types and no-hyperlink workbook behavior. Keep CSV only as an optional diagnostic export, if at all.
- **Accept only the new collector format:** reduces parser complexity but forces manual re-entry of current legacy files and weakens the immediate migration value. Recommended alternative is explicit legacy adapters with strict aliasing and blocking unknowns.
- **One combined tool:** fewer deployables, but exposes internal project/allocation concepts to participants and increases accidental disclosure risk. Keep the two audiences and deployment packs separate.

### Questions to resolve at the decision gate

1. Does the limit of 15 mean 15 respondents **excluding** the automatic self row? Recommendation: yes—up to 16 exported rows per participant.
2. Should the participant interface itself be Romanian-only or bilingual? Recommendation: RO default with an RO/EN switch; this UI language is independent of each respondent's questionnaire language.
3. Should `Criteriu1`–`Criteriu5` remain blank in this version, or should the internal tool expose optional project-wide/row-level mapping? Recommendation: keep them blank for the first production-safe release unless a real current import needs them.
4. May the two public packs redistribute the selected BHB/Leadership Profiler logo and illustration assets, and is a Zona Pro webfont license available? Recommendation: confirm assets; ship Poppins without Zona font files until license is explicit.
5. For a repeated normalized evaluator email with conflicting names, should the consultant select the canonical name or should the allocation export win automatically? Recommendation: allocation export preselects its existing name, but the conflict remains visible and reviewable before export.

### Proposed acceptance checks

**Collector**

1. Works from GitHub Pages at a repository subpath and from a local static server, with no runtime network request other than loading its own files.
2. Automatically creates the honest self entry, requires one distinct actual Manager, permits zero of every other role, presents 10 as guidance, accepts 15 non-self respondents and blocks the 16th.
3. Shows Stakeholder but writes the standardized collector value that the internal importer deterministically maps to `PartenerExtern`; never exposes the `Manager` self quirk to the participant.
4. Validates/normalizes names, emails and two-letter languages; catches Unicode whitespace, blank rows, duplicate participant/evaluator pairs and formula-like text safely.
5. Produces a readable `.xlsx` containing only the participant's intended data, with concise instructions for emailing it to the consultant.
6. Meets a visual review at mobile, laptop and wide desktop sizes: real approved illustration, brand palette, clear hierarchy, keyboard navigation, visible focus, labelled controls and sufficient contrast.

**Internal importer**

7. Imports multiple new collector files and all supplied legacy examples; reports source file, participant and actionable error without losing valid rows from other files.
8. Imports the optional `Accounts` allocation sheet with its observed headers (`Identifier`, `Assessor Name`, `Assessor Email`, `QuestionaireId`, `Assessed Email`, `Assessor Role`), trims ordinary/Unicode whitespace and scopes reuse to the intended project.
9. For a new project, identical normalized evaluator emails always receive one identifier and new identities allocate consecutively from 1. With an allocation export, existing identities reuse their identifier and new ones allocate consecutively from max + 1. Conflicting identifier mappings hard-block.
10. Shows counts by participant, role and language; every `EN` row appears in a non-blocking consultant notice. No other valid two-letter language is rejected merely for being non-RO.
11. Output has the exact 14 headers, A:M as text, no email hyperlinks, only N as formulas, one correct row-relative `CONCAT` formula per data row, no example row and no silent dropped/duplicated allocation.
12. For every participant, the self row is the first exported `Manager` row and at least one distinct actual Manager follows. `Stakeholder` never reaches production output; `PartenerExtern` does.
13. A deterministic round trip—same normalized inputs in a different file/order sequence—produces the same identity assignments and semantically identical rows.
14. Privacy test records zero third-party requests, zero client values in browser persistence/cache/URL/console, and zero real names/emails in repository fixtures or screenshots.
15. A controlled end-to-end trial imports the generated workbook into the old production 360 app and verifies row acceptance, self-sheet assignment, notification creation and identifier reuse. Until that trial passes, describe the pack as structurally validated, not “guaranteed production-safe.”

### Pre-flight disposition

Recommended to proceed after the five questions above are resolved and converted into a numbered DoD. The only material procedural blocker is that this branch currently has no recorded standalone-tools packet/DoD; implementation should not begin from this memo alone.

## Architect decision gate — 2026-08-20

**Model fit:** high-complexity architecture because this bridge handles personal data and must reproduce an undocumented production-import quirk exactly. The current model is suitable; a smaller model would save time but increase contract-drift risk. A fresh Inspector remains mandatory before any production-safety claim. **Seat:** Architect. **Scope:** this section resolves the Councilor memo and is authoritative for implementation on `inc/360-respondent-tools`.

The normal packet location is intentionally not used here. Vlad authorized this separate request to write only inside the two new standalone-tool folders and required the wider platform repository to remain read-only. This tool-local review note is therefore the build and review record for this isolated branch, not a precedent that changes D226.

### Resolved questions

1. The limit is **15 respondents excluding the automatic self row**. The collector therefore permits at most 16 exported allocations per participant: one self row plus up to 15 respondents. It recommends up to 10 respondents but does not present 10 as a requirement.
2. The participant interface is bilingual, with Romanian selected by default and an RO/EN UI switch. Interface language and each respondent's questionnaire language are independent choices.
3. `Criteriu1`–`Criteriu5` remain blank in v1. Neither tool exposes project-wide nor row-level criteria mapping.
4. Each public pack uses Poppins and copies only the already repository-distributed BHB assets needed by the design: `bhb-logo-full-white.png` and `bhb-360-profiler-report-illustration.webp`. No Zona Pro files are included. The artwork must orient or explain the task, not act as decoration around a dense form.
5. A repeated normalized evaluator email with different names remains visible and blocks export until the consultant chooses the canonical name. When an allocation export supplies an existing name, that name is preselected but not silently imposed.

### Authoritative definition of done

1. Deliver two independent, static, GitHub Pages-ready packs—participant collector and internal import builder—each with relative asset paths, no server dependency and its own deployment instructions.
2. Both packs use the BHB palette, Poppins, the repository-distributed BHB logo and 360 illustration, calm white work surfaces, responsive layouts and explanatory illustrations/copy appropriate to their separate audiences. They must pass keyboard, visible-focus, label, contrast and mobile/laptop/wide-desktop visual checks in both UI languages.
3. Both tools process workbooks entirely in the browser. They make no third-party/runtime network request beyond their own static files; put no client data in a URL, analytics, console, localStorage, IndexedDB or service-worker cache; and provide a visible local-processing explanation plus a clear/reset action.
4. The collector automatically includes the participant's honest self-evaluation, requires one distinct actual Manager, permits zero Peer/Subordonat/Stakeholder entries, recommends up to 10 respondents, accepts 15 non-self respondents and blocks the 16th.
5. The collector explains Autoevaluare, Manager, Peer, Subordonat and Stakeholder in plain RO and EN language. It never exposes the old application's self-as-Manager quirk or the production label `PartenerExtern` to participants.
6. The collector lets the participant choose a two-letter questionnaire language per respondent independently of the UI language, defaults new rows to `RO`, uppercases valid values and preserves valid non-RO values. It validates names and emails, trims ordinary and Unicode whitespace, blocks blank required data and duplicate participant/evaluator pairs, and keeps formula-like user text literal.
7. The collector downloads a readable standardized `.xlsx` containing the participant identity, automatic self allocation and intended respondents only, plus concise instructions for emailing it to the consultant. The same normalized input produces semantically identical output.
8. The importer accepts multiple new collector workbooks and all supplied legacy collection examples. Known legacy roles map explicitly—`Autoevaluare` to self/production `Manager`, `Coleg` to `Peer`, `Stakeholder` or `Partener` to `PartenerExtern`, `Functional Manager` to `Manager`; `Manager`, `Peer`, `Subordonat` and `PartenerExtern` remain unchanged. Unknown roles, missing identity, malformed emails, duplicate participant/evaluator allocations and more than 15 non-self respondents block only the affected participant and are never guessed away.
9. The importer asks for the project name and optionally accepts the current production allocation export, including the observed `Accounts` headers. It trims ordinary and Unicode whitespace and treats the supplied allocation file as the existing allocations for the named project.
10. Evaluator identity is the lowercased, trimmed evaluator email. A new project allocates text identifiers consecutively from `1`; an existing project reuses identifiers found in the allocation export and allocates new identities consecutively from the highest existing identifier plus one. One email mapped to multiple identifiers or one identifier mapped to multiple emails is a hard block.
11. The same evaluator email reuses one identifier across every participant and may legitimately carry different relationship roles. Only a duplicate evaluated-email + evaluator-email allocation is rejected. An evaluator who is also a participant may evaluate someone else and still reuses that identity.
12. Name conflicts for one normalized evaluator email remain visible and block export until the consultant selects a canonical name. The allocation-export name is preselected when available; the interface shows the alternatives and the source files that supplied them.
13. The importer presents participant, role and language totals plus actionable errors and warnings in person-first language. Every `EN` row appears in a visible non-blocking consultant notice; any other syntactically valid two-letter language remains valid.
14. The production workbook has exactly the 14 headers and behavior in `../360-import-builder/docs/production-contract.md`: A:M are text, I:M are blank, email cells contain no hyperlinks, N alone contains the row-relative `CONCAT` formula, no example row remains and all user-supplied formula-like text is escaped as literal text.
15. For every evaluated participant, the self row is exported before all respondents and is the first production `Manager` row; at least one distinct actual Manager follows. Participant-facing `Stakeholder` is always emitted as production `PartenerExtern`.
16. Identifier assignment and output grouping are deterministic: changing the order of otherwise identical source files/rows produces the same identity assignments and semantically identical production rows, with no silently dropped or duplicated allocation.
17. Automated checks cover collector validation, both input adapters, Unicode trimming, role conversion, email identity reuse, identifier conflicts/allocation, name-conflict resolution, language notices, self-first ordering, formula-injection defense, exact workbook cell types/formulas/hyperlink absence, static subpath loading and zero browser persistence/network leakage. Fixtures and screenshots contain synthetic data only and carry the D210 marker.
18. A fresh Inspector records a verdict against every DoD item. Structural acceptance requires the automated and visual checks plus workbook XML inspection and Excel/LibreOffice reopening. The pack may be described as **production-compatible** only after Vlad completes a controlled import into the old production 360 app and verifies row acceptance, self-sheet assignment, notification creation and identifier reuse; until then it is **structurally validated**.

Implementation is authorized against this DoD. Any discovery that changes one of these numbered outcomes returns to Vlad/Architect; it is not decided at the keyboard.

## Engineer implementation and evidence — 2026-08-20

**Model fit:** standard implementation verification against an already agreed DoD. The current model is suitable; a fresh Inspector remains required because this Engineer section records builder evidence, not independent acceptance. **Seat:** Engineer. **Commit status:** not committed.

### Implemented surfaces

- Participant collector: bilingual responsive interface, role and privacy explanations, automatic self-evaluation, respondent validation, local XLSX generation, reset flow, bundled Poppins/brand assets and an independent relative-path `deploy/` pack.
- Internal import builder: collector and legacy adapters, optional `Accounts` allocation import, participant-scoped blocking review, language notices, canonical-name conflict resolution, deterministic identifier reuse/allocation, exact production XLSX generation, reset flow, bundled assets and an independent relative-path `deploy/` pack.
- Tool-local documentation: separate READMEs, third-party notices, production import contract and future-platform bridge proposal.
- Synthetic D210 fixtures only; no real participant or respondent data is included in either pack.

### Automated evidence

- Collector `npm run verify`: build passed; **8/8 tests passed, 0 failed**.
- Import builder `npm run verify`: build passed; **11/11 tests passed, 0 failed**.
- Package checks cover complete independent deploy assets, relative GitHub Pages paths, bundled workbook library/font/image files, and absence of network, analytics, browser persistence, logging and service-worker surfaces in application code.
- Workbook checks cover both input adapters, Unicode trimming, role conversion, case-insensitive email identity, identifier conflicts and deterministic reuse/allocation, canonical-name blocking/resolution, EN notices, self-first ordering, Stakeholder-to-`PartenerExtern` conversion, formula-like text remaining literal, exact A:N headers, A:M text cell types, row-relative N formulas, and absence of hyperlink XML/relationships.
- The production workbook test writes an XLSX, reopens it through the bundled library, and inspects raw `xl/worksheets/sheet1.xml` plus the ZIP listing for formula count and hyperlink absence.

### Remaining verification boundary

- No fresh visual browser pass has yet been recorded at mobile, laptop and wide-desktop sizes or in both interface languages.
- The supplied real legacy collection files and real allocation export have not yet been exercised in this Engineer pass.
- No generated workbook has yet been reopened manually in Excel/LibreOffice.
- No controlled import into the old production 360 application has been performed. The packs therefore remain **structurally validated**, not production-compatible, until Vlad verifies row acceptance, self-sheet assignment, notification creation and identifier reuse.
- No commit was created in this Engineer pass.

## Inspector review — 2026-08-20

**Seat:** Fresh Inspector. **Verdict:** **CHANGES REQUESTED.** **Scope:** read-only review of `40-standalone/360-respondent-collector` and `40-standalone/360-import-builder` on `inc/360-respondent-tools`.

The production workbook structure is independently accepted. The two packs are not yet structurally accepted overall because required consultant-review information and runtime/visual verification remain incomplete. No production-compatibility claim is accepted or implied.

### Definition-of-done verdicts

1. **PASS.** Two independent static packs exist with separate deployment instructions, relative assets, bundled dependencies and no server dependency. `src/` and `deploy/` were byte-identical during inspection.
2. **NOT VERIFIED.** Brand assets, palette, Poppins, responsive CSS, labels and visible-focus rules are present, but no fresh mobile/laptop/wide-desktop visual and keyboard pass in both languages was completed.
3. **PASS — source-level.** Both packs contain visible local-processing/reset explanations and no application-code surface for network calls, analytics, URL data, browser persistence, logging or service workers. Runtime browser recording remains part of the item 17/18 gap.
4. **PASS.** Collector validation requires self plus a distinct Manager, permits zero optional roles, recommends 10, accepts 15 non-self respondents and rejects the 16th.
5. **PASS.** Collector copy explains Autoevaluare, Manager, Peer, Subordonat and Stakeholder in RO and EN without exposing `PartenerExtern` or the production self-as-Manager quirk.
6. **PASS.** Questionnaire languages normalize to uppercase two-letter values, default to RO and remain independent of UI language. Required values, Unicode whitespace, duplicate evaluator emails and literal formula-like text are covered.
7. **PASS.** Collector output contains the automatic self row first, intended respondents only, readable instructions and literal text cells.
8. **PASS.** Both adapters and settled role aliases are implemented. All six supplied participant templates parsed through the legacy adapter; two correctly blocked for absent self identity and one correctly blocked for exceeding 15 non-self respondents.
9. **PASS.** Project name and optional `Accounts` allocation input are implemented with exact observed headers and Unicode trimming. The supplied allocation export parsed successfully.
10. **PASS.** Email identity is normalized project-wide, new identifiers allocate deterministically, existing identifiers are reused and conflicting mappings hard-block. The supplied allocation export exposed 3 invalid rows, 35 email-to-multiple-ID conflicts and 37 ID-to-multiple-email conflicts and was correctly blocked.
11. **PASS.** Cross-participant evaluator reuse, different valid roles and participant-as-evaluator reuse are supported; only duplicate evaluated/evaluator pairs are rejected.
12. **FAIL.** Canonical-name conflicts block and require confirmation, but the UI does not associate each name alternative with the source file that supplied it and replaces the actual allocation filename with the generic text `allocation export`.
13. **FAIL.** The review surface omits required role and language totals, reduces all EN allocations to one aggregate count instead of showing every EN row, and renders allocation mapping conflicts as repeated generic messages without their identifiers, emails, source rows or corrective context.
14. **PASS.** Automated reopening and raw XML inspection confirm exact A:N headers, A:M text cells, blank I:M values, row-relative N-only `CONCAT` formulas, literal formula-like user input and no hyperlinks. Independent supplied evidence also confirms a LibreOffice reopen/resave with clean ZIP integrity and preserved row-relative formulas.
15. **PASS.** Output sorting places self first and therefore before every actual Manager; at least one distinct Manager is required, and Stakeholder maps to `PartenerExtern`.
16. **PASS.** Reversed participant/source order produces identical semantic output and deterministic identifier assignment in automated tests.
17. **FAIL.** Core/workbook tests pass, fixtures are synthetic and D210-marked, but the package tests only inspect file presence, relative-path strings and forbidden source tokens. They do not actually load either pack at a nested browser subpath or record runtime requests, persistence, cache, URL and console behavior with client values.
18. **FAIL.** This fresh Inspector verdict is recorded and XML plus LibreOffice evidence exists, but the required fresh responsive/bilingual visual pass is absent and findings 12, 13 and 17 remain open. Structural acceptance is therefore withheld. No controlled old-production import was available; this is an explicit compatibility boundary, not a code defect.

### Actionable findings

#### [P1] Required consultant totals and per-row language notices are absent

- **Files:** `40-standalone/360-import-builder/src/app.js:16-17`, supported data at `40-standalone/360-import-builder/src/core.js:245-247`
- **Reproduction:** Load a valid project containing Manager, Peer and EN rows. The four summary cards show only participant count, valid rows, reused identifiers and new identifiers. The notice says only that an aggregate number of rows is EN.
- **Impact:** The consultant cannot inspect totals by production role or questionnaire language, and cannot identify each EN allocation as required by DoD 13 and the production contract.
- **Required change:** Render `summary.byRole` and `summary.byLanguage`, and list every EN allocation with participant, evaluator and source. EN remains non-blocking.

#### [P1] Real allocation conflicts are reduced to generic repeated messages

- **Files:** `40-standalone/360-import-builder/src/core.js:107-127`, `40-standalone/360-import-builder/src/app.js:5`, `40-standalone/360-import-builder/src/app.js:17`
- **Reproduction:** Load the supplied allocation export. The analyzer correctly finds invalid rows and bidirectional identifier conflicts, but the UI renders repeated generic sentences such as “One email has multiple identifiers” without the affected email/identifier, source row or corrective context.
- **Impact:** The supplied real file produces more than seventy conflict messages that cannot be reconciled from the consultant surface. Blocking is correct, but it is not actionable or person-first.
- **Required change:** Group conflicts, show the affected normalized email/identifier, conflicting values, source filename and row numbers, and state whether the source allocation export must be corrected or replaced.

#### [P2] Name alternatives lose per-name source provenance

- **Files:** `40-standalone/360-import-builder/src/core.js:197-223`, especially `:211`; `40-standalone/360-import-builder/src/app.js:19`
- **Reproduction:** Load two participant workbooks that use different names for the same normalized evaluator email, optionally with an allocation record. The conflict card lists the names and one combined source list; it does not show which source supplied which name. Allocation provenance is shown only as `allocation export`.
- **Impact:** The consultant cannot make the explicitly informed canonical-name selection required by DoD 12.
- **Required change:** Retain provenance per normalized name variant and display its actual source filename and row. Keep the allocation-provided name preselected but unresolved until explicit confirmation.

#### [P2] Static/privacy package checks do not exercise browser runtime behavior

- **Files:** `40-standalone/360-respondent-collector/tests/package.test.mjs:3-4`; `40-standalone/360-import-builder/tests/package.test.mjs:2-3`
- **Reproduction:** Inspect or run the package tests. They check asset existence, reject root/HTTP paths in HTML and search application source for forbidden tokens, but never serve the packs at a nested path or observe browser requests, storage, cache, URL and console state.
- **Impact:** DoD 17’s claimed automated coverage and DoD 18’s structural-acceptance evidence are incomplete.
- **Required change:** Add a browser test that serves each `deploy/` pack beneath a nested subpath, exercises representative client values and reset, and asserts no third-party requests, persistence/cache entries, URL leakage or console leakage.

### Verification evidence

- Collector `npm test`: **8/8 passed**.
- Import builder `npm test`: **11/11 passed**.
- `npm run verify` was attempted in both folders, but the build step could not unlink/rewrite `deploy/app.js` under the read-only inspection sandbox. No write permission was requested. Independent `src/` versus `deploy/` comparison found no differences.
- All six supplied participant templates parsed through the legacy adapter with row counts 13, 11, 14, 12, 15 and 21.
- The two supplied processing/import workbooks are not participant-collection inputs: the preprocessing workbook is interpreted as a multi-row legacy sheet and blocked, while the production import workbook is unsupported by the participant adapter. This is not a defect because neither is documented as a participant input.
- The supplied `Accounts` allocation export parsed 3,615 records, one `QuestionaireId`, maximum identifier 1856 and the mapping conflicts described above.
- Git status showed only the two scoped folders as untracked. Because untracked files do not appear in `git diff master`, the complete contents of both folders were inspected as the effective review delta.

### Explicit limitations

- No fresh browser visual/keyboard pass was completed at mobile, laptop and wide-desktop sizes in both languages.
- Runtime privacy/network/persistence recording was not completed.
- The Inspector did not personally open Excel; independent supplied LibreOffice evidence was considered.
- No controlled import into the old production 360 application was performed. Absence of that access is not a code defect. The packs must not be described as production-compatible until Vlad verifies row acceptance, self-sheet assignment, notification creation and identifier reuse.
- No file was edited or committed during this Inspector pass.

### Fresh Inspector addendum — deterministic canonical names

The parallel fresh inspection confirmed the verdict above and added one **P1** defect under DoD 12 and 16: `namesByEmail` keyed spelling variants by a folded name, so case-only variants could silently overwrite one another. Reversing otherwise identical input rows changed the emitted canonical spelling without producing a conflict. Remediation must retain distinct normalized spellings and their per-file/row provenance, require explicit canonical selection, and add a row/file-order permutation regression test for case and diacritic variants.

## Engineer remediation evidence — 2026-08-20

**Seat:** Engineer remediation applied by the Orchestrator because the isolated Engineer sandbox could not write the sibling worktree. **Scope:** only the two authorized standalone folders. **Commit status:** not committed at the time of this evidence.

### Findings addressed

- Canonical-name variants now retain every distinct normalized spelling plus actual filename, row and participant/allocation origin. Case-only variants no longer overwrite by input order; they block until an explicit canonical choice. Allocation-origin alternatives are visibly recommended but remain unresolved until confirmation.
- Allocation conflicts now retain and display the affected normalized email or identifier, all conflicting values, actual source filename and rows, plus an instruction to correct or replace the allocation export.
- The consultant review now renders production-role totals, every language total and one non-blocking detail row for every EN allocation with participant, evaluator, email and source.
- Both packs now include a Playwright nested-subpath runtime test covering same-origin requests, D210 client-value leakage, URL/console leakage, local/session storage, IndexedDB, CacheStorage and reset behavior. The test runner never downloads dependencies and fails clearly when Playwright is unavailable.
- Both packs declare an inline empty favicon so a browser does not escape the GitHub Pages subpath for `/favicon.ico`.

### Verification after remediation

- Collector build and synthetic suite: **8/8 passed, 0 failed**.
- Import builder build and synthetic suite: **14/14 passed, 0 failed**. New regressions cover case-only canonical-name determinism/provenance, actionable allocation records and required consultant review rendering.
- The new Chromium tests are present and invoked by `npm run verify`. In this managed macOS shell they report an explicit skip because Chromium is denied its Mach rendezvous service; the runner does not silently substitute a weaker check. A fresh in-app browser pass already loaded both deploy packs at nested paths in RO and EN at 1440×1000 and 390×844, found no console errors or third-party requests, and confirmed responsive layouts. The standalone Chromium test must still be rerun outside this sandbox before public release.
- All six real legacy files parse through the adapter. Two correctly require consultant entry of missing self identity, and the 21-row example correctly blocks because it exceeds the settled 15-non-self limit.
- The real 3,615-row `Accounts` export parses and correctly hard-blocks its 3 invalid rows, 35 email-to-multiple-ID conflicts and 37 ID-to-multiple-email conflicts. These are now actionable in the UI rather than generic repeated messages.
- A synthetic production workbook reopened and re-saved through LibreOffice 26.8 with clean ZIP integrity and preserved row-relative `CONCAT` formulas.

### Remaining boundary

No controlled import into the old production 360 application has been performed. The packs remain **structurally validated**, not **production-compatible**, until Vlad verifies row acceptance, self-sheet assignment, notification creation and identifier reuse. The standalone Playwright test also needs one execution outside the managed macOS shell because this environment blocks Chromium startup.

## Final Inspector closure — 2026-08-20

**Seat:** Fresh Inspector. **Verdict:** **ACCEPTED.** **Scope:** final read-only remediation recheck.

### Definition-of-done verdicts

1. **PASS.** Independent static deployment packs are complete and subpath-safe.
2. **PASS.** Bilingual, responsive, branded and accessible presentation is accepted; dynamic importer row labels now follow the active language.
3. **PASS.** Local-only processing, reset behavior and privacy constraints are accepted.
4. **PASS.** Collector self, Manager and respondent-limit rules are correct.
5. **PASS.** Participant role explanations preserve the settled public terminology.
6. **PASS.** Validation, normalization, languages, duplicates and literal formula-like values are correct.
7. **PASS.** Collector workbook content and determinism are correct.
8. **PASS.** Collector and legacy adapters, aliases and participant-scoped blockers are correct.
9. **PASS.** Project and optional `Accounts` input handling are correct.
10. **PASS.** Identifier reuse, allocation and conflict blocking are correct.
11. **PASS.** Cross-participant evaluator reuse and duplicate-pair handling are correct.
12. **PASS.** Canonical-name alternatives preserve spelling and source provenance and require explicit resolution.
13. **PASS.** Participant, role and language totals, individual EN notices and actionable errors are present.
14. **PASS.** The exact production workbook/XML contract is satisfied.
15. **PASS.** Self-first ordering, actual Manager enforcement and role conversion are correct.
16. **PASS.** Identifier, grouping and canonical-name output are deterministic under input reordering.
17. **PASS WITH DOCUMENTED ENVIRONMENT LIMITATION.** Automated browser coverage is implemented and invoked. The managed macOS Chromium skip is acceptable for structural closure when combined with the recorded in-app nested-path runtime evidence and automated source checks. Execute Playwright outside the sandbox before public release.
18. **PASS.** Automated, visual, XML, LibreOffice and fresh Inspector evidence support structural acceptance.

### Final evidence and boundary

- Collector suite: **8/8 passed**.
- Importer suite: **15/15 passed**.
- The final bilingual regression confirms English `rows`/`Row` labels and dynamic translation use.
- Importer `src/` and `deploy/` application/core files are byte-identical.
- All prior Inspector findings are closed; no actionable finding remains.
- The packs are **structurally validated**. They are not **production-compatible** until Vlad completes the controlled old-production import and verifies row acceptance, self-sheet assignment, notification creation and identifier reuse.
- No file was edited or committed during this Inspector recheck.

## Direct-file interaction repair — 2026-08-21

Vlad reported that **Add respondent** appeared inert. A hosted reproduction added the second respondent correctly, which narrowed the failure to a downloaded pack opened directly from disk: the original deployment used an ES module, and browsers block local `file://` module loading in common configurations before event handlers are attached.

Both standalone build pipelines now produce a classic, self-contained `deploy/app.js` while keeping the authored `src/` modules unchanged. The deployment HTML loads the local workbook library first and the bundled application second. Package regressions reject module scripts or top-level imports/exports in deploy output; the collector browser regression explicitly checks that **Add respondent** changes the card count from one to two, and both packs include direct-disk initialization coverage for execution outside the managed browser policy.

- Collector synthetic/package suite: **9/9 passed**.
- Import builder synthetic/package suite: **16/16 passed**.
- The in-app browser URL policy does not permit navigating to `file://`. The outside-sandbox Playwright run passed both direct-disk checks: the collector opened locally and **Add respondent** changed the card count from one to two; the import builder also initialized locally. Both hosted nested-path privacy/reset scenarios passed in the same run.

## Orchestrator handoff — BHB operating-design alignment, 2026-08-24

**Model fit:** high-complexity because this re-iteration combines personal-data privacy, source provenance, a rigid legacy XLSX contract, public static packaging and brand-asset use. The current model is suitable; the Councilor and Engineer retain it, and a fresh same-strength Inspector remains mandatory. Stepping down would save little against the risk of changing a plausible-looking production import silently.

**Vlad-approved outcome.** Apply the `bhb-operating-design` skill to both accepted standalone 360 tools without changing the settled respondent rules or the exact production A:N contract. The approved alignment scope is: stronger consultant auditability; clearer diagnosis and recovery; tighter BHB palette/gradient/logo treatment; explicit documentation of accepted inputs, removed work, finished outputs, privacy, validation and recovery; and tests that bind source, deploy, downloadable artifacts and brand rules.

The existing BHB logo and 360 illustration may remain in these two BHB-hosted GitHub Pages packs as bounded authorized working assets. This is not a general redistribution licence. Their provenance and the restriction must be visible in tool documentation. Zona Pro remains excluded; Poppins remains the approved public-pack fallback.

**Hard boundaries.** Preserve local-only processing, no analytics/persistence/service worker, direct `file://` launch, independent deploy packs, participant-facing terminology, deterministic identifiers and role mapping, and the structurally-validated/not-production-compatible wording. The production workbook must remain exactly A:N and receive no audit sheet or metadata that could affect the old importer. Any audit receipt is a separate local artifact created only on explicit consultant action. No `30-prototypes/`, `10-project/`, root governance, live application, source-material or unrelated standalone file may change.

**Branch and review surface:** continue `inc/360-respondent-tools`; this tool-local review note remains the packet surface established for the original standalone pair. Councilor pre-flight follows before the focused numbered DoD is recorded; Engineer and fresh Inspector remain separate sessions.

## Councilor pre-flight — BHB operating-design alignment, 2026-08-24

**Model fit:** standard-complexity advisory work: the product rules are settled, but the audit receipt, local-data boundary, legacy workbook contract and visual alignment must agree. The current model is suitable; a smaller model would save little and increase the risk of a plausible-looking import losing provenance. **Seat:** Councilor. **Scope:** advisory only; no product decision or specification is recorded here.

### Recommendation

Proceed as a focused alignment re-iteration, not a redesign. Preserve both audiences and every accepted 360 rule. Add a source ledger and an optional, consultant-triggered audit workbook to the importer; add explicit diagnosis/recovery guidance to both tools; then bring the existing presentation onto the official BHB palette and gradient grammar.

The audit receipt should be a separate `audit-360-<project>.xlsx`, downloadable on explicit action even while the run is blocked. That makes it useful for diagnosis. It should contain `Run`, `Sources`, `Issues`, `Identifiers` and `Normalizations` sheets: current readiness and totals; every attempted filename, full local SHA-256 fingerprint, size, parser/adapter and row disposition; actionable blockers/warnings and their resolution state; reused/new identifier evidence and confirmed canonical names; and field-level before/after normalization evidence. It must never be embedded in, linked from or downloaded automatically with the production A:N workbook.

### Risks and required safeguards

1. **Rejected input can currently fall out of the run.** A participant or allocation file that fails parsing produces a message, but other valid inputs can still become ready. Every attempted source must remain visible as accepted, blocked or explicitly removed; an unresolved rejected source blocks production export.
2. **An audit file is itself client-confidential.** It may contain names, emails and project evidence. Generate it locally, only on click; never persist it in the browser; state that reset cannot delete a file already downloaded.
3. **Normalization can become an unverifiable claim.** Record exact source row, field, original value and normalized value. Distinguish parsed, exportable, blocked and intentionally ignored rows rather than using one ambiguous “accepted” count.
4. **The audit path must not weaken the importer contract.** Keep A:N byte-semantically unchanged, keep N as the only formula column, and author audit values as literal text so formula-like client values cannot execute.
5. **Brand documentation and code currently disagree.** Both READMEs name official red `#EF4136`, while both stylesheets use `#D92F26`; the hero treatments are predominantly aqua rather than the recognizable aqua–green–yellow BHB device. Correct the implementation and re-check contrast instead of merely changing the prose.
6. **Source/deploy equality is mechanical, not literal.** `deploy/app.js` and `deploy/index.html` intentionally differ because the build creates a classic direct-file bundle. Verification should prove the documented transformation and byte equality for copied styles/assets, not demand false whole-tree identity.

### Alternatives considered

- **JSON receipt:** easier for machines but poor for the consultant's normal workflow. Recommend the local XLSX receipt, using the workbook capability already bundled.
- **Receipt only after a successful export:** simpler, but useless when a blocked run must be diagnosed. Recommend allowing it after at least one source attempt, clearly labelled with current readiness.
- **Audit sheet inside the production workbook:** rejected because it risks the rigid legacy importer contract.
- **Automatic persistence for recovery:** rejected. Recovery should be remove/replace/reload within the current in-memory session; closing the tab deliberately starts over.

The previous asset contradiction is resolved: Vlad authorized the existing logo and 360 illustration only for these two BHB-hosted Pages packs. Their hashes already match across both tools, and the logo matches the skill's official working asset. This is not a general redistribution licence. Poppins remains the public-pack fallback; no Zona Pro.

### Proposed focused definition of done

1. Preserve all settled behavior: self plus a distinct Manager minimum; 15 non-self maximum and 10 recommendation; participant-facing `Autoevaluare`/`Stakeholder`; production `Manager`/`PartenerExtern`; per-row two-letter language and EN notices; email-keyed deterministic identifier reuse/allocation; local-only operation; bilingual UI; direct `file://` and GitHub Pages subpath use.
2. Preserve the production workbook contract exactly: one sheet, headers A:N unchanged, A:M literal text, I:M blank, no hyperlinks, N-only row-relative `CONCAT`, self as first `Manager`, deterministic rows and no audit metadata, relationship, extra sheet or sample row.
3. Introduce an in-memory source ledger covering every attempted participant and allocation file. For each, retain filename, byte size, full SHA-256 of the original bytes, detected adapter (`collector`, `legacy`, `allocation` or `rejected`), parsed/exportable/blocked/intentionally-ignored row counts, normalization count, warnings and errors.
4. Keep rejected or unreadable inputs visible and blocking until the consultant explicitly removes or replaces them. Provide per-source remove/replace guidance without discarding unrelated valid files or silently reusing stale allocation state.
5. Make blocker and warning messages person/source-first and actionable in RO and EN. Add concise recovery guidance: correct the named source, remove or replace it, re-run review, regenerate outputs; closing/resetting clears memory and requires reloading; downloaded files remain on the device.
6. Add one secondary `Download audit receipt` action, enabled after at least one source attempt and never automatic. It downloads a separate `audit-360-<project>.xlsx` snapshot of the current state, including blocked states, with `Run`, `Sources`, `Issues`, `Identifiers` and `Normalizations` sheets and the evidence described in the recommendation.
7. Author every audit cell as literal text, with no formulas or hyperlinks. Record a local generated-at value and the structural-validation/production-compatibility boundary. State in UI and documentation that the receipt contains client-confidential information and that the consultant controls its storage/deletion.
8. Keep collector output and behavior unchanged while adding bilingual recovery copy for validation, interrupted/closed sessions and successful download/handoff. Do not add an audit receipt, persistence or internal production terminology to the participant tool.
9. Align both interfaces to the official BHB system: exact Aqua `#09BAD2`, Green `#39B54A`, Yellow `#F8EC32`, Ink `#231F20` and error Red `#EF4136`; a recognizable aqua–green–yellow gradient device with a legible text zone; calm white work surfaces; Poppins only; logo minimum size/exclusion space; unchanged, undistorted logo and 360 illustration; verified focus and contrast states.
10. Document in both READMEs the automation admission-gate answers, canonical `src/`, build/verify commands, accepted-input matrix, finished outputs, removed manual work, privacy, validation, diagnosis/recovery and structural-vs-production boundary. Document the two asset filenames and hashes as bounded authorized working assets for these packs only, with no Zona Pro or general redistribution claim.
11. Extend the production contract to define the source ledger and separate audit receipt without changing the A:N section. Keep wider-platform implications as existing read-only context; make no wider-project edit.
12. Regenerate both `deploy/` packs only through their build scripts. Tests must prove copied styles/assets agree with source and the classic bundled deployment is deterministically derived from `src/core.js`, `src/app.js` and the documented index transformation.
13. Add synthetic regressions for source fingerprints/dispositions, rejected-source blocking/removal/replacement, normalization provenance, blocked and ready audit receipts, literal formula-like audit values, identifier evidence, exact sheet names/content, no audit contamination of A:N, official palette/asset hashes and bilingual recovery copy. Preserve all existing workbook, privacy, nested-path and direct-file regressions.
14. Before acceptance, run both full verification suites and a fresh Inspector pass; inspect both languages at mobile/laptop/wide layouts with keyboard/focus and contrast checks; open the synthetic audit workbook in Excel or LibreOffice and inspect its rendered sheets. Keep the tools **structurally validated**, not **production-compatible**, until Vlad completes the controlled legacy-app import already recorded in this note.

### Questions or contradictions

No product blocker remains. Vlad's bounded asset authorization resolves the former publication contradiction, and the separate explicit audit artifact resolves the A:N conflict. The Architect should ratify the proposed XLSX receipt shape and numbered DoD before the Engineer edits source.

## Decision gate — focused re-iteration agreed, 2026-08-24

Vlad directly approved all five operating-design alignment points and authorized proceeding. Within that approved scope, the Orchestrator adopts the Councilor's proposed 14-point definition of done above **unchanged**. The separate XLSX audit receipt is a routine execution choice: it uses the consultant's existing working format, remains optional and local, may describe a blocked run, and never changes or accompanies the legacy A:N import automatically.

No new platform decision or D-entry is created. All current/future-platform implications remain proposal-only and read-only. The Engineer is authorized to edit only the two 360 standalone folders on `inc/360-respondent-tools`, regenerate their deploy packs mechanically, append its own evidence below, and commit. A fresh Inspector must verify the full 14 points before handoff to Vlad.

## Engineer evidence — BHB operating-design alignment, 2026-08-24

**Model fit:** high-complexity but bounded implementation because local PII handling, source provenance, a rigid legacy workbook and static packaging intersect. The current model was suitable; a smaller model would have saved little against contract-drift risk. **Seat:** Engineer. **Scope:** only the two authorized 360 standalone folders on `inc/360-respondent-tools`.

### DoD implementation record

1. All settled respondent, language, role, identifier, bilingual, privacy, direct-file and subpath behavior remains covered and green.
2. The production workbook remains one `Sheet1` with exact A:N, literal A:M, blank I:M, N-only row-relative `CONCAT`, no hyperlinks and no audit material.
3. The importer now keeps every attempted participant/allocation source in memory with original filename, byte size, full SHA-256, adapter, disposition counts, normalizations, warnings and errors.
4. Rejected attempts remain visible and block production export. Each source card has explicit **Replace** and **Remove** controls; replacement targets only that exact source, so unrelated files sharing a filename are preserved. A new allocation attempt replaces and clears prior allocation state before parsing.
5. Recovery and source/person-first action copy is bilingual; reset/close/download behavior is explicit.
6. The optional audit action is enabled after the first source attempt, works in blocked or ready states, and creates a separate `audit-360-<project>.xlsx` with exact `Run`, `Sources`, `Issues`, `Identifiers`, `Normalizations` sheets.
7. Audit cells are literal text only, with zero formulas/hyperlinks; the local timestamp, structural/production boundary and client-confidential retention warning are present.
8. Collector processing/output is unchanged; only bilingual validation/session/download recovery guidance was added. No audit, persistence or internal terminology entered the collector.
9. Both interfaces now compute the exact BHB palette, use a two-layer aqua-green-yellow device with a darker text zone, Poppins, unchanged authorized assets, minimum logo size/clear padding, readable error text and black-plus-yellow focus treatment.
10. Both READMEs now record the five-point admission gate, input/output matrix, removed work, canonical `src/`, build/verify path, privacy, diagnosis/recovery, boundary and the two bounded asset hashes/authorization.
11. The tool-local production contract now defines the ledger and separate receipt while leaving the A:N contract unchanged. No wider-project file changed.
12. `deploy/` was regenerated only through each tool's build script. Package tests prove copied styles agree and the exact classic bundle/index transformation is deterministic from canonical source.
13. New D210 synthetic regressions cover SHA-256, dispositions, rejected blocking/removal/replacement, normalization provenance, ready/blocked receipts, literal formula-like audit values, identifier evidence, exact audit sheets, A:N isolation, palette/assets, recovery and build determinism. All existing workbook/privacy/nested/direct-file checks remain green.
14. Verification evidence is complete for Engineer handoff; a fresh Inspector remains mandatory and the tools retain the **structurally validated, not production-compatible** boundary.

### Verification evidence

- Collector: build plus **11/11** synthetic/package tests; outside-sandbox Chromium **2/2** (nested-path privacy/reset and direct `file://` Add respondent).
- Importer: build plus **22/22** synthetic/package tests; outside-sandbox Chromium **2/2** (nested-path privacy/reset, source ledger, rejected-source audit/removal/explicit replacement and direct `file://`).
- In-app visual/keyboard pass: both tools in RO and EN at **390×844, 1024×768 and 1440×1000**. No horizontal overflow; Poppins and exact `#EF4136` computed; aqua-green-yellow gradient plus legible overlay computed; logo width stayed above the 90 px minimum; focus computed as 3 px Ink plus 5 px Yellow; error text uses high-contrast dark red while official Red remains the error accent.
- LibreOffice 26.8 reopened/resaved synthetic audit and production workbooks. Audit: exact five sheets, **0 formulas, 0 hyperlinks**. Production: only `Sheet1`, **5/5 row-relative `CONCAT` formulas preserved, 0 hyperlinks**. PDF renders of all sheets were inspected; wide audit/import tables paginate horizontally rather than clipping workbook content. LibreOffice displays the production `CONCAT` cells as `#NAME?` in its PDF calculation view while preserving the exact formula text required by the legacy contract; this is a viewer-dialect limitation and does not change the established production boundary.
- `git diff --check` is clean. The effective diff is confined to `40-standalone/360-respondent-collector/**` and `40-standalone/360-import-builder/**`; no root, governance, prototype, source-material, live-system or other standalone surface changed.

### Handoff boundary

No controlled import into the current production 360 application was performed. Production compatibility still requires Vlad to verify row acceptance, self-sheet assignment, notification creation and identifier reuse. The branch is ready for a fresh Inspector against all 14 points.

## Fresh Inspector review — BHB operating-design alignment, 2026-08-25

**Model fit:** high-complexity, security/privacy-sensitive independent review. The current frontier coding model is appropriate; the extra verification cost is justified by the risk of a plausible-looking stale allocation silently entering a production import. **Seat:** fresh Inspector. **Compared:** baseline `ff00ae4` against Engineer commit `5e8590488fcd0ca4ce67955436edc88b5b0a6f41`. **Verdict:** **CHANGES REQUESTED.**

### Focused definition-of-done verdicts

1. **PASS.** Settled respondent limits, roles, language behavior, deterministic identifiers, local-only operation, bilingual UI, direct `file://` launch and nested Pages-subpath behavior remain green.
2. **PASS.** The generated production workbook remains one `Sheet1` with exact A:N, literal A:M, blank I:M, N-only row-relative `CONCAT`, no hyperlinks and no audit material.
3. **FAIL.** Accepted/parse-rejected sources have the required ledger evidence and original-byte SHA-256, but a failure while reading the original bytes or hashing them occurs before the guarded attempt and leaves no ledger entry at all.
4. **FAIL.** Parse-rejected inputs block and exact-card remove/replace works, including duplicate filenames. A genuinely unreadable replacement can retain the old accepted source and stale allocation state because the replacement is not invalidated before the unguarded read/hash completes.
5. **FAIL.** Normal parse/validation blockers and recovery copy are actionable in RO and EN. A raw read/hash failure instead becomes an unhandled browser error with no source card or recovery action.
6. **FAIL.** Audit download is explicit, separate, never automatic and works for ready and parse-blocked states. It is not enabled after a first raw-unreadable attempt because that attempt vanishes; after an unreadable replacement it can audit the stale prior state instead of the attempted replacement.
7. **PASS.** The audit receipt contains exact `Run`, `Sources`, `Issues`, `Identifiers`, `Normalizations` sheets; every inspected audit cell is literal text, including formula-like values, with zero formulas and zero hyperlinks. Privacy, local timestamp and structural/production boundary copy are present.
8. **PASS.** Collector workbook/behavior is unchanged apart from bilingual recovery guidance; no audit, persistence or production-only terminology entered the participant tool.
9. **PASS.** Both deployed interfaces use loaded Poppins, exact Aqua `#09BAD2`, Green `#39B54A`, Yellow `#F8EC32`, Ink `#231F20` and Red `#EF4136`; the aqua-green-yellow hero device has a darker legible text zone. Official assets retain their aspect ratios, logos exceed 90 px, RO/EN layouts have zero horizontal overflow at 390×844, 1024×768 and 1440×1000, and keyboard focus computes as 3 px Ink plus a 5 px Yellow ring.
10. **PASS.** Both READMEs document the admission gate, canonical source/build path, accepted inputs, outputs, removed work, privacy, recovery and compatibility boundary. The logo and illustration hashes match source, deploy and the authorized skill asset; authorization is explicitly bounded to these two packs and excludes Zona Pro/general redistribution.
11. **PASS.** The tool-local production contract adds the source ledger and separate receipt while leaving the A:N contract unchanged; no wider-project surface changed.
12. **PASS.** Both builds regenerate deploy mechanically and deterministically. Copied styles/assets agree with source, classic bundles match the documented transformation, direct-file initialization passes, `git diff --check` is clean and the effective diff is confined to the two authorized standalone folders/review surface.
13. **FAIL.** Existing synthetic regressions cover fingerprints, dispositions, parse rejection, remove/replace, normalization provenance, receipts, literals, identifiers, exact sheets, A:N isolation, palette/assets and bilingual recovery. They do not cover `File.arrayBuffer()` or SHA-256 rejection, which is the failing boundary above.
14. **FAIL.** Both full suites, real Chromium, responsive bilingual, workbook/XML and LibreOffice checks were performed, but DoD 3–6 and 13 remain open; acceptance cannot be granted.

### Numbered finding

#### I-1 — [P1] Raw file-read/hash failures vanish and can preserve stale allocation state

- **Files:** `40-standalone/360-import-builder/src/app.js:13,23-24`; generated mirror `40-standalone/360-import-builder/deploy/app.js:398,408-409`; missing regression boundary in `40-standalone/360-import-builder/tests/browser.browser.mjs`.
- **Reproduction A — new source:** Start from a ready valid participant, make the next selected file's `File.arrayBuffer()` reject with `NotReadableError`, and select `unreadable.xlsx`. Real Chromium records one unhandled page error; the ledger still contains only the prior valid file, readiness remains `Gata pentru export`, and the production download remains enabled.
- **Reproduction B — allocation replacement:** Start from a ready participant plus accepted `allocation-old.xlsx`; use that allocation card's **Replace** control with a file whose `arrayBuffer()` rejects. After the failure the UI still shows `allocation-old.xlsx`, keeps the prior identifier mapping, reports ready and leaves production export enabled.
- **Cause:** `attemptSource()` awaits `sourceBase()` before entering its `try`. Both byte reading and `sha256Hex()` therefore sit outside the catch that creates the rejected ledger entry. The replacement target is changed only after those awaits succeed.
- **Impact:** an attempted source can disappear from the audit trail, a first unreadable attempt cannot produce the promised blocked receipt, and an unreadable allocation replacement can silently export using identifiers the consultant intended to replace. This breaks the central no-vanishing/no-stale-state safety guarantee.
- **Required fix:** guard byte read, SHA-256 and parsing as one attempt. Invalidate the exact replacement/allocation state before the first await and retain a blocking pending/rejected ledger entry on any read/hash/parse failure (filename and byte size remain available; mark the fingerprint unavailable when original bytes cannot be read). Keep unrelated same-name sources intact. Add real-browser regressions for a first unreadable participant attempt and an unreadable allocation replacement, plus a SHA-digest rejection; assert visible blocking provenance, disabled production export, enabled blocked audit and zero stale identifier reuse.

### Independent evidence and current boundary

- Collector full verification: **11/11** synthetic/package tests; real outside-sandbox Chromium **2/2**.
- Importer full verification: **22/22** synthetic/package tests; real outside-sandbox Chromium **2/2**. These green suites do not cover finding I-1.
- LibreOffice 26.8 reopened/resaved independently generated synthetic production and audit workbooks. The audit retained exactly five sheets, literal formula-like values, **0 formulas** and **0 hyperlinks**. The production workbook retained one sheet, five row-relative `CONCAT` formulas and **0 hyperlinks**; LibreOffice's PDF calculation view shows `#NAME?` for `CONCAT`, while preserving the required formula text, consistent with the already-recorded viewer-dialect limitation. The original generated workbook retains blank text cells in I:M.
- All 22 LibreOffice-rendered PDF pages were visually inspected. Wide tables paginate horizontally without clipped content; the production formula display limitation above remains explicit.
- No controlled import into the current production 360 application was performed. Even after I-1 is fixed and structural acceptance is restored, **production compatibility** still requires Vlad to verify row acceptance, self-sheet assignment, notification creation and identifier reuse in that controlled import.
- No product code or governance file was edited and no commit was created in this Inspector pass; only this Inspector section was appended.

## Engineer remediation — Inspector finding I-1, 2026-08-25

**Model fit:** high-complexity but tightly bounded remediation because the failure sits at the local PII provenance and stale-identifier boundary. The current model remained appropriate. **Seat:** Engineer. **Scope:** only the two authorized 360 standalone folders on `inc/360-respondent-tools`; no wider-project surface changed.

### Fix implemented

- Every participant/allocation attempt now creates a visible, blocking in-memory ledger record synchronously, before the first file-read await. Exact-card replacement invalidates only that target; a new allocation invalidates prior allocation state and identifiers before reading begins. Unrelated files, including same-named sources, remain untouched.
- File read, full SHA-256 digest and workbook parse now share one guarded attempt. A read, digest or parse failure settles the exact pending record as rejected without throwing an unhandled page error or reviving a removed/replaced attempt.
- Rejected records retain filename and byte size. When hashing cannot complete, the UI and separate audit receipt explicitly record the fingerprint as `unavailable`; audit `Issues` also records `failureStage`, `errorCode` and the local error detail as literal text.
- Production A:N remains disabled for pending/rejected attempts; the separate audit action is enabled after the first attempt, including blocked first-attempt state. The production workbook contract and collector behavior are unchanged.

### Regression and verification evidence

- Importer canonical build plus **22/22** core/package tests passed. Production A:N XML/workbook isolation, literal audit cells, no hyperlinks/formulas in audit, deterministic build and all previous contracts remain green.
- Real outside-sandbox Chromium **5/5** passed. Three new D210 synthetic boundaries prove: (1) first unreadable participant remains visible and auditable; (2) delayed unreadable allocation replacement removes the accepted allocation and reused identifier **before** file read settles, then retains honest rejected provenance; and (3) SHA-256 digest rejection is contained. Every boundary asserts no `pageerror`, `unavailable` fingerprint, disabled production export, enabled audit and no stale identifiers.
- Collector canonical build plus **11/11** tests and real outside-sandbox Chromium **2/2** passed unchanged, including nested-path privacy/reset and direct-file **Add respondent**.
- Deploy was regenerated mechanically from canonical source. `git diff --check` is clean; the effective remediation diff remains confined to the two authorized 360 folders.

### Handoff boundary

Inspector finding I-1 is remediated and ready for a fresh independent recheck. Structural verification does not establish production compatibility; Vlad's controlled legacy-app import remains required for row acceptance, self-sheet assignment, notification creation and identifier reuse.

## Fresh Inspector re-check — finding I-1, 2026-08-25

**Model fit:** high-complexity, privacy-sensitive focused review because the boundary can silently retain production identifiers. The current frontier coding model remains appropriate. **Seat:** fresh Inspector. **Compared:** finding baseline `5843bdc` against remediation commit `29b91a0b50326e59b8a009ce1f33ea3dddbfdecf`. **Verdict:** **CHANGES REQUESTED.** Original P1 finding **I-1 is closed**, but one narrower P2 audit-honesty finding remains at the explicitly tested pre-settlement boundary.

### Focused DoD re-check

3. **FAIL — narrowed.** Every attempt now creates a synchronous blocking ledger entry and settled read/digest failures retain filename, byte size and explicit `unavailable` fingerprint. While the attempt is still pending, however, the visible ledger and downloadable receipt classify it as adapter `rejected` before any rejection has occurred.
4. **PASS.** A delayed unreadable allocation replacement removes the old allocation card and reused identifier before the read promise settles, keeps production disabled throughout, never revives stale state, and preserves an unrelated participant source with the same filename. Settled removal/replacement remains exact by source ID/token.
5. **FAIL — narrowed.** Settled read/digest failures are contained with visible bilingual recovery and no unhandled `pageerror`. During the pending state, the badge correctly says `checking`, but the same card already says “The source could not be read,” which is premature and contradictory.
6. **FAIL — narrowed.** Production is disabled and the separate audit action is enabled throughout. A receipt downloaded before the delayed read settles reports Adapter=`rejected`, issue=`source-rejected` and recovery for a failed read while its own details say `failureStage=pending` / `errorCode=source-pending`; that current-state snapshot is not honest.
13. **FAIL — narrowed.** The new real-browser regressions cover first unreadable, delayed allocation replacement, settled blocked audit and digest rejection. They do not download and inspect the receipt while the delayed attempt is still pending, so the contradiction above remains green.
14. **FAIL.** Full suites and independent adversarial rechecks completed, and I-1 is closed, but focused DoD 3, 5, 6 and 13 remain open through finding I-2.

### Finding disposition

#### I-1 — [P1] Raw file-read/hash failures vanish and can preserve stale allocation state — **CLOSED**

- A first unreadable participant attempt is immediately visible and blocking, shows `unavailable`, disables production, enables the audit, settles without `pageerror` and mints no identifiers.
- A delayed unreadable allocation replacement clears reused identifier `77` and the accepted allocation before the promise settles. An unrelated participant source also named `shared.xlsx` remains. The settled audit contains only the replacement failure plus deterministic new identifiers `1` and `2`; identifier `77` does not survive.
- SHA-256 digest rejection settles as a visible blocked source with `failureStage=digest`, `source-digest-failed`, `unavailable`, no `pageerror`, no identifiers and an enabled audit.

#### I-2 — [P2] Pending source attempts are recorded as already rejected

- **Files:** `40-standalone/360-import-builder/src/app.js:22,34-35,39`; generated mirror `40-standalone/360-import-builder/deploy/app.js:407,419-420,424`; missing pre-settlement audit assertion in `40-standalone/360-import-builder/tests/browser.browser.mjs:177-202`.
- **Reproduction:** Delay `File.arrayBuffer()` rejection, start a participant or allocation attempt, wait for the visible `checking` badge, and download the enabled audit before the promise settles. The card displays `unavailable` and correct blocking controls, but also displays “The source could not be read.” The receipt records source Adapter=`rejected`, Disposition=`blocked` and issue Code=`source-rejected`, even though Details says `failureStage=pending` and `errorCode=source-pending`.
- **Impact:** the audit receipt is meant to be an honest snapshot after any source attempt. A consultant can download evidence that asserts a failure which has not happened and may still resolve successfully. The UI simultaneously says “checking” and “could not be read.”
- **Required fix:** represent the transitional record truthfully as pending/checking in the ledger, blocker and receipt, with bilingual copy such as “Checking locally; production export stays blocked.” Show rejection/recovery only after read, digest or parse actually fails. Add a delayed-browser regression that downloads the audit before settlement and asserts a pending source/issue with no premature rejection or failure detail, then separately asserts the settled rejected receipt.

### Independent evidence and remaining boundary

- Importer canonical build and synthetic/package suite: **22/22 passed**; production A:N XML/workbook isolation and deterministic deploy remain green.
- Importer real outside-sandbox Chromium: **5/5 passed**. Independent adversarial probes additionally checked the receipt before promise settlement and exposed I-2.
- Collector unchanged synthetic/package suite: **11/11 passed**; real outside-sandbox Chromium **2/2 passed**, including direct `file://` Add respondent.
- `git diff --check` is clean; the remediation diff is confined to the importer and the sequential review-note evidence. No product code was edited and no commit was created by this Inspector.
- Structural acceptance remains withheld only for I-2. After it closes, the packs still remain **structurally validated, not production-compatible** until Vlad's controlled legacy-app import verifies row acceptance, self-sheet assignment, notification creation and identifier reuse.

## Engineer remediation — Inspector finding I-2, 2026-08-25

**Model fit:** standard-complexity, tightly bounded state-semantics remediation. The current model was suitable because the fix must keep UI, blocker analysis and downloadable audit evidence synchronized without weakening the I-1 stale-state boundary. **Seat:** Engineer. **Scope:** only the two authorized 360 standalone folders on `inc/360-respondent-tools`.

### Fix implemented

- The synchronous pre-settlement record remains blocking but is now truthfully classified as adapter/disposition `pending`, with issue code `source-pending`, zero error count and fingerprint `unavailable (pending)`.
- Pending UI and issue recovery use dedicated bilingual checking copy: local checking is in progress and production export remains blocked. No rejected badge, read-failure statement, rejection recovery, failure stage, error code or error detail appears until a read, digest or parse failure actually settles.
- Settled failures retain the I-1 behavior unchanged: exact attempt-token settlement, rejected/blocked provenance, explicit unavailable fingerprint, stage/code/detail evidence, disabled A:N and no stale allocation identifiers.
- The pending card uses the BHB Aqua informational state instead of the Red failure state. The tool-local production contract now distinguishes pending checking from settled rejection.

### Regression and verification evidence

- Importer canonical build plus **22/22** core/package tests passed.
- Real outside-sandbox Chromium **5/5** passed. The delayed allocation read is held unresolved while the test downloads and reopens an audit receipt. That pre-settlement receipt proves source adapter/disposition `pending`, issue `source-pending`, fingerprint `unavailable (pending)`, zero source errors, checking guidance, no rejection/read-failure details and no stale identifier `77`. The test then rejects the same held read and downloads a second receipt proving settled `rejected`/`blocked`, `source-rejected` and `failureStage=read` evidence.
- Collector canonical build plus **11/11** tests and real outside-sandbox Chromium **2/2** passed unchanged.
- Both deploy packs were regenerated mechanically. `git diff --check` is clean; the effective diff is confined to the two authorized 360 folders.

### Handoff boundary

Inspector finding I-2 is remediated and ready for a fresh independent recheck. The packs retain the **structurally validated, not production-compatible** boundary until Vlad completes the controlled legacy-app import.

## Final fresh Inspector re-check — finding I-2, 2026-08-25

**Model fit:** high-complexity, privacy-sensitive focused review because a premature or stale audit classification can become false production evidence. The current frontier coding model remains appropriate. **Seat:** fresh Inspector. **Compared:** finding baseline `1783901` against remediation commit `afadad46035d11ee0b09237ace43e0f149f47270`. **Verdict:** **ACCEPTED.** Finding **I-2 is closed** and the focused 14-point definition of done is structurally met.

### Focused DoD re-check

3. **PASS.** Held participant and allocation attempts are immediately visible as adapter/disposition `pending`, fingerprint `unavailable (pending)`, zero errors and no parsed/exportable/blocked counts. After the read rejects, the same attempts settle truthfully as `rejected`/`blocked` with fingerprint `unavailable` and one error.
5. **PASS.** Before settlement, RO and EN both show only dedicated checking/source-pending guidance and keep production blocked; neither language says the source was rejected or unreadable. After settlement, the bilingual rejection/recovery path appears. Chromium recorded zero unhandled `pageerror` events.
6. **PASS.** The separate audit action is explicit, enabled during both pending and settled blocked states, and never automatic. The independently downloaded pre-settlement receipt contained `source-pending`, zero errors and `{}` issue details, with no `source-rejected`, `source-read-failed`, `failureStage` or error-detail metadata. The settled receipt changed to `source-rejected` with `failureStage=read` and `source-read-failed`.
13. **PASS.** The delayed real-browser regression now downloads and reopens both pre- and post-settlement receipts. Independent adversarial coverage held two reads concurrently, including an exact same-filename allocation replacement, and reproduced the expected transition without retaining identifier `77` or disturbing the unrelated same-name participant source.
14. **PASS.** Importer synthetic/package verification passed **22/22** and real outside-sandbox Chromium passed **5/5**. Collector regression verification passed **11/11** and real outside-sandbox Chromium passed **2/2**, including direct `file://`. The focused independent held-promise inspection passed in both languages and reopened both audit snapshots.

### Finding disposition and boundary

#### I-2 — [P2] Pending source attempts are recorded as already rejected — **CLOSED**

- While reads were unresolved, two pending source rows reported adapter/disposition `pending`, zero errors and `unavailable (pending)`; two issue rows reported `source-pending` with empty details. Production was disabled, audit was enabled, reused identifiers were zero, and no stale identifier appeared in the receipt.
- After both held reads rejected, those rows changed to `rejected`/`blocked`, one error and `unavailable`; the issues changed to `source-rejected` with truthful read-stage failure metadata. The exact replacement token cleared old allocation/identifier state before settlement and did not remove the unrelated participant source sharing its filename.
- The remediation diff is confined to the importer source/deploy/tests/docs plus the sequential review-note record. No product code or governance file was edited and no commit was created by this Inspector.
- Structural acceptance is restored. The packs remain **structurally validated, not production-compatible** until Vlad's controlled legacy-app import verifies row acceptance, self-sheet assignment, notification creation and identifier reuse.
