#!/usr/bin/env bash
#
# Release firestore.rules to the live project.
#
# THIS REPO'S CI DOES NOT DO THIS. Both deploy workflows build and upload the
# site; neither touches Firestore. So an edit to firestore.rules that was never
# run through here is invisible from the source tree — the file says one thing
# and the database enforces another, with nothing anywhere reporting a problem.
# Run this after ANY rules edit, then run `npm run probe:cloud` to prove it.
#
# Two traps, both of which produce a confident-looking success:
#
#   1. Creating a ruleset is NOT releasing it. A ruleset is an inert, versioned
#      blob; the release is the pointer that makes one of them live. The create
#      call returns 200 with a lovely id whether or not anything is serving it.
#
#   2. POST /releases CREATES. It does not update. Once a release exists, POST
#      answers `409 Requested entity already exists` while every other line of
#      output looks fine, and the database keeps serving the OLD ruleset. The
#      first release of this project's life worked by POST; every one since has
#      needed PATCH. This script tries PATCH first for exactly that reason.
#
# Auth is by service-account IMPERSONATION — no key file is ever downloaded.
set -euo pipefail

PROJECT=ellaz-games
SA=ellaz-bootstrap@${PROJECT}.iam.gserviceaccount.com
RULES_FILE="$(cd "$(dirname "$0")/.." && pwd)/firestore.rules"
RELEASE="projects/${PROJECT}/releases/cloud.firestore"

TOKEN=$(gcloud auth print-access-token --impersonate-service-account="$SA")
BODY=$(mktemp)
trap 'rm -f "$BODY"' EXIT

# Build the payload in python so the rules text is JSON-escaped correctly — it
# is full of quotes, braces, newlines and non-ASCII.
python3 - "$RULES_FILE" > "$BODY" <<'PY'
import json, sys
src = open(sys.argv[1], encoding="utf-8").read()
print(json.dumps({"source": {"files": [{"name": "firestore.rules", "content": src}]}}))
PY

echo "== creating ruleset =="
CREATED=$(curl -sS -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @"$BODY" \
  "https://firebaserules.googleapis.com/v1/projects/${PROJECT}/rulesets")

NAME=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("name",""))' <<<"$CREATED")
if [ -z "$NAME" ]; then
  echo "NO RULESET NAME RETURNED — stopping before release"
  echo "$CREATED"
  exit 1
fi
echo "ruleset: $NAME"

echo "== releasing (PATCH, falling back to POST for a first release) =="
RESP=$(curl -sS -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"release\":{\"name\":\"${RELEASE}\",\"rulesetName\":\"${NAME}\"}}" \
  "https://firebaserules.googleapis.com/v1/${RELEASE}")

if grep -q '"error"' <<<"$RESP"; then
  echo "PATCH did not take, trying POST (expected only on a first release):"
  RESP=$(curl -sS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${RELEASE}\",\"rulesetName\":\"${NAME}\"}" \
    "https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases")
fi

# VERIFY, rather than trusting either call: read back what is actually live and
# assert it is the ruleset we just built. This is the only line in the script
# that proves anything.
LIVE=$(curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://firebaserules.googleapis.com/v1/${RELEASE}" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin).get("rulesetName",""))')

echo "live ruleset: $LIVE"
if [ "$LIVE" = "$NAME" ]; then
  echo "OK  the release points at the ruleset just built."
  echo "    Now run: npm run probe:cloud"
else
  echo "MISMATCH — the database is still serving a different ruleset."
  echo "$RESP"
  exit 1
fi
