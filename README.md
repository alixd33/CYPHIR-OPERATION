# OPERATION: CIPHER v2.2.1 (Desktop Offline PC Edition)

نسخه قابل اجرای دسکتاپ **OPERATION: CIPHER v2.2.1** بر اساس معماری **TDS v2.2.1** — یک بازی ماجراجویی تحقیقاتی، کارآگاهی و آموزشی (ریاضی پایه نهم) با اجرای کاملاً آفلاین برای ویندوز 10/11.

## ویژگی‌های پیاده‌سازی‌شده (v2.2.1)
- **دو صحنه دو‌بعدی Pixel Art قابل گشت‌وگذار:** `cipher_hq` (مقر مرکزی ژنو) و `server_room_7` (اتاق سرور 7) با حرکت `WASD / Arrows` و کلیک، تشخیص برخورد و تعامل با اشیا و NPCها (`E` / `Enter`).
- **4 موتور مستقل + مدیر توقف:**
  - `MathEngine` (`src/engines/mathEngine.js`): مستقل از داستان و UI، جایگشت پایدار `choiceOrder`، حذف گزینه (`elim_1` -> 3 گزینه، `elim_2` -> 2 گزینه)، راهنمای 3 سطحی بدون کاهش پایداری.
  - `InvestigationEngine` (`src/engines/investigationEngine.js`): کشف مدارک بخش‌بندی‌شده (`segments`)، ساخت/ویرایش/حذف نرم فرضیه‌های کاربر با حفظ `editHistory`، و ارزیابی چندمسیره (`Path A` بهینه با فیلم دوربین، `Path B` جایگزین با تله‌متری حرارتی و رک پشتیبان، و گزارش زودهنگام/اشتباه).
  - `ExplorationEngine` (`src/engines/explorationEngine.js`): مدیریت صحنه‌ها، برخورد، و دیالوگ‌های شرطی.
  - `OperationDirector` (`src/engines/operationDirector.js`): گراف فعالیت DAG بدون چرخه، پیامدهای Idempotent، و مدیریت گزارش زودهنگام.
  - `PauseManager` (`src/engines/pauseManager.js`): توقف کامل بازی با `ESC`، فریز تایمر و حرکت، تنظیمات، ذخیره و بازگشت به منو، و خروج امن.
- **ذخیره‌سازی آفلاین و بازیابی:** `IDBStore` (`operation_cipher_db` v2 با 4 مخزن و پشتیبان چرخشی اتمیک) + مهاجرت `v2.0.0 -> v2.2.0` + کنترل صحت Checksum + Service Worker آفلاین (`public/sw.js`).
- **بانک سوالات ریاضی نهم:** 30 سوال تاییدشده از فصل‌های 1، 2، 4، 5 و 7 با توزیع متوازن گزینه‌ها (`[8, 8, 7, 7]`) و ایزوله‌سازی فرمول‌ها در جهت `LTR`.

## اجرای پروژه (Windows 10/11 & Node.js 18+)
- روی ویندوز: اجرای `start-cipher.bat` برای راه‌اندازی و `stop-cipher.bat` برای توقف امن سرور.
- از خط فرمان:
  - اجرا: `npm start` (پورت پیش‌فرض `4173`)
  - تست‌های واحد و موتورها: `npm test`
  - تست کامل مرورگر (نیازمند Chromium): `npm run test:e2e`
