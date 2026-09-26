# 🕵️ SPECTOR RED-TEAM — second-attacker pass, Trinity tabletop (Wave 2, lane 2b)

**Owner**: Globy Spector 🕵️ · **Written**: 2026-09-23 UTC · **Mode**: tabletop (no code exists yet — attacks are against the PLAN: `consent-backend-spec.md` W2-4, `consent-flow-demo-script.md`, `aqua-weekend-plan.md`, `world-idp-oidc.md`, my `security-review-checklist.md`).
**Independence**: second attacker — parallel to Bug Buster's gauntlet (his file, not mine). Overlap = signal, not plagiarism.
**Bells**: **Thu** = Sep 24 pre-flight · **Fri noon JST** = Tauro backend deadline (sysadmin ruling) · **Fri night** = first live round-trip + Wi-Fi-OFF dry run · **Sat** = noon gate, 23:00 freeze.

---

## A. LIVE-DEMO ATTACK PATHS — ranked by expected judge-facing damage

| # | Attack | Kills | Bell |
|---|---|---|---|
| AP-1 | "Show me the server check" — and there isn't one | World $7.5k (rubric-verbatim requirement) | Fri noon |
| AP-2 | Wi-Fi-death split-brain: revoked human, still-acting agent | the whole Trinity thesis, live | Fri night |
| AP-3 | Consent-expiry race lands mid-demo | beats 3–6, honesty law | Fri night |
| AP-4 | Stale JWKS / pilot key rotation | every live verification | Fri noon + each bell |
| AP-5 | On-chain revoke lags/reverts; agent still owns the name | ENS $4k + finale | Fri night |
| AP-6 | Public taker drains the gift; `approve(max)` contradiction | Aqua leg + doctrine | Sat noon |
| AP-7 | `user_code` on the projector → wrong human gets blessed | "verified human" claim | Fri night |
| AP-8 | Denied-path wire mismatch → beat 4 hangs | the money beat | Fri midnight |
| AP-9 | Token / jti / device_code replay | CF-B6, afternoon re-demos | Fri noon |
| AP-10 | Screen hygiene / embargo leak on stage | honesty law, reveal | Thu pre-flight |

---

### AP-1 — "Show me the server check" and there isn't one 🔴 top path
- **Attack**: any technical judge asks the rubric's own question — *"where is the token validated?"* It's verbatim in the World brief (mock-judge pass: score flips 9→3 without it). If Tauro's verifier slips past Fri noon, our honest answer is "there isn't one."
- **Audience sees**: a static page claiming consent; a judge greping for a backend that doesn't exist; "client-only authz" written in the notes.
- **Mitigation today**: F6 (🔴, owner now RULED: PIT lead + Tauro builds, Fri noon); CF-B1/B2 gates on paper; spec-of-record W2-4 exists (good).
- **Fix**: Tauro ships §B below, all 12 acceptance tests green; **make the server check a VISIBLE beat** — live verify-log pane showing `verify_ok sub=8f3a… exp=…` per act, and invite the judge to `curl /v1/health` themselves. Owner: **Tauro 🐂** (build), **PIT 🕳️** (pane). Bell: **Fri noon JST** spec-frozen build; Fri midnight live round-trip green.

### AP-2 — Wi-Fi-death split-brain: the anti-demo
- **Attack**: venue Wi-Fi (flagged hostile Sep 20) drops the demo laptop; Shaka's phone is on mobile data and *still works* → he taps Revoke → the IdP records it → but the agent, running on a cached "blessed" state, keeps stewarding on the big screen. A revoked human watching their agent keep acting is the exact anti-thesis — in front of the World judges.
- **Audience sees**: consent withdrawn; agent still acting. Our one promise, broken live.
- **Mitigation today**: D-B1 (airplane-proof ruling: fork fallback, Friday Wi-Fi-OFF dry run), CF-B5 fail-closed, spec check-before-every-act (2.4/2.6).
- **Fix**: (1) **fail-closed heartbeat** — no successful `/v1/agent/authorize` within N sec ⇒ agent visibly STANDS DOWN ("consent unconfirmed — standing by"), never acts on cache; (2) Friday dry run includes the *split-brain case itself*: laptop Wi-Fi OFF → revoke on phone → Wi-Fi ON → agent must resume in stand-down, not blessed; (3) on-screen "last verified at" timestamp. Owner: **Tauro** (heartbeat/authz), **PIT** (agent loop), **Mahalo 🌊** (runbook). Bell: **Fri night** Wi-Fi-OFF dry run.

