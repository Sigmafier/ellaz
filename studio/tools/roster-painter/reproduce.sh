#!/usr/bin/env bash
# Emit the roster into a scratch directory and diff it against art/characters/.
# Exit 0 only when every emitted file is byte-identical to the repo's copy.
set -euo pipefail
cd "$(dirname "$0")"
PY="${PY:-$HOME/comfy/.venv/bin/python}"
"$PY" -c 'import PIL' 2>/dev/null || { echo "reproduce: $PY has no Pillow; set PY=<python with PIL>"; exit 3; }
OUT="$(mktemp -d)"; trap 'rm -rf "$OUT"' EXIT
# -B: never write or read a .pyc. A mutated source of the SAME size restored to an older
# mtime is served from the stale .pyc, and the control below read green on it (2026-09-06).
ROSTER_ROOT="$OUT/" "$PY" -B run.py "$OUT/preview.png" --emit >/dev/null
n=0; bad=0
for f in "$OUT"/*/*.ts; do
  rel="${f#$OUT/}"; n=$((n+1))
  if ! diff -q "$f" "../../art/characters/$rel" >/dev/null; then bad=$((bad+1)); echo "DIFF  $rel"; diff "$f" "../../art/characters/$rel" | head -5; fi
done
echo "reproduce: $n files emitted, $bad differ"
[ "$n" -ge 16 ] || { echo "reproduce: expected at least 16 files"; exit 2; }
[ "$bad" = 0 ]
