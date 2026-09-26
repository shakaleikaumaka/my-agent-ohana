# Intercepta screening fixtures — ILLUSTRATIVE, API-shape-accurate

These JSON files match the **real** `ToxicScoreShortResponseV2` shape returned by
`GET https://api.web3antivirus.io/api/public/v2/extension/account/{address}/toxic-score`
(verified against docs.web3antivirus.io on 2026-09-25). They exist so the module's four
verdict paths (**pay / cap / refuse / ask-human**) can be exercised and tested **without**
burning a sandbox key — because the free key arrives by email hours after signup (booth item).

They are **fabricated illustrative responses**, clearly labelled, NOT captured from a live
authenticated call. The one genuinely-live artifact we captured is `live-403.json` (a real
unauthenticated response from the production host, proving the call path and auth).

When `INTERCEPTA_API_KEY` is set, `screen.mjs` ignores these and makes the real call.

| file | toxicScore | traits | drives verdict |
|---|---|---|---|
| `clean.json` | 3 | none | **pay** |
| `mild.json` | 22 | mixer_transfers (caution) | **cap** |
| `borderline.json` | 48 | non_kyc_transfers | **ask-human** |
| `sanctioned.json` | 96 | sanction_address, known_scammer | **refuse** |
| `live-403.json` | — | — | **ask-human** (fail-closed; real unauth response) |
