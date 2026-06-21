# Kiro Chat RTL Auto-Direction

תוסף Kiro IDE לזיהוי אוטומטי של כיוון טקסט (RTL/LTR) בחלון השיחה (Chat Panel).

הודעות בעברית מוצגות RTL, הודעות באנגלית מוצגות LTR, ובלוקי קוד נשארים תמיד LTR — הכל אוטומטית, בלי שתצטרכו להגדיר דבר.

---

## איך זה עובד

התוסף מוצא את קבצי ה-CSS של Kiro Chat על הדיסק ומוסיף להם כללי CSS עם `unicode-bidi: plaintext` ו-`direction: auto`. הדפדפן עצמו מזהה את כיוון הטקסט לפי התו הראשון בכל פסקה.

- בלוקי קוד נשארים תמיד LTR
- תיבת הקלט מזהה כיוון אוטומטית
- נוצר גיבוי של הקובץ המקורי לפני כל שינוי
- דורש reload חד-פעמי אחרי injection ראשוני
- אם Kiro מתעדכנת ודורסת את ה-CSS, התוסף מזהה ומזריק מחדש בהפעלה הבאה

---

## התקנה והפעלה

### דרישות מקדימות

- [Node.js](https://nodejs.org/) (v18+)
- [Kiro IDE](https://kiro.dev/)

### שלב 1 — Build

```bash
git clone <repo-url>
cd extention
npm install
npm run build
```

### שלב 2 — יצירת VSIX

```bash
npm run package
```

הפקודה תייצר קובץ `kiro-chat-rtl-auto-direction-0.1.0.vsix` בתיקיית הפרויקט.

### שלב 3 — התקנה ב-Kiro IDE

1. פתחו את Kiro IDE
2. פתחו את Command Palette: `Ctrl+Shift+P`
3. הריצו: **Extensions: Install from VSIX...**
4. בחרו את קובץ ה-`.vsix` שנוצר
5. לחצו **Reload Now** כשתתבקשו (או סגרו ופתחו את Kiro)

### שלב 4 — אימות

אחרי ה-reload, התוסף יפעל אוטומטית:
- פתחו את חלון השיחה (Chat) וכתבו הודעה בעברית — הטקסט אמור להיות מיושר לימין
- כתבו הודעה באנגלית — הטקסט אמור להיות מיושר לשמאל
- בלוקי קוד בתשובות תמיד יישארו LTR

---

## פיתוח (Development Mode)

אם אתם רוצים לפתח או לדבג את התוסף:

1. פתחו את תיקיית הפרויקט ב-Kiro IDE
2. הריצו `npm install` ו-`npm run build`
3. לחצו `F5` — ייפתח חלון Extension Development Host
4. בחלון החדש, פתחו את Chat ובדקו שה-RTL עובד

לבנייה אוטומטית בזמן פיתוח:
```bash
npm run watch
```

---

## פקודות

פתחו את Command Palette (`Ctrl+Shift+P`) והקלידו "Kiro RTL":

| פקודה | תיאור |
|--------|--------|
| **Kiro RTL: Activate** | הזרקת CSS לקבצי Kiro Chat ו-reload |
| **Kiro RTL: Deactivate** | הסרת CSS (שחזור מגיבוי) ו-reload |
| **Kiro RTL: Open Logs** | פתיחת Output Channel עם הלוגים של התוסף |

---

## הגדרות

פתחו Settings (`Ctrl+,`) וחפשו "kiroRtl":

| הגדרה | ברירת מחדל | תיאור |
|--------|-------------|--------|
| `kiroRtl.enabled` | `true` | הפעלה/השבתה של התוסף. שינוי דורש reload |
| `kiroRtl.logging.level` | `"warn"` | רמת לוג מינימלית: `info` / `warn` / `error` |

---

## פתרון בעיות

### התוסף לא מזהה את קבצי ה-CSS

פתחו את הלוגים (`Kiro RTL: Open Logs`) ובדקו אם יש הודעת "No Kiro agent chat CSS files found". ייתכן ש-Kiro מותקנת במיקום לא סטנדרטי.

### ה-RTL לא מופיע אחרי התקנה

ודאו שעשיתם reload לחלון (`Ctrl+Shift+P` → `Developer: Reload Window`). ה-CSS מוזרק לדיסק ונטען רק בעת טעינת ה-webview מחדש.

### עדכון Kiro הסיר את ה-RTL

זה צפוי — עדכוני Kiro דורסים את קבצי ה-CSS. התוסף מזהה את זה אוטומטית בהפעלה הבאה ומציע להזריק מחדש.

### בלוקי קוד מופיעים RTL

זה לא אמור לקרות. אם זה קורה, פתחו issue עם צילום מסך.

---

## מבנה הפרויקט

```
src/
  extension.ts              — entry point, commands, lifecycle
  injection/
    KiroCssInjector.ts      — מציאת CSS, הזרקה, גיבוי, הסרה
  logging/
    OutputChannelLogger.ts  — structured logging עם rate limiting
```

---

## קרדיט

הפרויקט הזה קיבל השראה מ-[claude-code-rtl](https://github.com/yechielby/claude-code-rtl) מאת [@yechielby](https://github.com/yechielby), שמיישם RTL אוטומטי עבור Claude Code. הגישה של הזרקת CSS ישירות לקבצי ה-extension נלקחה משם והותאמה ל-Kiro IDE.

---

## רישיון

MIT
