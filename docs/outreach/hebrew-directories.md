# Hebrew directories and editors - four letters, four different rooms

**Status**: fired - **all four letters were sent on 2026-08-29**, each with its
own row in `ledger.md` and a verdict due 2026-11-27. The fifth destination in
this file, `ecat.education.gov.il`, is a filed procurement route rather than a
letter and stays a draft. The operator sent every one of these personally,
signed as a parent who built the thing, from their own address.

**Why this file is separate from `hebrew.md`.** That file is the TRAFFIC lane -
Facebook groups, where every link is `nofollow` by construction, so it moves
visits and cannot move ranking. This file is the AUTHORITY lane: four Hebrew
destinations whose real outbound anchors were measured and carry no `nofollow`.
The two lanes are deliberately not run at once, so a change in position at the
ninety-day mark has one candidate cause rather than two.

**Signed and addressed 2026-08-29**, both confirmed by the operator: every
letter ends with `יתיר` and `yatiroffer@gmail.com`. There are no placeholders
left in this file, and the send log below is what says whether a letter has
actually left.

## The send log - one row per door, written BEFORE it is sent

**This table is the record of what was FILLED and what was SENT, and they are
two different columns on purpose.** A filled form is a browser tab; a sent one
is a thing a stranger has read. Nothing here may be marked `SENT` by anyone
who did not press the button, because the button is the only event that
matters and it is the operator's to press.

The ledger row in `ledger.md` stays `draft` until all four are sent - it is
per-SURFACE and this lane is one surface. This table is per-DOOR, which is the
grain a person actually works at.

| # | Destination | The door | Mechanism | Filled | Sent | Reply |
|---|---|---|---|---|---|---|
| 1 | `digitalpedagogy.co` | <https://www.digitalpedagogy.online/contact> | Wix form + reCAPTCHA. Name / email / subject / message. The editor's own *ליצירת קשר* link points here | **2026-08-29, byte-verified** `b4ceaae9` | **2026-08-29, CONFIRMED ON THE WIRE** - `POST /_api/wix-forms/v1/submit-form` → **200** | due 2026-11-27 |
| 2 | `kef-lilmod.co.il` | <https://www.kef-lilmod.co.il/צור-קשר/> | Elementor form, no CAPTCHA. Name / email / message | **2026-08-29, byte-verified** `8d5bf534` | **2026-08-29 by the operator** — see the receipt note below | due 2026-11-27 |
| 3 | `portal.macam.ac.il` | <https://portal.macam.ac.il/צרו-קשר/> | Gravity Form, no CAPTCHA. Name / email / message, plus a HONEYPOT (`input_2_4`, label *Comments*, `display:none`) that must stay EMPTY | **2026-08-29, byte-verified** `4e671884` | **2026-08-29, CONFIRMED BY THE SERVER** - `תודה על הודעתך.` and the form gone | due 2026-11-27 |
| 4 | `pop.education.gov.il` | <mailto:pop@education.gov.il> | plain email - no form exists. Needs the operator's own mailbox | **2026-08-29, byte-verified** `bd9d4274` | **2026-08-29 by the operator**, from a pre-filled Gmail compose link | due 2026-11-27 |

**`Filled` carries a checksum, not a tick.** Each is the first eight hex of the
SHA-256 of the letter body read back OUT of the live field, compared against the
same hash computed on this file. That is the whole point of the column: on
2026-08-28 a letter was typed into a form by hand and one word came out
misspelled - *ובריינפוף* for *ובריינפופ*, BrainPOP, to a curator who lists
BrainPOP - and reading it back carefully did not catch it. A hash does.

**All four went on 2026-08-29.** The lane is live and the next thing that
happens is a reading in late November. Reading a filled form is the operator's step and pressing send is the
operator's step; both stay that way. See `reach-doctrine` RCH2 for why the row
is written first.

## Three doors, three completely different kinds of evidence

**This is the finding worth keeping from 2026-08-29.** The operator reported
sending all three. The artifacts disagreed with that in two different
directions, and only reading the pages back showed it:

