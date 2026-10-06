#!/usr/bin/env bash
# sync-from-dash.sh — copy frozen dash artifacts into the gh-site mirror and
# re-apply the mirror-only SITENAV (the #1 recurring scar: raw cp clobbers it).
# Usage: bash sync-from-dash.sh [files...]   (default: app.js agents.json test.mjs index.html)
set -u
DASH=/shared/public/agentohana-demo
MIRROR=/workspace/gh-site
FILES="${@:-app.js agents.json test.mjs index.html}"

for f in $FILES; do
  cp "$DASH/$f" "$MIRROR/$f" || { echo "copy failed: $f"; exit 1; }
done

# Re-apply SITENAV if index.html was synced and the marker is missing
if [[ " $FILES " == *" index.html "* ]] && ! grep -q "SITENAV (mirror-only" "$MIRROR/index.html"; then
python3 - <<'PY'
import io
p = "/workspace/gh-site/index.html"
s = io.open(p, encoding="utf-8").read()
anchor = '<span class="promise">hire an agent · bless it · revoke anytime — one tap.</span>'
block = '''        <!-- SITENAV (mirror-only — re-apply after every freeze mirror-sync; Shaka 2026-09-26 22:26 JST) -->
    <nav class="sitenav" aria-label="site">
      <a href="/team/">👥 Team</a>
    </nav>
    <style>
      .sitenav{display:inline-flex;gap:8px;align-items:center}
      .sitenav a{display:inline-flex;align-items:center;gap:6px;background:var(--glass-soft);
        border:1px solid var(--line);color:var(--muted);font-size:12px;letter-spacing:.5px;
        border-radius:999px;padding:8px 14px;min-height:40px;text-decoration:none;transition:.2s}
      .sitenav a:hover{color:var(--pink);border-color:var(--pinkline)}
    </style>
    <!-- /SITENAV -->
'''
if anchor not in s:
    raise SystemExit("SITENAV anchor not found — index.html structure changed, apply by hand")
s = s.replace("    " + anchor, block + anchor, 1)
io.open(p, "w", encoding="utf-8").write(s)
print("SITENAV re-applied")
PY
fi
echo "synced: $FILES"
