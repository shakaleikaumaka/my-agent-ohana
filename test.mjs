// Playwright walkthrough test for My Agent Ohana demo shell.
// Covers CAST v4 (2026-09-26): hireable SIX (orbie, trace, terri, pit,
// spector, GLOBY) + Ohana host banner (NOT hireable) + commons row of THREE
// (shaka-twin + oso + crops — present, NEVER for hire, no ceremony) rendered ABOVE
// the hire grid (Ohana host → commons → for hire) + offline mode + denied path.
// THE DOORS (2026-09-27, Shaka's main-UX ruling): 🚪 door chips on homed cards
// (stopPropagation — ceremony click-path unchanged), hero door on detail, honest
// queued chips for homeless agents, and the 🎒 passport carry-link (#ohana= b64url
// {v,a,n,c,t}) on blessed + debrief screens. window.open is stubbed in-page so no
// real tab/network ever opens during the run.
// Asserts 0 console errors / 0 page errors across every flow, desktop + mobile.
//
// Usage: node test.mjs            (spawns its own static server on 8099)
//        BASE=http://host node test.mjs   (test an external URL)
import pw from "/usr/lib/node_modules/playwright/index.js";
const { chromium } = pw;
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8099;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };

let server = null;
async function startServer() {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const fp = path.join(DIR, p);
    if (!fp.startsWith(DIR) || !fs.existsSync(fp)) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "text/plain" });
    fs.createReadStream(fp).pipe(res);
  });
  await new Promise((r) => server.listen(PORT, r));
}

const BASE = process.env.BASE || `http://127.0.0.1:${PORT}`;
const AGENTS = ["orbie", "trace", "terri", "pit", "spector", "globy"];
const COMMONS = ["shaka-twin", "oso", "crops"];
// 🚪 THE DOORS — agents with a real live home site (mirror of agents.json home.url)
const HOMES = {
  orbie: "https://orbie-vcnqvzxuo4-ffieyo32.taur.link/",
  trace: "https://tracewaste.org",
  terri: "https://theshellpit.com",
  pit: "https://publicinform.com",
  spector: "https://spector-app-yoyp3xag64-ffieyo32.taur.link/"
};
const QUEUED_HOMES = ["globy"]; // honest queued chip, never a dead link
function decodePassport(href) {
  const b64 = href.split("#ohana=")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900, isMobile: false },
  { name: "mobile", width: 390, height: 844, isMobile: true }
];

let pass = 0, fail = 0;
const lines = [];
function log(s) { console.log(s); lines.push(s); }
function ok(cond, msg) { if (cond) { pass++; log("  [PASS] " + msg); } else { fail++; log("  [FAIL] " + msg); } }

async function attachErrorSinks(page, bag) {
  page.on("console", (m) => { if (m.type() === "error") bag.push("console.error: " + m.text()); });
  page.on("pageerror", (e) => bag.push("pageerror: " + e.message));
  page.on("requestfailed", (r) => {
    // favicon data: URIs never hit network; ignore aborted navigations only
    bag.push("requestfailed: " + r.url() + " — " + (r.failure()?.errorText || "?"));
  });
}

