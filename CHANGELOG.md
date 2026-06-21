# Changelog

## [0.1.0]

### Added

- הזרקת CSS אוטומטית לקבצי ה-CSS של Kiro Chat עם כללי RTL
- זיהוי כיוון אוטומטי באמצעות `unicode-bidi: plaintext` ו-`direction: auto`
- בלוקי קוד נשארים תמיד LTR
- גיבוי אוטומטי של קבצי CSS לפני שינוי
- פקודות: Activate, Deactivate, Open Logs
- הגדרות: `kiroRtl.enabled`, `kiroRtl.logging.level`
- Output Channel עם rate limiting ורמות לוג
- Re-injection אוטומטי אם Kiro מתעדכנת ודורסת את ה-CSS
