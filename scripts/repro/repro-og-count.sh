# The before/after for "never bake a count into a shared image".
# Two arms, one variable, both through the shipping rasteriser.
set -euo pipefail
OUT="${OG_OUT:-/tmp/og-count}"
F=src/build/ogCard.ts
CFG=scripts/repro/vitest.og.config.ts
trap 'cp /tmp/ogCard.count.bak $F' EXIT
cp $F /tmp/ogCard.count.bak

OG_OUT="$OUT" OG_ARM=AFTER-countless npx vitest run --config $CFG -t "as this arm draws it" 2>&1 | grep -E '^stdout|AFTER-|countless:' || true

before=$(sha256sum $F | cut -c1-16)
python3 - <<'PY'
p="src/build/ogCard.ts"; s=open(p,encoding="utf-8").read()
old="  const sub = site.tagline;"
assert old in s, "anchor gone - the arm would render the same card twice"
s=s.replace(old, '  const sub = `${GAMES.length} free games - no download, no ads`;',1)
open(p,"w",encoding="utf-8").write(s)
PY
after=$(sha256sum $F | cut -c1-16)
[ "$before" != "$after" ] || { echo "MUTATION DID NOT LAND - the two arms would be identical"; exit 1; }

OG_OUT="$OUT" OG_ARM=BEFORE-count npx vitest run --config $CFG -t "as this arm draws it" 2>&1 | grep -E 'BEFORE-|count:' || true
echo "arms: $before (countless) -> $after (count)"