// Drives the full ceremony for one agent. `deny=true` exercises the denied path instead of bless.
async function walk(page, agentId, { deny = false } = {}) {
  await page.click(`.card[data-id="${agentId}"]`);
  await page.waitForSelector(".agent-hero");
  // kit must render 5 parts
  const kitCount = await page.$$eval(".kit-item", (n) => n.length);
  ok(kitCount === 5, `${agentId}: detail shows 5-part kit (got ${kitCount})`);
  await page.click(".btn.big"); // HIRE
  await page.waitForSelector(".qrbox");
  await page.click(".btn"); // Open my World ID app
  await page.waitForSelector(".phone .approve");

  if (deny) {
    await page.click(".phone .deny");
    await page.waitForSelector(".standdown.declined");
    const said = await page.textContent(".standdown .said");
    ok(/declined/i.test(said), `${agentId}: DENY → dignified declined stand-down`);
    await page.click(".btnrow .btn, .btnrow .link");
    await page.waitForSelector(".grid");
    return;
  }

  await page.click(".phone .approve"); // APPROVE → binding
  await page.waitForSelector(".legs");
  // wait for CTA to enable (chain legs settle)
  await page.waitForFunction(() => {
    const r = document.querySelector("#bindCta");
    return r && r.style.pointerEvents === "auto";
  }, { timeout: 8000 });
  await page.click("#bindCta .btn"); // → blessed
  await page.waitForSelector(".countdown");
  // 🎒 DOORS: post-blessing passport carry-over on the blessed screen
  if (HOMES[agentId]) {
    const href = await page.$eval(".carrylink", (n) => n.getAttribute("href"));
    ok(href.startsWith(HOMES[agentId]) && href.includes("#ohana="), `${agentId}: blessed carry-link → home with #ohana= passport`);
    const p = decodePassport(href);
    ok(p.v === 1 && p.a === agentId && !!p.c && !!p.t, `${agentId}: passport payload {v:1,a,c,t} valid (c=${String(p.c).slice(0, 28)})`);
  } else {
    ok(await page.$(".carryqueued") !== null, `${agentId}: queued home → honest carry chip on blessed screen`);
  }
  await page.click(".btn.big"); // Put to work → utility
  await page.waitForSelector("#runBtn");
  await page.click("#runBtn"); // run utility
  await page.waitForSelector(".receipt .stamp", { timeout: 4000 });
  const stamp = await page.textContent(".receipt .stamp");
  const sub = await page.$eval(".subname-pill", (n) => n.textContent);
  ok(/myagentohana\.eth/.test(sub), `${agentId}: subname derived from parent (${sub.trim().slice(0, 40)})`);
  // REVOKE — one word "Stop"
  await page.fill("#revokeIn", "Stop");
  await page.press("#revokeIn", "Enter");
  await page.waitForSelector(".standdown.halt-flash");
  await page.waitForSelector(".promise-strip", { timeout: 6000 });
  const debrief = await page.textContent("#debriefHost");
  ok(/revoked/i.test(debrief), `${agentId}: REVOKE → instant halt + debrief receipt`);
  // 🎒 DOORS: the debrief carries the passport too (link for homed, honest chip for queued)
  ok(await page.$(HOMES[agentId] ? "#debriefHost .carrylink[href*='#ohana=']" : "#debriefHost .carryqueued") !== null,
    `${agentId}: debrief carries the passport ${HOMES[agentId] ? "link" : "queued chip"}`);
  await page.click(".btnrow .btn"); // back to shelf
  await page.waitForSelector(".grid");
}

// F1 regression: revoke landing DURING the ~900ms utility spinner must render EXACTLY ONE
// debrief receipt (not a stacked double). `delayMs` = when "Stop" lands inside the spinner
// window; `useEnter` toggles Enter-key vs button revoke path.
async function walkRevokeMidSpinner(page, agentId, { delayMs = 0, useEnter = true } = {}) {
  await page.click(`.card[data-id="${agentId}"]`);
  await page.waitForSelector(".agent-hero");
  await page.click(".btn.big"); // HIRE
  await page.waitForSelector(".qrbox");
  await page.click(".btn"); // Open my World ID app
  await page.waitForSelector(".phone .approve");
  await page.click(".phone .approve"); // APPROVE → binding
  await page.waitForSelector(".legs");
  await page.waitForFunction(() => {
    const r = document.querySelector("#bindCta");
    return r && r.style.pointerEvents === "auto";
  }, { timeout: 8000 });
  await page.click("#bindCta .btn"); // → blessed
  await page.waitForSelector(".countdown");
  await page.click(".btn.big"); // Put to work → utility
  await page.waitForSelector("#runBtn");
  await page.click("#runBtn"); // start ~900ms spinner
  await page.waitForSelector(".poll .spin"); // spinner is up
  if (delayMs > 0) await page.waitForTimeout(delayMs); // let the stale timer arm
  // REVOKE mid-spinner
  if (useEnter) { await page.fill("#revokeIn", "Stop"); await page.press("#revokeIn", "Enter"); }
  else { await page.click(".btn.danger"); }
  await page.waitForSelector(".standdown.halt-flash");
  await page.waitForSelector("#debriefHost .promise-strip", { timeout: 6000 });
  // give the stale 900ms timer + full leg choreography ample time to (mis)fire
  await page.waitForTimeout(1600);
  const receipts = await page.$$eval("#debriefHost .receipt", (n) => n.length);
  const strips = await page.$$eval("#debriefHost .promise-strip", (n) => n.length);
  const backBtns = await page.$$eval("#debriefHost .btnrow .btn", (n) => n.length);
  const label = `${agentId} @${delayMs}ms ${useEnter ? "Enter" : "button"}`;
  ok(receipts === 1, `${label}: EXACTLY ONE debrief receipt (got ${receipts})`);
  ok(strips === 1, `${label}: EXACTLY ONE promise-strip (got ${strips})`);
  ok(backBtns === 1, `${label}: EXACTLY ONE "hire anytime" button (got ${backBtns})`);
  const debrief = await page.textContent("#debriefHost");
  ok(/revoked/i.test(debrief), `${label}: debrief shows revoked`);
  await page.click("#debriefHost .btnrow .btn"); // back to shelf
  await page.waitForSelector(".grid");
}

