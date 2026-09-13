#!/usr/bin/env bash
# Re-emit the crypt room set into a scratch directory and diff against the
# committed copy in games/hollow/assets/crypt-room/. Exit 0 only when every
# emitted file is byte-identical.
#
#   bash reproduce.sh            the gate: 3 files emitted, 0 differ
#   bash reproduce.sh --control  the control: a scratch copy of paint.mjs with one
#                                palette entry flipped MUST come back DIFF, or the
#                                gate is not discriminating and exit 4 says so
set -euo pipefail
cd "$(dirname "$0")"
COMMITTED=../../games/hollow/assets/crypt-room
OUT="$(mktemp -d)"; trap 'rm -rf "$OUT"' EXIT

PAINTER=paint.mjs
if [ "${1:-}" = "--control" ]; then
  # one floor colour changed: the sheet must differ, the atlas and manifest must not
  mkdir -p "$OUT/mutant"
  cp png.mjs "$OUT/mutant/png.mjs"
  sed 's/grout: rgb("#3e2840")/grout: rgb("#3e2841")/' paint.mjs > "$OUT/mutant/paint.mjs"
  grep -q '#3e2841' "$OUT/mutant/paint.mjs" || { echo "reproduce: control mutation did not land"; exit 4; }
  PAINTER="$OUT/mutant/paint.mjs"
fi

node "$PAINTER" "$OUT/emit" >/dev/null
n=0; bad=0
for f in "$OUT"/emit/*; do
  name="$(basename "$f")"; n=$((n+1))
  if ! cmp -s "$f" "$COMMITTED/$name"; then bad=$((bad+1)); echo "DIFF  $name"; fi
done
echo "reproduce: $n files emitted, $bad differ"
[ "$n" -ge 3 ] || { echo "reproduce: expected at least 3 files"; exit 2; }
if [ "$PAINTER" != paint.mjs ]; then
  [ "$bad" -ge 1 ] && { echo "control: FIRED (the gate can see a one-colour change)"; exit 0; }
  echo "control: DID NOT FIRE - the gate is not discriminating"; exit 4
fi
[ "$bad" = 0 ]
