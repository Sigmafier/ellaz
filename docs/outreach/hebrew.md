# Hebrew outreach - three posts, for three different rooms

**Status**: drafts. Nothing here has been posted. The operator posts all of these
personally, from their own account, in groups they already belong to.

**Why three and not one.** A post pasted into three groups reads as advertising in all
three and gets removed from at least one. These share facts and share nothing else: a
different opening, a different structure, a different admission, and a different reason
for the reader to care. If you find yourself wanting to shorten this to one, post only
the first and skip the others.

**Every number below is derived, not estimated - and so is every game NAME.**

Each post declares the games it names in an `outreach-games` comment, and
`npm run assert:outreach` checks both directions: every id must be in the roster,
and its Hebrew title must appear verbatim in the prose beneath. That is the
`provenance` pattern one step over, and it exists because this file offered
kindergarten teachers a game called **גדול וקטן** for nine days after it was
deleted from the tree (`0207a33`). Every gate here read numbers; a name that
leaves the repository is the same defect with no digits in it.

| Claim | Where it comes from |
|---|---|
| 33 games, 24 of them for young children | `src/games/*/meta.ts`, counting `ageBand: "kids"`, 2026-08-18 |
| no ads, no account, no download | there is no backend and no ad SDK in the tree |
| nothing to type, anywhere | `src/sdk/names.ts` - a name is two word ids from a fixed pool, so there is no text field to moderate |
| works offline after the first visit | the PWA precaches the shell (`vite.config.ts` workbox) |
| a phone and a tablet are two separate players | everything is in `localStorage`; the backup code in the room screen is the only transfer |

**House rules followed here**: written in Hebrew rather than translated from English, so
the rhythm is Hebrew rather than English wearing Hebrew words. Plain hyphens, never an em
dash. One honest limitation per post, stated before anyone discovers it themselves.

---

## Post 1 - parents of 3 to 8 year olds

<!-- outreach-games: -->

**Where**: general parenting groups. **Tone**: a parent, not a company.

> בנינו אתר משחקים לילדים, והוא באמת בחינם
>
> שלום לכולם. אני אבא, ובניתי משחקים לילדים שלי כי נמאס לי.
>
> כל אתר משחקים שהילדה שלי פתחה נגמר באותו מקום. פרסומת באמצע המשחק. כפתור "הורידו את
> האפליקציה". בקשה להירשם. פעם אחת היא לחצה על משהו שנראה כמו חלק מהמשחק, והגיעה לחנות
> אפליקציות.
>
> אז עשיתי אתר משלנו. יש בו 33 משחקים, 24 מהם לגיל הרך. הכל בעברית, מימין לשמאל, ועובד
> בטלפון, בטאבלט ובמחשב.
>
> מה שאין בו:
> אין פרסומות. בכלל.
> אין הרשמה ואין סיסמה.
> אין מה להוריד.
> אין שום מקום להקליד בו טקסט. הילד לא בוחר שם, הוא מקבל שם מתוך רשימה. אין צ'אט, אין
> תגובות, ואין אנשים אחרים.
>
> הכל נשמר על המכשיר עצמו. אין שרת שיודע מי הילד שלכם.
>
> דבר אחד שכדאי לדעת מראש: הטלפון והטאבלט הם שני שחקנים נפרדים. מטבעות שנאספו על הטלפון
> לא יופיעו על הטאבלט, אלא אם מעבירים אותם עם קוד הגיבוי שבמסך החדר. זה מבלבל בהתחלה.
>
> https://ellaz.fun
>
> אשמח לשמוע מה עובד ומה לא. בעיקר מה לא.

---

## Post 2 - gananot

<!-- outreach-games: memory, sort, vanish, shadows, sequence, finddiff, math, coloring -->

**Where**: kindergarten-teacher groups. **Tone**: a colleague offering a tool, with the
age-appropriateness reasoning shown rather than claimed.

> לגננות - אתר משחקים בעברית בלי פרסומות, לשימוש בגן
>
> שלום. בניתי אתר משחקים לילדים ואני חושב שהוא יכול להתאים לפינת המחשב בגן, אז אני משתף
> כאן.
>
> 24 מהמשחקים מיועדים לגיל הרך, בהם: זיכרון, מיון צבעים, מה נעלם, צל ותמונה, מה בא אחר כך, מצא
> הבדלים, חשבון וצביעה.
>
> שלושה דברים שחשבנו עליהם בגלל הגיל:
>
> אין שום טקסט להקליד, ואין צורך לדעת לקרוא כדי לנווט. כל משחק נפתח בלחיצה על תמונה.
>
> אין עונש על טעות. תשובה לא נכונה מרעידה את הכפתור, וזהו. אין צליל של כישלון ואין מסך
> "הפסדת".
>
> אפשר לשחק בלחיצה בלבד. גרירה היא אף פעם לא חובה, כי אצבע קטנה על מסך לא תמיד מצליחה
> להחזיק.
>
> האתר עובד גם בלי אינטרנט אחרי הפעם הראשונה, וזה שימושי בגן שבו החיבור לא יציב.
>
> הערה כנה: רמות הקושי הגבוהות מתסכלות בן ארבע. אל תתחילו מהן. יש בורר רמה בכל משחק,
> והרמה הראשונה היא הנכונה לגיל הרך.
>
> https://ellaz.fun
>
> אין לי מה למכור. אין באתר פרסומות, אין הרשמה ואין גרסה בתשלום.

