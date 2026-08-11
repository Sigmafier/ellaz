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

**The parenting and education blog list is NOT yet verified and is deliberately absent
below.** Naming blogs from memory is how a draft ends up addressed to a site that shut
down in 2019. The email template is written and reusable; the list is a separate step,
and it is the only part of this file that is not ready to send.

---

## The pitch to Geektime

**The angle, and why it is not "a kids games site".** A tech publication has no reason to
run a games site. It has a reason to run an engineering story, and this one has three
that are true and documented: no backend at all, a first load smaller than most single
images, and a set of published post-mortems about failures that are invisible from a
browser. Lead with the last of those - it is the only part nobody else has written.

**Every number in the letter is derived**: 86,927 bytes gzipped is the first visit
measured on the built artifact by `scripts/assert-payload.mjs`, which fails the build
above 90,000. 23 games and 52 pages come from the roster and the emitted sitemap.

> **נושא:** אתר משחקים לילדים בעברית, בלי שרת ובלי פרסומות - והבאגים שאי אפשר לראות
> מהדפדפן
>
> שלום,
>
> בניתי אתר משחקים לילדים בעברית, ואני חושב שהחלק המעניין בו הוא דווקא ההנדסי.
>
> 23 משחקים, 52 עמודים, ואפס שרת. אין בסיס נתונים, אין הרשמה, אין איסוף מידע. הכל נשמר
> על המכשיר עצמו. הטעינה הראשונה שוקלת 86,927 בתים דחוסים, פחות מתמונה בודדת בכתבה
> ממוצעת, ויש בדיקה אוטומטית שמפילה את הבילד אם המספר עובר 90,000.
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
> בניתי אתר משחקים לילדים בעברית: 23 משחקים, 16 מהם לגיל הרך. אין פרסומות, אין הרשמה,
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
