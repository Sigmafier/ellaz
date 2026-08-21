# Press and blog outreach

**Status**: drafts. Nothing has been sent. The operator sends these.

**Destinations verified 2026-08-11** by fetching each one, not from memory:

| Destination | Status | Note |
|---|---|---|
| `https://www.geektime.co.il/` | 200 | the primary target - Israeli tech, dev readership |
| `https://www.themarker.com/` | 200 | tech desk, business angle |
| `https://www.ynet.co.il/` | 200 | consumer angle only, not the engineering story |
| `https://www.mako.co.il/` | 200 | consumer angle only |
| `https://www.calcalist.co.il/` | **403 to a script** | loads in a browser; the contact page must be found by hand |

---

## The parenting list, verified 2026-08-12 - and the two candidates it killed

The earlier version of this file left this list out on the grounds that naming blogs from
memory is how a draft ends up addressed to a site that shut down in 2019. That caution was
correct, and it was cheap to prove: **two of the first sites that came to mind do not
resolve at all.**

Every row below was fetched with a browser user agent, and each is scored on words of
readable prose and count of Hebrew characters. An invented domain was fetched in the same
batch as a control.

| Destination | Code | Words | Hebrew | Verdict |
|---|---|---|---|---|
| `basalon.co.il` | 200 | 20,159 | 18,459 | **best fit** - "what to do with the kids", exactly our reader |
| `horimnet.co.il` | 200 | 4,040 | 14,235 | strong - a parenting guides portal |
| `haaretz.co.il/family` | 200 | 1,763 | 25,780 | real, but a newspaper desk rather than a blog |
| `imaba.co.il` | 200 | 1,365 | 7,345 | good - a parenting portal with a contact form |
| `littleann.co.il` | 200 | 1,415 | 2,246 | moderate - gifts, design and tips |
| `atmag.co.il` | 200 | 721 | 2,880 | moderate - a magazine that runs a parenting issue |
| `mako.co.il/home-family` | 200 | 2,605 | 7,780 | real, consumer desk |
| `ynet.co.il/parents` | 200 | 2,904 | 14,139 | real, consumer desk |
| `kolzchut.org.il` | 200 | 795 | 4,233 | **dropped** - a rights wiki, not a fit |
| `parents.education.gov.il` | 200 | **228** | **10** | client-rendered shell; the probe learned nothing |
| `edu.gov.il` | 403 | 23 | 0 | redirects to gov.il and blocks scripts |
| **`kidsdo.co.il`** | **000** | 0 | 0 | **does not resolve** |
| **`gogomom.co.il`** | **000** | 0 | 0 | **does not resolve** |
| `zzzzz-not-real-xyzzy.co.il` | 000 | 0 | 0 | *the control, invented* |

**The control is what makes this a verified list rather than a hopeful one.** The invented
domain failed at DNS with `000` and zero words, so a `200` carrying thousands of Hebrew
characters is real information about a real site. That is the opposite of the Reddit and
AlternativeTo probes in this folder, where a real destination and an invented one answered
identically and the honest conclusion was that nothing had been learned.

And it paid immediately: `kidsdo.co.il` and `gogomom.co.il` both read like plausible
Israeli parenting sites and neither exists. Those are precisely the two rows that would
have shipped in a list written from memory.

### Contact routes, as far as a script could get

| Site | Route | Found |
|---|---|---|
| `basalon.co.il` | `/contact/` | 200, a form **and** a published address: `info@basalon.co.il` |
| `imaba.co.il` | `/contact.php` | 200, a contact form, no published address |
| `horimnet.co.il` | `/contact` | **404** - the real route was not found by a script |
| `littleann.co.il` | `/contact` | **404** - same |

The two 404s are not evidence the sites lack a contact page; their navigation did not
survive a raw fetch. Open those two in a browser.

One small trap worth recording, because it is the same class as everything else in this
folder: the address grep also matched `Spin@1x-1.0s-200px-200px.svg`, an SVG filename with
an `@` in it. It is excluded above. **A pattern written for one shape of input will happily
fire on another and report it with total confidence.**

### Before sending to any of them

Their fit is verified. Their **submission policy is not** - none of these publishes one in
a form a script can read. Read the site first, find a specific article, and name it. An
email with `[הכתבה הספציפית]` left as a placeholder is worse than no email.

---

## The pitch to Geektime

**The angle, and why it is not "a kids games site".** A tech publication has no reason to
run a games site. It has a reason to run an engineering story, and this one has three
that are true and documented: no backend at all, a first load smaller than most single
images, and a set of published post-mortems about failures that are invisible from a
browser. Lead with the last of those - it is the only part nobody else has written.

**Every number in the letter is derived**: 90,413 bytes gzipped is the first visit
measured on the built artifact by `scripts/assert-payload.mjs`, which fails the build
above 90,500. 33 games and 164 pages come from the roster and the emitted sitemap.

