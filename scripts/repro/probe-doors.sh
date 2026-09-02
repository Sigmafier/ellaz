#!/usr/bin/env bash
# Arc 4, 2026-09-02: the no-letter doors behind docs/outreach/exports/README.md § 2026-09-02.
# Usage: bash scripts/repro/probe-doors.sh   (read-only; ~1 min; needs curl)
# read-only: fetch a listing page, count anchors, count rel=nofollow, show 2 external hrefs
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36'
probe() {
  local name="$1" url="$2"
  local body code
  body=$(curl -sL -A "$UA" --max-time 20 -w '\n__CODE__%{http_code}' "$url" 2>/dev/null)
  code=${body##*__CODE__}; body=${body%__CODE__*}
  local bytes=${#body}
  local anchors=$(grep -oiE '<a\b[^>]*href=' <<<"$body" | wc -l)
  local nofollow=$(grep -oiE '<a\b[^>]*rel="[^"]*nofollow' <<<"$body" | wc -l)
  local ext=$(grep -oiE '<a\b[^>]*href="https?://[^"]+"' <<<"$body" | grep -viE "$(sed -E 's#https?://([^/]+).*#\1#' <<<"$url" | sed 's/^www\.//')" | head -3 | grep -oE 'href="[^"]+"' | tr '\n' ' ')
  printf '%-22s %s %7dB anchors=%-4s nofollow=%-4s ext: %s\n' "$name" "$code" "$bytes" "$anchors" "$nofollow" "${ext:0:140}"
}
probe osgameclones     https://osgameclones.com/
probe osgc-2048        https://osgameclones.com/2048/
probe alternativeto    https://alternativeto.net/software/sudoku-com/
probe saashub          https://www.saashub.com/sudoku-com-alternatives
probe progressiveapp   https://progressiveapp.store/
probe findpwa          https://findpwa.com/
probe pwa-directory    https://pwa-directory.appspot.com/
probe appscope         https://appsco.pe/
probe softonic-webapps https://en.softonic.com/web-apps
probe refseek-edu      https://www.refseek.com/directory/educational_games.html
probe sldirectory      https://www.sldirectory.com/teachf/educationalgames.html
probe rcls-games       https://guides.rcls.org/websites_nanuetlibrary/games/
probe commonsense      https://www.commonsensemedia.org/website-reviews
probe ms-store-sample  https://apps.microsoft.com/detail/9NBLGGH4NNS1
probe indiedb          https://www.indiedb.com/games/browser
probe wikidata-q       https://www.wikidata.org/wiki/Q117467
