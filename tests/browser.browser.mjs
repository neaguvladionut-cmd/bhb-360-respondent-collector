import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BHB_PLAYWRIGHT_MODULE);
const root = resolve("deploy");
const prefix = "/pages/d210-collector/";
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".webp": "image/webp", ".ttf": "font/ttf", ".txt": "text/plain; charset=utf-8" };

function startServer() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    if (!url.pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
    const relative = url.pathname.slice(prefix.length) || "index.html";
    if (relative.includes("..")) { response.writeHead(400).end(); return; }
    try { const bytes = await readFile(resolve(root, relative)); response.writeHead(200, { "content-type": mime[extname(relative)] || "application/octet-stream" }); response.end(bytes); }
    catch { response.writeHead(404).end(); }
  });
  return new Promise((resolveReady) => server.listen(0, "127.0.0.1", () => resolveReady(server)));
}

test("nested collector runtime keeps D210 client values local and reset clears memory", async () => {
  const server = await startServer();
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const requests = []; const consoleMessages = []; const pageErrors = [];
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("request", (request) => requests.push(request.url()));
    page.on("console", (message) => consoleMessages.push(message.text()));
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(`${origin}${prefix}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await page.locator("#participant-name").fill("D210 Runtime Participant");
    await page.locator("#participant-email").fill("d210.runtime@example.invalid");
    await page.locator("#manager-name").fill("D210 Runtime Manager");
    await page.locator("#manager-email").fill("d210.manager@example.invalid");
    await page.locator("#manager-language").fill("EN");
    assert.equal(await page.locator(".respondent-card").count(), 1);
    await page.locator("#add-respondent").click();
    assert.equal(await page.locator(".respondent-card").count(), 2);
    const secrets = ["D210 Runtime Participant", "d210.runtime@example.invalid", "d210.manager@example.invalid"];
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
    assert(requests.every((value) => { const url = new URL(value); return url.origin === origin && url.pathname.startsWith(prefix); }), requests.join("\n"));
    assert(secrets.every((secret) => !requests.some((value) => decodeURIComponent(value).includes(secret))));
    assert(secrets.every((secret) => !consoleMessages.some((value) => value.includes(secret))));
    assert(secrets.every((secret) => !page.url().includes(secret)));
    const persistence = await page.evaluate(async () => ({ local: localStorage.length, session: sessionStorage.length, indexed: indexedDB.databases ? (await indexedDB.databases()).length : 0, caches: globalThis.caches ? (await caches.keys()).length : 0 }));
    assert.deepEqual(persistence, { local: 0, session: 0, indexed: 0, caches: 0 });
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#clear-form").click();
    assert.equal(await page.locator("#participant-name").inputValue(), "");
    assert.equal(await page.locator("#participant-email").inputValue(), "");
    assert.equal(await page.locator("#manager-name").inputValue(), "");
    assert.equal(await page.locator("#manager-email").inputValue(), "");
    const body = await page.locator("body").textContent();
    assert(secrets.every((secret) => !body.includes(secret)));
  } finally { await browser.close(); await new Promise((resolveClose) => server.close(resolveClose)); }
});

test("collector add button works when deploy index is opened directly from disk", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(pathToFileURL(resolve(root, "index.html")).href, { waitUntil: "load" });
    assert.equal(await page.locator(".respondent-card").count(), 1);
    await page.locator("#add-respondent").click();
    assert.equal(await page.locator(".respondent-card").count(), 2);
    assert.equal(errors.length, 0, errors.join("\n"));
  } finally { await browser.close(); }
});