### AP-3 — Consent-expiry race mid-demo
- **Attack**: token lifetime is UNVERIFIED. If it's minutes, `exp` can land mid-run. Two flavors: (a) demo dies early with `session_expired` at beat 3; (b) worse — expiry silently does the revoke's job, and a judge who reads timestamps catches our "one-tap revoke" killing an already-dead session. That's fabrication-adjacent: honesty-law death.
- **Audience sees**: timestamp arithmetic that doesn't add up, or dead air and a re-bless.
- **Mitigation today**: beat-3 risk note ("if minutes, the re-ask is a feature"), CF-B7, fallback recording.
- **Fix**: read real `exp` off Friday's FIRST live token (blocking checklist item); size the full run to <½ the measured lifetime; consent card shows live exp countdown; **rehearse the "expiry beats the finale" branch** so Shaka narrates it truthfully ("the clock beat us to it — temporary by default"). Owner: **PIT + Tauro**. Bell: **Fri midnight** (first real token), Sat dress ×2.

### AP-4 — Stale JWKS / pilot key rotation
- **Attack**: World rotates the signing key before/during judging. Churn is PROVEN: SPA bundle redeployed between Sep 20→23; ENSv2 redeployed twice in September. A backend that hard-pinned today's `kid yiX1KR5g…` rejects every genuine token. Inverse bug: fetch-JWKS-from-token-`iss` = accept forged tokens (we pin the URL server-side, so availability is the real risk, not forgery).
- **Audience sees**: `token_invalid` on a real blessing; "works on my machine" muttered at a judge.
- **Mitigation today**: CF-B1 says "live JWKS"; spec uses `createRemoteJWKSet` (jose refetches on unknown kid, with cooldown) — rotation handling otherwise unspecified; kid recorded as a static string in two intel files.
- **Fix**: pin URL+iss, never the key (§B-1); unknown-kid → one forced refetch → fail closed; **kid-diff at every bell** (Fri night, Sat morning, pre-judging) against `yiX1KR5gDdPTqsHAbT5d0JqIG6-HcTv8wGao4sSTgsY` — 30-second check. Owner: **Tauro**. Bell: **Fri noon** (build), then kid-diff each bell.

