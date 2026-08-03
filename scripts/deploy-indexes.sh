#!/usr/bin/env bash
#
# Create the composite indexes in firestore.indexes.json on the live project.
#
# THIS REPO'S CI DOES NOT DO THIS — same as scripts/deploy-rules.sh. An index
# declared in the JSON but never applied is invisible from the source tree, and
# its absence does not show up until a query runs in production and fails with a
# 400 that reads like a bug in the query rather than a missing index.
#
# Two things worth knowing before reading the output:
#
#   1. Creating an index is ASYNCHRONOUS. The create call returns a long-running
#      operation immediately, and the index is useless until its state reaches
#      READY. On an empty collection that is fast; on a full one it is not. So
#      this script waits, rather than printing a success it has not earned.
#
#   2. Re-running is safe. An index that already exists answers 409, which is
#      treated as "fine, it is there" — the script is meant to be run after
#      every edit to the JSON without anyone having to work out which entries
#      are new.
set -euo pipefail

PROJECT=ellaz-games
SA=ellaz-bootstrap@${PROJECT}.iam.gserviceaccount.com
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPEC="$ROOT/firestore.indexes.json"
API="https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/collectionGroups"

TOKEN=$(gcloud auth print-access-token --impersonate-service-account="$SA")

echo "== creating indexes from firestore.indexes.json =="
python3 - "$SPEC" > /tmp/ellaz-index-list.txt <<'PY'
import json, sys
spec = json.load(open(sys.argv[1], encoding="utf-8"))
for idx in spec["indexes"]:
    body = {"queryScope": idx["queryScope"], "fields": idx["fields"]}
    print(idx["collectionGroup"] + "\t" + json.dumps(body))
PY

while IFS=$'\t' read -r GROUP BODY; do
  LABEL=$(python3 -c '
import json,sys
b = json.loads(sys.argv[1])
print(", ".join(f["fieldPath"] + " " + f["order"][:4] for f in b["fields"]))' "$BODY")
  RESP=$(curl -sS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$BODY" \
    "${API}/${GROUP}/indexes")
  if grep -q '"error"' <<<"$RESP"; then
    if grep -q "already exists" <<<"$RESP"; then
      echo "  exists   ${GROUP}: ${LABEL}"
    else
      echo "  FAILED   ${GROUP}: ${LABEL}"
      echo "$RESP"
      exit 1
    fi
  else
    echo "  created  ${GROUP}: ${LABEL}"
  fi
done < /tmp/ellaz-index-list.txt

# The part that actually proves something: read back every index on the
# collection and refuse to report success while any of them is still building.
echo "== waiting for every index to reach READY =="
for attempt in $(seq 1 60); do
  LIST=$(curl -sS -H "Authorization: Bearer $TOKEN" "${API}/scores/indexes")
  SUMMARY=$(python3 -c '
import json,sys
d = json.load(sys.stdin)
idx = d.get("indexes", [])
states = {}
for i in idx:
    states[i.get("state","?")] = states.get(i.get("state","?"),0)+1
print(json.dumps(states))
print(len(idx))
' <<<"$LIST")
  STATES=$(head -1 <<<"$SUMMARY")
  COUNT=$(tail -1 <<<"$SUMMARY")
  echo "  attempt ${attempt}: ${COUNT} index(es) ${STATES}"
  if ! grep -q "CREATING" <<<"$STATES"; then
    break
  fi
  sleep 10
done

echo "== live indexes on 'scores' =="
curl -sS -H "Authorization: Bearer $TOKEN" "${API}/scores/indexes" | python3 -c '
import json,sys
d = json.load(sys.stdin)
rows = d.get("indexes", [])
if not rows:
    print("NONE — nothing was created."); sys.exit(1)
for i in rows:
    fields = ", ".join(f.get("fieldPath","?") + " " + f.get("order","")[:4]
                       for f in i.get("fields", [])
                       if f.get("fieldPath") != "__name__")
    state = i.get("state", "?")
    print("  %-9s %s" % (state, fields))
missing = [i for i in rows if i.get("state") != "READY"]
sys.exit(1 if missing else 0)
'
echo "OK  every index is READY. Now run: npm run probe:cloud"