---

## Post 3 - primary school teachers

<!-- outreach-games: math, sudoku, minesweeper, 2048, wordguess, memory, finddiff -->

**Where**: teacher groups, grades 1 to 3. **Tone**: practical, and it leads with the
limitation because this audience will ask about tracking within the first two replies.

> מורים לכיתות א-ג: 33 משחקים בעברית, בלי פרסומות ובלי חשבונות
>
> שלום. אני משתף אתר משחקים שבניתי, כי הוא פותר בעיה שהכרתי מהכיתה של הבת שלי: כל אתר
> משחקים חינמי דורש בסוף חשבון, או מציג פרסומת שאי אפשר לשלוט בה.
>
> מה שיכול להיות רלוונטי לכיתה:
>
> חשבון - תרגילי חיבור וחיסור עם בורר רמה.
> סודוקו - מגרסת חיות בלוח 4 על 4 ועד לוח 9 על 9 מלא.
> שולה מוקשים, 2048 ונחשו מילה - לכיתות הגבוהות יותר.
> זיכרון ומצא הבדלים - לזמן חופשי.
>
> הכל נפתח בכתובת אחת בדפדפן. אין התקנה, אין קוד כיתה, ואין ססמאות לחלק.
>
> מה שאין, וכדאי שתדעו לפני: אין ניהול כיתה, אין דוחות התקדמות, ואין דרך לראות מה תלמיד
> עשה. אין שרת בכלל, והכל נשמר על המכשיר שבו שיחקו. אם אתם צריכים מעקב אחרי תלמידים, זה
> לא הכלי המתאים.
>
> https://ellaz.fun

---

## Post 4 - the Ministry's Hebrew-language group

<!-- outreach-games: spell, letters, wordguess -->

**Where**: `הוראת השפה העברית ביסודי`, run by the Ministry of Education's
pedagogical secretariat. **Tone**: a colleague opening a design decision for
discussion, not offering a tool. **Why it is its own post**: post 3 names seven
games and not one of them is a language game, so pasting it into a Hebrew
teaching group is the roster arriving where the subject was Hebrew. This one
leads on `מרכיבים מילה`'s central decision, because that is the thing a Hebrew
teacher would actually have an opinion about.

**It links to `/he/games/learn/`, never the home page** - the learning category
in Hebrew, which is where the three games below live. Verified 200 to Googlebot
2026-08-23.

> שלושה משחקים לעברית ביסודי, ושיקול אחד שהנחה אותם
>
> שלום. בניתי אתר משחקים לילדים, ושלושה מהם עוסקים ישירות בעברית. אני משתף כאן
> בעיקר בגלל החלטה אחת בעיצוב שלהם, שאשמח לשמוע עליה דעות.
>
> ב"מרכיבים מילה" הילד רואה תמונה ומרכיב את שמה אות אחר אות, מתוך מגש אריחים.
> ההחלטה: אריח שגוי לעולם לא מונח. לחיצה עליו מרעידה אותו ומוציאה אותו מהמשבצת
> הנוכחית, כך שהמילה שעל המסך נכונה בכל רגע שהילד מסתכל בה.
>
> האפשרות השנייה, שלא בחרנו בה, היא לתת למלא את כל המשבצות ולבדוק בסוף. זה בוחן
> איות במקום ללמד אותו, ובגיל הצעיר זה נגמר בשורת אותיות שגויה שאי אפשר להצביע על
> מה בדיוק לא בסדר בה.
>
> ברמה הראשונה אין אריחים מסיחים כלל. במגש יש בדיוק את אותיות המילה, כך שהמשימה
> היא סדר בלבד - מיומנות מוקדמת ושונה מלזהות שאות מסוימת לא שייכת למילה.
>
> "אות פותחת" הוא הצעד שלפניו: תמונה, ובאיזו אות השם שלה מתחיל. המילה עצמה לא
> מוצגת ככתב, כי זה היה מוסר את התשובה.
>
> "נחשו מילה" הוא לכיתות הגבוהות יותר - ניחוש מילה, עם סימון של אותיות שנמצאות
> במקום ושל אותיות שנמצאות אבל לא במקום.
>
> מגבלה שכדאי לדעת מראש: רשימות המילים קבועות, ואין דרך להוסיף מילים משלכם או
> להתאים אותן לאוצר המילים של הכיתה. אם אתם מחפשים כלי שמתיישר עם תוכנית הלימודים
> שלכם, זה לא הוא.
>
> הכל בחינם, בלי פרסומות, בלי הרשמה ובלי התקנה:
> https://ellaz.fun/he/games/learn/
>
> אשמח לשמוע אם ההחלטה על האריח השגוי נכונה בעיניכם, או שדווקא יש ערך בלתת לטעות
> להישאר על המסך.