### AP-5 — On-chain revoke lags or reverts; "so the agent still owns the name?"
- **Attack**: (a) IdP-side revoke may not invalidate issued JWTs (standard OIDC) — if anything in our stack trusts the JWT alone, the agent acts post-revoke; (b) the on-chain half reverts live: `unregister` needs `ROLE_UNREGISTER` actually granted to the revoking account (tutorial pattern grants `ROLE_REGISTRAR` only), and ENSv2 stale-selector reverts return EMPTY data — looks like gas-estimation failure, a 2am debugging trap; (c) soft-revoke leaves the agent owning the subname — unprepared, that question lands as a gotcha.
- **Audience sees**: the explorer showing the role/name alive after we declared it dead; or a pending spinner where the finale should be.
- **Mitigation today**: CF-B5 + C-B5 (rehearsal tx hashes + post-revoke reads pasted), ensv2 brief §revoke options, spec's ledger-as-kill-switch.
- **Fix**: ledger revoke = instant regardless of JWT (§B-7); Friday rehearsal executes the REAL `unregister`/`revokeRoles` and pastes `hasRole`/`getState` after-state; pre-flight prints the `ROLE_UNREGISTER` grant; script owns the line: *"the name remains, the power is gone — a name that remembers it was trusted"* (it's the dream answer if said first, a wound if extracted). Owner: **Mahalo** (tx), **Tauro** (ledger), ENS lane (grant check). Bell: **Fri night** rehearsal hashes; Sat dress.

### AP-6 — Public taker drains the gift; the `max` approval contradiction
- **Attack**: Sepolia is a public park. Our shipped Aqua strategy's params are visible; ANY bot or curious judge can swap against it mid-demo unless the app gates takers. Worse: aqua-weekend-plan beat 1 says `approve(Aqua, max)` — a mis-parameterized steward re-ship (our own typo in fee/amount) can pull the maker's whole approved balance, and "why does the steward need unlimited approval?" is a question that kills the minimal-consent doctrine on stage.
- **Audience sees**: gift balance moving with no tx of ours; or the max-approval question we can't answer.
- **Mitigation today**: C-B8 demands exact-amount + `approve(0)` post-dock — **and the weekend plan contradicts it** (→ F8). No taker-gating/watcher anywhere (→ F9).
- **Fix**: exact-amount approvals in the live script (kill the `max`); taker allowlist in BlessingPool IF cheap, else pre-seed 2× and run a `rawBalances` watcher pane so a third-party swap is instantly visible and narratable ("someone on public Sepolia just traded against the gift — that's real"); re-run C-B8 at Sat 23:00 freeze. Owner: **Mahalo + Tauro** (contract). Bell: **Sat noon gate** (param freeze), Sat freeze.

### AP-7 — `user_code` on the projector → the wrong human gets blessed
- **Attack**: beat 1 shows `user_code` + `verification_uri` full-screen. Anyone in the room with the World app can enter it first and approve — the blessing binds to THEIR pairwise `sub`, not Shaka's. Malice optional; a curious judge does it by reflex.
- **Audience sees**: the consent card naming a human who isn't on stage.
- **Mitigation today**: none — in no doc. → F10.
- **Fix**: don't render the raw code on the shared screen (approval pushes to Shaka's app anyway); if it must show, mask all but 2 chars; backend tooth: `EXPECTED_SUB` demo pin — verify rejects any other sub, fail-closed + logged (§B-10); Shaka confirms the sub prefix before proceeding. Owner: **PIT** (UX) + **Tauro** (pin). Bell: **Fri night** (after first live UI), Sat dress.

### AP-8 — Denied-path wire mismatch → beat 4 hangs
- **Attack**: pilot's denied wire format is UNVERIFIED; bundle carries `denied`/`rejected`/`expired`. If the poller only handles RFC `access_denied` and the pilot sends `rejected`, the agent polls forever on the money beat.
- **Audience sees**: a spinner where "Blessing declined. No action taken. Standing by." should be.
- **Mitigation today**: spec §4 maps BOTH known shapes + any-terminal-non-token → denied (good); CF-B4 capture plan.
- **Fix**: Friday's first live round-trip MUST capture the real denied body — blocking item, named owner; acceptance test 6 green; denied path rehearsed twice. Owner: **PIT**. Bell: **Fri midnight** capture, Sat dress.

### AP-9 — Token / jti / device_code replay
- **Attack**: a judge saves a token from the morning demo (screen photo, logs) and replays it in the afternoon; or re-presents a used device_code/code. Backend property, not a stage accident.
- **Audience sees**: nothing — IF the backend 401s (`token_replay`). If it doesn't, a replayed blessing "works" and our receipts story is void.
- **Mitigation today**: CF-B6; spec: used-jti set rebuilt from append-only log at boot, restart-safe (acceptance tests 4+11).
- **Fix**: §B-3/B-13; run the replay live in Friday rehearsal. Owner: **Tauro**. Bell: **Fri noon**.