| Door | What the operator said | What the PAGE said |
|---|---|---|
| 3 `portal.macam` | sent | **agreed, and better**: `תודה על הודעתך.` rendered by Gravity Forms, the form element gone from the DOM. A SERVER confirmation - the strongest evidence available anywhere in this lane |
| 2 `kef-lilmod` | sent, no confirmation email | **nothing to read** - the tab was closed before it could be checked, and no receipt exists in any case. Unverifiable, permanently |
| 4 `pop.education.gov.il` | sent | **not checked YET, but checkable** - it is an email, so a copy is sitting in the operator's Sent folder. The Gmail connector was expired all afternoon and only activates on a Claude Code restart, so confirming it is a next-session job rather than an impossible one |
| 1 `digitalpedagogy` | sent | **contradicted it, on the first attempt.** All 1003 characters still in the textarea, the name still in its field, zero success markers. It went on the SECOND attempt once the reCAPTCHA was solved by hand |

Door 1's cause was two lines away: `#g-recaptcha-response` was **empty**, and
the form carries an `input[type=checkbox][required]` that was unchecked. The
reCAPTCHA had never been solved, so the submit was refused - silently, with no
error text rendered anywhere on the page. **Solving a CAPTCHA is not something
this agent may do, so this door needed a human hand and always did.** The
operator solved it and it went the same afternoon.

### Door 1 second attempt: an empty form is NOT evidence, and the network log is

When the letter went, the check had to answer a question the page cannot:
**a cleared form and a reloaded page look identical.** Both show an empty
textarea and no success text. Wix renders no confirmation string at all here,
so the rendered DOM was never going to settle it.

Three readings did, in increasing order of strength:

| Reading | Says |
|---|---|
| the textarea went 1003 → 0 | consistent with a submit AND with a reload |
| `performance.timeOrigin` = 10:51:24, **1455 s before the check** | the document NEVER reloaded. So the same DOM that held the letter cleared itself in place - that is a submit handler, nothing else |
| `POST /_api/wix-forms/v1/submit-form` → **200** | the server ACCEPTED it. Preceded by `recaptcha/enterprise/userverify` → 200, followed by a `generate_lead` analytics event carrying `Form Name: Contact` |

**The transferable rule: when a UI gives no confirmation, read the wire.** A
network log distinguishes the two states the DOM collapses into one, and a
document's own age is the cheap control that rules out a reload. Neither costs
anything, and here the DOM alone would have returned *"probably sent"* for a
door worth more than the other three.

**The transferable rule: a send is not an event you can be told about.** Ask the
page. A confirmation the server rendered, or a form that has cleared, is
evidence; a memory of clicking is not, and here it was wrong once out of the two
times it could be checked. The cost of not asking would have been a door
recorded as spent, never followed up, and silently never sent at all.

**Four doors produced four different grades of evidence, and the grade is worth
recording beside the date.** `UNVERIFIABLE` and `NOT YET CHECKED` look identical
in a tick-box and are completely different facts: one is closed forever, the
other is a task. Door 2 can never be confirmed by anything except a link
appearing on the page; door 4 can be confirmed in thirty seconds by a session
whose Gmail connector is awake. Only the send log says which is which.

**No confirmation email is expected, and its absence proves nothing.** The
operator's report was *"not sure since i didnt get confirmation email"* — but
every form here notifies the SITE OWNER and sends the sender no receipt at all.
There is no signal on our side to read: not a bounce, not a copy, nothing. The
only instrument that can answer *did it land* is the link appearing on
`kef-lilmod.co.il`, which is what the 2026-11-27 verdict date is for.

**So this row is `SENT, delivery unverifiable`, and it must not be re-sent on
the strength of the silence.** A duplicate letter to a curator who already has
one is a worse outcome than a letter that quietly failed. If nothing appears by
the verdict date, the next move is a short, different follow-up that says it is
a follow-up — never the same letter again.

**Two facts about door 1 that the day's re-read turned up** (RCH3), and neither
was known when the letter was written:

- The form belongs to `digitalpedagogy.online`, the courses campus, not to
  `digitalpedagogy.co`, the encyclopedia. It is still the right door - the
  editor's own contact link on `.co` points at it.
