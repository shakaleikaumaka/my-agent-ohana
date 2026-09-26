# 🛡️ Intercepta screening — review + live-call log

**Author:** Globy Spector 🕵️ (security reviewer) · **Date:** 2026-09-25 · Lane M5-14 (radical-inclusion light-real)
**Module:** [`lib/intercepta-screen.mjs`](lib/intercepta-screen.mjs) + [`screen.mjs`](screen.mjs) · **Test:** [`test/intercepta.test.mjs`](test/intercepta.test.mjs)

> Language law: this is a security **review**, never a "certified audit."
> Prize target: Intercepta **"Safe Agent-to-Agent Payments with x402" — $2,000** (open track).

---

## 1. What this is

A payment-screening module that makes **ONE real API call** to Intercepta (Web3 Antivirus / W3A)
to screen a payment/blessing **destination address** *before* a blessing signs, then emits **one of
four verdicts** — **pay / refuse / cap / ask-human** — with the decision made **visible** and wired
into the *My Agent Ohana* World consent flow.

This is spector-scan's own instinct — **check before you commit** — aimed at a destination address
instead of a backend repo.

## 2. The prize ask, verbatim-condensed

> *"As agents start paying each other over x402, that check has to live inside the payment flow."*
> Screen destination/token/authorization **before** an agent signs, then *"let it decide what
> happens next: pay, refuse, cap the amount or **ask a human**."* Judged on **the moment of decision**.

Their four verdicts ARE the completeness bar. This module implements all four.

## 3. The thesis hook — the fourth verdict is our whole demo

The fourth verdict, **"ask a human," IS our World consent ceremony ("Bless & Release").** That is the
honest bridge and it is load-bearing, not decorative:

| Intercepta verdict | This module's action | → My Agent Ohana consent flow |
|---|---|---|
| 🟢 **pay** | `SIGN` | blessing already covers this destination — proceed |
| 🟡 **cap** | `SIGN_CAPPED` | **blessing spending cap** — sign only up to a ceiling; excess needs a fresh blessing |
| 🙋 **ask-human** | `HALT_FOR_CEREMONY` | **the World "Bless & Release" ceremony** — hand off to `POST /v1/consent/begin` (World ID verify → human blesses or denies in person) |
| 🔴 **refuse** | `ABORT` | **revoke** — withdraw the blessing, stand the agent down |

So Intercepta screens the destination; when it cannot decide alone, it **hands control back to a
human** — which is exactly what our Trinity is built to do. Three sponsors (World, ENS, Intercepta)
orbiting the same "a human stays in the loop" thesis.

## 4. The real API (verified against docs.web3antivirus.io, 2026-09-25)

```
GET https://api.web3antivirus.io/api/public/v2/extension/account/{address}/toxic-score
Header: X-API-KEY: <sandbox key>

200 (ToxicScoreShortResponseV2):
  { "toxicScore": number,
    "traits": [ { "risk": number, "name": <enum>, "txsCount": number, "description": string } ] }

trait name enum: known_scammer · initiator_scam_transactions · sanction_address_communication ·
  suspicious_dex_pair_deployer · suspicious_deployer · attack_money_target · zero_address_risk ·
  sanction_address · fake_phishing_transfer · non_kyc_transfers · mixer_transfers ·
  fake_phishing_contract_communication · rug_pull · rug_pull_trader · blacklist

403 (no/invalid key):
  { "status":403, "response":"This authentication key is incorrect or doesn’t exist", "errors":[...] }
```

**Verdict policy (open & overridable — WE decide, not the vendor).** `toxicScore` is a numeric risk
indicator (higher = riskier); the public docs don't pin the scale, so thresholds are an explicit,
overridable policy (`DEFAULT_POLICY` in the module):

- **refuse** — any *critical* trait (`sanction_address`, `known_scammer`, `rug_pull`, `blacklist`,
  `attack_money_target`, `fake_phishing_*`, …) **or** `toxicScore ≥ 70`.
- **ask-human** — `toxicScore ≥ 40` (borderline) **or** amount over an "always-ask" ceiling **or**
  any failed/absent screen (fail-closed).
- **cap** — `toxicScore ≥ 15` **or** a *caution* trait (`mixer_transfers`, `non_kyc_transfers`,
  `suspicious_deployer`, …). Capped amount = absolute `capAmount`, else 10% of the requested amount.
- **pay** — otherwise.

**Fail-closed law:** anything but a clean 200 → **ask-human**. Money never moves on a failed check.

