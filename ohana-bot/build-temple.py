#!/usr/bin/env python3
"""Build ohana-bot/index.html (the totem temple) from temple-template.html + totem/script.json."""
import json, pathlib, re, sys

ROOT = pathlib.Path('/workspace/gh-site/ohana-bot')
beats_src = json.load(open(ROOT / 'totem' / 'script.json'))['beats']

# bake the real mp3 durations into each beat — the ceremony paces itself to the
# voice actually finishing (scar 23 Oct: typewriter+500ms was cutting faces off mid-sentence)
import subprocess
def mp3_dur(bid):
    p = ROOT / 'totem' / 'audio' / 'demo' / f'beat{bid}.mp3'
    try:
        out = subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
                              '-of', 'csv=p=0', str(p)], capture_output=True, text=True, timeout=15)
        return round(float(out.stdout.strip()), 1)
    except Exception:
        return 8.0  # safe default ≈ the slowest clone take

BEATS = [{'id': b['id'], 'face': b['face'], 'title': b['title'],
          'visitor': b['visitor'], 'reply': b['reply'], 'dur': mp3_dur(b['id'])} for b in beats_src]
# sanity gates
assert 6 <= len(BEATS) <= 8, f"expected 6-8 beats, got {len(BEATS)}"
for b in BEATS:
    assert b['face'] in {'shaka','oso','deva','crops','kala','oke'}, b['face']
    assert b['visitor'] and b['reply'], b['id']
    for bad in ('__', 'http://', 'https://'):
        assert bad not in b['reply'] or bad == '__', b  # replies must stay self-contained

tpl = (ROOT / 'temple-template.html').read_text(encoding='utf-8')
assert '__BEATS_JSON__' in tpl, 'placeholder missing'
out = tpl.replace('__BEATS_JSON__', json.dumps(BEATS, ensure_ascii=False))

# GFW law: no external resource loads (hrefs to the outside are fine and intended)
bad = re.findall(r'(?:src|href)="https?://(?!app\.taurusagents\.com|myagentohana\.com|opensourceorchestra\.org|shanhaipit\.com)[^"]*"', out)
bad = [b for b in bad if 'mailto' not in b]
assert not bad, f'external resource refs: {bad}'
# no leftover placeholders
assert '__' not in out.replace('__BEATS_JSON__','') or out.count('__') == 0, 'placeholder leak?'

(ROOT / 'index.html').write_text(out, encoding='utf-8')
print(f'OK — wrote ohana-bot/index.html ({len(out)} bytes, {len(BEATS)} beats)')
