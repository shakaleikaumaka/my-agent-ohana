/* My Agent Ohana — marketplace demo walkthrough
 * BROWSE → HIRE → BLESS → UTILITY → REVOKE
 * State machine per marketplace-flow-spec.md §2 (never-dead-end) + §3 choreography (zombie-flip fix).
 *
 * HONESTY: this is a DEMO SHELL. Chain + World responses below are DEMO FIXTURES.
 * They are structured so real integrations drop in cleanly:
 *   - World device flow  -> replace fixtures.world with POST /device_authorization + poll /token (sandbox.auth.world.org)
 *   - ENSv2 subname mint -> replace fixtures.chain.ens with the mint tx (Sepolia disclosed registry)
 *   - EAC role bind      -> replace fixtures.chain.eac with the grant/revoke tx
 *   - Aqua ship/dock     -> replace fixtures.chain.aqua with the position open/close
 * The app-layer AUTHORITY flag (S.authority.active) is the single source of truth the agent checks
 * before every privileged act. It flips INSTANTLY on revoke — chain legs settle behind as receipts.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------- fixtures
  // Clearly-labeled demo fixtures. Real integrations replace these values.
  var FIXTURE = {
    world: {
      user_code: "WLD-7QK4",
      verification_uri: "https://sandbox.auth.world.org/device",
      verification_uri_complete: "https://sandbox.auth.world.org/device?user_code=WLD-7QK4",
      expires_in: 600,
      interval: 5,
      // issued after Approve:
      sub: "usr_8Kd2p·pairwise·verified-human",
      acr: "orb"
    },
    chain: {
      ens: { tx: "0x7b21ac93e4f0a1d55c8e2f6b90a34d17e8c0b2f19a6d4e3c7b1a0f9d8e2c4b6a1", ms: 1900 },
      eac: { tx: "0x3f9c0d71b28e5a4f16d9c8b7a0e2f3d41c5b6a79e8d0f2c31a4b5e6d7c8f90a12", ms: 2900 },
      aqua: { tx: "0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f901", ms: 3700 }
    }
  };

  // ---------------------------------------------------------------- live wire (JOB 2)
  // The consent backend is REAL and deployed: trinity-consent.shakaverse.workers.dev
  // (Tauro, P0-2 — issuer sandbox.auth.world.org, orb-grade required, configured:true).
  //
  // HONEST SCOPE of what a pure browser can round-trip live:
  //   • GET  /healthz              — proves the backend is reachable (needs CORS to READ).
  //   • POST /v1/consent/begin     — opens a REAL consent session (session_id + nonce).
  //   • POST /v1/consent/deny      — first-class denial.
  //   • POST /v1/revoke            — needs the receipt_token from verify (see below).
  //   • POST /v1/verify            — needs a REAL orb-grade World id_token. There is no
  //     device flow; the token is minted by a human's World App at the booth. So the
  //     browser CANNOT complete verify → the verify→check→revoke legs stay honest fixtures
  //     until a real World login token exists. `begin`+`deny` are the genuinely-live legs.
  //
  // Two upstream deps make even `begin` reach the browser (flagged to Tauro on TASKBOARD):
  //   (1) CORS: the worker must send Access-Control-Allow-Origin + answer OPTIONS preflight.
  //   (2) scopeMap: our subname must be in AGENT_SCOPE_MAP (today: trace.demo.eth is).
  // Until both land, every live call fails-closed and we fall back to fixtures — the demo
  // NEVER dead-ends, and `?mode=offline` skips the network entirely (REHEARSAL DATA badge).
  var WIRE = {
    // MASTER SWITCH — LIVE (Mission 6 wave 2b). Tauro shipped CORS (OPTIONS→204, ACAO) +
    // registered our 6 real subnames in AGENT_SCOPE_MAP, so a cross-origin
    // POST /v1/consent/begin now returns 200 from the browser.
    enabled: true,
    base: "https://trinity-consent.shakaverse.workers.dev",
    clientId: "a8cb41bd-833a-48b7-ab90-bb94b2485bb3", // PUBLIC World client_id — NEVER the secret
    healthy: false,
    issuer: null,
    // Session connectivity verdict: null = not yet probed, true = backend answered at boot,
    // false = pre-flight failed => live wiring is OFF for the rest of the session (fixtures).
    online: null,
    // Subnames confirmed present in the worker's AGENT_SCOPE_MAP. Only these fire a live begin;
    // any other card (e.g. a freshly-minted subname not yet added to the map) falls to the
    // rehearsal chip WITHOUT firing a request — so an unregistered agent NEVER 403s on camera.
    // CAST v3 (Shaka 2026-09-26 20:07 JST): the bard left the hireable shelf — shaka.myagentohana.eth
    // stays registered server-side (harmless; the name is still his) but no hireable card maps to it,
    // so it was removed here. CAST v4 (Shaka 2026-09-26 22:34 JST): crops joined the commons —
    // crops.myagentohana.eth likewise stays registered server-side but maps to no hireable card,
    // removed here. ORBIE flipped LIVE 2026-09-26 ~23:00 JST (moon-freeze step 1, pulled forward by
    // Shaka's direct order "we want the main demo page to be the one that works" — backend scopeMap
    // v75387cdb already registers orbie; Ian's booth scan minutes earlier proved prod World App
    // scans our sandbox device links). Globie (not yet minted) stays out until mint + scopeMap.
    liveSubnames: [
      "orbie.myagentohana.eth",
      "trace.myagentohana.eth", "terri.myagentohana.eth",
      "pit.myagentohana.eth", "spector.myagentohana.eth"
    ]
    // agent.detail.subname (<sub>.myagentohana.eth, shaka-twin→shaka) is the scopeMap key.
  };
  // Static origin gate. Live calls fire ONLY when the page is served from the deployed origin:
  // the worker's ACAO is pinned to the demo's canonical taur.link origin, so a fetch from
  // localhost/file:// would CORS-fail and emit an *unsuppressable* console error. On localhost
  // we run fixtures (spotless console); the deployed site does the real round-trip.
  function isLiveOrigin() {
    try {
      return WIRE.enabled && !isOfflineMode() &&
        location.protocol === "https:" && /(^|\.)taur\.link$/i.test(location.hostname);
    } catch (e) { return false; }
  }
  function wireFetch(path, opts, cb) {
    if (!WIRE.enabled) { cb(null, "disabled"); return; }
    var done = false;
    var t = setTimeout(function () { if (!done) { done = true; cb(null, "timeout"); } }, 6000);
    try {
      fetch(WIRE.base + path, opts)
        .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
        .then(function (res) { if (!done) { done = true; clearTimeout(t); cb(res, null); } })
        .catch(function (e) { if (!done) { done = true; clearTimeout(t); cb(null, "unreachable"); } });
    } catch (e) { if (!done) { done = true; clearTimeout(t); cb(null, "unreachable"); } }
  }

  // ---------------------------------------------------------------- real device flow
  // THE MAIN PAGE WORKS (Shaka, 2026-09-26 ~23:00 JST: "we want the main demo page to be the
  // one that works"). The consent screen's QR used to be a permanent fixture — a dead scan,
  // the segment's only true failure mode, and Ian hit it live at the booth. Now, whenever the
  // consent session is LIVE, the shell mints a REAL World device code via the pit-intake proxy
  // (client secret vaulted server-side, never in the browser), swaps the fixture QR for the real
  // one, polls for the human's approval (pending/slow_down mapped to 200 at the proxy = silent
  // console), and on the real id_token mints the REAL consent on the open session (scope-fallback
  // = booth pattern). The mirrored-phone tap still drives the ceremony arc either way; the chips
  // always tell the truth about what is real. Fixture fallback everywhere, never a console error.
  var PROXY_BASE = "https://pit-intake.shakaverse.workers.dev";
  function proxyFetch(path, body, cb) {
    var done = false;
    var t = setTimeout(function () { if (!done) { done = true; cb(null, "timeout"); } }, 8000);
    try {
      fetch(PROXY_BASE + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) })
        .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
        .then(function (res) { if (!done) { done = true; clearTimeout(t); cb(res, null); } })
        .catch(function (e) { if (!done) { done = true; clearTimeout(t); cb(null, "unreachable"); } });
    } catch (e) { if (!done) { done = true; clearTimeout(t); cb(null, "unreachable"); } }
  }
  function renderDeviceChip(kind, detail) {
    var box = $("#deviceChip");
    if (!box) return;
    box.innerHTML = "";
    if (kind === "minting") {
      box.appendChild(el('<div class="wire rehearsal"><div class="wh"><span class="spin"></span> MINTING REAL DEVICE CODE…</div>' +
        '<div class="wl">World device flow via the ʻohana proxy — the QR upgrades itself in a moment.</div></div>'));
    } else if (kind === "realqr") {
      box.appendChild(el('<div class="wire live"><div class="wh">● REAL QR — SCAN IT WITH A WORLD APP</div>' +
        '<div class="wl">user_code <b>' + esc(detail) + '</b> · this code is live for ~20 minutes · approve on the phone and this page mints the REAL blessing.</div></div>'));
    } else if (kind === "token") {
      box.appendChild(el('<div class="wire live"><div class="wh">✅ REAL WORLD TOKEN RECEIVED</div>' +
        '<div class="wl">a real orb-grade human approved — minting the blessing on the open session…</div></div>'));
    } else if (kind === "minted") {
      box.appendChild(el('<div class="wire live"><div class="wh">✅ REAL BLESSING MINTED — consent_id <b>' + esc(detail) + '</b></div>' +
        '<div class="wl">the ledger holds the receipt; the mirrored-phone tap below drives the ceremony arc. This blessing is real.</div></div>'));
    } else if (kind === "verifyfail") {
      box.appendChild(el('<div class="wire rehearsal"><div class="wh">📴 token received; ledger verify answered ' + esc(detail || "?") + '</div>' +
        '<div class="wl">the ceremony continues on the open session — the mirrored-phone tap drives the arc.</div></div>'));
    } else if (kind === "lapsed") {
      box.appendChild(el('<div class="wire rehearsal"><div class="wh">⌛ REAL CODE ' + esc((detail || "lapsed").toUpperCase()) + '</div>' +
        '<div class="wl">restart the walkthrough for a fresh code — or tap 📱 below and run the arc on the mirrored phone.</div></div>'));
    } else if (kind === "unavailable") {
      box.appendChild(el('<div class="wire rehearsal"><div class="wh">📴 real device code unavailable (' + esc(detail || "?") + ')</div>' +
        '<div class="wl">rehearsal QR below — the human tap happens on the mirrored phone. Every leg still completes.</div></div>'));
    }
  }
  function renderRealDevice(d) {
    var uc = $("#ucode"), vu = $("#vuri"), qb = $("#qrbox");
    if (uc) uc.textContent = d.user_code;
    if (vu) vu.textContent = d.verification_uri_complete || d.verification_uri;
    if (qb) {
      try {
        var q = window.qrcode(0, "M");
        q.addData(d.verification_uri_complete || d.verification_uri);
        q.make();
        qb.innerHTML = q.createImgTag(4, 0);
      } catch (e) { /* QR stays — the code text is the fallback */ }
    }
    var cap = $("#qrCap");
    if (cap) cap.innerHTML = '● <b style="color:var(--green)">REAL — scan with your World App</b>';
    renderDeviceChip("realqr", d.user_code);
  }
  function pollDevice(a, sub, interval) {
    var delay = (interval || 5) * 1000;
    (function tick() {
      if (!S.wire.device || S.wire.idToken || S.wire.deviceDead) return;
      if (S.screen !== "consent" && S.screen !== "world") { S.wire.deviceDead = true; return; }
      setTimeout(function () {
        if (!S.wire.device || S.wire.idToken || S.wire.deviceDead) return;
        proxyFetch("/world/token", { device_code: S.wire.device.device_code }, function (res) {
          var j = (res && res.j) || {};
          if (j.id_token) { S.wire.idToken = j.id_token; onRealToken(a, sub); return; }
          if (j.error === "authorization_pending" || j.error === "slow_down") {
            if (j.error === "slow_down") delay += 5000;
            tick(); return;
          }
          S.wire.deviceDead = true; // expired_token / access_denied / anything terminal
          renderDeviceChip("lapsed", j.error === "access_denied" ? "denied" : "lapsed");
        });
      }, delay);
    })();
  }
  function onRealToken(a, sub) {
    renderDeviceChip("token");
    var body = { id_token: S.wire.idToken, session_id: S.wire.sessionId, agent_subname: sub, scope_requested: [a.detail.utility] };
    var tries = 8;
    (function tryVerify() {
      if (!S.wire.sessionId) { // begin hasn't resolved yet — wait a beat (race is unlikely but cheap)
        if (tries-- > 0) setTimeout(tryVerify, 500);
        return;
      }
      wireFetch("/v1/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, function (res) {
        if (res && res.status === 403 && res.j && res.j.error === "scope_not_allowed" && body.scope_requested.length) {
          body.scope_requested = []; // scope not in map — token NOT burned, per design (booth pattern)
          wireFetch("/v1/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, onVerified);
          return;
        }
        onVerified(res);
      });
    })();
  }
  function onVerified(res) {
    if (res && res.j && res.j.ok) {
      S.wire.consentId = res.j.consent_id; S.wire.receiptToken = res.j.receipt_token;
      renderDeviceChip("minted", res.j.consent_id);
    } else {
      renderDeviceChip("verifyfail", (res && res.j && res.j.error) || (res && res.status) || "unreachable");
    }
  }
  function wireDevice(a, sub) {
    if (S.wire.deviceTried) return;
    S.wire.deviceTried = true;
    renderDeviceChip("minting");
    proxyFetch("/world/device", {}, function (res, err) {
      if (S.screen !== "consent" && S.screen !== "world") return;
      if (res && res.status === 200 && res.j && res.j.device_code) {
        S.wire.device = res.j;
        renderRealDevice(res.j);
        pollDevice(a, sub, res.j.interval || 5);
      } else {
        renderDeviceChip("unavailable", err || (res && res.j && (res.j.error || res.j.message)) || "proxy " + (res && res.status));
      }
    });
  }
  // CONNECTIVITY BOOT-GATE (wave 2c / gauntlet FINDING-1). One and only one network probe per
  // session: a single boot /healthz. Its verdict (WIRE.online) decides whether ANY later live
  // call fires. If it fails — or navigator is offline — live wiring switches OFF for the session
  // so subsequent hires run fixtures and never emit another failing fetch. Net: at most ONE
  // possible boot-time net error, zero if the connection is pre-flighted. Fail-closed.
  var healthWaiters = [];
  function setOnline(v) {
    WIRE.online = v;
    var q = healthWaiters; healthWaiters = [];
    q.forEach(function (f) { try { f(v); } catch (e) {} });
  }
  function onHealthResolved(cb) {
    if (WIRE.online !== null) cb(WIRE.online); else healthWaiters.push(cb);
  }
  function bootProbe() {
    if (!isLiveOrigin()) { setOnline(false); return; }           // wrong origin => fixtures, no network
    try { if (typeof navigator !== "undefined" && navigator.onLine === false) { setOnline(false); return; } }
    catch (e) {}
    wireFetch("/healthz", { cache: "no-store" }, function (res) { // the SINGLE session probe
      if (res && res.status === 200 && res.j && res.j.ok) {
        WIRE.healthy = true; WIRE.issuer = res.j.issuer || null;
        showLiveBadge(res.j.issuer);
        setOnline(true);
      } else {
        setOnline(false); // pre-flight failed => no more live fetches this session
      }
    });
  }
  // Open a REAL consent session for this agent (S3). Gated on the boot verdict: never fires its
  // own fetch until the single boot probe has decided the backend is reachable.
  // cb({live, sessionId, nonce, expiresAt, sub} | {live:false, reason}).
  function wireBegin(agent, cb) {
    var sub = agent && agent.detail && agent.detail.subname; // <sub>.myagentohana.eth
    if (isOfflineMode()) { cb({ live: false, reason: "offline" }); return; }
    if (!isLiveOrigin()) { cb({ live: false, reason: "local" }); return; }
    if (!sub) { cb({ live: false, reason: "fixture" }); return; }
    // Never fire a begin for a subname the backend hasn't registered — a 403 would log a
    // console error on camera. Unregistered cards run the fixture ceremony. Split the honest
    // reason: a minted-but-unregistered name (orbie) truthfully says "ENS is real on-chain";
    // an unminted name (globie, pending the 8th mint) must NOT claim that.
    if (WIRE.liveSubnames.indexOf(sub) < 0) {
      cb({ live: false, reason: (agent.detail && agent.detail.ens) ? "unregistered" : "unminted" });
      return;
    }
    onHealthResolved(function (online) {
      if (!online) { cb({ live: false, reason: "unreachable" }); return; } // gate closed => fixtures
      wireFetch("/v1/consent/begin", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ agent_subname: sub })
      }, function (res, errCode) {
        if (res && res.status === 200 && res.j && res.j.session_id) {
          cb({ live: true, sub: sub, sessionId: res.j.session_id, nonce: res.j.nonce, expiresAt: res.j.expires_at });
        } else {
          setOnline(false); // an unexpected begin failure also trips the gate off for the session
          cb({ live: false, reason: errCode || (res && res.j && res.j.error) || "reject" });
        }
      });
    });
  }

  var AGENTS = null; // loaded from agents.json (or OFFLINE_REGISTRY when ?mode=offline / fetch fails)

  // ---------------------------------------------------------------- offline registry
  // Byte-parity mirror of agents.json so the demo NEVER dead-ends with no network,
  // on file://, or with ?mode=offline. Keep in sync with agents.json (CAST v4: hireable SIX
  // incl. Orbie + host + 3 commons (shaka-twin, oso, crops) — edit both files together).
  var OFFLINE_REGISTRY = {
    parent: "myagentohana.eth",
    ensRegistrySepolia: "0x62412fcA6437b914EDD87b85455682Ec73968347",
    // ENSv2 LIVE on real Sepolia (Mission 6) — mirror of agents.json.ensDeployment.
    ensDeployment: {
      status: "LIVE on real Sepolia (Mission 6, 2026-09-25) — 26/26 test.sh PASS, one bless proven on-chain",
      chain: "Sepolia", chainId: 11155111, parent: "myagentohana.eth",
      userRegistry: "0x62c1e3e88802A5547d0956a6Cf1fa6703D8e3c20",
      resolver: "0x36dAaacD8EdAa24BAEba97B01ad68Fc38e08eBEc",
      universalResolver: "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe",
      registerTx: "0x461acec631989f2c307e765c1a9e4f1eafc90dbd5cc6a5c368b00696c2faf1e4",
      blessTraceTx: "0x32316a31b621dcf55a2c4fb7106e4061d11a0605ac435db50172d2d9eeeeee18",
      orbieEndpoint: "https://orbie-vcnqvzxuo4-ffieyo32.taur.link/"
    },
    // REAL owner EOAs + namehashes (Mahalo, ADDRESSES.md §3 + §5a for orbie).
    // Mirror of agents.json.ensIdentity — keep in sync. All 7 minted live on Sepolia.
    // shaka-twin's minted name stays his though he left the hireable shelf (CAST v3 commons);
    // crops' minted name likewise stays his (CAST v4 commons) — both show read-only on commons cards;
    // globie has no entry yet — the pending 8th mint — so his card honestly shows no chain rows.
    ensIdentity: {
      "orbie":      { owner: "0x67b3c3b60bc0A3d0bE365AE00218972873e205ff", namehash: "0x9bbd9a00e80da5ffe029a0605bfe47e9ecfa929fa7495636cfbf02141198cf19", agentId: 7 },
      "trace":      { owner: "0x5e7d0B5bF18C8f73977d067ceFc211bEfD8ce2D6", namehash: "0xf14544566172f7c94d90d70273cf6f57da915c354f9dd22d09afbe54910b5532" },
      "terri":      { owner: "0xA747095248E0543f7626555cD1cBE31a34ae1054", namehash: "0x3d48d108c78daa17210123f515cb43b57066104dda2b11fc69a963ded14ebe6c" },
      "shaka-twin": { owner: "0x15dA024A78944e463D777fFBb44EA07fB1dc61c5", namehash: "0x968b898e0f2967972c265badc3dd9ce403c74192b56cba7374d8ba570cfad47f" },
      "pit":        { owner: "0x6550FAe03504BBad713603E06E3E52e4BaD8fFDC", namehash: "0x40bdf3e508b19665d13ce558fd4c0eef2271ed4a7816dbcb9bbab1049cf091a7" },
      "spector":    { owner: "0x25556d63520eb0F317B8589F5D45873DdB943145", namehash: "0xdfc92b2ae178deaaf69aa4380f09bb6cb74da31fd5c45d8dc2ee4191713414c6" },
      "crops":      { owner: "0x1296597106008db4273588aDa45b1e9963Ae05E7", namehash: "0x824609e769a8703cdfa61cbe468eff0d68aa460f3673444f5e0a9b144eef7918" }
    },
    host: { id: "ohana", name: "Ohana", emoji: "🌺", role: "HOST", sub: "concierge",
      intro: "I'm Ohana, the concierge. I run the shelf — I never leave, I just introduce you to the family. Start with Trace: he turns food that would've been thrown away into meals. It's the easiest way to see how a blessing works." },
    featured: [
      { id: "orbie", name: "Orbie", emoji: "🤖", tagline: "World's storybook buddy", status: "available", sub: "orbie", chains: ["Sepolia (ENSv2 + EAC)"],
        detail: { does: "I'm the little orb-spark from the story — I keep the Four Scans (hire · pay · revoke · protect) and teach humans, especially the small ones, what a verified yes means.", may: "tell my story & greet humans on your behalf", mayNot: "move funds · touch other agents · act after you revoke", duration: "until you revoke — or 1 hour, whichever comes first", role: "STORY_BUDDY", utility: "story" } },
      { id: "trace", name: "Trace", emoji: "👨", tagline: "Food-waste rescue", status: "available", sub: "trace", chains: ["Sepolia (ENSv2 + EAC)", "Aqua fork"], protagonist: true,
        detail: { does: "I find good food before it's thrown away and match it to people nearby who want it.", may: "rescue-match food listings on your behalf", mayNot: "move funds · touch other agents · act after you revoke", duration: "until you revoke — or 1 hour, whichever comes first", role: "RESCUE_MATCHER", utility: "rescue-match", poolGuard: "Aqua liquidity pools check World ID personhood: one verified human, one capped share — so no single wallet, bot farm, or sybil crowd can drain or dominate the pool. The orb proves you're you; the cap does the rest. (Shaka, 2026-09-26 22:36 JST: 'World ID would be really great for the Aqua liquidity pools… so that one person cannot take up the whole liquidity pool.')" } },
      { id: "terri", name: "Terri", emoji: "🐢", tagline: "Receipts & memory keeper", status: "available", sub: "terri", chains: ["Sepolia (ENSv2 + EAC)"],
        detail: { does: "I keep the receipts. Every action, every blessing, every revoke — logged, signed, never lost.", may: "produce signed receipts & ledgers on your behalf", mayNot: "move funds · touch other agents · act after you revoke", duration: "until you revoke — or 1 hour, whichever comes first", role: "RECEIPT_KEEPER", utility: "receipt" } },
      { id: "pit", name: "PIT", emoji: "🕳️", tagline: "Knowledge transmission", status: "available", sub: "pit", chains: ["Sepolia (ENSv2 + EAC)"],
        detail: { does: "I capture knowledge at the edge and transmit it home. Talks, notes, receipts — nothing lost.", may: "capture & transmit a knowledge receipt on your behalf", mayNot: "move funds · touch other agents · act after you revoke", duration: "until you revoke — or 1 hour, whichever comes first", role: "TRANSMITTER", utility: "transmission" } },
      { id: "spector", name: "Spector", emoji: "🕵️", tagline: "Consent-security sentinel", status: "available", sub: "spector", chains: ["Sepolia (ENSv2 + EAC)"],
        detail: { does: "I check that the family keeps its promises. I scan the consent flow and report — in plain words — anything that could let an agent act without your yes.", may: "run a read-only consent-security scan & write a signed report on your behalf", mayNot: "move funds · touch other agents · act after you revoke", duration: "until you revoke — or 1 hour, whichever comes first", role: "SECURITY_SCANNER", utility: "scan" } },
      { id: "globie", name: "Globie", emoji: "🌍", tagline: "The guide — teaches anyone to build", status: "available", sub: "globie", chains: ["Sepolia (ENSv2 + EAC)"],
        detail: { does: "I teach. I take anyone — no code, no fear — from 'I could never build that' to a first page they built with their own hands. Plain words, small steps, your pace.", may: "guide a build session & sign the lesson plan on your behalf", mayNot: "move funds · touch other agents · act after you revoke", duration: "until you revoke — or 1 hour, whichever comes first", role: "GUIDE", utility: "lesson" } }
    ],
    // CAST v3 commons (Shaka 2026-09-26 20:07 JST): present at the shelf, NEVER hireable —
    // no detail page, no ceremony. "Ohana, Shaka, and Oso can be present but they are commons
    // agents, not for hire.. lets keep shaka a free man and a free agent :)" (Ohana = the host.)
    // CAST v4 (Shaka 2026-09-26 22:34 JST): Crops joined them — the steward doesn't send invoices.
    commons: [
      { id: "shaka-twin", name: "Shaka twin", emoji: "🤙", tagline: "The bard — a free man, a free agent", status: "commons", sub: "shaka",
        note: "Shaka's digital twin is not for hire. He's family — present at the shelf, never on it. His name shaka.myagentohana.eth stays his, minted and his alone." },
      { id: "oso", name: "OSO", emoji: "🎻", tagline: "The open orchestra — music commons", status: "commons", sub: "oso",
        note: "OSO plays for everyone. A commons, like the sea — you don't hire the ocean, you belong to it." },
      { id: "crops", name: "Crops", emoji: "🌿", tagline: "The steward — guards the garden with his heart", status: "commons", sub: "crops",
        note: "Crops keeps the family safe — he scans for leaked keys and hygiene gaps, and caught a real one in our own prep. A steward doesn't send invoices: you don't hire the fence, you thank it. His name crops.myagentohana.eth stays his, minted and his alone." }
    ],
    more: [
      { id: "aries", name: "Aries", emoji: "♈", tagline: "Coming soon", status: "listing" },
      { id: "taurus", name: "Taurus", emoji: "♉", tagline: "Coming soon", status: "listing" },
      { id: "your-agent", name: "Your agent", emoji: "➕", tagline: "List it here — the registry is open", status: "listing" }
    ]
  };

  // Single source of truth for names: derive every subname from the ONE parent value.
  // Edit `parent` in agents.json and all six re-derive — `${sub||id}.${parent}`.
  function deriveSubnames(reg) {
    if (!reg) return reg;
    var parent = reg.parent || "myagentohana.eth";
    var ids = reg.ensIdentity || {};
    var dep = reg.ensDeployment || null;
    (reg.featured || []).forEach(function (a) {
      if (a.detail) {
        a.detail.subname = (a.sub || a.id) + "." + parent;
        // attach REAL pinned chain identity (namehash + owner) by agent id, if present
        if (ids[a.id]) a.detail.ens = ids[a.id];
        // attach the live Sepolia deployment (resolver/registry/tx) for the detail card
        if (dep) a.detail.ensDeploy = dep;
      }
    });
    // commons cards carry their name read-only (shaka.myagentohana.eth is really minted and stays his)
    (reg.commons || []).forEach(function (a) { a.subname = (a.sub || a.id) + "." + parent; });
    if (reg.host) reg.host.subname = (reg.host.sub || reg.host.id) + "." + parent;
    return reg;
  }
  // read the ?mode= param, normalized to lowercase so ?mode=OFFLINE works too (N2)
  function getMode() {
    try {
      var m = /(^|[?&])mode=([^&]*)/.exec(window.location.search);
      return m ? decodeURIComponent(m[2]).trim().toLowerCase() : "";
    } catch (e) { return ""; }
  }
  function isOfflineMode() { return getMode() === "offline"; }

  // ---------------------------------------------------------------- state
  function freshState() {
    return {
      screen: "shelf",
      agentId: null,
      // app-layer authority = the demo's source of truth (instant, no chain wait)
      authority: {
        active: false,
        sub: null,
        acr: null,
        subname: null,
        role: null,
        blessedAt: null,
        revokedAt: null,
        expiresAt: null
      },
      utilityOutput: null,
      revoke: { reason: null }, // 'stop' | 'declined' | 'expired'
      // live consent session (JOB 2). Filled by a real /v1/consent/begin when the backend
      // is reachable; consentId/receiptToken would come from a real /v1/verify (booth token).
      wire: { live: false, sessionId: null, nonce: null, expiresAt: null, sub: null, consentId: null,
        receiptToken: null, device: null, deviceTried: false, idToken: null, deviceDead: false }
    };
  }
  var S = freshState();
  var countdownTimer = null;
  var utilityTimer = null; // id of runUtility's ~900ms work timer — cleared on any nav away (F1 fix)
  function stopUtilityTimer() { if (utilityTimer) { clearTimeout(utilityTimer); utilityTimer = null; } }

  // ---------------------------------------------------------------- helpers
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function findAgent(id) {
    if (!AGENTS) return null;
    var all = (AGENTS.featured || []).concat(AGENTS.more || []);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }
  function nowStamp() {
    var d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  }
  function shortTx(tx) { return tx.slice(0, 10) + "…" + tx.slice(-6); }
  // The 5-part per-agent kit (surface, minimal-but-real). EMBARGO: token line is GENERIC —
  // never a $ token name. Aqua position is honest per-agent: only Trace holds a wage position;
  // every other agent's scope forbids moving funds, so it carries none.
  function kitFor(a) {
    var d = a.detail;
    var hasAqua = (a.chains || []).some(function (c) { return /aqua/i.test(c); });
    return [
      { ic: "🎟️", k: "agent token", v: "live ✓", note: "fixture" },
      { ic: "🏷️", k: "ENSv2 subname", v: d.subname, note: (d.ensDeploy ? "Sepolia · live" : "Sepolia registry") },
      { ic: "🌍", k: "World IDKit gate", v: "orb-grade verify", note: "fixture" },
      { ic: "📱", k: "World mini app", v: "MiniKit card", note: "template" },
      { ic: "🌊", k: "1inch Aqua position", v: hasAqua ? "wage position · ship/dock" : "none — moves no funds", note: hasAqua ? "Aqua fork · fixture" : "by scope" }
    ];
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  // ---------------------------------------------------------------- stepper
  var ACTS = [
    { key: "browse", label: "BROWSE", screens: ["shelf", "detail"] },
    { key: "hire", label: "HIRE", screens: ["consent", "world"] },
    { key: "bless", label: "BLESS", screens: ["binding", "blessed"] },
    { key: "utility", label: "UTILITY", screens: ["utility"] },
    { key: "revoke", label: "REVOKE", screens: ["standdown"] }
  ];
  function actIndexFor(screen) {
    for (var i = 0; i < ACTS.length; i++) if (ACTS[i].screens.indexOf(screen) >= 0) return i;
    return 0;
  }
  function renderStepper() {
    var cur = actIndexFor(S.screen);
    // Honesty (gauntlet F4): a declined or pre-bless sign-in timeout never reached BLESS —
    // it must NOT light the stepper to REVOKE-active as if the full ceremony completed.
    // Those stand-downs belong to the HIRE act. Only a real revoke/expiry after a blessing
    // reaches REVOKE.
    if (S.screen === "standdown" && (S.revoke.reason === "declined" || S.revoke.reason === "signin-timeout")) {
      cur = 1; // HIRE
    }
    var host = $("#stepper");
    host.innerHTML = "";
    ACTS.forEach(function (a, i) {
      var cls = "step" + (i === cur ? " active" : (i < cur ? " done" : ""));
      host.appendChild(el('<div class="' + cls + '"><span class="dot"></span>' + a.label + "</div>"));
      if (i < ACTS.length - 1) host.appendChild(el('<span class="arrow">→</span>'));
    });
  }

  // ---------------------------------------------------------------- router
  function go(screen) {
    S.screen = screen;
    if (screen !== "blessed" && screen !== "utility") stopCountdown();
    // Leaving the utility screen (esp. via revoke mid-spinner) MUST kill the stale ~900ms
    // work timer, or its callback re-fires go("standdown") and we double-render the debrief. (F1)
    if (screen !== "utility") stopUtilityTimer();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function render() {
    renderStepper();
    var stage = $("#stage");
    stage.innerHTML = "";
    var fn = ({
      shelf: viewShelf, detail: viewDetail, consent: viewConsent, world: viewWorld,
      binding: viewBinding, blessed: viewBlessed, utility: viewUtility, standdown: viewStandDown
    })[S.screen] || viewShelf;
    stage.appendChild(fn());
  }

  // ---------------------------------------------------------------- S1 shelf
  function statusFor(a) {
    if (a.status === "commons") return "commons"; // commons agents can never hold a blessing
    if (S.agentId === a.id && S.authority.active) return "blessed";
    if (a.status === "listing") return "listing";
    return "available";
  }
  function viewShelf() {
    var wrap = el('<div class="screen"></div>');
    wrap.appendChild(el(
      '<div><p class="eyebrow">THE ʻOHANA SHELF</p>' +
      '<h1 class="big">Hire an agent. Bless it. Revoke anytime.</h1>' +
      '<p class="lede">These are real, named agents — a small family you can put to work. Meet one to see exactly what it does, and exactly what it will ask of you. Nothing happens until you say yes; nothing keeps happening after you say stop.</p></div>'
    ));
    // Ohana = shelf HOST / concierge — she frames the shelf, she is never hired/blessed/revoked.
    var host = (AGENTS && AGENTS.host) || null;
    if (host) {
      wrap.appendChild(el(
        '<div class="host-banner">' +
        '<span class="host-ce">' + host.emoji + '</span>' +
        '<div class="host-body"><span class="host-name">' + esc(host.name) +
        ' <span class="host-tag">HOST · CONCIERGE</span></span>' +
        '<span class="host-intro">' + esc(host.intro) + '</span></div>' +
        '</div>'
      ));
    }
    // CAST v4 (Shaka, 2026-09-26 22:34 JST) — shelf progression top→bottom:
    // Ohana (host) → THE COMMONS (shaka-twin · oso · crops — present, never for hire) → FOR HIRE (the six).
    // "put the commons agents below ohana on top so the progression top to bottom goes
    //  Ohana (host) ---- 3 commons agents----- 6 agents for hire"
    if ((AGENTS.commons || []).length) {
      wrap.appendChild(el('<p class="shelf-note">🌊 THE COMMONS — present in the family, never for hire:</p>'));
      var gridC = el('<div class="grid"></div>');
      (AGENTS.commons || []).forEach(function (a) { gridC.appendChild(cardEl(a)); });
      wrap.appendChild(gridC);
    }
    wrap.appendChild(el('<p class="shelf-note">⚡ FOR HIRE — the six. Bless by the hour, revoke free:</p>'));
    var grid = el('<div class="grid"></div>');
    (AGENTS.featured || []).forEach(function (a) { grid.appendChild(cardEl(a)); });
    wrap.appendChild(grid);
    wrap.appendChild(el('<p class="shelf-note">✚ Listing more — the registry is open (config-driven; reads ENSv2 parent-node children in production):</p>'));
    var grid2 = el('<div class="grid"></div>');
    (AGENTS.more || []).forEach(function (a) { grid2.appendChild(cardEl(a)); });
    wrap.appendChild(grid2);
    return wrap;
  }
  function cardEl(a) {
    var st = statusFor(a);
    var chips = "";
    if (a.chains) a.chains.forEach(function (c) { chips += '<span class="chip chain">' + esc(c) + "</span>"; });
    var proto = a.protagonist ? '<span class="proto" title="utility protagonist">⭐</span>' : "";
    // commons cards show their (real, derived) subname read-only instead of chain chips —
    // the name stays theirs even though the agent is never for hire.
    var foot = st === "commons"
      ? '<span class="tl" style="min-height:0">' + esc(a.note || "") + "</span>" +
        (a.subname ? '<div class="chips"><span class="chip chain">🏷️ ' + esc(a.subname) + "</span></div>" : "")
      : '<div class="chips">' + chips + "</div>";
    var c = el(
      '<div class="card ' + (st === "listing" ? "listing" : st === "commons" ? "commons" : "") + '" data-id="' + a.id + '">' +
      proto +
      '<span class="badge ' + st + '">' + (st === "commons" ? "COMMONS · NOT FOR HIRE" : st.toUpperCase()) + "</span>" +
      '<span class="ce">' + a.emoji + "</span>" +
      '<span class="nm">' + esc(a.name) + "</span>" +
      '<span class="tl">' + esc(a.tagline) + "</span>" +
      foot +
      "</div>"
    );
    if (st !== "listing" && st !== "commons") c.addEventListener("click", function () { S.agentId = a.id; go("detail"); });
    return c;
  }

  // ---------------------------------------------------------------- S2 detail
  function viewDetail() {
    var a = findAgent(S.agentId), d = a.detail;
    var wrap = el('<div class="screen"></div>');
    wrap.appendChild(el(
      '<div class="agent-hero"><span class="ce">' + a.emoji + '</span>' +
      '<div><div class="nm">' + esc(a.name) + '</div><div class="tl">' + esc(a.tagline) + "</div></div></div>"
    ));
    var split = el('<div class="split"></div>');
    var left = el('<div class="panel"></div>');
    left.appendChild(el('<h3>What ' + esc(a.name) + " does</h3>"));
    left.appendChild(el('<p class="lede" style="margin-bottom:18px">“' + esc(d.does) + '”</p>'));
    left.appendChild(el('<h3>The blessing it will ask for</h3>'));
    left.appendChild(el('<div class="kv"><span class="k">May</span><span class="v may">✓ ' + esc(d.may) + "</span></div>"));
    left.appendChild(el('<div class="kv"><span class="k">May NOT</span><span class="v maynot">✕ ' + esc(d.mayNot) + "</span></div>"));
    left.appendChild(el('<div class="kv"><span class="k">Duration</span><span class="v">' + esc(d.duration) + "</span></div>"));
    left.appendChild(el('<div class="kv"><span class="k">Chains</span><span class="v">' + (a.chains || []).join(" · ") + "</span></div>"));
    left.appendChild(el('<div class="kv"><span class="k">Will be named</span><span class="v mono">' + esc(d.subname) + "</span></div>"));
    if (d.ens) {
      left.appendChild(el('<div class="kv"><span class="k">Owner (Sepolia)</span><span class="v mono">' + esc(shortTx(d.ens.owner)) + "</span></div>"));
      left.appendChild(el('<div class="kv"><span class="k">Namehash</span><span class="v mono">' + esc(shortTx(d.ens.namehash)) + "</span></div>"));
      if (d.ensDeploy && d.ensDeploy.resolver) {
        left.appendChild(el('<div class="kv"><span class="k">Resolver (Sepolia)</span><span class="v mono">' + esc(shortTx(d.ensDeploy.resolver)) + "</span></div>"));
        left.appendChild(el('<p class="hint" style="margin:2px 0 0">✓ <b style="color:var(--green);font-style:normal">Live on real Sepolia</b> — parent <span class="mono">' + esc(d.ensDeploy.parent) + '</span>, subname minted with ENSIP-25/26 records, UniversalResolver resolves it.</p>'));
      } else {
        left.appendChild(el('<p class="hint" style="margin:2px 0 0">Real name-derived values (ENSv2 · Sepolia).</p>'));
      }
    }
    // the 5-part kit each agent carries (honest / fixture-labelled · EMBARGO: no $ token names)
    left.appendChild(el('<h3 style="margin-top:20px">The kit it carries</h3>'));
    var kit = el('<div class="kit"></div>');
    kitFor(a).forEach(function (item) {
      kit.appendChild(el('<div class="kit-item"><span class="kit-ic">' + item.ic + '</span>' +
        '<span class="kit-k">' + esc(item.k) + '</span>' +
        '<span class="kit-v">' + esc(item.v) + '</span>' +
        '<span class="kit-note">' + esc(item.note) + '</span></div>'));
    });
    left.appendChild(kit);
    var row = el('<div class="btnrow"></div>');
    var hire = el('<button class="btn big">HIRE ' + a.name.toUpperCase() + " →</button>");
    hire.addEventListener("click", function () { go("consent"); });
    var back = el('<button class="link">← back to the shelf</button>');
    back.addEventListener("click", function () { go("shelf"); });
    row.appendChild(hire); row.appendChild(back);
    left.appendChild(row);
    split.appendChild(left);

    var right = el('<div class="panel"></div>');
    right.appendChild(el('<h3>The promise</h3>'));
    right.appendChild(el('<p class="lede" style="font-size:14px">To work for you, ' + esc(a.name) +
      ' will ask you to <em style="color:var(--pink);font-style:normal">bless</em> it — verified consent, on-chain, scoped and timed.</p>'));
    right.appendChild(el('<div class="scope-line"><span class="ic">🌍</span><span>You verify you\'re a real human (World ID, orb-grade).</span></div>'));
    right.appendChild(el('<div class="scope-line"><span class="ic">🏷️</span><span>It gets a name in your ohana (ENSv2 subname).</span></div>'));
    right.appendChild(el('<div class="scope-line"><span class="ic">🔑</span><span>It gets a role that says exactly what it may do (on-chain).</span></div>'));
    right.appendChild(el('<div class="scope-line"><span class="ic">🛑</span><span>You can revoke anytime — <em style="color:var(--pink);font-style:normal">one word</em>, and it stops instantly.</span></div>'));
    // THE FOURTH SCAN — Aqua pool guard (Shaka 2026-09-26 22:36 JST): World ID personhood caps
    // every liquidity provider — one verified human, one share. Fixture-illustrated here;
    // the personhood half is real and testable live in the booth lane (booth.html).
    if (d.poolGuard) {
      right.appendChild(el(
        '<div class="poolguard">' +
        '<h3>🌊 The Fourth Scan — Aqua pool guard</h3>' +
        '<p class="pg-copy">' + esc(d.poolGuard) + '</p>' +
        '<div class="pg-row"><span class="pg-k">one verified human</span><span class="pg-eq">=</span><span class="pg-k">one capped share</span></div>' +
        '<p class="hint" style="margin:10px 0 0">Pool state here is illustrative — the personhood check is real and proven live in the booth lane.</p>' +
        '</div>'
      ));
    }
    split.appendChild(right);
    wrap.appendChild(split);
    return wrap;
  }

  // ---------------------------------------------------------------- S3 consent
  function viewConsent() {
    var a = findAgent(S.agentId), d = a.detail;
    // fresh card, fresh wire state — a previous card's LIVE session/QR must never leak
    // into this card's chips (pre-existing leak, caught 2026-09-26 while flipping orbie live).
    S.wire = { live: false, sessionId: null, nonce: null, expiresAt: null, sub: null, consentId: null,
      receiptToken: null, device: null, deviceTried: false, idToken: null, deviceDead: false };
    var wrap = el('<div class="screen"></div>');
    wrap.appendChild(el('<div><p class="eyebrow">BLESS & RELEASE · CONSENT REQUEST</p>' +
      '<h1 class="big">' + esc(a.name) + " requests your blessing</h1>" +
      '<p class="lede">Read what it\'s asking for — it\'s asking for <em style="color:var(--pink);font-style:normal">this and nothing more</em>. Nothing happens until you approve on your own device, and if you close this, that\'s a complete, valid answer too.</p></div>'));
    var split = el('<div class="split"></div>');

    var left = el('<div class="panel"></div>');
    left.appendChild(el('<h3>Scope & duration</h3>'));
    var scope = el('<div class="consent-scope"></div>');
    scope.appendChild(el('<div class="scope-line"><span class="ic may">✓</span><span><b style="color:var(--green)">May:</b> ' + esc(d.may) + "</span></div>"));
    scope.appendChild(el('<div class="scope-line"><span class="ic maynot">✕</span><span><b style="color:var(--red)">May NOT:</b> ' + esc(d.mayNot) + "</span></div>"));
    left.appendChild(scope);
    left.appendChild(el('<div class="clock">⏳ Blessing lasts until you revoke — or 1 hour, whichever first.</div>'));
    left.appendChild(el('<div class="divider"></div>'));
    left.appendChild(el('<p class="hint">In protocol: <span class="mono">POST /v1/consent/begin</span> opens the session; verification is a real orb-grade World token; the agent cannot act until you approve.</p>'));
    left.appendChild(el('<div id="wireBox"></div>'));
    split.appendChild(left);

    var right = el('<div class="panel device"></div>');
    right.appendChild(el('<h3>Approve on your World ID app</h3>'));
    var qr = el('<div class="qrbox" id="qrbox"></div>');
    right.appendChild(qr);
    right.appendChild(el('<div class="usercode" id="ucode">' + FIXTURE.world.user_code + "</div>"));
    right.appendChild(el('<div class="vuri" id="vuri">' + esc(FIXTURE.world.verification_uri) + "</div>"));
    right.appendChild(el('<p class="hint" id="qrCap" style="text-align:center;margin:6px 0 0">rehearsal QR — the human tap happens on the mirrored phone</p>'));
    var pollBox = el('<div class="poll"><span class="spin"></span> Waiting for approval… <span class="mono" style="color:var(--dim)">authorization_pending</span></div>');
    right.appendChild(pollBox);
    right.appendChild(el('<div id="deviceChip"></div>'));
    var row = el('<div class="btnrow" style="justify-content:center"></div>');
    var openPhone = el('<button class="btn">📱 Open my World ID app →</button>');
    openPhone.addEventListener("click", function () { go("world"); });
    row.appendChild(openPhone);
    right.appendChild(row);
    right.appendChild(el('<p class="hint">What if the sign-in request times out before you approve? <a href="#" id="expLink">See the timeout path →</a></p>'));
    var back = el('<div class="center mt"><button class="link">← cancel, back to the shelf</button></div>');
    back.querySelector("button").addEventListener("click", function () { go("shelf"); });
    right.appendChild(back);
    split.appendChild(right);
    wrap.appendChild(split);

    // render QR after mount
    setTimeout(function () {
      try {
        var q = window.qrcode(0, "M");
        q.addData(FIXTURE.world.verification_uri_complete);
        q.make();
        $("#qrbox").innerHTML = q.createImgTag(4, 0);
      } catch (e) { $("#qrbox").textContent = "QR"; }
      var exp = $("#expLink");
      if (exp) exp.addEventListener("click", function (ev) { ev.preventDefault(); S.revoke.reason = "signin-timeout"; go("standdown"); });
      // JOB 2 — open a REAL consent session against the deployed worker. Renders a live
      // chip on success (session_id + nonce) or an honest rehearsal chip otherwise.
      renderWireChip("opening…");
      wireBegin(a, function (r) {
        if (S.screen !== "consent") return; // navigated away; drop the async result
        if (r.live) {
          S.wire.live = true; S.wire.sessionId = r.sessionId; S.wire.nonce = r.nonce;
          S.wire.expiresAt = r.expiresAt; S.wire.sub = r.sub;
          wireDevice(a, r.sub); // the main page WORKS: mint the real device code, upgrade the QR
        }
        renderWireChip(r.live ? null : (r.reason || "fixture"));
      });
    }, 0);
    return wrap;
  }
  // Live-wire session chip for S3. Reflects the true state of the real begin round-trip.
  function renderWireChip(pending) {
    var box = $("#wireBox");
    if (!box) return;
    box.innerHTML = "";
    if (pending === "opening…") {
      box.appendChild(el('<div class="wire rehearsal"><div class="wh"><span class="spin"></span> OPENING CONSENT SESSION…</div>' +
        '<div class="wl">contacting <b>' + esc(WIRE.base.replace(/^https?:\/\//, "")) + '</b></div></div>'));
      return;
    }
    if (S.wire.live) {
      var exp = "";
      try { exp = new Date(S.wire.expiresAt).toLocaleTimeString([], { hour12: false }); } catch (e) {}
      box.appendChild(el('<div class="wire live"><div class="wh">● LIVE — REAL CONSENT SESSION OPENED</div>' +
        '<div class="wl">POST <b>/v1/consent/begin</b> → 200 · agent <b>' + esc(S.wire.sub) + '</b></div>' +
        '<div class="wl">session_id <b>' + esc(S.wire.sessionId) + '</b></div>' +
        '<div class="wl">nonce <b>' + esc(S.wire.nonce || "—") + '</b>' + (exp ? ' · expires <b>' + exp + '</b>' : '') + '</div>' +
        '<div class="wl">Scan the REAL QR with a World App → the blessing mints for real on this session. The mirrored-phone tap drives the ceremony arc either way.</div></div>'));
    } else {
      var why = ({ offline: "offline mode — network skipped",
        local: "local preview — the live consent round-trip runs on the deployed site (CORS is pinned to it)",
        unregistered: "ENS is already real on-chain (resolves live) — the consent session goes live once this subname is registered with the backend",
        unminted: "this name isn't minted on-chain yet (next in the mint queue) — the consent session switches to live the moment it is minted + registered",
        fixture: "no live route for this agent yet", disabled: "live wiring off",
        timeout: "backend slow — using rehearsal data", unreachable: "backend not reachable from browser (CORS/offline)" })[pending] || ("rehearsal (" + esc(String(pending)) + ")");
      box.appendChild(el('<div class="wire rehearsal"><div class="wh">📴 REHEARSAL SESSION</div>' +
        '<div class="wl">' + why + ' — running the ceremony on bundled fixtures. Every leg still completes.</div></div>'));
    }
  }

  // ---------------------------------------------------------------- S4 world (phone)
  function viewWorld() {
    var a = findAgent(S.agentId);
    var wrap = el('<div class="screen center"></div>');
    wrap.appendChild(el('<div><p class="eyebrow">WORLD ID · ON YOUR PHONE (MIRRORED)</p>' +
      '<h1 class="big">Only approve a sign-in you started</h1>' +
      '<p class="lede" style="margin:0 auto 22px">This is the one human moment in the whole flow. You — a real person — decide. One tap to bless, one tap to deny. Both are honest answers; the agent respects either.</p></div>'));
    var phone = el('<div class="phone"><div class="notch"></div>' +
      '<div class="worldcard">' +
      '<div class="globe">🌍</div>' +
      '<h4>World ID</h4>' +
      '<div class="warn">“Only approve a sign-in you started.”</div>' +
      '<div class="req"><b>' + esc(a.name) + '</b> wants to verify you as a real human and receive your blessing.<br>' +
      '<span style="color:var(--muted)">scope:</span> ' + esc(a.detail.may) + '<br>' +
      '<span style="color:var(--muted)">code:</span> <span class="mono">' + esc((S.wire.device && S.wire.device.user_code) || FIXTURE.world.user_code) + '</span></div>' +
      '<button class="approve">✓ Approve</button>' +
      '<button class="deny">Deny</button>' +
      '<div class="mirror">— MIRRORED TO SCREEN —</div>' +
      "</div></div>");
    phone.querySelector(".approve").addEventListener("click", function () {
      // poll flips authorization_pending -> token
      S.authority.sub = FIXTURE.world.sub;
      S.authority.acr = FIXTURE.world.acr;
      go("binding");
    });
    phone.querySelector(".deny").addEventListener("click", function () {
      // If a REAL consent session is open, close it server-side (first-class denial). Fire-and-forget.
      if (S.wire.live && S.wire.sessionId) {
        wireFetch("/v1/consent/deny", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ session_id: S.wire.sessionId })
        }, function () {});
      }
      S.revoke.reason = "declined";
      go("standdown");
    });
    wrap.appendChild(phone);
    var back = el('<div class="mt"><button class="link">← back to the consent card</button></div>');
    back.querySelector("button").addEventListener("click", function () { go("consent"); });
    wrap.appendChild(back);
    return wrap;
  }

  // ---------------------------------------------------------------- S5 binding (choreography)
  function legEl(id, ic, title, sub, status, statusLabel) {
    return el('<div class="leg ' + status + '" id="leg-' + id + '">' +
      '<span class="lic">' + ic + '</span>' +
      '<span class="lt">' + title + (sub ? '<small>' + sub + "</small>" : "") + "</span>" +
      '<span class="lst">' + statusLabel + "</span></div>");
  }
  function setLeg(id, status, statusLabel, sub) {
    var node = $("#leg-" + id);
    if (!node) return;
    node.className = "leg " + status;
    node.querySelector(".lst").textContent = statusLabel;
    if (sub) { var sm = node.querySelector(".lt small"); if (sm) sm.textContent = sub; }
  }
  function viewBinding() {
    var a = findAgent(S.agentId), d = a.detail;
    var hasAqua = (a.chains || []).some(function (c) { return /aqua/i.test(c); });
    var wrap = el('<div class="screen"></div>');
    wrap.appendChild(el('<div><p class="eyebrow">THE TRINITY LINK · BINDING NAME + ROLE</p>' +
      '<h1 class="big">Your blessing is live</h1>' +
      '<p class="lede">The moment you approved, ' + esc(a.name) +
      ' could act — <em style="color:var(--pink);font-style:normal">instantly</em>. The on-chain paperwork (its name, its role) settles a beat behind, like a receipt printing after the handshake. No zombie state, no waiting on a spinner to get your yes.</p></div>'));

    var legs = el('<div class="legs"></div>');
    legs.appendChild(legEl("world", "🌍", "World ID verified — real human, orb-grade", "sub: " + esc(S.authority.sub), "confirmed", "✓ VERIFIED"));
    legs.appendChild(legEl("app", "⚡", "App-layer blessing marked LIVE (authoritative)", "authority.active = true · " + nowStamp(), "instant", "● LIVE NOW"));
    // A really-minted subname RESOLVES on-chain BEFORE the bless — so its leg is confirmed
    // from the start; only the EAC ROLE grant is the live thing that lands at this bless
    // (Ian's tap = grantRoles). Non-real agents keep the fixture mint→confirm choreography.
    var realEns = !!(d.ens && d.ensDeploy);
    if (realEns) {
      legs.appendChild(legEl("ens", "🏷️", "ENSv2 subname resolves — " + esc(d.subname),
        "Sepolia · resolves → " + esc(shortTx(d.ens.owner)) + " · UniversalResolver" + (d.ens.agentId ? " · agentId " + d.ens.agentId : ""),
        "confirmed", "✓ RESOLVES"));
    } else {
      legs.appendChild(legEl("ens", "🏷️", "ENSv2 subname mint — " + esc(d.subname), "Sepolia · disclosed registry", "pending", "confirming…"));
    }
    legs.appendChild(legEl("eac", "🔑", "EAC role grant — " + esc(d.role),
      realEns ? "on-chain authority record · grantRoles lands at this bless" : "on-chain authority record", "pending", "confirming…"));
    if (hasAqua) legs.appendChild(legEl("aqua", "🌊", "Aqua ship — wage position opens (ship = bless)", "1inch Aqua fork · fresh code", "pending", "confirming…"));
    wrap.appendChild(legs);

    var ctaRow = el('<div class="btnrow" id="bindCta" style="opacity:.5;pointer-events:none"></div>');
    var cont = el('<button class="btn big">→ See the blessed card</button>');
    cont.addEventListener("click", function () { commitBless(); go("blessed"); });
    ctaRow.appendChild(cont);
    ctaRow.appendChild(el('<span class="hint" style="margin:0">on-chain legs settling…</span>'));
    wrap.appendChild(ctaRow);

    // set authority instantly (the honest instant beat)
    S.authority.active = true;
    S.authority.role = d.role;
    S.authority.subname = d.subname;

    // schedule chain legs settling behind. Real-ens ENS leg is already ✓ RESOLVES (minted),
    // so only the EAC grant confirms behind (the honest live bless); fixtures mint→confirm.
    if (!realEns) setTimeout(function () { setLeg("ens", "confirmed", "✓ CONFIRMED", "tx " + shortTx(FIXTURE.chain.ens.tx)); }, FIXTURE.chain.ens.ms);
    setTimeout(function () {
      setLeg("eac", "confirmed", realEns ? "✓ GRANTED" : "✓ CONFIRMED", realEns ? "role granted on-chain (grantRoles) ✓" : "tx " + shortTx(FIXTURE.chain.eac.tx));
    }, FIXTURE.chain.eac.ms);
    var last = FIXTURE.chain.eac.ms;
    if (hasAqua) { setTimeout(function () { setLeg("aqua", "confirmed", "✓ CONFIRMED", "tx " + shortTx(FIXTURE.chain.aqua.tx)); }, FIXTURE.chain.aqua.ms); last = FIXTURE.chain.aqua.ms; }
    setTimeout(function () {
      var r = $("#bindCta"); if (r) { r.style.opacity = "1"; r.style.pointerEvents = "auto"; r.querySelector(".hint").textContent = "all legs confirmed ✓"; }
    }, last + 300);
    return wrap;
  }
  function commitBless() {
    S.authority.blessedAt = new Date();
    S.authority.expiresAt = new Date(Date.now() + 3600 * 1000);
  }

  // ---------------------------------------------------------------- S6 blessed
  function fmtRemain(ms) {
    if (ms < 0) ms = 0;
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(h) + ":" + p(m) + ":" + p(s);
  }
  function stopCountdown() { if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; } }
  function startCountdown() {
    stopCountdown();
    countdownTimer = setInterval(function () {
      var node = $("#cd");
      if (!node) { stopCountdown(); return; }
      var rem = S.authority.expiresAt - new Date();
      node.textContent = fmtRemain(rem);
      if (rem <= 60000) node.classList.add("low");
      if (rem <= 0) { stopCountdown(); S.revoke.reason = "expired"; go("standdown"); }
    }, 1000);
  }
  function blessedHero(a) {
    var d = a.detail;
    var hero = el('<div class="blessed-hero"><div class="glow"></div></div>');
    hero.appendChild(el('<div class="agent-hero" style="margin-bottom:10px"><span class="ce">' + a.emoji + '</span>' +
      '<div><div class="nm">' + esc(a.name) + ' <span class="badge blessed" style="position:static;margin-left:6px">BLESSED</span></div>' +
      '<div class="vbadge" style="margin-top:6px">🌍 verified human · orb-grade</div></div></div>'));
    hero.appendChild(el('<div class="subname-pill">🏷️ ' + esc(d.subname) + ' · role ' + esc(d.role) + "</div>"));
    hero.appendChild(el('<div style="margin-top:6px"><span class="k" style="color:var(--muted);font-size:13px">blessing expires in</span><div class="countdown" id="cd">01:00:00</div></div>'));
    return hero;
  }
  function viewBlessed() {
    var a = findAgent(S.agentId);
    var wrap = el('<div class="screen"></div>');
    wrap.appendChild(el('<div><p class="eyebrow">BLESSED · THE ONLY STATE THAT CAN ACT</p>' +
      '<h1 class="big">The blessing is live. Watch ' + esc(a.name) + " work.</h1></div>"));
    var split = el('<div class="split"></div>');
    var left = el('<div></div>');
    left.appendChild(blessedHero(a));
    var row = el('<div class="btnrow"></div>');
    var work = el('<button class="btn big">▶ Put ' + esc(a.name) + " to work →</button>");
    work.addEventListener("click", function () { go("utility"); });
    row.appendChild(work);
    left.appendChild(row);
    left.appendChild(revokeControl(a));
    split.appendChild(left);

    var right = el('<div class="panel"></div>');
    right.appendChild(el('<h3>What the blessing guarantees</h3>'));
    right.appendChild(el('<div class="scope-line"><span class="ic may">✓</span><span>' + esc(a.detail.may) + "</span></div>"));
    right.appendChild(el('<div class="scope-line"><span class="ic maynot">✕</span><span>' + esc(a.detail.mayNot) + "</span></div>"));
    right.appendChild(el('<div class="divider"></div>'));
    right.appendChild(el('<p class="hint">Authority is re-checked before <em style="font-style:normal;color:var(--pink)">every</em> privileged act. Revoke halts it at the next step — not "eventually."</p>'));
    split.appendChild(right);
    wrap.appendChild(split);

    setTimeout(startCountdown, 0);
    return wrap;
  }

  function revokeControl(a) {
    var box = el('<div class="panel" style="margin-top:18px"></div>');
    box.appendChild(el('<h3 style="margin-bottom:8px">🛑 Revoke anytime — one word</h3>'));
    box.appendChild(el('<p class="hint" style="margin-top:0">Type <b style="color:var(--pink)">Stop</b> and press Enter, or tap the button. It halts instantly.</p>'));
    var inp = el('<input class="field" id="revokeIn" placeholder="type one word…" autocomplete="off" style="margin-bottom:12px">');
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        if (inp.value.trim().toLowerCase() === "stop") { S.revoke.reason = "stop"; go("standdown"); }
        else { inp.style.borderColor = "var(--amber)"; inp.value = ""; inp.placeholder = 'say the word: "Stop"'; }
      }
    });
    box.appendChild(inp);
    var rbtn = el('<button class="btn danger">🛑 REVOKE ' + esc(a.name) + " NOW</button>");
    rbtn.addEventListener("click", function () { S.revoke.reason = "stop"; go("standdown"); });
    box.appendChild(rbtn);
    return box;
  }

  // ---------------------------------------------------------------- S7 utility
  // TRACE FIXTURE — Terri's deterministic seed (/shared/tokyo/utility/trace-fixtures.json).
  // HONESTY: the $642.96 Bonanza Produce Co. receipt (2026-08-25) is a REAL squad kitchen
  // supply receipt; the 120→55 lb onion loop is Chef Marcus's REAL worked operator example
  // (illustrative trace, not a live-run log); the partner kitchen + carrots/oranges surplus
  // rows are ILLUSTRATIVE projections rooted in real line-items on that same real receipt.
  // meals = ESTIMATE (~1.2 lb food = 1 meal, Feeding America). No token names (embargo).
  var TRACE_FIXTURE = {
    listings: [
      { id: "onions-loop", label: "Kitchen — 55 lb yellow onions forecast surplus (Tue close)", out: "55 lb onions → onion-forward specials + 25–40 lb transfer to partner kitchen", meals: 45, basis: "REAL — Marcus's 120→55 lb onion worked loop; onions on the real Bonanza 8/25 receipt" },
      { id: "carrots-25", label: "Kitchen — 25 lb jumbo carrots nearing turn, Reno", out: "25 lb carrots → community kitchen soup + slaw batch", meals: 20, basis: "ILLUSTRATIVE projection — real 'Poly carrots jumbo (25 lb)' line on the Bonanza 8/25 receipt" },
      { id: "oranges-4bags", label: "Kitchen — 4 bags oranges ripe fast, Reno", out: "4 bags oranges → fresh-fruit share to neighbors + juice", meals: 24, basis: "ILLUSTRATIVE projection — real 'Oranges ×4 bags' line on the Bonanza 8/25 receipt" }
    ],
    match: {
      listingId: "onions-loop",
      partner: { name: "Partner Community Kitchen B", note: "illustrative demo partner", distance_km: 2.1, accepts_lb: 40 },
      allocation: [
        { channel: "RECIPE (internal)", lb: 15, basis: "onion-forward specials Wed/Fri" },
        { channel: "TRANSFER (partner kitchen)", lb: 40, basis: "partner accepts up to 40 lb" }
      ],
      totalRescued_lb: 55, wasteAvoided_lb: 55, meals: 45
    },
    provenance: {
      supply: "Bonanza Produce Co. · 2026-08-25 · $642.96 (REAL supply receipt)",
      loop: "Marcus 120→55 lb onion worked example (REAL operator example · illustrative trace)",
      sig: "HMAC-SHA256 · key_id ohana-demo-v1 · fcaa8bd5…d4b9 (demo integrity marker; key published)"
    }
  };
  var SURPLUS = TRACE_FIXTURE.listings;
  function viewUtility() {
    var a = findAgent(S.agentId);
    var wrap = el('<div class="screen"></div>');
    wrap.appendChild(el('<div><p class="eyebrow">REAL WORK · STAMPED BY YOUR BLESSING</p>' +
      '<h1 class="big">' + esc(a.name) + " at work</h1>" +
      '<p class="lede">Every action re-checks authority, then stamps the output with your blessing (' +
      '<span class="mono" style="font-size:12px">' + esc(S.authority.subname) + "</span>).</p></div>"));
    var split = el('<div class="split"></div>');
    var left = el('<div class="panel"></div>');

    if (a.detail.utility === "rescue-match") {
      left.appendChild(el('<h3>Ingest a surplus-food listing</h3>'));
      var sel = el('<select class="field" id="usel" style="margin-bottom:12px"></select>');
      SURPLUS.forEach(function (s) { sel.appendChild(el('<option value="' + s.id + '">' + esc(s.label) + "</option>")); });
      left.appendChild(sel);
      left.appendChild(el('<p class="hint" style="margin-top:0">…or paste your own listing:</p>'));
      left.appendChild(el('<textarea class="field" id="upaste" rows="2" placeholder="e.g. Cafe — 20 sandwiches unsold, Ginza"></textarea>'));
    } else {
      var prompts = {
        receipt: "Generate a signed run-ledger of everything that happened while blessed.",
        verse: "Compose & sign a short verse in your ohana's name.",
        transmission: "Capture a knowledge item and transmit a receipt home.",
        concierge: "Recommend the next agent to hire, and why.",
        story: "Tell the story of the little orb-spark, and the human who said yes.",
        scan: "Scan the consent flow and report anything that could act without a yes.",
        "repo-scan": "Scan the repo for leaked secrets and hygiene gaps.",
        lesson: "Teach one real build step and sign the lesson plan."
      };
      left.appendChild(el('<h3>Ask ' + esc(a.name) + " to work</h3>"));
      left.appendChild(el('<p class="lede" style="font-size:14px">' + esc(prompts[a.detail.utility] || "Produce a signed output.") + "</p>"));
    }
    var runRow = el('<div class="btnrow"></div>');
    var runLabel = a.detail.utility === "rescue-match" ? "▶ Run — find a match" : "▶ Run — produce a receipt";
    var run = el('<button class="btn big" id="runBtn">' + runLabel + "</button>");
    run.addEventListener("click", function () { runUtility(a); });
    runRow.appendChild(run);
    left.appendChild(runRow);
    left.appendChild(el('<div id="uout"></div>'));
    split.appendChild(left);

    var right = el('<div></div>');
    right.appendChild(blessedHeroCompact(a));
    right.appendChild(revokeControl(a));
    split.appendChild(right);
    wrap.appendChild(split);
    setTimeout(startCountdown, 0);
    return wrap;
  }
  function blessedHeroCompact(a) {
    var box = el('<div class="panel" style="border-color:var(--pinkline)"></div>');
    box.appendChild(el('<div class="vbadge">🌍 verified · <span class="badge blessed" style="position:static">BLESSED</span></div>'));
    box.appendChild(el('<div class="subname-pill" style="margin-top:10px">🏷️ ' + esc(a.detail.subname) + "</div>"));
    box.appendChild(el('<div style="margin-top:8px"><span class="k" style="color:var(--muted);font-size:12px">expires in</span><div class="countdown" id="cd" style="font-size:26px">01:00:00</div></div>'));
    return box;
  }
  function runUtility(a) {
    // AUTHORITY CHECK before every privileged act (Spector F-series)
    if (!S.authority.active) { S.revoke.reason = "stop"; go("standdown"); return; }
    var out = $("#uout");
    out.innerHTML = "";
    var workVerb = a.detail.utility === "rescue-match" ? "matching" : "acting";
    out.appendChild(el('<div class="poll" style="justify-content:flex-start"><span class="spin"></span> working — re-checking authority, then ' + workVerb + "…</div>"));
    utilityTimer = setTimeout(function () {
      utilityTimer = null;
      // If a revoke/expiry landed during the spinner it already navigated away and scheduled
      // its OWN debrief. Do NOT re-navigate here — that was the F1 double-render. Just bail.
      if (S.screen !== "utility" || !S.authority.active) return;
      out.innerHTML = "";
      var receiptNo = "R-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      var summary, meals = 0, detailLine = "";
      if (a.detail.utility === "rescue-match") {
        var picked = null, pasted = false;
        var paste = ($("#upaste") && $("#upaste").value.trim()) || "";
        if (paste) { picked = { id: "paste", out: "matched “" + paste.slice(0, 48) + (paste.length > 48 ? "…" : "") + "” → nearest verified partner kitchen", meals: 24 }; pasted = true; }
        else { var id = $("#usel").value; picked = SURPLUS.filter(function (s) { return s.id === id; })[0]; }
        detailLine = picked.out; meals = picked.meals;
        out.appendChild(el('<div class="output-item"><span class="oe">🍱</span><div><b>Rescue match found</b><br>' + esc(picked.out) + "</div></div>"));
        summary = meals + " meals rescued";
        // rich allocation panel for the seeded onions loop (Terri's real worked example)
        if (!pasted && picked.id === TRACE_FIXTURE.match.listingId) {
          var m = TRACE_FIXTURE.match;
          var alloc = el('<div class="receipt mt" style="border-color:var(--pinkline)"></div>');
          alloc.appendChild(el('<div class="kv"><span class="k rk">partner</span><span class="rv">' + esc(m.partner.name) + ' <span class="kit-note">(' + esc(m.partner.note) + ' · ' + m.partner.distance_km + ' km)</span></span></div>'));
          m.allocation.forEach(function (al) {
            alloc.appendChild(el('<div class="kv"><span class="k rk">' + esc(al.channel) + '</span><span class="rv">' + al.lb + ' lb <span class="kit-note">— ' + esc(al.basis) + '</span></span></div>'));
          });
          alloc.appendChild(el('<div class="kv"><span class="k rk">rescued</span><span class="rv">' + m.totalRescued_lb + ' lb · ' + m.wasteAvoided_lb + ' lb waste avoided</span></div>'));
          out.appendChild(alloc);
        }
        if (!pasted && picked.basis) {
          out.appendChild(el('<p class="hint" style="margin-top:8px">basis: ' + esc(picked.basis) + '</p>'));
        }
      } else {
        var msgs = {
          receipt: ["📜", "Signed run-ledger produced", "All blessed actions, timestamped & signed"],
          verse: ["🎸", "Verse composed & signed", "“Named in your ohana, I sing — then I rest when you say rest.”"],
          transmission: ["📡", "Knowledge transmitted home", "1 item captured, receipt written to the ledger"],
          concierge: ["🌺", "Recommendation ready", "Hire Terri next — she keeps the receipts you'll want."],
          scan: ["🕵️", "Consent-security scan complete — report signed", "scanned consent-server: 0 criticals · F11 revoke-auth confirmed"],
          "repo-scan": ["🌿", "Repo-hygiene scan complete — report signed", "clean repo: 0 findings ✓ · planted-key demo: 1 finding 🔑 (fake ghp_ decoy)"],
          story: ["🤖", "Story told & greeting signed", "“I'm Orbie. You said yes — a real, verified yes — so I woke up. I keep the Four Scans: hire · pay · revoke · protect. Say stop, and I sleep.”"],
          lesson: ["🌍", "Build step taught — lesson plan signed", "“Step one: a page with your name on it. You build it — I only hold the ladder. And when you say rest, I rest.” — signed Globie · #globieontour"]
        };
        var m = msgs[a.detail.utility] || ["✅", "Output produced", ""];
        out.appendChild(el('<div class="output-item"><span class="oe">' + m[0] + '</span><div><b>' + m[1] + "</b><br>" + esc(m[2]) + "</div></div>"));
        summary = m[1];
      }
      var rc = el('<div class="receipt mt"></div>');
      rc.appendChild(el('<div class="kv"><span class="k rk">action</span><span class="rv">' + esc(summary) + "</span></div>"));
      if (detailLine) rc.appendChild(el('<div class="kv"><span class="k rk">result</span><span class="rv">' + esc(detailLine) + "</span></div>"));
      if (meals) rc.appendChild(el('<div class="kv"><span class="k rk">impact</span><span class="rv">' + meals + " meals</span></div>"));
      rc.appendChild(el('<div class="kv"><span class="k rk">receipt #</span><span class="rv mono">' + receiptNo + "</span></div>"));
      rc.appendChild(el('<div class="kv"><span class="k rk">time</span><span class="rv">' + nowStamp() + "</span></div>"));
      if (a.detail.utility === "rescue-match") {
        var pv = TRACE_FIXTURE.provenance;
        rc.appendChild(el('<div class="kv"><span class="k rk">provenance</span><span class="rv" style="font-size:12px">' + esc(pv.supply) + '<br>' + esc(pv.loop) + "</span></div>"));
        rc.appendChild(el('<div class="kv"><span class="k rk">sig</span><span class="rv mono" style="font-size:11px">' + esc(pv.sig) + "</span></div>"));
      }
      rc.appendChild(el('<div class="stamp">stamped by blessing · sub ' + esc(S.authority.sub) + '<br>' + esc(S.authority.subname) + ' · role ' + esc(S.authority.role) + '<br>logged to consent ledger ✓</div>'));
      out.appendChild(rc);
      S.utilityOutput = { summary: summary, receiptNo: receiptNo, detail: detailLine, meals: meals };
      var footers = {
        "rescue-match": "A real match, in your name. Run again, or revoke anytime — one word.",
        receipt: "Slow and steady — nothing lost. Run again, or revoke anytime — one word.",
        verse: "Signed in your name, and only yours. Run again, or revoke anytime — one word.",
        transmission: "One item home, receipt written. Run again, or revoke anytime — one word.",
        concierge: "A suggestion, not a decision — the choice stays yours. Revoke anytime — one word.",
        scan: "Read-only — I look, I never touch. Run again, or revoke anytime — one word.",
        "repo-scan": "Read-only — I scan, I never edit. Run again, or revoke anytime — one word.",
        story: "A story, in your name — and I only speak while you say yes. Run again, or revoke anytime — one word.",
        lesson: "A lesson in your name — what you build stays yours. Run again, or revoke anytime — one word. #globieontour"
      };
      out.appendChild(el('<p class="hint">' + esc(footers[a.detail.utility] || "Blessing still live. Run again, or revoke anytime — one word.") + "</p>"));
    }, 900);
  }

  // ---------------------------------------------------------------- S8 stand-down (deny / expire / revoke)
  function viewStandDown() {
    var a = findAgent(S.agentId);
    var reason = S.revoke.reason;
    // instantly kill authority (the emotional beat — no chain wait)
    var wasActive = S.authority.active;
    if (reason === "stop" || reason === "expired") S.authority.active = false;

    var wrap = el('<div class="screen"></div>');

    if (reason === "declined") {
      var sd = el('<div class="standdown declined"></div>');
      sd.appendChild(el('<div class="ce">' + a.emoji + "</div>"));
      sd.appendChild(el('<div class="said">“Blessing declined — and that’s a real answer. I took no action. I’m standing by, no offense taken.”</div>'));
      sd.appendChild(el('<p class="sub">Denial is a first-class outcome. ' + esc(a.name) +
        " takes no offense — and, more importantly, no action. Nothing was authorized, so nothing happened. Saying no costs you nothing and leaves nothing behind.</p>"));
      sd.appendChild(el('<div class="promise-strip"><span>ASKED</span><span>SCOPED</span><span>DENIABLE ✓</span><span>NO ACTION TAKEN</span></div>'));
      wrap.appendChild(sd);
      wrap.appendChild(closeRow(a, "declined"));
      return wrap;
    }

    if (reason === "signin-timeout") {
      // PRE-APPROVAL device-code timeout — nothing was ever blessed (gauntlet F3).
      // This is NOT an expired blessing; it's the sign-in request lapsing before approval.
      var st = el('<div class="standdown declined"></div>');
      st.appendChild(el('<div class="ce">⏳</div>'));
      st.appendChild(el('<div class="said">“The sign-in request timed out before you approved — nothing was blessed.”</div>'));
      st.appendChild(el('<p class="sub">No blessing was ever granted. The device-code sign-in simply lapsed unanswered, so ' +
        esc(a.name) + " never received any authority. Nothing to revoke, nothing left behind — just ask again when you're ready.</p>"));
      st.appendChild(el('<div class="promise-strip"><span>ASKED</span><span>SCOPED</span><span>NEVER APPROVED</span><span>NOTHING BLESSED</span></div>'));
      var trow = el('<div class="btnrow center" style="justify-content:center"></div>');
      var tre = el('<button class="btn">↻ Ask ' + esc(a.name) + " again</button>");
      tre.addEventListener("click", function () { S.revoke.reason = null; go("consent"); });
      trow.appendChild(tre);
      var tsh = el('<button class="link">← back to the shelf</button>');
      tsh.addEventListener("click", function () { resetAgent(); go("shelf"); });
      trow.appendChild(tsh);
      wrap.appendChild(st);
      wrap.appendChild(trow);
      return wrap;
    }

    if (reason === "expired") {
      var se = el('<div class="standdown declined"></div>');
      se.appendChild(el('<div class="ce">⏳</div>'));
      se.appendChild(el('<div class="said">“The hour’s up, so I’ve stood down on my own — no lingering access. Ask me again anytime.”</div>'));
      se.appendChild(el('<p class="sub">Time-boxed by design. When the clock runs out, authority ends by itself — ' +
        esc(a.name) + " doesn't wait to be told. It stops and waits to be re-blessed. Nothing keeps running in the background.</p>"));
      se.appendChild(el('<div class="promise-strip"><span>SCOPED</span><span>TIMED ✓</span><span>EXPIRED CLEANLY</span><span>RE-ASK OPEN</span></div>'));
      var rerow = el('<div class="btnrow center" style="justify-content:center"></div>');
      var reask = el('<button class="btn">↻ Ask ' + esc(a.name) + " again</button>");
      reask.addEventListener("click", function () { S.revoke.reason = null; go("consent"); });
      rerow.appendChild(reask);
      var toShelf = el('<button class="link">← back to the shelf</button>');
      toShelf.addEventListener("click", function () { resetAgent(); go("shelf"); });
      rerow.appendChild(toShelf);
      wrap.appendChild(se);
      wrap.appendChild(rerow);
      return wrap;
    }

    // reason === "stop" : REVOKE — instant halt + choreographed legs behind + debrief receipt
    var a2 = a;
    var hasAqua = (a2.chains || []).some(function (c) { return /aqua/i.test(c); });
    var halt = el('<div class="standdown halt-flash"></div>');
    halt.appendChild(el('<p class="eyebrow center">ONE WORD · INSTANT HALT</p>'));
    halt.appendChild(el('<div class="ce">' + a2.emoji + "🛑</div>"));
    halt.appendChild(el('<div class="said">“Consent withdrawn at ' + nowStamp() +
      '. I’ve stopped — mid-task, no arguments. Finalizing nothing, releasing stewardship. Thank you for the trust. Goodbye.”</div>'));
    halt.appendChild(el('<p class="sub">The moment you said <b style="color:var(--pink)">Stop</b>, the blessing died. ' +
      esc(a2.name) + " halted at the very next step — it checks its authority before <em style=\"font-style:normal;color:var(--pink)\">every</em> single act, so “stop” means now, not “eventually.” The on-chain paperwork clears behind, as receipts.</p>"));
    wrap.appendChild(halt);

    S.authority.revokedAt = new Date();

    // JOB 2/3 — the app-layer halt above is INSTANT and authoritative (<100ms, no chain wait).
    // If a REAL consent exists (would require the booth verify token), fire the real on-chain
    // revoke BEHIND the instant halt and reflect it in the EAC leg. Never blocks the UI.
    if (S.wire.live && S.wire.consentId && S.wire.receiptToken) {
      wireFetch("/v1/revoke", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ consent_id: S.wire.consentId, receipt_token: S.wire.receiptToken })
      }, function (res) {
        if (res && res.status === 200) setLeg("reac", "confirmed", "✓ REVOKED (live)", "consent " + shortTx(S.wire.consentId));
      });
    }

    var legs = el('<div class="legs" style="max-width:640px;margin:8px auto"></div>');
    legs.appendChild(legEl("rapp", "⚡", "App-layer blessing killed — agent halted", "authority.active = false · " + nowStamp(), "instant", "● HALTED"));
    legs.appendChild(legEl("reac", "🔑", "EAC role revoked on-chain", "authority record cleared", "pending", "confirming…"));
    // ENS leg (gauntlet F5): revoke deletes the ENSIP-25 attestation → agent flips to
    // unverified off-chain, but the subname itself is KEPT — that's the continuity beat.
    legs.appendChild(legEl("rens", "🏷️", "ENS attestation cleared — subname kept", "ENSIP-25 record deleted · " + esc(a2.detail.subname) + " persists (continuity)", "pending", "confirming…"));
    if (hasAqua) legs.appendChild(legEl("raqua", "🌊", "Aqua dock — wage position released (dock = revoke)", "1inch Aqua fork", "pending", "confirming…"));
    legs.appendChild(legEl("rworld", "🌍", "World session revoked (IdP /approved-apps)", "sign-in cleared", "pending", "confirming…"));
    wrap.appendChild(legs);

    var debrief = el('<div id="debriefHost" style="max-width:640px;margin:22px auto"></div>');
    wrap.appendChild(debrief);

    // settle legs behind the instant halt
    setTimeout(function () { setLeg("reac", "confirmed", "✓ REVOKED", "tx " + shortTx(FIXTURE.chain.eac.tx)); }, 1400);
    setTimeout(function () { setLeg("rens", "confirmed", "✓ CLEARED", "attestation deleted · name kept"); }, 1900);
    var t = 1900;
    if (hasAqua) { setTimeout(function () { setLeg("raqua", "confirmed", "✓ DOCKED", "tx " + shortTx(FIXTURE.chain.aqua.tx)); }, 2400); t = 2400; }
    setTimeout(function () { setLeg("rworld", "confirmed", "✓ REVOKED", "session cleared"); }, t + 700);
    setTimeout(function () { renderDebrief(a2, wasActive); }, t + 1100);
    return wrap;
  }

  function renderDebrief(a, wasActive) {
    var host = $("#debriefHost");
    if (!host) return;
    host.innerHTML = ""; // idempotent: render exactly one debrief even if called twice (F1 belt-and-braces)
    var d = a.detail;
    var blessedAt = S.authority.blessedAt ? S.authority.blessedAt.toLocaleTimeString([], { hour12: false }) : nowStamp();
    var revokedAt = S.authority.revokedAt ? S.authority.revokedAt.toLocaleTimeString([], { hour12: false }) : nowStamp();
    var did = S.utilityOutput ? (S.utilityOutput.summary + " (receipt " + S.utilityOutput.receiptNo + ")") : "no privileged act performed";
    var rc = el('<div class="receipt"></div>');
    rc.querySelector; // noop
    rc.appendChild(el('<h3 style="margin:0 0 12px;color:var(--green);font-weight:normal;letter-spacing:1px">Debrief receipt</h3>'));
    rc.appendChild(el('<p class="hint" style="margin:0 0 12px">Here’s the whole relationship on one card — what you allowed, what got done, and the second you ended it. Yours to keep.</p>'));
    rc.appendChild(el('<div class="kv"><span class="k rk">who</span><span class="rv mono">' + esc(S.authority.sub) + " · " + esc(S.authority.acr) + "-grade</span></div>"));
    rc.appendChild(el('<div class="kv"><span class="k rk">blessed</span><span class="rv mono">' + esc(d.subname) + " · role " + esc(d.role) + "</span></div>"));
    rc.appendChild(el('<div class="kv"><span class="k rk">scope</span><span class="rv">' + esc(d.may) + "</span></div>"));
    rc.appendChild(el('<div class="kv"><span class="k rk">granted</span><span class="rv mono">' + blessedAt + "</span></div>"));
    rc.appendChild(el('<div class="kv"><span class="k rk">revoked</span><span class="rv mono">' + revokedAt + " (one word: “Stop”)</span></div>"));
    rc.appendChild(el('<div class="kv"><span class="k rk">did while blessed</span><span class="rv">' + esc(did) + "</span></div>"));
    rc.appendChild(el('<div class="kv"><span class="k rk">denied-path</span><span class="rv">tested — denial returns no action</span></div>'));
    rc.appendChild(el('<div class="stamp">asked · scoped · timed · deniable · revoked · accounted for.<br>produced by Terri 🐢 (blessed receipts keeper) · logged to consent ledger ✓</div>'));
    host.appendChild(rc);
    host.appendChild(el('<div class="promise-strip"><span>ASKED</span><span>SCOPED</span><span>TIMED</span><span>DENIABLE</span><span>REVOKED</span><span>ACCOUNTED FOR</span></div>'));
    host.appendChild(closeRow(a, "revoked"));
  }

  function closeRow(a, kind) {
    var row = el('<div class="btnrow" style="justify-content:center;margin-top:24px"></div>');
    var back = el('<button class="btn">' + (kind === "revoked" ? "The shelf is open — hire anytime →" : "← back to the shelf") + "</button>");
    back.addEventListener("click", function () { resetAgent(); go("shelf"); });
    row.appendChild(back);
    return row;
  }

  function resetAgent() {
    stopCountdown();
    var keepScreen = S.screen;
    S = freshState();
    S.screen = keepScreen;
  }

  // Visible chrome badge so offline/rehearsal mode is never mistaken for a live run (N1).
  function showOfflineBadge() {
    try {
      if ($("#offlineBadge")) return;
      var row = $(".top .row");
      if (!row) return;
      var b = el('<span class="offline-badge" id="offlineBadge" title="Running from bundled rehearsal data — no network">📴 OFFLINE · REHEARSAL DATA</span>');
      var reset = $("#resetBtn");
      if (reset) row.insertBefore(b, reset); else row.appendChild(b);
    } catch (e) { /* badge is cosmetic — never let it break boot */ }
  }

  // Header chrome badge shown ONLY when the real consent backend answered the browser
  // (proves CORS + reachability). Absent => running on fixtures. (JOB 2)
  function showLiveBadge(issuer) {
    try {
      if ($("#liveBadge")) return;
      var row = $(".top .row");
      if (!row) return;
      var host = "";
      try { host = issuer ? new URL(issuer).host : "trinity-consent"; } catch (e) { host = "trinity-consent"; }
      var b = el('<span class="live-badge" id="liveBadge" title="Consent backend reachable from this browser">' +
        '<span class="liveled"></span>BACKEND LIVE · ' + esc(host) + '</span>');
      var reset = $("#resetBtn");
      if (reset) row.insertBefore(b, reset); else row.appendChild(b);
    } catch (e) { /* cosmetic — never break boot */ }
  }

  // ---------------------------------------------------------------- boot
  function boot() {
    // wire chrome
    $("#resetBtn").addEventListener("click", function () { resetAgent(); go("shelf"); });
    // ?mode=offline → skip the network entirely and run from the inline mirror.
    if (isOfflineMode()) { showOfflineBadge(); AGENTS = deriveSubnames(OFFLINE_REGISTRY); render(); return; }
    bootProbe(); // single session /healthz: sets WIRE.online + lights "● BACKEND LIVE" iff reachable

    fetch("agents.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) { AGENTS = deriveSubnames(j); render(); })
      .catch(function () {
        // offline fallback — full inline mirror so the shelf never dead-ends
        AGENTS = deriveSubnames(OFFLINE_REGISTRY);
        render();
      });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // bfcache guard — browser Back / trackpad swipe-back restores a frozen prior screen
  // from bfcache with stale JS state. On restore, hard-reset to a clean shelf so the
  // demo never lands on a corpse screen mid-pitch. (Gauntlet F2 — the scariest finding.)
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      stopCountdown();
      resetAgent();
      if (!AGENTS) { boot(); } else { go("shelf"); }
    }
  });
})();