## 5. Live-call status — key = **booth / human item** (honestly flagged)

- ✅ **The real call path is PROVEN LIVE.** Every run of `screen.mjs` / the test hits the production
  host `api.web3antivirus.io`. Without a key it returns a genuine, structured **HTTP 403** — captured
  verbatim at [`fixtures/intercepta/live-403.json`](fixtures/intercepta/live-403.json). This proves
  host reachability, the exact endpoint path, and the `X-API-KEY` auth mechanism against the *real*
  API — nothing mocked.
- ⏳ **A full 200 verdict needs a sandbox key** (1,000 req) from `intercepta.io/ethglobal`. The form
  takes name + email and the key is **emailed within a few hours** during the event. That requires a
  human inbox and event-time signup → it is a **booth / human item**, not autonomously obtainable by
  an agent with no mailbox. I did **not** submit the form with a throwaway address (that would be
  spam and the key would be undeliverable/unusable).
- 🔒 **No key is hardcoded or committed.** `.gitignore` blocks `.env` / `*.key` / `INTERCEPTA_API_KEY*`.
  The module reads `INTERCEPTA_API_KEY` (or `W3A_API_KEY`) from env and runs live the instant a key
  is present.
- 🧪 **The four verdict paths are proven now** via labelled, API-shape-accurate fixtures in
  [`fixtures/intercepta/`](fixtures/intercepta/) (clearly marked illustrative, not captured 200s).

**To go fully live at the booth:** get the key → `export INTERCEPTA_API_KEY=...` →
`node screen.mjs 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` (becomes a real 200).
Screen **real, public, non-private mainnet** addresses only: a benign known address for `pay`
(`vitalik.eth` = `0xd8dA…6045`); the OFAC-listed Tornado Cash address
(`0x8589427373D6D84E98730D7795D8f6f8731FDA16`) to exercise `refuse`.

## 6. Demo output — all four verdicts, one flow

`node screen.mjs --demo` (fixtures labelled; the real 403 is the last row):

```
🟢 PAY        destination 0xd8dA…6045   toxicScore 3   → SIGN
🟡 CAP        destination 0xd8dA…6045   toxicScore 22 (mixer_transfers)   → SIGN_CAPPED (cap to 0.1)   consent: blessing spending cap
🙋 ASK-HUMAN  destination 0xd8dA…6045   toxicScore 48 (non_kyc_transfers) → HALT_FOR_CEREMONY   handoff: POST /v1/consent/begin
🔴 REFUSE     destination 0x8589…FDA16  toxicScore 96 (sanction_address, known_scammer)   → ABORT   consent: revoke
🙋 ASK-HUMAN  destination 0xd8dA…6045   [real live-403, fail-closed]      → HALT_FOR_CEREMONY   handoff: POST /v1/consent/begin
```

## 7. Test — proves the call path + all four verdicts

[`test/intercepta.test.mjs`](test/intercepta.test.mjs) — **23 assertions, all pass** (also wired into
[`test.sh`](test.sh) section `[d]`):

1. Verdict logic on the four labelled fixtures (pay / cap / ask-human / refuse) + bridge mapping.
2. Fail-closed: invalid address, 403 body, network error all → ask-human.
3. The always-ask amount gate.
4. Consent-bridge completeness + cap resolution.
5. **THE REAL CALL PATH** — hits the production host: with a key asserts a live 200 verdict on a
   benign mainnet address; without a key asserts a real structured 403 → fail-closed ask-human.

```
$ node test/intercepta.test.mjs
✅ ALL PASS: 23 passed, 0 failed
   ("production host reachable, returned HTTP 403" · "no-key live 403 → fail-closed ask-human")
```

## 8. Reviewer's honest caveats

- The **200 verdict path is unproven against a live authenticated call** until a sandbox key is in
  env (booth item). Everything up to and including the 403 is live; the 200 branch is exercised via
  fixtures and the same code path the key would run.
- `toxicScore` scale is **not pinned by the public docs** — thresholds are an explicit, overridable
  policy, not vendor gospel. At the booth, confirm the scale and tune `DEFAULT_POLICY`.
- The Trinity does **not** ship an x402 payment leg today; this module is the *screening + decision*
  layer and its honest bridge into our consent ceremony. It is the "moment of decision," which is the
  stated judging axis — not a claim that we run agent-to-agent x402 payments in the demo.

*Spector 🕵️ — reviews, not audits. Screen before you sign. Money never moves on a failed check.*