<!-- outreach-facts:off -->
**That figure has moved twice since this letter was first written, and the letter was
wrong both times.** It read 86,927 on a clean tree on 2026-08-11; eleven interface
languages landed that evening and the same script reported 88,234 at `799e2ef` on
2026-08-12; ten more games landed and it reads 90,027 at `1e219fe` on 2026-08-18. Every
one of those was honest when taken, which is the point: **a figure in an outgoing letter
carries the tree it was measured on, so re-measure before sending rather than trusting a
number written down last week.** `npm run assert:outreach` is that re-measurement.
<!-- outreach-facts:on -->

> **נושא:** אתר משחקים לילדים בעברית, בלי שרת ובלי פרסומות - והבאגים שאי אפשר לראות
> מהדפדפן
>
> שלום,
>
> בניתי אתר משחקים לילדים בעברית, ואני חושב שהחלק המעניין בו הוא דווקא ההנדסי.
>
> 33 משחקים, 164 עמודים, ואפס שרת. אין בסיס נתונים, אין הרשמה, אין איסוף מידע. הכל נשמר
> על המכשיר עצמו. הטעינה הראשונה שוקלת 90,413 בתים דחוסים, פחות מתמונה בודדת בכתבה
> ממוצעת, ויש בדיקה אוטומטית שמפילה את הבילד אם המספר עובר 90,500.
>
> אבל מה שהייתי כותב עליו הוא זה: תוך שבועיים האתר נשבר שלוש פעמים בשלוש דרכים שאף אחת
> מהן לא נראית מהדפדפן.
>
> ה-CDN החזיר לגוגלבוט 403 עם דף אתגר JavaScript שרובוט לא יכול לפתור, בזמן שהאתר נטען
> מושלם אצל כל אדם. גוגל דיווח "לא הצלחנו לקרוא את מפת האתר" ואפס עמודים.
>
> מנגנון ההעלאה שמר רישום על השרת של מה כבר הועלה. העברה אחת נכשלה אחרי שהרישום נכתב, ומאז
> כל העלאה השוותה את עצמה מול קובץ שטען שהחלקים החסרים כבר שם - ודילגה עליהם לנצח. הדיפלוי
> דיווח הצלחה תוך תשעים שניות, והאתר הציג דף לבן במשך שעה.
>
> ודף הבית הראשי הגיש 29 בתים לכל זוחל שלא מריץ JavaScript. גוגל מריץ, אז הוא ראה עמוד
> תקין. ChatGPT, Claude ו-Perplexity לא מריצים, אז מבחינתם הדף הראשי של האתר היה ריק
> במשך חודשים.
>
> המכנה המשותף הוא שכל בדיקה שכתבנו קראה את תיקיית הבילד, ואף אחת לא קראה את מה שהמשתמש
> באמת מקבל. זה נשמע טריוויאלי וזה עלה שלוש תקלות.
>
> הקוד פתוח תחת רישיון MIT, כולל התיעוד של כל אחת מהתקלות:
> https://github.com/Sigmafier/ellaz
>
> האתר עצמו: https://ellaz.fun
>
> אשמח לענות על שאלות, ואם זה לא מתאים - גם זה בסדר גמור.
>
> [שם], [טלפון]

**If they reply asking for the consumer angle instead**, that story is post 1 in
[`hebrew.md`](hebrew.md), not this letter. Do not merge the two - the engineering pitch
loses its point the moment it also has to explain why parents want it.

---

## The blog email template

Short on purpose. A cold email that opens by explaining itself is deleted at the second
paragraph.

> **נושא:** משחקים בעברית לילדים, בחינם ובלי פרסומות
>
> שלום [שם],
>
> קראתי את [הכתבה הספציפית] ואני פונה בעקבותיה.
>
> בניתי אתר משחקים לילדים בעברית: 33 משחקים, 24 מהם לגיל הרך. אין פרסומות, אין הרשמה,
> אין הורדה, ואין שום מקום להקליד בו טקסט - הילד מקבל שם מתוך רשימה, אז אין צ'אט ואין מה
> לפקח עליו. הכל נשמר על המכשיר ואין שרת.
>
> https://ellaz.fun
>
> אם זה מתאים לקוראים שלכם אשמח, ואם לא - תודה על הזמן.
>
> [שם]

**The `[הכתבה הספציפית]` line is not optional.** An email that could have been sent to
forty blogs was sent to forty blogs, and reads that way. If there is no specific article
to name, that blog is not on the list.

---

## Before any of this is sent

1. Fetch the destination as a crawler and confirm it is healthy - this site has twice
   pointed people at a page that was serving a challenge or a blank shell.
2. Confirm the live site is the current build (`scripts/assert-live.mjs` runs on deploy).
3. Never quote a player count, a rating or a download number. There is none - analytics
   has never produced data, so any such figure would be invented.
