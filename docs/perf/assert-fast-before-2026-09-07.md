# assert:fast — the BEFORE run, 2026-09-07T15:59:48Z

Recorded before any fix landed, so the gate is known to fire rather than
merely known to be green. Controls: 12/12 classified correctly.

```
reading what blocks the first paint on https://ellaz.fun

https://ellaz.fun/
FAIL  / — /assets/shell-DkfkxXv9.css @imports a third-party stylesheet:
        https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;800&family=Fredoka:wght@500;600&display=swap
        Nothing can preload it: it is not discoverable until this file
        has downloaded and parsed. Name the font in the document head.
  ok  all 1 blocking stylesheet(s) are first-party
FAIL  / — third-party script in <head>, not deferred:
        https://www.googletagmanager.com/gtag/js?id=G-E25QBB8420
        Every visitor and every audit pays for this before anyone has
        asked for anything. Inject it on the first interaction instead.
FAIL  / — the body face (heebo) is not preloaded in this page's head.
        0 font preload(s) found. A font declared only in CSS
        starts downloading after that CSS parses, which is the whole bug.

https://ellaz.fun/he/
FAIL  /he/ — /assets/shell-DkfkxXv9.css @imports a third-party stylesheet:
        https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;800&family=Fredoka:wght@500;600&display=swap
        Nothing can preload it: it is not discoverable until this file
        has downloaded and parsed. Name the font in the document head.
FAIL  /he/ — render-blocking stylesheet on a third-party origin:
        https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;800&amp;family=Fredoka:wght@500;600&amp;display=swap
        The first paint waits on a DNS lookup and a TLS handshake to a
        host we do not control. Serve it ourselves.
FAIL  /he/ — third-party script in <head>, not deferred:
        https://www.googletagmanager.com/gtag/js?id=G-E25QBB8420
        Every visitor and every audit pays for this before anyone has
        asked for anything. Inject it on the first interaction instead.
FAIL  /he/ — the body face (heebo) is not preloaded in this page's head.
        0 font preload(s) found. A font declared only in CSS
        starts downloading after that CSS parses, which is the whole bug.

https://ellaz.fun/games/snake/
FAIL  /games/snake/ — /assets/shell-DkfkxXv9.css @imports a third-party stylesheet:
        https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;800&family=Fredoka:wght@500;600&display=swap
        Nothing can preload it: it is not discoverable until this file
        has downloaded and parsed. Name the font in the document head.
FAIL  /games/snake/ — render-blocking stylesheet on a third-party origin:
        https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;800&amp;family=Fredoka:wght@500;600&amp;display=swap
        The first paint waits on a DNS lookup and a TLS handshake to a
        host we do not control. Serve it ourselves.
FAIL  /games/snake/ — third-party script in <head>, not deferred:
        https://www.googletagmanager.com/gtag/js?id=G-E25QBB8420
        Every visitor and every audit pays for this before anyone has
        asked for anything. Inject it on the first interaction instead.
FAIL  /games/snake/ — the body face (heebo) is not preloaded in this page's head.
        0 font preload(s) found. A font declared only in CSS
        starts downloading after that CSS parses, which is the whole bug.

FAIL  11 blocking problem(s) on the served pages.
exit: 1
```