**The honest limitation is REAL and was verified, not softened**: `words.ts` in
both games is a fixed list with no custom-word entry point (`grep -rniE
"custom|addWord|userWord|editable"` returns nothing in either directory). A
teacher cannot align it to their own vocabulary, and this audience is the one
that will ask.

---

## The destinations - and the one part of RCH5 nobody here can do

RCH5 says the destination is fetched the way its readers see it before anything is
pitched to it. **For these three posts that cannot be satisfied from this repository,
and saying so is the finding rather than a gap in the work.**

Measured 2026-08-21, twice: a direct fetch of a Facebook group returns its TITLE and
nothing else. No rules, no pinned post, no member count, no About panel - for a public
group and a private one alike. A search index holds more (Perplexity's snippet for
`מורות משקיעות` carried rule text a direct fetch could not see), but that is somebody
else's crawl on somebody else's date, which is exactly what "fetched the way its readers
see it" excludes.

So the candidates below are NAMED, with what is known about each and where that knowledge
came from. **The rules themselves are read by the operator, in the group, on the day**,
and the checklist at the end is what that read has to produce.

### Post 1 - parents

| Group | Where | What is known, and from where |
|---|---|---|
| הורות בזכות | `facebook.com/groups/Horotb` | describes itself as the largest parents' group in Israel. Rights and legislation, which is a poor room for a games link |
| מאמאזון · סופר מאמא · אמהות בסטייל · הצודקת | indexed at `mamamiterany.co.il` | general parenting advice, several with daily activity. Leads, not verified rooms |
| ynet's ten | `ynet.co.il/parents/article/sjmflflti` | a round-up from 2023. Three years old, so every entry is a lead to re-check |

### Post 2 - gananot

| Group | Where | What is known |
|---|---|---|
| מנהלי הגיל הרך בישראל | `facebook.com/groups/541317406624168` | the closest match to this post's audience anywhere: gananot, nursery managers and early-years staff, described as a professional space for sharing and learning |

### Post 3 - teachers

| Group | Where | What is known |
|---|---|---|
| מורות משקיעות | `facebook.com/groups/morot.mashkiot` | **has a brokered promotion channel.** The group's own text directs anyone wanting to promote to it to contact a named person by phone, and separately bars whole topics from the main group |

### Post 4 - the Ministry's Hebrew-language group

| Group | Where | What is known |
|---|---|---|
| הוראת השפה העברית ביסודי | `facebook.com/groups/2392746324230224` | a PUBLIC group run by the Ministry of Education's pedagogical secretariat. **Post 3 does not belong here** - it names seven games and not one of them is a language game, so it arrives as a roster in a room whose subject is Hebrew. Post 4 was written for it, leading on `מרכיבים מילה`, `אות פותחת` and `נחשו מילה`, and linking to `/he/games/learn/` rather than the home page |


**The מורות משקיעות finding is the transferable one.** A room with a paid or brokered
promotion channel reads an unbrokered link as somebody dodging it, and the fact that the
thing being linked is free changes nothing about how it reads. Look for that channel
before posting anywhere; if it exists, use it or pick a different room.

### The checklist, completed in the group, on the day

- [ ] Read the rules TODAY - the pinned post and the About panel, not a memory of them
- [ ] Does it forbid links? Forbid promotion? Hold posts for admin approval?
- [ ] Is there a paid or brokered promotion channel? If yes: use it, or leave
- [ ] Does a free thing you built yourself count as promotion HERE? When it is not
      obvious, ask an admin before posting. A question costs nothing; a removed post
      costs standing in a room you cannot get back into
- [ ] Are you actually a member, and have you posted here before as a person?
- [ ] Write the ledger row BEFORE the post goes out (RCH2)

---

## If someone asks "why did you build this"

Keep it short and true. The long version reads as marketing.

> כי כל אתר משחקים שהילדים שלי פתחו רצה משהו מהם. או פרסומת, או הרשמה, או הורדה. רציתי
> מקום שפשוט נפתח ומשחקים בו.

## If someone asks "how do you make money"

The honest answer is the persuasive one. Do not soften it.

> אני לא. אין פרסומות, אין גרסה בתשלום ואין איסוף מידע. זה פרויקט צד, והקוד פתוח.

## What NOT to write

- Never a download count, a rating, a review or a number of players. There is no
  analytics data behind any of those - the PostHog key has never been set - so every one
  of them would be invented.
- Never "the best" or "the leading". Nothing measures that.
- Never post the same text in two groups.
- Never argue in the comments. A removed post costs nothing; an argument costs the account.
