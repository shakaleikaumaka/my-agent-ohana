# 🗿👁 ʻOhana Watcher kit — SenseCAP Watcher W1-A → SHAKA's physical face

*Loaner from ShanHaiWoo (21 Oct 2026). Path A = flash xiaozhi-esp32, bind on xiaozhi.me, SHAKA persona (~40 min).
Path B = +MCP bridge so the Watcher reaches all SIX faces through the laptop totem (~30 min more).*

```
kit/
├── flash.sh                 Mac/Linux: probe port → backup identity + full image → flash xiaozhi (asks "FLASH")
├── restore.sh               hand it back exactly as received (exact image, or Seeed V1.1.7 + identity)
├── xiaozhi/merged-binary.bin   xiaozhi-esp32 v2.5.2 "sensecap-watcher" build (13.5 MB, zh-CN wake word), flash at 0x0
├── xiaozhi/watcher.zip         the same, as released (sha256 9d8df9d1…)
├── factory-v1.1.7/          Seeed's open-source factory firmware (restore fallback)
├── xiaozhi-role-prompt.txt  paste into xiaozhi.me → agent → 配置角色 (SHAKA, EN/中文, hands off to siblings)
├── mcp/                     Path B: mcp_pipe.py (upstream) + ohana_mcp.py (ask_ohana → totem /chat)
└── backup/                  created by flash.sh — nvsfactory.bin (KEEP FOREVER) + watcher-factory-full.bin
```

## 0. What you need on the table
- Laptop with **python3** · `pip3 install esptool` (China mirror: `pip3 install -i https://pypi.tuna.tsinghua.edu.cn/simple esptool`)
- **USB-C DATA cable** into the **BOTTOM/side** port (the back port is power only). Two serial ports appear (ESP32-S3 + Himax) — `flash.sh` probes both.
- A **2.4 GHz** Wi-Fi the Watcher can join (venue Wi-Fi or your phone hotspot; iPhone → *Maximize Compatibility* ON). ESP32 has no 5 GHz.
- **Google account** — xiaozhi.me console has *Sign in with Google* (no Chinese phone needed). Google needs the VPN; the Watcher itself talks to xiaozhi.me's China servers, no VPN.

## 1. Flash (Path A)
```bash
cd kit && chmod +x flash.sh restore.sh
./flash.sh            # ≈7 min: identity backup (3 s) + full 32 MB image (≈6 min) + write (≈2 min)
./flash.sh --skip-full   # hurry mode: identity backup only (restore then uses Seeed's V1.1.7 bins)
```
Windows: use Espressif Flash Download Tool, chip ESP32-S3, COM port ending in **B**, file `xiaozhi/merged-binary.bin` @ `0x0`, SPI mode DIO, 80 MHz — but FIRST back up: `python -m esptool --chip esp32s3 --port COMx --no-stub read_flash 0x9000 204800 backup\nvsfactory.bin`.

**Loaner law:** `backup/nvsfactory.bin` (200 KB @0x9000 = EUI + SenseCraft credentials) is mandatory; without it the Watcher can never rejoin SenseCraft. `flash.sh` refuses to write until it exists. Copy `backup/` to Drive/TG right after.

## 2. First boot → Wi-Fi → bind
1. Screen dark? hold the **wheel button ~3 s** (power on). XiaoZhi boots in a few seconds.
2. Phone → Wi-Fi **"Xiaozhi-xxxx"** → captive page (else open `http://192.168.4.1`) → pick the 2.4 GHz network → password → Connect → it reboots.
   Redo Wi-Fi later: **single-click the wheel while the "starting" screen shows.**
3. Wake it: say **"你好小智"** (or single-click the wheel = push-to-talk toggle). It speaks a **6-digit code** (ask again to re-hear).
4. Laptop → https://xiaozhi.me → Console → **Sign in with Google** → **新建智能体** (name: SHAKA) → **添加设备** → the code.
5. Agent → **配置角色**: paste `xiaozhi-role-prompt.txt`; pick a voice (a warm male zh/en voice — Shaka's own clone lives on the laptop totem, not here); language auto; save.
6. Say "你好小智" → "Aloha Shaka, what are you?" → the round face answers as SHAKA. 🤙
Wheel = volume · click = talk/stop · hold 2 s = power off · hold 10 s = factory reset (erases Wi-Fi + binding, NOT the identity partition — that's gone already, which is why backup/ matters).

## 3. Path B — all six faces through the laptop (MCP接入点)
```bash
# terminal 1 — the totem (already part of totem-web.tar.gz)
cd totem-web && python3 serve.py                     # http://127.0.0.1:8777
# terminal 2 — the bridge
cd kit/mcp && pip3 install -r requirements.txt      # mcp<2 pinned (FastMCP API)
export MCP_ENDPOINT='wss://api.xiaozhi.me/mcp/?token=…'   # Console → 智能体 → 配置角色 → MCP接入点 → copy
python3 mcp_pipe.py                                 # runs every enabled server in mcp_config.json (= ohana)
```
Then say: *"你好小智 — ask KALA how to play three chords"* → xiaozhi calls `ask_ohana("kala", …)` → laptop `/chat` → same `router.py` + `memory.json` → KALA's face **glows on the 3D totem** while the Watcher speaks her words. Tools exposed: `ask_ohana(face, question)`, `list_faces()`, `totem_status()`. Outbound websocket only — no port-forwarding, works on venue Wi-Fi. If the laptop bridge is down the tool returns an in-persona canned line (never an error string into TTS).

Honest framing for judges: the Watcher is the **first physical node**; the laptop 3D totem is the **body it grows into** (BOM + HARDWARE.md = the manufacturing plan).

## 4. Give it back
```bash
./restore.sh     # exact 32 MB image if you made one, else Seeed V1.1.7 + your nvsfactory.bin
```
Himax (camera AI chip) firmware is never touched by any of this.

## Risks / scars
- xiaozhi.me is a hobby cloud (tenclass): expect 1–3 s latency, zh-CN wake word only on this build ("你好小智"); the persona answers in EN/中文.
- Flash from a laptop on battery + a short cable; a dropped USB mid-write just means re-run `flash.sh` (bootloader lives at 0x0 — if the device won't enumerate, hold the wheel 3 s, replug, and run with `--before default_reset`).
- Himax port answers nothing to esptool — that's the probe telling you to use the other one, not a fault.
- If `pip install esptool` fails on the venue network: `python3 -m pip install --user esptool -i https://pypi.tuna.tsinghua.edu.cn/simple`.