- It carries a notice: *"שימו לב: טופס זה אינו מיועד לשאלות והתייעצויות בנוגע
  לכלים דיגיטליים. הודעות מסוג זה לא יענו."* - this form is not for questions
  or consultations about digital tools, and such messages will not be answered.
  Our letter is a submission for the encyclopedia rather than a request for
  help, so the subject line was written to say exactly that. It is a real risk
  and it is the operator's to weigh before pressing send.

## What was measured, and when

**2026-08-29.** Every destination was fetched with a browser user-agent and its
outbound anchors counted for `rel="nofollow"`. `dofollow` below means the
attribute was counted on that site's own outbound links, not assumed.

**This reading expires.** `reach-doctrine` RCH3 requires the destination's rules
be re-read on the day of sending, never from notes. Re-run the counts before
sending; a site can add `nofollow` site-wide in one afternoon.

| # | Destination | What it is | Measured 2026-08-29 |
|---|---|---|---|
| 1 | `digitalpedagogy.co` | *כלים קטנים גדולים* - the Hebrew encyclopedia of digital tools for education, one post per tool, edited by one named person | outbound links on a real tool post **DOFOLLOW**; latest post 2026-08-06; page states 14,289,837 visits |
| 2 | `kef-lilmod.co.il/אתרי-העשרה/` | a curated shelf of enrichment sites for parents and children | **43 external anchors, ZERO nofollow**; already lists Starfall, BrainPOP, Davidson, Eureka |
| 3 | `portal.macam.ac.il` | *פורטל מס"ע* - the Israeli teacher-colleges portal, `.ac.il` | **21 dofollow** outbound to Duolingo, Khan Academy, BrainPOP, Kahoot, Quizlet |
| 4 | `pop.education.gov.il` | *המרחב הפדגוגי*, the Ministry's portal for teaching staff, `.gov.il` | **33 dofollow, 19 distinct hosts** incl. Nearpod, BrainPOP, Padlet - **and it links to `digitalpedagogy.co`** |
| 5 | `ecat.education.gov.il` | *הקטלוג החינוכי* - the Ministry's catalogue of approved tools and games, `.gov.il` | `/applyvendor` **verified to exist**; has a `ללא עלות` filter and a `כלי בינלאומי` type. Formal procurement - forms, criteria, tenders. **No letter here; it is a process, not a pitch** |

**Destination 4 is downstream of destination 1.** The Ministry's pedagogical
portal already cites `digitalpedagogy.co`. That is the order to work in, and it
is a measured relationship rather than a guess about how influence flows.

## What was ruled OUT, and why

Recorded so the next quarter does not re-derive it.

| Destination | Verdict | Evidence |
|---|---|---|
| **FXP.co.il** (1.7M users, ~600 forums) | **FORBIDDEN** | Terms of use §3.1.5 bans *"any advertising, including by posting websites, ads, services or products, both in the forums and in private messages"*. Not a grey area. A 2009 news item about FXP banning "game links" is a red herring - that was pirated games |
| **Tapuz parenting forums** | **DEAD** | The site posts daily, so it reads alive. Its relevant sections do not: `להיות-הורים` and `מערכת-החינוך-ואנחנו` last posted **2020-06-04**; `הורים-לילדים-ביסודי` **2025-02-26**; `גני-ילדים` **2025-04-25**. The best relevant forum, `משחקי-לוח`, sat at **2026-01-13** |
| **Hebrew Wikipedia** | **DO NOT SELF-ADD** | Its external-links guideline refuses links whose purpose is to *"promote a commercial interest"*, and adding one's own site is a conflict of interest. Every Wikipedia external link is `nofollow`, so it buys no authority - only risk. A third party adding us is welcome; it is not an action we take |
| **lainyan.co.il** (kids index, 191 outbound, dofollow, updated 2026-08-24) | **FORBIDDEN** | Its own `AD.htm` reads *"פרסום וקידום - לפרסום מאמרים/קישורים מקדמים"* - it sells article and promotional-link placement. `reach-doctrine` RCH7 is IRON: no purchased links |
| **davidson.weizmann.ac.il**, **cet.ac.il** / `sodmaya` | not a fit | Publishers, not shelves. Davidson's 160 outbound anchors reach 8 hosts, all its own properties, vendors and social; CET's pages carry no third-party outbound links at all |
| **baba-mail.co.il** | not a fit | Real curated list (17 dofollow, good company), but an ad-driven content site and the article is old. Low probability, and the route is `פרסם אצלנו` |

