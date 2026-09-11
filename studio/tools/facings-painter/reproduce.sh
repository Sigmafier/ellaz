#!/usr/bin/env bash
# Re-emit the knight facings into a scratch directory and diff against out/.
# Exit 0 only when every emitted file is byte-identical to the committed copy.
#
#   bash reproduce.sh            the gate: 3 files emitted, 0 differ
#   bash reproduce.sh --control  the control: a scratch copy of paint.py with one
#                                palette entry flipped MUST come back DIFF, or the
#                                gate is not discriminating and exit 4 says so
set -euo pipefail
cd "$(dirname "$0")"
PY="${PY:-$HOME/comfy/.venv/bin/python}"
"$PY" -c 'import PIL' 2>/dev/null || { echo "reproduce: $PY has no Pillow; set PY=<python with PIL>"; exit 3; }
OUT="$(mktemp -d)"; trap 'rm -rf "$OUT"' EXIT

PAINTER=paint.py
if [ "${1:-}" = "--control" ]; then
  # one visible pixel colour changed: the sheet must differ, the atlas and manifest must not
  sed 's/"W": "#fff6d8"/"W": "#fff6d9"/' paint.py > "$OUT/paint-mutant.py"
  grep -q '#fff6d9' "$OUT/paint-mutant.py" || { echo "reproduce: control mutation did not land"; exit 4; }
  PAINTER="$OUT/paint-mutant.py"
fi

# -B: never write or read a .pyc (a same-size mutant restored to an older mtime is
# served from the stale bytecode - measured on the roster painter, 2026-09-06).
"$PY" -B "$PAINTER" "$OUT/emit" >/dev/null
n=0; bad=0
for f in "$OUT"/emit/*; do
  name="$(basename "$f")"; n=$((n+1))
  if ! cmp -s "$f" "out/$name"; then bad=$((bad+1)); echo "DIFF  $name"; fi
done
echo "reproduce: $n files emitted, $bad differ"
[ "$n" -ge 3 ] || { echo "reproduce: expected at least 3 files"; exit 2; }
if [ "$PAINTER" != paint.py ]; then
  [ "$bad" -ge 1 ] && { echo "control: FIRED (the gate can see a one-colour change)"; exit 0; }
  echo "control: DID NOT FIRE - the gate is not discriminating"; exit 4
fi
[ "$bad" = 0 ]