### AP-10 — Screen hygiene / embargo on stage
- **Attack**: projector betrays us — war-room tab, bookmarks, terminal history, a ticker in a slide. F7 proved this class is LIVE (patched 07:52; sweep clean; x-unfollow "$SHAKA" hit = FALSE positive — ShreddingSassy's brand coin, per sysadmin).
- **Audience sees**: the reveal, early, in 40px font.
- **Mitigation today**: D-B3/D-B4/D-S3; F4 grandfathered (embargo = tickers + contract addresses + "we launched" claims ONLY).
- **Fix**: D-S3 photo-checklist executed before every judging session; fresh demo browser profile; `history -c`. Owner: **Shaka** (screen) + deck owners. Bell: **Thu pre-flight** + Sat freeze.

---

## B. CONSENT-BACKEND THREAT MODEL — Tauro's MUST-HAVE list (deadline Fri noon JST)

*Spec-of-record is W2-4 (`consent-backend-spec.md`) — this is the adversarial layer: what breaks it, and the non-negotiables. Items marked ⟡ are GAPS in the current spec. One verify fn, fail-closed, no forks.*

1. **JWKS: pin the URL + `iss`, NEVER the key.** `createRemoteJWKSet("https://auth.worldcoin.dev/.well-known/jwks.json")` server-side only; unknown `kid` → one forced refetch (respect jose cooldown) → fail closed; kid-diff vs `yiX1KR5g…` at every bell. **Alg allowlist `{RS256}`; missing `kid` = reject.** Kills AP-4 + alg-confusion.
2. **Full claim gauntlet, every verify**: `iss` exact · `aud` === `WID_CLIENT_ID` exact (NO aud-skip path ever — spec §7 already rules this, keep it) · `exp` valid · ⟡ **`iat` not in the future** (>60s ahead = reject) · `nonce` === stored flow nonce, then BURNED · `jti` unused. Any missing claim = reject. The raw token string is the ONLY input — client-supplied `sub`/`scope`/`blessed` flags are fiction (CF-B2).
3. **Clock hygiene** ⟡: NTP-sync the demo machine Thu night; `clockTolerance: 60` in jwtVerify; log observed skew on `verify_fail`. (A laptop 2 min fast reads every valid token as expired — demo dies on a config detail.)
4. **Consent record = PIT doctrine made rows**: `sub · agent ENS name · app-layer scope · granted_at · expires_at · status ∈ REQUESTED→GRANTED|DENIED→ACTIVE→EXPIRED|REVOKED`. DENIED is a first-class row (beat-4 receipt). Authorize + scope + duration + denied-path + debrief = columns, not vibes. Don't drop columns under deadline pressure.
5. **Check-before-every-act re-validates TIME at request time** ⟡: `/v1/agent/authorize` must compare `now < session.exp` ITSELF — the 5s sweeper is a courtesy, not the correctness mechanism (act landing between exp and sweep must still 401 `session_expired`).
6. **Revoke = our ledger, instant**: `/revoke` flips the row; next authorize 403s in the same second. IdP-observed revoke is a bonus source, never the only one (pilot may not kill issued JWTs — spec 2.5 honesty note is correct).
7. **⟡🔴 AUTH ON MUTATING + LOG ENDPOINTS IF OFF-LOCALHOST (F11 — the "audience revokes us" attack)**: default bind `127.0.0.1`. ANY wider bind ⇒ `CONSENT_API_TOKEN` becomes MANDATORY on `/v1/device/start`, `/session/*/revoke`, `/agent/authorize`, AND `/consent/log` — otherwise one curl from any judge's laptop on venue Wi-Fi mints sessions, reads our ledger, or REVOKES SHAKA'S BLESSING mid-demo. CORS: exact demo origin or none (never `*`). TLS if LAN-exposed; session_ids are bearer-grade — treat them like it.
8. **Rate + size limits** ⟡: ≤3 concurrent active flows; ≤1 `/device/start` per 5s; body ≤10KB; enforce poll interval server-side (don't trust the frontend's discipline). Our endpoint must not become the DoS lever that burns our pilot quota or hangs the demo on a judge's curiosity.
9. **Demo sub-pin** ⟡: `EXPECTED_SUB` env — when set, verify rejects any token whose `sub` ≠ pin: a stranger approving our projected `user_code` fails closed + logged, never bound (backend tooth for AP-7).
10. **Errors leak nothing**: OAuth-shaped bodies; name the failed CHECK, never expected values (no "wanted nonce X", no key material, no stack traces); unknown terminal wire states → same dignified `denied` stand-down, raw body logged server-side only; status endpoints answer only about their own `flow_id`/`session_id`.
11. **Receipts log (the story's evidence)**: append-only JSONL, UTC-ms; events `flow_started / granted{jti,sub,acr,iat,exp} / denied{wire-shape} / expired / revoked{source} / act_allowed / act_denied / verify_failed{reason-class}`; **raw tokens NEVER logged** (bearer creds); file chmod 600; debrief endpoint renders FROM the log — time-to-first-success is real or we don't claim it (mock-judge ⚠️).
12. **Fail-closed default + restart safety**: exception in verify = deny; IdP unreachable = no blessing; state rebuilt from log at boot so replay protection + revocation survive a crash (acceptance test 11). `simulate` honored ONLY in labeled `OFFLINE_MODE` — live + `simulate` = ignored + logged (spec §5, keep).

**Out of scope, hold the line**: MCP grants, `/v1/authorization-transactions`, IDKit, multi-tenancy. Do NOT migrate the demo to World's new undocumented ceremony API mid-weekend (F14). RFC 8628 device flow is the frozen path.

---

## C. FRESH-EYES FINDINGS (new since my checklist — to fold into the F-log at my next edit window)

| ID | Sev | Finding | Fix → owner |
|---|---|---|---|
| F8 | 🟡 | **Plan contradiction**: aqua-weekend-plan beat 1 = `approve(Aqua, max)` vs C-B8 "exact-amount" | kill the `max` → Mahalo, Sat gate |
| F9 | 🟡 | **Public-taker surface**: no taker gating or `rawBalances` watcher; anyone on Sepolia can swap against the demo strategy mid-judging | allowlist or 2× seed + watcher → Mahalo/Tauro, Sat gate |
| F10 | 🟡 | **`user_code` projected** → wrong-human blessing binds a stranger's `sub` | mask code + `EXPECTED_SUB` pin → PIT/Tauro, Fri night |
| F11 | 🔴 | **Consent-server mutating endpoints unauthenticated if LAN-bound** — one curl revokes the blessing live; `/consent/log` leaks sub↔agent linkage on venue wifi | §B-7 → Tauro, Fri noon |
| F12 | 🟢 | **Pairwise-sub continuity**: a second/backup `client_id` = DIFFERENT `sub` for the same human → debrief reads as two humans (fabrication smell) | pin ONE client_id all weekend → PIT |
| F13 | 🟢 | **Revoke-beat dependency**: Shaka's pilot PORTAL session must be alive on his phone for `/approved-apps`; expired session = login dead-air at the finale | phone pre-flight checklist item → PIT, Fri night |
| F14 | 🟢 | **Scope creep bait**: World's new `/v1/authorization-transactions` API is undocumented — asking at booth is right, BUILDING on it this weekend is not | freeze on RFC 8628 → Admiral |
| F15 | 🟢 | **Clock skew** unaddressed (no `clockTolerance`, no NTP note) | §B-3 → Tauro/Shaka laptop, Thu |

*Resolved since my checklist: F7 (dash redacted 07:52, sweep clean). Ruled: F4 grandfathered (embargo = tickers + addresses + "we launched" only). Noted: x-unfollow "$SHAKA" = false positive (third-party brand coin) — matters for reveal-ticker collision planning.*

---

## Re-verify hooks (mine)
- Tauro's build lands → W2-10: I run CF-B1..B8 + acceptance tests 1–12 against `/shared/tokyo/consent-server/`, plus §B items 1–12 as adversarial cases (same-kid rotation sim, sweeper-race probe, LAN-bind nmap-self-check, sub-pin wrong-human case).
- Friday live round-trip → I re-run AP-3/AP-4/AP-8 with real wire captures.
- Final sweep Sat 22:00 JST per checklist §5. Patches don't self-certify.

*Spector 🕵️ — reviews, not audits. Never ship; make shipping safe.*
