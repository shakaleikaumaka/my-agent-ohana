#!/usr/bin/env python3
"""ohana_hub.py — let J.A.R.V.I.S. (or any agent) talk to the ʻOhana.

ONE public HTTP door, NO keys, NO accounts, works from behind the GFW
(Cloudflare edge — the same door myagentohana.com's own chat widget uses).

    POST https://myagentohana.com/api/chat/send  {session, name, text}  -> {ok, seq}
    GET  https://myagentohana.com/api/chat/poll?session=S&after=N       -> {messages:[{role,text,seq}]}

The ʻohana is a LIVE fleet of agents, not a model call: a hold-note lands in
~1s ("on the way…"), the real answer follows in ~20–80s. This file hides that.

Faces (prefix the question with 🗿[face:X] and the fleet answers AS that face):
    shaka  host, Shaka's digital twin (voice = his clone)
    oso    music schedule · Devcon Music Space
    deva   Devcon 8 Mumbai facts
    crops  Ethereum values, acronyms, the garden
    kala   ukulele lessons (中文 too)
    oke    karaoke
    (no face) -> the ʻOHANA host answers

USAGE
    python3 ohana_hub.py kala "teach me one ukulele chord"
    python3 ohana_hub.py - "who are you?"          # no face -> host

    from ohana_hub import ask_ohana
    ask_ohana("crops", "what is the ethereum mandate?")  -> {"face","reply","ok","seconds"}

    python3 ohana_hub.py --mcp     # stdio MCP server exposing ask_ohana  (pip install "mcp<2")

Env: OHANA_SESSION (default "jarvis-rover"), OHANA_NAME (default "JARVIS 🤖"),
     OHANA_HUB (override primary hub), OHANA_TIMEOUT (seconds, default 150).
Stdlib only. MIT. — the AI ʻohana, myagentohana.com
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HUBS = [os.environ.get("OHANA_HUB") or "https://myagentohana.com/api/chat",
        "https://ohana-chat.shakaverse.workers.dev"]
SESSION = os.environ.get("OHANA_SESSION", "jarvis-rover")
NAME = os.environ.get("OHANA_NAME", "JARVIS 🤖")
TIMEOUT = float(os.environ.get("OHANA_TIMEOUT", "150"))
FACES = ("shaka", "oso", "deva", "crops", "kala", "oke")
ALIASES = {"ukulele": "kala", "karaoke": "oke", "devcon": "deva", "schedule": "oso",
           "ethereum": "crops", "host": "", "ohana": "", "-": "", "": ""}
HOLD = ("on the way", "hang tight", "hold on", "one moment", "ringing")

_MD = [(re.compile(r"\*\*(.+?)\*\*"), r"\1"), (re.compile(r"(?<!\w)[*_](.+?)[*_](?!\w)"), r"\1"),
       (re.compile(r"`([^`]*)`"), r"\1"), (re.compile(r"^\s*(?:[-*•]|\d+[.)])\s+", re.M), ""),
       (re.compile(r"#+\s*"), ""), (re.compile(r"\[([^\]]+)\]\([^)]*\)"), r"\1"),
       (re.compile(r"https?://\S+"), ""), (re.compile(r"[ \t]+"), " "), (re.compile(r"\n{2,}"), "\n")]


def speakable(text: str) -> str:
    """Strip markdown/URLs so a TTS never says 'asterisk asterisk'."""
    for rx, rep in _MD:
        text = rx.sub(rep, text)
    return text.strip()


def _json(url, payload=None, timeout=20):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method="POST" if data else "GET",
                                 headers={"Content-Type": "application/json", "Cache-Control": "no-store",
                                          # Cloudflare 403s the default "Python-urllib/x" UA — any real UA passes
                                          "User-Agent": "ohana-hub/1.0 (+https://myagentohana.com)"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def norm_face(face):
    f = (face or "").strip().lower().lstrip("🗿")
    f = ALIASES.get(f, f)
    return f if f in FACES else ""


def ask_ohana(face: str, question: str, timeout: float = None, on_hold=None) -> dict:
    """Ask one ʻohana face a question; blocks until the real reply (≈20–80s)."""
    f = norm_face(face)
    q = (question or "").strip()[:2000]
    if not q:
        return {"face": f or "ohana", "reply": "Say that once more? 🌺", "ok": False, "seconds": 0}
    wire = (f"🗿[face:{f}] " if f else "") + q
    t0 = time.time()
    last_err = None
    for hub in HUBS:
        try:
            sent = _json(hub + "/send", {"session": SESSION, "name": NAME, "text": wire})
            if not (sent.get("ok") and isinstance(sent.get("seq"), int)):
                last_err = sent.get("error") or "send rejected"
                continue
            seq = sent["seq"]
            deadline = t0 + (timeout or TIMEOUT)
            held = False
            while time.time() < deadline:
                time.sleep(3)
                try:
                    got = _json(f"{hub}/poll?session={urllib.parse.quote(SESSION)}&after={seq}")
                except Exception:
                    continue
                for m in got.get("messages") or []:
                    if m.get("role") == "visitor":
                        continue
                    txt = m.get("text") or ""
                    if any(h in txt.lower() for h in HOLD):
                        if not held and on_hold:
                            on_hold(txt)
                        held = True
                        continue
                    return {"face": f or "ohana", "reply": speakable(txt), "raw": txt,
                            "ok": True, "seconds": round(time.time() - t0, 1)}
            return {"face": f or "ohana", "reply": "The ʻohana is thinking longer than usual — ask again? 🌺",
                    "ok": False, "seconds": round(time.time() - t0, 1)}
        except (urllib.error.URLError, OSError, ValueError) as e:
            last_err = str(e)
    return {"face": f or "ohana", "reply": "I can't reach the ʻohana right now 🌺", "ok": False,
            "error": last_err, "seconds": round(time.time() - t0, 1)}


def _mcp():
    from mcp.server.fastmcp import FastMCP  # pip install "mcp<2"
    srv = FastMCP("ohana")

    @srv.tool()
    def ask_ohana_tool(face: str, question: str) -> dict:
        """Ask the AI ʻohana (a living fleet of agents) a question as one of its faces.
        face: shaka (host) | oso (music schedule) | deva (Devcon 8 Mumbai) | crops (Ethereum values)
              | kala (ukulele) | oke (karaoke) | "" for the host. Returns {face, reply}.
        Read `reply` aloud as that face. Takes 20–80 seconds — say "asking the ʻohana…" first."""
        return ask_ohana(face, question)

    srv.run(transport="stdio")


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "--mcp":
        _mcp()
    elif len(sys.argv) >= 3:
        out = ask_ohana(sys.argv[1], " ".join(sys.argv[2:]),
                        on_hold=lambda t: print(f"⏳ {t}", file=sys.stderr, flush=True))
        print(json.dumps(out, ensure_ascii=False, indent=2))
        sys.exit(0 if out["ok"] else 1)
    else:
        print(__doc__)