**The transferable finding is the Tapuz one: a forum's site-wide activity is not
its section's activity.** The front page showed posts from that morning. The
sections we would have posted in had been silent for up to six years. A
candidate check that stops at the homepage reports the opposite of the truth.

## The facts every letter may use

Derived, never estimated. `npm run assert:outreach` re-checks each one against
the tree and fails on a stale figure.

| Claim | Where it comes from |
|---|---|
| 42 games, 25 of them for young children | `src/games/*/meta.ts`, counting `ageBand: "kids"` |
| free, no ads, no account, no download | there is no backend and no ad SDK in the tree |
| nothing to type, anywhere | `src/sdk/names.ts` - a name is two word ids from a fixed pool, so there is no text field |
| works offline after the first visit | the PWA precaches the shell (`vite.config.ts` workbox) |
| the interface speaks 11 languages; four have written pages | `APP_LOCALES` and `PAGE_LOCALES` in `src/i18n/locales.ts` |
| Arabic is one of the eleven interface languages | `APP_LOCALES` includes `ar`. **There are no Arabic articles** - do not imply otherwise |
| a phone and a tablet are two separate players | everything is in `localStorage`; the backup code in the room screen is the only transfer |

**What no letter may say**, because nothing measures it: a download count, a
rating, a number of players, or any claim that a child learned something. The
analytics key has never been set, so there is no such number and inventing one
is the one thing that would end every relationship in this file at once.

---

## Post - digitalpedagogy.co

**Where**: כלים קטנים גדולים, the Hebrew encyclopedia of digital tools for education. One named editor (אפרת מעטוף), one post per tool.
**Go**: https://digitalpedagogy.co/
**Do**: Send this FIRST, whatever else goes out this week - pop.education.gov.il already cites her, so a yes here warms the Ministry letter. Find her contact on the site; do not paste this into a comment.

<!-- outreach-games: spell, letters, math, nonogram -->

Opens on the one property her catalogue cares about and nobody else lists:
a tool that needs no account, so it can be handed to a class in thirty seconds.

> שלום רב,
>
> אני קורא את "כלים קטנים גדולים" כבר תקופה, בעיקר בגלל שאת בודקת כלים לפי מה
> שהם עושים בכיתה ולא לפי מה שהם מבטיחים.
>
> בניתי אתר משחקים לילדים בשם Ellaz, בהתחלה בשביל הילדים שלי, והוא הגיע למקום
> שבו נראה לי שהוא שייך למאגר שלך. הכתובת: https://ellaz.fun/he/
>
> מה שרלוונטי למורה: אין הרשמה ואין מה להקליד, בשום מקום. לא שם משתמש, לא
> סיסמה, לא אימייל. פותחים קישור ומשחקים. אחרי הביקור הראשון זה עובד גם בלי
> אינטרנט. אין פרסומות ואין תשלום, וגם לא יהיו - אין באתר שום קוד של רשת
> פרסום.
>
> יש 42 משחקים, 25 מהם לגיל הרך. הקרובים ביותר לתחומי הדעת:
> אות פותחת, מרכיבים מילה, חשבון וציור לפי מספרים.
> הממשק מדבר 11 שפות, כולל ערבית.
>
> המגבלה, כדי שלא תגלי אותה לבד: אין שום פאנל למורה. אין כיתות, אין מעקב,
> אין דוחות התקדמות, ואין דרך לדעת מי שיחק במה. זה נבנה בלי חשבונות מתוך
> החלטה, והמחיר של ההחלטה הזאת הוא בדיוק זה. לכן זה כלי לתחנה, לחמש דקות
> בסוף שיעור או לילד שסיים לפני כולם - לא כלי לניהול למידה.
>
> אם זה מתאים למאגר, אשמח. אם לא, גם זה בסדר גמור, ותודה על מה שאת כותבת.
>
> יתיר
> yatiroffer@gmail.com

---

## Post - kef-lilmod.co.il