async function run() {
  if (!process.env.BASE) await startServer();
  const browser = await chromium.launch();
  const allErrs = [];

  for (const vp of VIEWPORTS) {
    log(`\n#### VIEWPORT: ${vp.name} (${vp.width}x${vp.height}) ####`);
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.isMobile });
    const page = await ctx.newPage();
    const bag = [];
    await attachErrorSinks(page, bag);

    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    // Host banner present, and Ohana is NOT a hireable card
    ok(await page.$(".host-banner") !== null, `${vp.name}: Ohana host/concierge banner present`);
    const cardIds = await page.$$eval(".card[data-id]", (ns) => ns.map((n) => n.getAttribute("data-id")));
    ok(!cardIds.includes("ohana"), `${vp.name}: Ohana is NOT a hireable card`);
    const featured = cardIds.filter((id) => AGENTS.includes(id));
    ok(featured.length === 6, `${vp.name}: exactly 6 featured agents (got ${featured.length}: ${featured.join(",")})`);

    // CAST v4 commons row of THREE: shaka-twin + oso + crops, COMMONS badge, NOT hireable,
    // rendered ABOVE the hire grid (progression: Ohana host → commons → for hire).
    const commonsIds = await page.$$eval(".card.commons", (ns) => ns.map((n) => n.getAttribute("data-id")));
    ok(COMMONS.every((id) => commonsIds.includes(id)) && commonsIds.length === 3, `${vp.name}: commons row = shaka-twin + oso + crops (got ${commonsIds.join(",")})`);
    const commonsBadge = await page.$eval('.card.commons[data-id="shaka-twin"] .badge', (n) => n.textContent);
    ok(/NOT FOR HIRE/i.test(commonsBadge), `${vp.name}: shaka-twin badge reads COMMONS · NOT FOR HIRE`);
    // clicking a commons card must NOT open the detail/ceremony — the bard stays a free agent
    await page.click('.card.commons[data-id="shaka-twin"]');
    await page.waitForTimeout(400);
    ok(await page.$(".agent-hero") === null && (await page.$(".grid")) !== null, `${vp.name}: clicking a commons card does NOT enter the hire ceremony`);
    // crops is commons now — his card is click-proof too, and he is gone from the hireable grid
    await page.click('.card.commons[data-id="crops"]');
    await page.waitForTimeout(400);
    ok(await page.$(".agent-hero") === null && (await page.$(".grid")) !== null, `${vp.name}: clicking crops' commons card does NOT enter the hire ceremony`);
    ok(!featured.includes("crops") && !featured.includes("shaka-twin"), `${vp.name}: crops + shaka-twin are NOT among the hireable featured`);
    ok(cardIds.indexOf("crops") > -1 && cardIds.indexOf("crops") < cardIds.indexOf("orbie"), `${vp.name}: commons row renders ABOVE the hire grid (CAST v4 progression)`);
    // globy joined the cohort
    ok(cardIds.includes("globy"), `${vp.name}: globy is on the shelf (hireable)`);

    // Orbie (Beat-3, Ian's card) must render REAL Sepolia ENS rows — no auto-derived path.
    ok(featured[0] === "orbie", `${vp.name}: Orbie is first among the hireable (got ${featured[0]})`);
    await page.click('.card[data-id="orbie"]');
    await page.waitForSelector(".agent-hero");
    const orbieKeys = await page.$$eval(".panel .kv .k", (ns) => ns.map((n) => n.textContent));
    const orbieBody = await page.$eval(".split .panel", (n) => n.textContent);
    ok(orbieKeys.includes("Owner (Sepolia)") && orbieKeys.includes("Namehash") && orbieKeys.includes("Resolver (Sepolia)"),
      `${vp.name}: Orbie detail shows real Sepolia rows (owner/namehash/resolver)`);
    ok(/Live on real Sepolia/.test(orbieBody), `${vp.name}: Orbie detail badged "Live on real Sepolia"`);
    await page.click("#resetBtn");
    await page.waitForSelector(".grid");

    // Globy (renamed from Globie 2026-09-27 — globyagent.com acquired): his NEW subname
    // globy.myagentohana.eth mint LANDED on real Sepolia 2026-09-26 UTC (agentId 9, GUIDE —
    // ADDRESSES.md §2d), so his detail renders the REAL Sepolia rows at Orbie-parity. The
    // old-spelling globie.myagentohana.eth (agentId 8) stays minted as honest chain history
    // in ensIdentity — but is NEVER passed off as Globy's own rows.
    await page.click('.card[data-id="globy"]');
    await page.waitForSelector(".agent-hero");
    const globyKeys = await page.$$eval(".panel .kv .k", (ns) => ns.map((n) => n.textContent));
    const globyBody = await page.$eval(".split .panel", (n) => n.textContent);
    ok(globyKeys.includes("Will be named") && /globy\.myagentohana\.eth/.test(globyBody),
      `${vp.name}: Globy detail names him globy.myagentohana.eth`);
    ok(globyKeys.includes("Owner (Sepolia)") && globyKeys.includes("Namehash") && globyKeys.includes("Resolver (Sepolia)"),
      `${vp.name}: Globy detail shows real Sepolia rows (owner/namehash/resolver) — mint landed`);
    ok(/Live on real Sepolia/.test(globyBody), `${vp.name}: Globy detail badged "Live on real Sepolia"`);
    ok(/0x7b629239…525BD5/.test(globyBody) && /0x04caed2c…a23b9a/.test(globyBody),
      `${vp.name}: Globy detail carries the real minted owner + namehash (agentId 9)`);
    ok(!/Name mint in flight/.test(globyBody), `${vp.name}: Globy mint-in-flight note retired (mint landed)`);
    ok(!/globie/i.test(globyBody), `${vp.name}: Globy detail is fully renamed (no globie anywhere)`);
    await page.click("#resetBtn");
    await page.waitForSelector(".grid");

    // ---- 🚪 THE DOORS (Shaka's main-UX ruling, 2026-09-27) ----
    // Stub window.open in-page: door clicks are recorded, no real tab/network ever opens.
    await page.evaluate(() => { window.__doors = []; window.open = (u) => { window.__doors.push(u); return null; }; });
    const doorIds = await page.$$eval(".card .chip.door:not(.queued)", (ns) => ns.map((n) => n.closest(".card").getAttribute("data-id")));
    ok(Object.keys(HOMES).every((id) => doorIds.includes(id)), `${vp.name}: door chips on all homed hireable cards (got ${doorIds.join(",")})`);
    ok(COMMONS.every((id) => doorIds.includes(id)), `${vp.name}: door chips on all three commons cards (real live homes)`);
    const queuedIds = await page.$$eval(".card .chip.door.queued", (ns) => ns.map((n) => n.closest(".card").getAttribute("data-id")));
    ok(QUEUED_HOMES.every((id) => queuedIds.includes(id)) && queuedIds.length === QUEUED_HOMES.length,
      `${vp.name}: globy shows the only honest queued door chip (got ${queuedIds.join(",")})`);
    ok(/#globyontour/.test(await page.$eval('.card[data-id="globy"] .chip.door.queued', (n) => n.textContent)),
      `${vp.name}: globy queued door chip carries #globyontour`);
    // stopPropagation: a door-chip click opens the home, NOT the detail/ceremony
    await page.click('.card[data-id="terri"] .chip.door');
    await page.waitForTimeout(350);
    ok(await page.$(".agent-hero") === null && (await page.$(".grid")) !== null,
      `${vp.name}: door-chip click stays on the shelf (stopPropagation — ceremony path untouched)`);
    let doorsOpened = await page.evaluate(() => window.__doors);
    ok(doorsOpened.length === 1 && doorsOpened[0] === HOMES.terri,
      `${vp.name}: terri door chip opened ${HOMES.terri} (got ${doorsOpened.join(",")})`);
    // commons door works too (oso → the open orchestra)
    await page.click('.card.commons[data-id="oso"] .chip.door');
    await page.waitForTimeout(250);
    doorsOpened = await page.evaluate(() => window.__doors);
    ok(doorsOpened.length === 2 && doorsOpened[1] === "https://opensourceorchestra.org" && (await page.$(".agent-hero")) === null,
      `${vp.name}: oso commons door opens the orchestra, still no ceremony`);
    // the card's MAIN click path is unchanged: card body → detail
    await page.click('.card[data-id="terri"] .nm');
    await page.waitForSelector(".agent-hero");
    const heroTxt = await page.$eval(".doorhero", (n) => n.textContent);
    ok(/ENTER TERRI'S HOME/.test(heroTxt) && /theshellpit\.com/.test(heroTxt) && /revoke stay here/i.test(heroTxt),
      `${vp.name}: terri detail hero door present + proofs-stay-here line`);
    await page.click(".doorhero");
    await page.waitForTimeout(250);
    doorsOpened = await page.evaluate(() => window.__doors);
    ok(doorsOpened.length === 3 && doorsOpened[2] === HOMES.terri && (await page.$(".agent-hero")) !== null,
      `${vp.name}: hero door opens the home and stays on the detail`);
    await page.click("#resetBtn");
    await page.waitForSelector(".grid");
    // queued hero door — honest, dim, never a dead link
    await page.click('.card[data-id="globy"]');
    await page.waitForSelector(".agent-hero");
    ok(await page.$(".doorhero.queued") !== null, `${vp.name}: globy detail shows honest queued hero door`);
    await page.click("#resetBtn");
    await page.waitForSelector(".grid");
    // 🚪 trace's REAL door (tracewaste.org, 2026-09-27) — queued chip retired
    await page.click('.card[data-id="trace"] .nm');
    await page.waitForSelector(".agent-hero");
    const traceHero = await page.$eval(".doorhero:not(.queued)", (n) => n.textContent);
    ok(/ENTER TRACE'S HOME/.test(traceHero) && /tracewaste\.org/.test(traceHero) && /revoke stay here/i.test(traceHero),
      `${vp.name}: trace detail hero door → tracewaste.org + proofs-stay-here line`);
    await page.click("#resetBtn");
    await page.waitForSelector(".grid");

    // Full ceremony for all six hireable (incl. Orbie — the Beat-3 card Ian blesses)
    for (const id of AGENTS) { await walk(page, id); }
    // Denied path (dignified) — exercise once on Spector
    await walk(page, "spector", { deny: true });

    if (bag.length) { allErrs.push(...bag.map((e) => `[${vp.name}] ${e}`)); }
    ok(bag.length === 0, `${vp.name}: 0 console/page/request errors (got ${bag.length})`);
    await ctx.close();
  }

  // ---- static: agents.json registry truth for the landed globy mint ----
  log(`\n#### STATIC REGISTRY (agents.json) ####`);
  const registry = JSON.parse(fs.readFileSync(path.join(DIR, "agents.json"), "utf8"));
  ok(registry.ensIdentity.globie && registry.ensIdentity.globie.agentId === 8,
    "registry: legacy globie ensIdentity block KEPT (agentId 8 — honest chain history, never revoked)");
  ok(/old-spelling globie name stays minted as the honest chain record/.test(registry._ensNote),
    "registry: _ensNote labels the globie block as the honest chain record of the old spelling");
  ok(registry.ensIdentity.globy && registry.ensIdentity.globy.agentId === 9 &&
     registry.ensIdentity.globy.owner === "0x7b629239481A8f5E2daf0b5F96345D2Df2525BD5" &&
     registry.ensIdentity.globy.namehash === "0x04caed2c5f3a3e753a03ca2052bd756d8c0a23e816e542a6bcdb177f6fa23b9a",
    "registry: globy ensIdentity = the real landed mint (agentId 9 · owner 0x7b62…5BD5 · namehash 0x04ca…3b9a)");
  ok(!((registry.featured.find((a) => a.id === "globy") || { detail: {} }).detail || {}).ensQueued,
    "registry: globy ensQueued marker retired (mint landed)");
  ok(/9 subnames minted/.test(registry.ensDeployment.status),
    "registry: ensDeployment.status counts all 9 minted subnames");

  // Offline mode
  log(`\n#### OFFLINE MODE (?mode=offline) ####`);
  const octx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const opage = await octx.newPage();
  const obag = [];
  await attachErrorSinks(opage, obag);
  await opage.goto(BASE + "/?mode=offline", { waitUntil: "networkidle" });
  const off6 = await opage.$$eval(".card[data-id]", (ns) => ns.map((n) => n.getAttribute("data-id")).filter((id) => AGENTS.includes(id)), AGENTS).catch(() => []);
  const offFeatured = await opage.$$eval(".card[data-id]", (ns) => ns.map((n) => n.getAttribute("data-id")));
  ok(offFeatured.filter((id) => AGENTS.includes(id)).length === 6, `offline: 6 featured agents render`);
  ok(await opage.$(".host-banner") !== null, `offline: host banner renders`);
  // 🚪 doors render from OFFLINE_REGISTRY too (byte-parity mirror)
  ok(await opage.$('.card[data-id="terri"] .chip.door') !== null, `offline: door chips render from OFFLINE_REGISTRY`);
  ok(await opage.$('.card[data-id="globy"] .chip.door.queued') !== null, `offline: globy queued door chip renders offline`);
  await walk(opage, "trace"); // full ceremony offline
  // Offline badge chrome present + case-insensitive ?mode (N1/N2)
  ok(await opage.$("#offlineBadge") !== null, `offline: OFFLINE·REHEARSAL badge chrome present (N1)`);
  if (obag.length) allErrs.push(...obag.map((e) => `[offline] ${e}`));
  ok(obag.length === 0, `offline: 0 console/page/request errors (got ${obag.length})`);
  await octx.close();

  // Case-insensitive ?mode=OFFLINE (N2)
  const ucCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ucPage = await ucCtx.newPage();
  await ucPage.goto(BASE + "/?mode=OFFLINE", { waitUntil: "networkidle" });
  ok(await ucPage.$("#offlineBadge") !== null, `?mode=OFFLINE (uppercase) is recognized as offline (N2)`);
  await ucCtx.close();

  // ---- F1 REGRESSION: revoke mid-utility-spinner → EXACTLY ONE debrief ----
  log(`\n#### F1: REVOKE DURING UTILITY SPINNER (no double-render) ####`);
  const fctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const fpage = await fctx.newPage();
  const fbag = [];
  await attachErrorSinks(fpage, fbag);
  await fpage.goto(BASE + "/", { waitUntil: "networkidle" });
  // Aqua (trace) + non-Aqua (terri), across the whole spinner window, Enter + button paths
  await walkRevokeMidSpinner(fpage, "trace", { delayMs: 0, useEnter: true });
  await walkRevokeMidSpinner(fpage, "trace", { delayMs: 400, useEnter: false });
  await walkRevokeMidSpinner(fpage, "trace", { delayMs: 850, useEnter: true });
  await walkRevokeMidSpinner(fpage, "terri", { delayMs: 0, useEnter: false });
  await walkRevokeMidSpinner(fpage, "terri", { delayMs: 400, useEnter: true });
  await walkRevokeMidSpinner(fpage, "terri", { delayMs: 850, useEnter: false });
  if (fbag.length) allErrs.push(...fbag.map((e) => `[F1] ${e}`));
  ok(fbag.length === 0, `F1: 0 console/page/request errors during mid-spinner revoke (got ${fbag.length})`);
  await fctx.close();

  await browser.close();
  if (server) server.close();

  log(`\n==================== SUMMARY ====================`);
  log(`PASS: ${pass}   FAIL: ${fail}`);
  if (allErrs.length) { log("ERRORS:"); allErrs.forEach((e) => log("  " + e)); }
  log(fail === 0 ? "\n✅ ALL GREEN — 0 console errors across desktop + mobile + offline." : "\n❌ FAILURES ABOVE.");
  fs.writeFileSync(path.join(DIR, ".last-test-output.txt"), lines.join("\n"));
  process.exitCode = fail === 0 ? 0 : 1;
}

run().catch((e) => { console.error(e); process.exitCode = 1; if (server) server.close(); });