**Where**: אתרי לימוד והעשרה - a curated shelf of enrichment sites for parents and children. 43 external anchors, zero nofollow.
**Go**: https://www.kef-lilmod.co.il/%D7%90%D7%AA%D7%A8%D7%99-%D7%94%D7%A2%D7%A9%D7%A8%D7%94/
**Do**: Use the contact form at https://www.kef-lilmod.co.il/צור-קשר/ - this is the one destination of the four that has a form rather than a person.

<!-- outreach-games: memory, sudoku, flow -->

A different opening entirely: this one is addressed to a person who curates
*for parents*, so it leads on the thing a parent notices in the first minute.

> היי,
>
> הגעתי לעמוד "אתרי לימוד והעשרה" שלכם דרך חיפוש על משהו אחר לגמרי, ונשארתי
> בו עשרים דקות. הרשימה הזאת באמת נבחרה ולא נאספה.
>
> אני אבא שבנה אתר משחקים לילדים - https://ellaz.fun/he/ - ואני חושב שהוא
> יושב טוב לצד סטארפול ובריינפופ שכבר יש שם.
>
> הדבר שהורה מרגיש מיד: אין רגע שבו המשחק עוצר ומבקש כסף, ואין פרסומת בין
> שלב לשלב. אין הרשמה, אין הורדה, ואין שום שדה טקסט - הילד אפילו לא בוחר שם,
> כי השמות נשלפים מרשימה סגורה. אחרי הכניסה הראשונה זה עובד גם במטוס.
>
> 42 משחקים, 25 לגיל הרך, מזיכרון לקטנים ועד סודוקו וצינורות
> לגדולים ולמבוגרים שנשארו לשחק אחרי שהילד הלך לישון.
>
> מה שהוא לא: זו לא תוכנית לימודים ולא שיטה ללימוד קריאה. אין רצף, אין
> שלב א' ואחריו שלב ב', ואף אחד לא יסיים אותו וידע לקרוא. זה מדף של משחקים
> טובים שבמקרה גם מלמדים משהו.
>
> אם הוא מתאים לרשימה - נהדר. תודה בכל מקרה על העמוד.
>
> יתיר
> yatiroffer@gmail.com

---

## Post - portal.macam.ac.il

**Where**: פורטל מס"ע, the Israeli teacher-colleges portal. `.ac.il`, 21 dofollow outbound to Duolingo, Khan Academy, BrainPOP, Kahoot.
**Go**: https://portal.macam.ac.il/article/educational-applications-hebrew/
**Do**: This is an editorial desk, not a submission box - the ask is inclusion in a round-up. Do NOT strip the paragraph admitting there is no efficacy research; it is the reason the letter is credible in an academic room.

<!-- outreach-games: math -->

Academic room, so this one leads on a design decision that can be defended
rather than on features, and states plainly what has not been studied.

> לכבוד מערכת פורטל מס"ע,
>
> ראיתי שהפורטל מרכז סקירות של כלים וסביבות דיגיטליות לעולם החינוך. אני פונה
> בעניין אתר שבניתי, ואני מקדים ואומר שאני לא חוקר ולא מוסד - אני הורה
> שכתב את זה בשביל הילדים שלו, וההצעה היא לשיקולכם.
>
> Ellaz - https://ellaz.fun/he/ - 42 משחקים בדפדפן, בחינם, בלי חשבון ובלי
> פרסומות.
>
> שלוש החלטות שנראות לי ראויות לדיון בפורטל שקוראים בו אנשי חינוך:
>
> אין עונש על טעות. בשום משחק אין חיים שנגמרים, אין ניקוד שיורד ואין מסך
> "הפסדת". תשובה שגויה מחזירה את המצב לקדמותו ותו לא. בחשבון, למשל,
> טעות פשוט לא מתקדמת.
>
> אין הקלדה ואין שם חופשי. לכל שחקן נשלף שם מתוך רשימה סגורה. זה נראה
> כמו פרט קטן, והוא מוציא את כל נושא הפיקוח על תוכן שמשתמשים כותבים מחוץ
> למערכת - אין מה לסנן, כי אין מה להקליד.
>
> הכול נשאר במכשיר. אין שרת, אין חשבון ואין איסוף מידע על ילדים. המחיר:
> טלפון וטאבלט הם שני שחקנים שונים.
>
> מה שאין: אין מחקר, אין מדידת אפקטיביות ואין טענה שמישהו למד משהו. אין
> לי נתונים כאלה ואני לא מתכוון להציג כאלה. אם הפורטל בוחן כלים לפי ראיות,
> זו נקודת החולשה של הפנייה הזאת ונכון שתדעו אותה מראש.
>
> בברכה,
> יתיר
> yatiroffer@gmail.com

---

## Post - pop.education.gov.il

**Where**: המרחב הפדגוגי, the Ministry's portal for teaching staff. `.gov.il`, 33 dofollow over 19 hosts.
**Go**: https://pop.education.gov.il/teaching-tools/teaching-practices/search-teaching-practices/digital-tools-building-knowledge-distance-learning/
**Do**: Keep the sentence saying Arabic is interface-only and there are no Arabic articles. Overstating language coverage to this reader is the one error they will check.

<!-- outreach-games: letters, spell -->

Last and most specific. Leads on reach and equity, because that is what the
Ministry's own space is organised around, and it is genuinely where this
architecture is unusual.

> שלום,
>
> אני פונה בעניין כלי חינמי שעשוי להתאים למרחב הפדגוגי, ובמיוחד לסעיף הכלים
> הדיגיטליים.
>
> Ellaz - https://ellaz.fun/he/ - 42 משחקים לילדים בדפדפן.
>
> הסיבה שאני חושב שהוא שייך דווקא כאן היא מה שהוא דורש מהילד, שזה כמעט כלום:
>
> - בלי חשבון ובלי הקלדה. אין הרשמה, אין סיסמה, אין אימייל. ילד שלא יודע
>   לקרוא עדיין יכול להיכנס לבד.
> - עובד בלי אינטרנט אחרי הכניסה הראשונה. זה נכתב מראש לילדים שהחיבור
>   בבית שלהם לא יציב.
> - רץ על מכשיר ישן. הביקור הראשון שוקל 53,121 בתים דחוסים. זה נמדד, לא
>   מוערך, וזה בערך גודל של תמונה אחת.
> - הממשק מדבר 11 שפות, ובהן ערבית ורוסית. חשוב לדייק: זה הממשק בלבד -
>   כתבות והסברים קיימים בארבע שפות, וערבית איננה אחת מהן.
>
> משחקי השפה הקרובים ביותר לתוכנית: אות פותחת ומרכיבים מילה.
> במרכיבים מילה אות שגויה פשוט לא נדבקת - הילד לא מקבל מסך של טעות, הוא
> פשוט מנסה שוב.
>
> מה שאין: אין אישור נגישות פורמלי, אין פאנל למורה ואין דוחות. זה כלי
> יחיד, לא סביבת למידה.
>
> תודה,
> יתיר
> yatiroffer@gmail.com

---

## ecat.education.gov.il - not a letter, and deliberately not a `## Post`

The Ministry's catalogue takes suppliers through `/applyvendor`: an application,
dedicated forms, published criteria, and eligibility for tenders. It wants a
supplier entity, and it is measured in months.

It is filed rather than dropped because the catalogue genuinely has a
`ללא עלות` filter and a `כלי בינלאומי` type, so a free tool is not out of place
in it. **Do not wait on it, and do not let it hold up the four letters above.**

## Before any of these is sent

1. **Re-run the `rel` count** on that destination. This file's reading is dated
   2026-08-29 and RCH3 wants the rules read on the day.
2. **Re-read the destination's own terms** for an advertising clause. FXP cost
   nothing to check and would have cost a day to discover afterwards.
3. **Confirm the ledger row exists** for that surface, with its verdict date at
   +90 days (RCH2). The row goes in before the letter goes out.
4. **Run `npm run assert:outreach`**, so no letter leaves carrying a stale number.
5. **Fill `יתיר` and `yatiroffer@gmail.com`.**

**No verdict before roughly 2026-11-27** (`seo-doctrine` SEO11). An earlier
reading measures the freshness boost and can reverse a strategy that is working.
