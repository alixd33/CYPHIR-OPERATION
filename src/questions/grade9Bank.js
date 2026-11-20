/**
 * Grade 9 Mathematics Question Bank — OPERATION: CIPHER v2.2.1
 * Grounded in Grade 9 Textbook & final2.pdf (جزوه ریاضی پایه نهم)
 * Allowed Chapters ONLY: 1 (Sets), 2 (Real Numbers), 4 (Powers & Roots),
 * 5 (Algebraic Expressions), 7 (Rational Expressions).
 * 30 Validated Questions with balanced correctIndex distribution across 0..3.
 */

export const ALLOWED_CHAPTERS = [1, 2, 4, 5, 7];

export const QUESTION_BANK = [
  {
    "id": "Q-C1-T1",
    "isVariant": false,
    "variantOf": null,
    "curriculumRef": "ریاضی نهم - فصل 1 (جزوه ص 9: اشتراک مجموعه‌ها)",
    "chapter": 1,
    "topic": "اشتراک مجموعه‌ها",
    "subtopic": "مقایسه شناسه‌های ورود",
    "difficulty": {
      "mathematical": 1,
      "operational": 1,
      "narrative": 1
    },
    "questionType": "computational",
    "storyConnection": "مقایسه شناسه‌های ورود به سرور 7 در ساعت 02:00 و 02:15 برای یافتن عامل مشترک.",
    "questionText": "در دو گزارش مستقل از سرور 7، مجموعه شناسه‌های فعال در بازه نخست $A = \\{102, 105, 108, 114\\}$ و در بازه دوم $B = \\{105, 111, 114, 119\\}$ ثبت شده است. مجموعه $A \\cap B$ کدام است؟",
    "choices": [
      "$\\{102, 105, 108, 111, 114, 119\\}$",
      "$\\{105, 114\\}$",
      "$\\{102, 108\\}$",
      "$\\{111, 119\\}$"
    ],
    "correctIndex": 1,
    "hints": {
      "1": "اشتراک دو مجموعه شامل عضوهایی است که هم در $A$ و هم در $B$ باشند.",
      "2": "عضوهای $A$ را یکی‌یکی در $B$ جست‌وجو کنید.",
      "3": "تنها $105$ و $114$ در هر دو مجموعه هستند؛ پس $A \\cap B = \\{105, 114\\}$."
    },
    "solutionSteps": [
      "تعریف اشتراک: $A \\cap B = \\{x \\mid x \\in A \\text{ و } x \\in B\\}$.",
      "بررسی اعضا: $105 \\in A, B$ و $114 \\in A, B$.",
      "پاسخ نهایی: $\\{105, 114\\}$."
    ],
    "alternativeSolution": "در نمودار ون، ناحیه هم‌پوشانی دو دایره فقط شامل $105$ و $114$ است.",
    "commonMistake": "اشتباه گرفتن اشتراک ($\\cap$) با اجتماع ($\\cup$).",
    "suggestedTimeSec": 90,
    "rewardOC": 15,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C1-T1-V",
    "isVariant": true,
    "variantOf": "Q-C1-T1",
    "curriculumRef": "ریاضی نهم - فصل 1 (جزوه ص 9: تفاضل مجموعه‌ها)",
    "chapter": 1,
    "topic": "تفاضل مجموعه‌ها",
    "subtopic": "جداسازی شناسه‌های جدید",
    "difficulty": {
      "mathematical": 1,
      "operational": 1,
      "narrative": 1
    },
    "questionType": "computational",
    "storyConnection": "یافتن شناسه‌هایی که فقط در بازه دوم به سرور 7 وارد شده‌اند.",
    "questionText": "اگر $A = \\{201, 204, 209, 212\\}$ و $B = \\{204, 209, 215, 220\\}$ باشد، مجموعه $B - A$ کدام است؟",
    "choices": [
      "$\\{215, 220\\}$",
      "$\\{201, 212\\}$",
      "$\\{204, 209\\}$",
      "$\\{201, 212, 215, 220\\}$"
    ],
    "correctIndex": 0,
    "hints": {
      "1": "تفاضل $B - A$ شامل عضوهایی از $B$ است که در $A$ نباشند.",
      "2": "عضوهای مشترک $204$ و $209$ را از $B$ حذف کنید.",
      "3": "باقی‌مانده در $B$ برابر $\\{215, 220\\}$ است."
    },
    "solutionSteps": [
      "عضوهای مشترک $204$ و $209$ کنار گذاشته می‌شوند.",
      "تنها $215$ و $220$ در $B$ هستند و در $A$ نیستند."
    ],
    "alternativeSolution": "محاسبه $B - (A \\cap B) = \\{215, 220\\}$.",
    "commonMistake": "محاسبه $A - B$ به جای $B - A$.",
    "suggestedTimeSec": 90,
    "rewardOC": 0,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C1-T2",
    "isVariant": false,
    "variantOf": null,
    "curriculumRef": "ریاضی نهم - فصل 1 (جزوه ص 6: تعداد زیرمجموعه‌ها)",
    "chapter": 1,
    "topic": "تعداد زیرمجموعه‌ها",
    "subtopic": "ترکیب کلیدهای امنیتی",
    "difficulty": {
      "mathematical": 2,
      "operational": 1,
      "narrative": 1
    },
    "questionType": "conceptual",
    "storyConnection": "محاسبه تعداد ترکیب‌های ناتهی قابل ساخت از 4 کلید سخت‌افزاری گره ژنو.",
    "questionText": "از مجموعه کلیدهای $K = \\{k_1, k_2, k_3, k_4\\}$ چند زیرمجموعه ناتهی می‌توان ساخت؟",
    "choices": [
      "16",
      "14",
      "8",
      "15"
    ],
    "correctIndex": 3,
    "hints": {
      "1": "تعداد کل زیرمجموعه‌های یک مجموعه $n$ عضوی برابر $2^n$ است.",
      "2": "مجموعه تهی ($\\emptyset$) را از کل کم کنید.",
      "3": "$2^4 - 1 = 16 - 1 = 15$."
    },
    "solutionSteps": [
      "تعداد کل زیرمجموعه‌ها: $2^4 = 16$.",
      "حذف زیرمجموعه تهی: $16 - 1 = 15$."
    ],
    "alternativeSolution": "$4 + 6 + 4 + 1 = 15$.",
    "commonMistake": "فراموش کردن حذف مجموعه تهی و انتخاب 16.",
    "suggestedTimeSec": 95,
    "rewardOC": 15,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C1-T2-V",
    "isVariant": true,
    "variantOf": "Q-C1-T2",
    "curriculumRef": "ریاضی نهم - فصل 1 (جزوه ص 6: زیرمجموعه حاوی عضو معین)",
    "chapter": 1,
    "topic": "زیرمجموعه با شرط حضور",
    "subtopic": "کلید اجباری",
    "difficulty": {
      "mathematical": 2,
      "operational": 1,
      "narrative": 1
    },
    "questionType": "logical",
    "storyConnection": "تعداد حالت‌های دسترسی به شرط حضور حتمی کلید اصلی $k_1$.",
    "questionText": "مجموعه $K = \\{k_1, k_2, k_3, k_4, k_5\\}$ چند زیرمجموعه دارد که حتماً شامل $k_1$ باشند؟",
    "choices": [
      "32",
      "15",
      "16",
      "8"
    ],
    "correctIndex": 2,
    "hints": {
      "1": "حضور $k_1$ قطعی است؛ پس برای 4 عضو دیگر تصمیم می‌گیریم.",
      "2": "تعداد حالت برای 4 عضو باقی‌مانده برابر $2^4$ است.",
      "3": "$2^4 = 16$."
    },
    "solutionSteps": [
      "با کنار گذاشتن $k_1$، چهار عضو باقی می‌مانند.",
      "تعداد زیرمجموعه‌های شامل $k_1$ برابر $2^4 = 16$ است."
    ],
    "alternativeSolution": "نیمی از $2^5 = 32$ زیرمجموعه شامل $k_1$ هستند: $16$.",
    "commonMistake": "محاسبه $2^5 = 32$ بدون اعمال شرط.",
    "suggestedTimeSec": 95,
    "rewardOC": 0,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C1-T3",
    "isVariant": false,
    "variantOf": null,
    "curriculumRef": "ریاضی نهم - فصل 2 (جزوه ص 25: کسر بین دو کسر)",
    "chapter": 2,
    "topic": "مقایسه و یافتن عدد گویا",
    "subtopic": "کالیبراسیون کسر زمانی",
    "difficulty": {
      "mathematical": 2,
      "operational": 2,
      "narrative": 1
    },
    "questionType": "computational",
    "storyConnection": "پیدا کردن یک گام زمانی استاندارد با مخرج 24 بین دو گزارش کسرشده سرور.",
    "questionText": "کدام یک از کسرهای زیر با مخرج $24$ دقیقاً بین دو عدد گویای $\\frac{1}{3}$ و $\\frac{2}{5}$ قرار دارد؟",
    "choices": [
      "$\\frac{7}{24}$",
      "$\\frac{9}{24}$",
      "$\\frac{11}{24}$",
      "$\\frac{10}{24}$"
    ],
    "correctIndex": 1,
    "hints": {
      "1": "مخرج مشترک $3$ و $5$ و $24$ را در نظر بگیرید یا کسرها را اعشاری مقایسه کنید.",
      "2": "$\\frac{1}{3} \\approx 0.333$ و $\\frac{2}{5} = 0.400$.",
      "3": "$\\frac{9}{24} = \\frac{3}{8} = 0.375$ که بین $0.333$ و $0.400$ است."
    },
    "solutionSteps": [
      "تبدیل به مخرج 120: $\\frac{1}{3} = \\frac{40}{120}$ و $\\frac{2}{5} = \\frac{48}{120}$.",
      "از گزینه‌ها: $\\frac{9}{24} = \\frac{45}{120}$ که بین $40$ و $48$ است."
    ],
    "alternativeSolution": "مقایسه اعشاری: $0.333 < 0.375 < 0.4$.",
    "commonMistake": "انتخاب $\\frac{10}{24} = \\frac{5}{12} \\approx 0.416$ که از $\\frac{2}{5}$ بزرگ‌تر است.",
    "suggestedTimeSec": 105,
    "rewardOC": 20,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C1-T3-V",
    "isVariant": true,
    "variantOf": "Q-C1-T3",
    "curriculumRef": "ریاضی نهم - فصل 2 (جزوه ص 24: مقایسه کسرهای منفی)",
    "chapter": 2,
    "topic": "مقایسه اعداد گویا",
    "subtopic": "ترتیب تراز سیگنال",
    "difficulty": {
      "mathematical": 2,
      "operational": 2,
      "narrative": 1
    },
    "questionType": "comparison",
    "storyConnection": "تشخیص قوی‌ترین تراز سیگنال منفی در میان کانال‌های ورودی.",
    "questionText": "کدام یک از اعداد گویای زیر از بقیه بزرگ‌تر است؟",
    "choices": [
      "$-\\frac{3}{17}$",
      "$-\\frac{3}{11}$",
      "$-\\frac{3}{7}$",
      "$-\\frac{3}{5}$"
    ],
    "correctIndex": 0,
    "hints": {
      "1": "در کسرهای مثبت با صورت برابر، کسری بزرگ‌تر است که مخرج کوچکتری دارد؛ در اعداد منفی برعکس است.",
      "2": "به صفر نزدیک‌ترین عدد منفی، بزرگ‌ترین آن‌هاست.",
      "3": "چون $\\frac{3}{17}$ کوچک‌ترین قدر مطلق را دارد، $-\\frac{3}{17}$ بزرگ‌ترین است."
    },
    "solutionSteps": [
      "مقایسه قدر مطلق: $\\frac{3}{17} < \\frac{3}{11} < \\frac{3}{7} < \\frac{3}{5}$.",
      "با قرینه کردن، جهت نامساوی برعکس می‌شود: $-\\frac{3}{17}$ بزرگ‌ترین است."
    ],
    "alternativeSolution": "تقسیم تقریبی: $-0.176 > -0.272 > -0.428 > -0.6$.",
    "commonMistake": "اعمال قانون اعداد مثبت روی اعداد منفی.",
    "suggestedTimeSec": 100,
    "rewardOC": 0,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C2-T1",
    "isVariant": false,
    "variantOf": null,
    "curriculumRef": "ریاضی نهم - فصل 2 (جزوه ص 37: بازه‌های حقیقی)",
    "chapter": 2,
    "topic": "اشتراک بازه‌های حقیقی",
    "subtopic": "هم‌پوشانی پنجره ارسال",
    "difficulty": {
      "mathematical": 2,
      "operational": 2,
      "narrative": 2
    },
    "questionType": "comparison",
    "storyConnection": "یافتن بازه زمانی مشترک فعالیت دو فرستنده مخفی شبکه THE VEIL.",
    "questionText": "فرستنده اول در بازه $[-2, 5)$ و فرستنده دوم در بازه $(1, 7]$ فعال بوده‌اند. بازه هم‌پوشانی $[-2, 5) \\cap (1, 7]$ کدام است؟",
    "choices": [
      "$[1, 5]$",
      "$[-2, 7]$",
      "$(1, 5]$",
      "$(1, 5)$"
    ],
    "correctIndex": 3,
    "hints": {
      "1": "برای اشتراک بازه‌ها، بزرگ‌ترین کران پایین و کوچک‌ترین کران بالا را بگیرید.",
      "2": "نقطه $1$ در بازه دوم و نقطه $5$ در بازه اول عضو نیستند.",
      "3": "پاسخ بازه باز $(1, 5)$ است."
    },
    "solutionSteps": [
      "شرط اول: $-2 \\le x < 5$ و شرط دوم: $1 < x \\le 7$.",
      "اشتراک دو شرط: $1 < x < 5$ یعنی $(1, 5)$."
    ],
    "alternativeSolution": "رسم دو بازه روی محور و بررسی نقاط انتهایی توخالی.",
    "commonMistake": "بسته گذاشتن نقاط $1$ و $5$.",
    "suggestedTimeSec": 110,
    "rewardOC": 20,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C2-T1-V",
    "isVariant": true,
    "variantOf": "Q-C2-T1",
    "curriculumRef": "ریاضی نهم - فصل 2 (جزوه ص 37: بازه‌های حقیقی)",
    "chapter": 2,
    "topic": "اشتراک بازه‌ها",
    "subtopic": "بازه بسامد مجاز",
    "difficulty": {
      "mathematical": 2,
      "operational": 2,
      "narrative": 2
    },
    "questionType": "comparison",
    "storyConnection": "پالایش بسامد مشترک دو آنتن شنود در آزمایشگاه ژنو.",
    "questionText": "اشتراک دو بازه $[0, 6]$ و $(-3, 4)$ کدام است؟",
    "choices": [
      "$(0, 4]$",
      "$[0, 4]$",
      "$[0, 4)$",
      "$(-3, 6]$"
    ],
    "correctIndex": 2,
    "hints": {
      "1": "عدد $0$ در هر دو بازه هست، اما $4$ در بازه دوم نیست.",
      "2": "بازه مشترک از $0$ بسته تا $4$ باز است.",
      "3": "پاسخ $[0, 4)$ است."
    },
    "solutionSteps": [
      "$0 \\le x \\le 6$ و $-3 < x < 4$ نتیجه می‌دهد $0 \\le x < 4$.",
      "به صورت بازه: $[0, 4)$."
    ],
    "alternativeSolution": "بررسی عضویت مرزها در هر دو بازه.",
    "commonMistake": "انتخاب $(0, 4]$ با جابه‌جایی کروشه و پرانتز.",
    "suggestedTimeSec": 110,
    "rewardOC": 0,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C2-T2",
    "isVariant": false,
    "variantOf": null,
    "curriculumRef": "ریاضی نهم - فصل 2 (جزوه ص 38: قدر مطلق)",
    "chapter": 2,
    "topic": "معادله قدر مطلق",
    "subtopic": "انحراف دمای سرور 7",
    "difficulty": {
      "mathematical": 2,
      "operational": 2,
      "narrative": 2
    },
    "questionType": "computational",
    "storyConnection": "محاسبه مجموع نقاط دمایی مجاز از رابطه ثبت‌شده در سنسور حرارتی سرور 7.",
    "questionText": "اگر رابطه خطای سنسور به صورت $|2x - 6| = 10$ باشد، مجموع تمام مقادیر ممکن برای $x$ کدام است؟",
    "choices": [
      "8",
      "6",
      "10",
      "-2"
    ],
    "correctIndex": 1,
    "hints": {
      "1": "معادله $|u| = 10$ دو حالت دارد: $u = 10$ و $u = -10$.",
      "2": "مقادیر $x$ برابر $8$ و $-2$ می‌شوند.",
      "3": "$8 + (-2) = 6$."
    },
    "solutionSteps": [
      "$2x - 6 = 10 \\Rightarrow x = 8$.",
      "$2x - 6 = -10 \\Rightarrow x = -2$.",
      "مجموع: $8 + (-2) = 6$."
    ],
    "alternativeSolution": "مرکز تقارن $x = 3$ است و مجموع دو ریشه $2 \\times 3 = 6$ می‌شود.",
    "commonMistake": "حل کردن فقط حالت مثبت و انتخاب $8$.",
    "suggestedTimeSec": 115,
    "rewardOC": 22,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C2-T2-V",
    "isVariant": true,
    "variantOf": "Q-C2-T2",
    "curriculumRef": "ریاضی نهم - فصل 2 (جزوه ص 38: قدر مطلق)",
    "chapter": 2,
    "topic": "ساده‌سازی قدر مطلق",
    "subtopic": "اختلاف تقریبی",
    "difficulty": {
      "mathematical": 2,
      "operational": 2,
      "narrative": 2
    },
    "questionType": "computational",
    "storyConnection": "محاسبه دقیق فاصله سیگنال رادیکالی بدون تقریب.",
    "questionText": "حاصل عبارت $|2 - \\sqrt{5}| + |\\sqrt{5} - 3|$ کدام است؟",
    "choices": [
      "1",
      "$2\\sqrt{5} - 5$",
      "-1",
      "$5 - 2\\sqrt{5}$"
    ],
    "correctIndex": 0,
    "hints": {
      "1": "چون $\\sqrt{5} \\approx 2.23$ است، علامت داخل هر قدر مطلق را تعیین کنید.",
      "2": "$2 - \\sqrt{5} < 0$ و $\\sqrt{5} - 3 < 0$ است؛ پس هر دو قرینه می‌شوند.",
      "3": "$(\\sqrt{5} - 2) + (3 - \\sqrt{5}) = 1$."
    },
    "solutionSteps": [
      "چون $2 < \\sqrt{5} < 3$، داریم $|2 - \\sqrt{5}| = \\sqrt{5} - 2$.",
      "همچنین $|\\sqrt{5} - 3| = 3 - \\sqrt{5}$.",
      "جمع: $(\\sqrt{5} - 2) + (3 - \\sqrt{5}) = 1$."
    ],
    "alternativeSolution": "فاصله نقطه $\\sqrt{5}$ تا $2$ به علاوه فاصله‌اش تا $3$ برابر فاصله $2$ تا $3$ یعنی $1$ است.",
    "commonMistake": "برداشتن قدر مطلق بدون تغییر علامت عبارت‌های منفی.",
    "suggestedTimeSec": 115,
    "rewardOC": 0,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C2-T3",
    "isVariant": false,
    "variantOf": null,
    "curriculumRef": "ریاضی نهم - فصل 2 و 1 (جزوه ص 34: مجموعه اعداد گویا و گنگ)",
    "chapter": 2,
    "topic": "اشتراک مجموعه‌های عددی",
    "subtopic": "غربالگری داده‌های گنگ",
    "difficulty": {
      "mathematical": 3,
      "operational": 2,
      "narrative": 2
    },
    "questionType": "error_detection",
    "storyConnection": "جداسازی داده‌های گنگ واقعی از داده‌های گویای جعلی در بسته بایگانی.",
    "questionText": "اگر مجموعه $A = \\{\\sqrt{12}, \\sqrt{0.25} + \\frac{1}{2}, \\pi - 1, \\sqrt{2} + 3\\}$ و $\\mathbb{Q}$ مجموعه اعداد گویا باشد، $A \\cap \\mathbb{Q}$ کدام تک‌عضوی است؟",
    "choices": [
      "$\\{\\sqrt{12}\\}$",
      "$\\{\\pi - 1\\}$",
      "$\\{\\sqrt{2} + 3\\}$",
      "$\\{\\sqrt{0.25} + \\frac{1}{2}\\}$"
    ],
    "correctIndex": 3,
    "hints": {
      "1": "تنها عضو گویای مجموعه $A$ را پیدا کنید.",
      "2": "$\\sqrt{0.25} = 0.5 = \\frac{1}{2}$.",
      "3": "$0.5 + 0.5 = 1 \\in \\mathbb{Q}$."
    },
    "solutionSteps": [
      "$\\sqrt{12} = 2\\sqrt{3}$ و $\\pi - 1$ و $\\sqrt{2}+3$ گنگ هستند.",
      "$\\sqrt{0.25} + \\frac{1}{2} = \\frac{1}{2} + \\frac{1}{2} = 1$ گویاست."
    ],
    "alternativeSolution": "تبدیل $0.25 = \\frac{1}{4}$ و جذرگیری دقیق آن.",
    "commonMistake": "تصور گنگ بودن هر عبارت رادیکالی.",
    "suggestedTimeSec": 115,
    "rewardOC": 22,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C2-T3-V",
    "isVariant": true,
    "variantOf": "Q-C2-T3",
    "curriculumRef": "ریاضی نهم - فصل 2 (جزوه ص 31: کسر مولد اعشار متناوب)",
    "chapter": 2,
    "topic": "اعداد اعشاری متناوب",
    "subtopic": "تبدیل کد اعشاری",
    "difficulty": {
      "mathematical": 3,
      "operational": 2,
      "narrative": 2
    },
    "questionType": "computational",
    "storyConnection": "تبدیل کد اعشاری متناوب استخراج‌شده از لاگ ژنو به کسر دقیق.",
    "questionText": "شکل کسری ساده شده عدد اعشاری متناوب $0.\\overline{12}$ (یعنی $0.121212...$) کدام است؟",
    "choices": [
      "$\\frac{12}{100}$",
      "$\\frac{4}{30}$",
      "$\\frac{4}{33}$",
      "$\\frac{3}{25}$"
    ],
    "correctIndex": 2,
    "hints": {
      "1": "در اعشار متناوب ساده، صورت بدون اعشار و در مخرج به تعداد ارقام دوره گردش عدد $9$ می‌گذاریم.",
      "2": "دوره گردش $12$ دو رقمی است، پس مخرج $99$ می‌شود.",
      "3": "$\\frac{12}{99} = \\frac{4}{33}$."
    },
    "solutionSteps": [
      "$x = 0.121212... \\Rightarrow 100x = 12.1212...$",
      "تفریق: $99x = 12 \\Rightarrow x = \\frac{12}{99} = \\frac{4}{33}$."
    ],
    "alternativeSolution": "قاعده مستقیم کسر مولد: $\\frac{12}{99} = \\frac{4}{33}$.",
    "commonMistake": "گذاشتن مخرج $100$ به جای $99$.",
    "suggestedTimeSec": 115,
    "rewardOC": 0,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C3-T1",
    "isVariant": false,
    "variantOf": null,
    "curriculumRef": "ریاضی نهم - فصل 4 (جزوه ص 60: ضرب و تقسیم توان‌دارها)",
    "chapter": 4,
    "topic": "قوانین توان با پایه مشترک",
    "subtopic": "ظرفیت پردازش سرور",
    "difficulty": {
      "mathematical": 3,
      "operational": 2,
      "narrative": 2
    },
    "questionType": "computational",
    "storyConnection": "محاسبه توان پردازشی خوشه سرور 7 در زمان اوج بارگذاری.",
    "questionText": "حاصل ساده شده عبارت $\\frac{8^4 \\times 4^{-2}}{2^5}$ کدام است؟",
    "choices": [
      "$2^5$",
      "$2^3$",
      "$2^7$",
      "$2^2$"
    ],
    "correctIndex": 1,
    "hints": {
      "1": "پایه‌های $8$ و $4$ را به پایه $2$ تبدیل کنید.",
      "2": "$8^4 = 2^{12}$ و $4^{-2} = 2^{-4}$.",
      "3": "$\\frac{2^{12 - 4}}{2^5} = 2^{8 - 5} = 2^3$."
    },
    "solutionSteps": [
      "$8^4 = (2^3)^4 = 2^{12}$ و $4^{-2} = (2^2)^{-2} = 2^{-4}$.",
      "$\\frac{2^8}{2^5} = 2^3$."
    ],
    "alternativeSolution": "$\\frac{4096 \\times \\frac{1}{16}}{32} = 8 = 2^3$.",
    "commonMistake": "اشتباه در علامت توان مخرج هنگام انتقال به صورت.",
    "suggestedTimeSec": 120,
    "rewardOC": 25,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C3-T1-V",
    "isVariant": true,
    "variantOf": "Q-C3-T1",
    "curriculumRef": "ریاضی نهم - فصل 4 (جزوه ص 64: ساده کردن توان‌ها)",
    "chapter": 4,
    "topic": "قوانین توان",
    "subtopic": "تبدیل پایه 3",
    "difficulty": {
      "mathematical": 3,
      "operational": 2,
      "narrative": 2
    },
    "questionType": "computational",
    "storyConnection": "محاسبه نرخ فشرده‌سازی بسته‌های بایگانی خاموش.",
    "questionText": "مقدار عبارت $\\frac{9^3 \\times 27^{-1}}{3^2}$ برابر کدام گزینه است؟",
    "choices": [
      "$3$",
      "$3^2$",
      "$3^3$",
      "$1$"
    ],
    "correctIndex": 0,
    "hints": {
      "1": "پایه‌ها را بر حسب $3$ بنویسید.",
      "2": "$9^3 = 3^6$ و $27^{-1} = 3^{-3}$.",
      "3": "$\\frac{3^3}{3^2} = 3$."
    },
    "solutionSteps": [
      "تبدیل پایه‌ها به پایه 3: $9^3 = 3^6$ و $27^{-1} = 3^{-3}$.",
      "ساده‌سازی: $\\frac{3^6 \\times 3^{-3}}{3^2} = \\frac{3^3}{3^2} = 3$."
    ],
    "alternativeSolution": "$\\frac{729}{27 \\times 9} = 3$.",
    "commonMistake": "جمع کردن توان مخرج با صورت.",
    "suggestedTimeSec": 120,
    "rewardOC": 0,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C3-T2",
    "isVariant": false,
    "variantOf": null,
    "curriculumRef": "ریاضی نهم - فصل 4 (جزوه ص 66-67: نماد علمی)",
    "chapter": 4,
    "topic": "نماد علمی",
    "subtopic": "نرخ انتقال نانوسیگنال",
    "difficulty": {
      "mathematical": 3,
      "operational": 3,
      "narrative": 2
    },
    "questionType": "computational",
    "storyConnection": "محاسبه تاخیر تجمعی رله مخفی THE VEIL در مقیاس میکروثانیه با نماد علمی.",
    "questionText": "حاصل عبارت $\\frac{12.5 \\times 10^{-6}}{25 \\times 10^{-17}}$ به صورت نماد علمی استاندارد کدام است؟",
    "choices": [
      "$5 \\times 10^{11}$",
      "$0.5 \\times 10^{11}$",
      "$5 \\times 10^{13}$",
      "$5 \\times 10^{10}$"
    ],
    "correctIndex": 3,
    "hints": {
      "1": "در نماد علمی استاندارد $a \\times 10^n$، باید $1 \\le a < 10$ باشد.",
      "2": "$\\frac{12.5}{25} = 0.5$ و $\\frac{10^{-6}}{10^{-17}} = 10^{11}$.",
      "3": "$0.5 \\times 10^{11} = 5 \\times 10^{10}$."
    },
    "solutionSteps": [
      "تقسیم ضرایب: $\\frac{12.5}{25} = 0.5$.",
      "تقسیم توان‌های 10: $10^{-6 - (-17)} = 10^{11}$.",
      "تبدیل به نماد علمی استاندارد: $0.5 \\times 10^{11} = 5 \\times 10^{10}$."
    ],
    "alternativeSolution": "نوشتن $12.5 \\times 10^{-6} = 125 \\times 10^{-7}$ و تقسیم بر $25$.",
    "commonMistake": "انتخاب $0.5 \\times 10^{11}$ که شرط $1 \\le a < 10$ را نقض می‌کند.",
    "suggestedTimeSec": 120,
    "rewardOC": 25,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C3-T2-V",
    "isVariant": true,
    "variantOf": "Q-C3-T2",
    "curriculumRef": "ریاضی نهم - فصل 4 (جزوه ص 67: جمع در نماد علمی)",
    "chapter": 4,
    "topic": "جمع نماد علمی",
    "subtopic": "هم‌توان‌سازی سیگنال",
    "difficulty": {
      "mathematical": 3,
      "operational": 3,
      "narrative": 2
    },
    "questionType": "computational",
    "storyConnection": "جمع دو توان تابشی ثبت‌شده در آنتن آزمایشگاه.",
    "questionText": "نماد علمی حاصل جمع $7.2 \\times 10^{-6} + 0.04 \\times 10^{-5}$ کدام است؟",
    "choices": [
      "$7.6 \\times 10^{-7}$",
      "$2.88 \\times 10^{-6}$",
      "$7.6 \\times 10^{-6}$",
      "$7.24 \\times 10^{-5}$"
    ],
    "correctIndex": 2,
    "hints": {
      "1": "برای جمع دو عدد با نماد علمی، ابتدا توان‌های $10$ را یکسان کنید.",
      "2": "$0.04 \\times 10^{-5} = 0.4 \\times 10^{-6}$.",
      "3": "$(7.2 + 0.4) \\times 10^{-6} = 7.6 \\times 10^{-6}$."
    },
    "solutionSteps": [
      "تبدیل جمله دوم به توان $-6$: $0.04 \\times 10^{-5} = 0.4 \\times 10^{-6}$.",
      "جمع ضرایب: $7.2 + 0.4 = 7.6 \\Rightarrow 7.6 \\times 10^{-6}$."
    ],
    "alternativeSolution": "تبدیل هر دو به اعشار معمولی و سپس بازگرداندن به نماد علمی.",
    "commonMistake": "جمع ضرایب بدون هم‌توان کردن پایه $10$.",
    "suggestedTimeSec": 120,
    "rewardOC": 0,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C3-T3",
    "isVariant": false,
    "variantOf": null,
    "curriculumRef": "ریاضی نهم - فصل 4 و 2 (جزوه ص 72-73: رادیکال و گویا کردن)",
    "chapter": 4,
    "topic": "ساده‌سازی و گویا کردن رادیکال",
    "subtopic": "امضای دیجیتال",
    "difficulty": {
      "mathematical": 3,
      "operational": 3,
      "narrative": 3
    },
    "questionType": "multi_step",
    "storyConnection": "بازیابی امضای رادیکالی بسته داده THE VEIL پس از حذف نویز.",
    "questionText": "حاصل ساده شده عبارت $\\sqrt{50} + \\sqrt{18} - \\frac{4}{\\sqrt{2}}$ کدام است؟",
    "choices": [
      "$8\\sqrt{2}$",
      "$6\\sqrt{2}$",
      "$4\\sqrt{2}$",
      "$10\\sqrt{2}$"
    ],
    "correctIndex": 1,
    "hints": {
      "1": "هر رادیکال را بر حسب $\\sqrt{2}$ ساده و مخرج کسر را گویا کنید.",
      "2": "$\\sqrt{50} = 5\\sqrt{2}$، $\\sqrt{18} = 3\\sqrt{2}$ و $\\frac{4}{\\sqrt{2}} = 2\\sqrt{2}$.",
      "3": "$5\\sqrt{2} + 3\\sqrt{2} - 2\\sqrt{2} = 6\\sqrt{2}$."
    },
    "solutionSteps": [
      "$\\sqrt{50} = 5\\sqrt{2}$ و $\\sqrt{18} = 3\\sqrt{2}$.",
      "گویا کردن: $\\frac{4}{\\sqrt{2}} = \\frac{4\\sqrt{2}}{2} = 2\\sqrt{2}$.",
      "حاصل: $(5 + 3 - 2)\\sqrt{2} = 6\\sqrt{2}$."
    ],
    "alternativeSolution": "فاکتورگیری از $\\sqrt{2}$ پس از گویا کردن.",
    "commonMistake": "گویا نکردن مخرج کسر و نوشتن $8\\sqrt{2} - 2$.",
    "suggestedTimeSec": 125,
    "rewardOC": 25,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C3-T3-V",
    "isVariant": true,
    "variantOf": "Q-C3-T3",
    "curriculumRef": "ریاضی نهم - فصل 4 (جزوه ص 73: گویا کردن مخرج)",
    "chapter": 4,
    "topic": "گویا کردن مخرج",
    "subtopic": "ضریب فرکانس",
    "difficulty": {
      "mathematical": 3,
      "operational": 3,
      "narrative": 3
    },
    "questionType": "computational",
    "storyConnection": "اصلاح کسر ضریب فرکانس برای جلوگیری از خطای گرد کردن.",
    "questionText": "شکل گویا شده و ساده شده کسر $\\frac{6}{\\sqrt{3}}$ کدام است؟",
    "choices": [
      "$2\\sqrt{3}$",
      "$3\\sqrt{2}$",
      "$6\\sqrt{3}$",
      "$\\sqrt{2}$"
    ],
    "correctIndex": 0,
    "hints": {
      "1": "صورت و مخرج را در $\\sqrt{3}$ ضرب کنید.",
      "2": "مخرج برابر $3$ می‌شود.",
      "3": "$\\frac{6\\sqrt{3}}{3} = 2\\sqrt{3}$."
    },
    "solutionSteps": [
      "ضرب صورت و مخرج در $\\sqrt{3}$: $\\frac{6\\sqrt{3}}{3}$.",
      "ساده‌سازی $6$ بر $3$: حاصل $2\\sqrt{3}$ است."
    ],
    "alternativeSolution": "$6 = 2(\\sqrt{3})^2$.",
    "commonMistake": "تقسیم $6$ بر $3$ زیر رادیکال.",
    "suggestedTimeSec": 100,
    "rewardOC": 0,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C4-T1",
    "isVariant": false,
    "variantOf": null,
    "curriculumRef": "ریاضی نهم - فصل 5 (جزوه ص 81 و 90: اتحاد مزدوج و مربع)",
    "chapter": 5,
    "topic": "اتحاد مزدوج و مربع",
    "subtopic": "استخراج کلید ماتریس",
    "difficulty": {
      "mathematical": 3,
      "operational": 3,
      "narrative": 3
    },
    "questionType": "computational",
    "storyConnection": "استخراج تفاضل مربعات کلید از دو مقدار خلاصه‌شده در بسته امنیتی.",
    "questionText": "اگر $a + b = 9$ و $a - b = 3$ باشد، مقدار $a^2 - b^2$ چقدر است؟",
    "choices": [
      "12",
      "81",
      "18",
      "27"
    ],
    "correctIndex": 3,
    "hints": {
      "1": "از اتحاد مزدوج $a^2 - b^2 = (a - b)(a + b)$ استفاده کنید.",
      "2": "دو عدد داده‌شده را در هم ضرب کنید.",
      "3": "$9 \\times 3 = 27$."
    },
    "solutionSteps": [
      "نوشتن اتحاد مزدوج: $a^2 - b^2 = (a + b)(a - b)$.",
      "جایگذاری مقادیر: $9 \\times 3 = 27$."
    ],
    "alternativeSolution": "$a = 6, b = 3 \\Rightarrow 36 - 9 = 27$.",
    "commonMistake": "جمع کردن $9 + 3 = 12$.",
    "suggestedTimeSec": 105,
    "rewardOC": 25,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C4-T1-V",
    "isVariant": true,
    "variantOf": "Q-C4-T1",
    "curriculumRef": "ریاضی نهم - فصل 5 (جزوه ص 86: اتحادهای مکمل مربع)",
    "chapter": 5,
    "topic": "اتحاد مربع دوجمله‌ای",
    "subtopic": "شاخص همبستگی",
    "difficulty": {
      "mathematical": 3,
      "operational": 3,
      "narrative": 3
    },
    "questionType": "computational",
    "storyConnection": "محاسبه مجموع مربعات دو پارامتر همبستگی.",
    "questionText": "اگر $a + b = 7$ و $ab = 10$ باشد، مقدار $a^2 + b^2$ کدام است؟",
    "choices": [
      "49",
      "39",
      "29",
      "19"
    ],
    "correctIndex": 2,
    "hints": {
      "1": "$a^2 + b^2 = (a + b)^2 - 2ab$.",
      "2": "$7^2 - 2(10) = 49 - 20$.",
      "3": "پاسخ برابر $29$ است."
    },
    "solutionSteps": [
      "$(a+b)^2 = a^2 + b^2 + 2ab \\Rightarrow 49 = a^2 + b^2 + 20$.",
      "$a^2 + b^2 = 29$."
    ],
    "alternativeSolution": "$5^2 + 2^2 = 29$.",
    "commonMistake": "کم کردن $ab$ به جای $2ab$.",
    "suggestedTimeSec": 110,
    "rewardOC": 0,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C4-T2",
    "isVariant": false,
    "variantOf": null,
    "curriculumRef": "ریاضی نهم - فصل 5 (جزوه ص 91-92: تجزیه با جمله مشترک)",
    "chapter": 5,
    "topic": "تجزیه چندجمله‌ای",
    "subtopic": "قفل چندجمله‌ای",
    "difficulty": {
      "mathematical": 3,
      "operational": 3,
      "narrative": 3
    },
    "questionType": "conceptual",
    "storyConnection": "یافتن دو عامل سازنده کلید چندجمله‌ای برای دسترسی به بایگانی مدیر.",
    "questionText": "تجزیه کامل عبارت جبری $x^2 - 5x + 6$ کدام است؟",
    "choices": [
      "$(x + 2)(x - 3)$",
      "$(x - 2)(x - 3)$",
      "$(x - 1)(x - 6)$",
      "$(x + 2)(x + 3)$"
    ],
    "correctIndex": 1,
    "hints": {
      "1": "دو عدد بیابید که جمعشان $-5$ و ضربشان $+6$ باشد.",
      "2": "هر دو عدد منفی هستند: $-2$ و $-3$.",
      "3": "تجزیه: $(x - 2)(x - 3)$."
    },
    "solutionSteps": [
      "$(-2) + (-3) = -5$ و $(-2)(-3) = +6$.",
      "$x^2 - 5x + 6 = (x - 2)(x - 3)$."
    ],
    "alternativeSolution": "ریشه‌یابی: به ازای $x=2$ و $x=3$ عبارت صفر می‌شود.",
    "commonMistake": "انتخاب $(x - 1)(x - 6)$ که جمع ضرایبش $-7$ می‌شود.",
    "suggestedTimeSec": 110,
    "rewardOC": 25,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C4-T2-V",
    "isVariant": true,
    "variantOf": "Q-C4-T2",
    "curriculumRef": "ریاضی نهم - فصل 5 (جزوه ص 90: فاکتورگیری و مزدوج)",
    "chapter": 5,
    "topic": "تجزیه ترکیبی",
    "subtopic": "لایه دوم کلید",
    "difficulty": {
      "mathematical": 3,
      "operational": 3,
      "narrative": 3
    },
    "questionType": "computational",
    "storyConnection": "تجزیه کامل شناسه لایه دوم رمزنگاری.",
    "questionText": "تجزیه کامل عبارت $3x^2 - 27$ کدام است؟",
    "choices": [
      "$3(x - 3)(x + 3)$",
      "$3(x - 9)(x + 9)$",
      "$(3x - 3)(x + 9)$",
      "$3(x - 3)^2$"
    ],
    "correctIndex": 0,
    "hints": {
      "1": "ابتدا از عامل مشترک $3$ فاکتور بگیرید.",
      "2": "سپس $x^2 - 9$ را با اتحاد مزدوج تجزیه کنید.",
      "3": "$3(x - 3)(x + 3)$."
    },
    "solutionSteps": [
      "فاکتورگیری از عامل مشترک 3: $3(x^2 - 9)$.",
      "کاربرد اتحاد مزدوج: $3(x - 3)(x + 3)$."
    ],
    "alternativeSolution": "بسط دادن گزینه‌ها.",
    "commonMistake": "توقف در $3(x^2 - 9)$ یا تبدیل آن به مربع کامل.",
    "suggestedTimeSec": 110,
    "rewardOC": 0,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C4-T3",
    "isVariant": false,
    "variantOf": null,
    "curriculumRef": "ریاضی نهم - فصل 5 و 2 (جزوه ص 96-97: نامعادله و بازه)",
    "chapter": 5,
    "topic": "دستگاه نامعادله‌های خطی",
    "subtopic": "محدوده مجاز پورت‌ها",
    "difficulty": {
      "mathematical": 4,
      "operational": 3,
      "narrative": 3
    },
    "questionType": "multi_step",
    "storyConnection": "یافتن بازه مشترک شناسه‌هایی که هم‌زمان در دو شرط فیلتر فایروال صدق می‌کنند.",
    "questionText": "به ازای کدام بازه از مقادیر $x$، هر دو نامعادله $2x - 1 > 3$ و $10 - x \\ge 4$ هم‌زمان برقرار هستند؟",
    "choices": [
      "$[2, 6)$",
      "$(-\\infty, 6]$",
      "$(2, +\\infty)$",
      "$(2, 6]$"
    ],
    "correctIndex": 3,
    "hints": {
      "1": "هر نامعادله را جداگانه حل کنید و سپس اشتراک دو بازه را بیابید.",
      "2": "از اولی $x > 2$ و از دومی $-x \\ge -6 \\Rightarrow x \\le 6$ به دست می‌آید.",
      "3": "اشتراک $x > 2$ و $x \\le 6$ برابر بازه $(2, 6]$ است."
    },
    "solutionSteps": [
      "$2x - 1 > 3 \\Rightarrow 2x > 4 \\Rightarrow x > 2$.",
      "$10 - x \\ge 4 \\Rightarrow -x \\ge -6 \\Rightarrow x \\le 6$ (با ضرب در منفی، جهت عوض می‌شود).",
      "اشتراک: $2 < x \\le 6$ یعنی $(2, 6]$."
    ],
    "alternativeSolution": "تست مرزی: $x=6$ هر دو را برقرار می‌کند، اما $x=2$ اولی را نقض می‌کند.",
    "commonMistake": "عوض نکردن جهت نامساوی هنگام ضرب یا تقسیم بر عدد منفی.",
    "suggestedTimeSec": 125,
    "rewardOC": 28,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C4-T3-V",
    "isVariant": true,
    "variantOf": "Q-C4-T3",
    "curriculumRef": "ریاضی نهم - فصل 5 (جزوه ص 97: نامعادله زنجیره‌ای)",
    "chapter": 5,
    "topic": "حل نامعادله",
    "subtopic": "آستانه ترافیک",
    "difficulty": {
      "mathematical": 4,
      "operational": 3,
      "narrative": 3
    },
    "questionType": "computational",
    "storyConnection": "تعیین بزرگ‌ترین مقدار صحیح مجاز در فیلتر ترافیک.",
    "questionText": "بزرگ‌ترین عدد صحیحی که در نامعادله $\\frac{x - 1}{2} + x < 4$ صدق می‌کند کدام است؟",
    "choices": [
      "3",
      "1",
      "2",
      "4"
    ],
    "correctIndex": 2,
    "hints": {
      "1": "دو طرف نامعادله را در $2$ ضرب کنید تا مخرج از بین برود.",
      "2": "$x - 1 + 2x < 8 \\Rightarrow 3x < 9 \\Rightarrow x < 3$.",
      "3": "بزرگ‌ترین عدد صحیح کمتر از $3$ عدد $2$ است."
    },
    "solutionSteps": [
      "ضرب در 2: $(x - 1) + 2x < 8$.",
      "$3x - 1 < 8 \\Rightarrow 3x < 9 \\Rightarrow x < 3$.",
      "بزرگ‌ترین عدد صحیح: $2$."
    ],
    "alternativeSolution": "جایگذاری گزینه‌ها در نامعادله: برای $x=3$ داریم $1 + 3 = 4$ که کمتر از $4$ نیست.",
    "commonMistake": "انتخاب $3$ بدون توجه به علامت اکید ($<$).",
    "suggestedTimeSec": 120,
    "rewardOC": 0,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C5-T1",
    "isVariant": false,
    "variantOf": null,
    "curriculumRef": "ریاضی نهم - فصل 7 (جزوه ص 119-120: دامنه عبارت گویا)",
    "chapter": 7,
    "topic": "دامنه تعریف عبارت گویا",
    "subtopic": "نقاط کور شبکه",
    "difficulty": {
      "mathematical": 4,
      "operational": 4,
      "narrative": 3
    },
    "questionType": "logical",
    "storyConnection": "یافتن مقادیری که تابع مسیریابی THE VEIL را دچار خطای تقسیم بر صفر می‌کند.",
    "questionText": "عبارت گویای $F(x) = \\frac{x + 4}{x^2 - 9}$ برای کدام مقادیر $x$ تعریف‌نشده است؟",
    "choices": [
      "فقط $x = 3$",
      "$x = 3$ و $x = -3$",
      "$x = -4$",
      "$x = 9$ و $x = -9$"
    ],
    "correctIndex": 1,
    "hints": {
      "1": "مخرج کسر گویا نباید صفر شود: $x^2 - 9 = 0$.",
      "2": "$(x - 3)(x + 3) = 0$.",
      "3": "$x = 3$ و $x = -3$."
    },
    "solutionSteps": [
      "صفر شدن مخرج: $x^2 - 9 = 0 \\Rightarrow (x-3)(x+3) = 0$.",
      "ریشه‌ها: $x = 3$ و $x = -3$."
    ],
    "alternativeSolution": "بررسی گزینه‌ها در مخرج کسر.",
    "commonMistake": "بررسی ریشه صورت ($x = -4$) به جای مخرج.",
    "suggestedTimeSec": 115,
    "rewardOC": 30,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C5-T1-V",
    "isVariant": true,
    "variantOf": "Q-C5-T1",
    "curriculumRef": "ریاضی نهم - فصل 7 (جزوه ص 120: دامنه عبارت گویا)",
    "chapter": 7,
    "topic": "دامنه عبارت گویا",
    "subtopic": "نقاط بحرانی مخرج",
    "difficulty": {
      "mathematical": 4,
      "operational": 4,
      "narrative": 3
    },
    "questionType": "logical",
    "storyConnection": "شناسایی مقادیر قطع دسترسی در گره خروجی.",
    "questionText": "عبارت $\\frac{2x - 1}{x(x - 5)}$ به ازای کدام مقادیر $x$ تعریف‌نشده است؟",
    "choices": [
      "$x = 0$ و $x = 5$",
      "فقط $x = 5$",
      "$x = \\frac{1}{2}$",
      "$x = 0$ و $x = -5$"
    ],
    "correctIndex": 0,
    "hints": {
      "1": "معادله $x(x - 5) = 0$ را حل کنید.",
      "2": "یا $x = 0$ یا $x - 5 = 0$.",
      "3": "$x = 0$ و $x = 5$."
    },
    "solutionSteps": [
      "صفر قرار دادن مخرج: $x(x - 5) = 0$.",
      "ریشه‌ها: $x = 0$ و $x = 5$."
    ],
    "alternativeSolution": "آزمون عددی در مخرج.",
    "commonMistake": "فراموش کردن ریشه $x = 0$.",
    "suggestedTimeSec": 110,
    "rewardOC": 0,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C5-T2",
    "isVariant": false,
    "variantOf": null,
    "curriculumRef": "ریاضی نهم - فصل 7 و 5 (جزوه ص 121-122: ساده‌سازی و تقسیم گویا)",
    "chapter": 7,
    "topic": "ساده‌سازی عبارت گویا",
    "subtopic": "فشرده‌سازی تابع مسیر",
    "difficulty": {
      "mathematical": 4,
      "operational": 4,
      "narrative": 4
    },
    "questionType": "multi_step",
    "storyConnection": "ساده‌سازی تابع نهایی سرور 7 برای افشای آدرس رله خارجی THE VEIL.",
    "questionText": "به ازای $x \\ne \\pm 2$، حاصل ساده شده عبارت $\\frac{x^2 - 4}{x^2 + 4x + 4}$ کدام است؟",
    "choices": [
      "$\\frac{x + 2}{x - 2}$",
      "$\\frac{-4}{4x + 4}$",
      "$x - 2$",
      "$\\frac{x - 2}{x + 2}$"
    ],
    "correctIndex": 3,
    "hints": {
      "1": "صورت مزدوج و مخرج مربع دوجمله‌ای است.",
      "2": "$\\frac{(x-2)(x+2)}{(x+2)^2}$.",
      "3": "با ساده کردن $(x+2)$ حاصل $\\frac{x-2}{x+2}$ می‌شود."
    },
    "solutionSteps": [
      "صورت: $(x - 2)(x + 2)$ و مخرج: $(x + 2)^2$.",
      "ساده‌سازی عامل $(x + 2)$: $\\frac{x - 2}{x + 2}$."
    ],
    "alternativeSolution": "آزمون عددی با $x = 3$: $\\frac{5}{25} = \\frac{1}{5}$.",
    "commonMistake": "خط زدن $x^2$ از صورت و مخرج در جمع.",
    "suggestedTimeSec": 130,
    "rewardOC": 30,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C5-T2-V",
    "isVariant": true,
    "variantOf": "Q-C5-T2",
    "curriculumRef": "ریاضی نهم - فصل 7 (جزوه ص 122: ضرب و تقسیم گویا)",
    "chapter": 7,
    "topic": "تقسیم عبارت گویا",
    "subtopic": "ادغام دو مسیر",
    "difficulty": {
      "mathematical": 4,
      "operational": 4,
      "narrative": 4
    },
    "questionType": "multi_step",
    "storyConnection": "ساده‌سازی کسر نهایی مسیر جایگزین.",
    "questionText": "به ازای مقادیر مجاز، حاصل ساده شده $\\frac{x^2 - 1}{x^2 - 2x + 1}$ کدام است؟",
    "choices": [
      "$\\frac{x - 1}{x + 1}$",
      "$\\frac{-1}{-2x + 1}$",
      "$\\frac{x + 1}{x - 1}$",
      "$x + 1$"
    ],
    "correctIndex": 2,
    "hints": {
      "1": "صورت مزدوج و مخرج مربع دوجمله‌ای است.",
      "2": "$\\frac{(x-1)(x+1)}{(x-1)^2}$.",
      "3": "پاسخ $\\frac{x + 1}{x - 1}$ است."
    },
    "solutionSteps": [
      "تجزیه صورت (مزدوج) و مخرج (مربع): $\\frac{(x - 1)(x + 1)}{(x - 1)^2}$.",
      "ساده کردن عامل $(x - 1)$: $\\frac{x + 1}{x - 1}$."
    ],
    "alternativeSolution": "آزمون عددی با $x = 2$.",
    "commonMistake": "حذف مستقیم $x^2$.",
    "suggestedTimeSec": 125,
    "rewardOC": 0,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C5-T3",
    "isVariant": false,
    "variantOf": null,
    "curriculumRef": "ریاضی نهم - فصل 7 و 5 و 4 (جزوه ص 123-125: قضیه باقیمانده)",
    "chapter": 7,
    "topic": "قضیه باقیمانده چندجمله‌ای",
    "subtopic": "تایید امضای نهایی رله",
    "difficulty": {
      "mathematical": 5,
      "operational": 4,
      "narrative": 4
    },
    "questionType": "multi_step",
    "storyConnection": "استفاده از قضیه باقیمانده تقسیم چندجمله‌ای برای کشف کلید تایید نهایی رله THE VEIL.",
    "questionText": "اگر باقیمانده تقسیم چندجمله‌ای $P(x) = 2x^2 - 5x + a$ بر $(x - 2)$ برابر $3$ باشد، مقدار $a$ کدام است؟",
    "choices": [
      "-5",
      "5",
      "4",
      "-4"
    ],
    "correctIndex": 1,
    "hints": {
      "1": "طبق قضیه باقیمانده (نکته 4 جزوه ص 123)، ریشه مقسوم‌علیه یعنی $x = 2$ را در $P(x)$ قرار دهید.",
      "2": "$P(2) = 3 \\Rightarrow 2(2^2) - 5(2) + a = 3$.",
      "3": "$8 - 10 + a = 3 \\Rightarrow -2 + a = 3 \\Rightarrow a = 5$."
    },
    "solutionSteps": [
      "ریشه مقسوم‌علیه: $x - 2 = 0 \\Rightarrow x = 2$.",
      "جایگذاری در $P(x)$: $P(2) = 2(4) - 5(2) + a = 8 - 10 + a = a - 2$.",
      "مساوی با باقیمانده: $a - 2 = 3 \\Rightarrow a = 5$."
    ],
    "alternativeSolution": "انجام تقسیم چندجمله‌ای $2x^2 - 5x + a$ بر $x - 2$ که خارج‌قسمت $2x - 1$ و باقیمانده $a - 2$ می‌دهد.",
    "commonMistake": "قرار دادن $x = -2$ به جای $x = 2$ در چندجمله‌ای.",
    "suggestedTimeSec": 135,
    "rewardOC": 35,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  },
  {
    "id": "Q-C5-T3-V",
    "isVariant": true,
    "variantOf": "Q-C5-T3",
    "curriculumRef": "ریاضی نهم - فصل 7 و 4 (جزوه ص 126: ترکیب توان منفی و گویا)",
    "chapter": 7,
    "topic": "عبارت گویا با توان منفی",
    "subtopic": "بازگشایی لایه نهایی",
    "difficulty": {
      "mathematical": 5,
      "operational": 4,
      "narrative": 4
    },
    "questionType": "multi_step",
    "storyConnection": "ساده‌سازی کسر مرکب توان منفی برای بستن پرونده SILENT ARCHIVE.",
    "questionText": "به ازای $a, b, x \\ne 0$ و $a + b \\ne 0$، حاصل ساده شده عبارت $\\frac{b^{-1} + a^{-1}}{\\frac{ax + bx}{ab}}$ کدام است؟",
    "choices": [
      "$\\frac{1}{x}$",
      "$x$",
      "$a + b$",
      "$ab$"
    ],
    "correctIndex": 0,
    "hints": {
      "1": "ابتدا $b^{-1} + a^{-1} = \\frac{1}{b} + \\frac{1}{a} = \\frac{a + b}{ab}$ را بنویسید.",
      "2": "مخرج را فاکتورگیری کنید: $\\frac{x(a + b)}{ab}$.",
      "3": "با تقسیم صورت بر مخرج، $\\frac{a + b}{ab}$ ساده شده و $\\frac{1}{x}$ می‌ماند."
    },
    "solutionSteps": [
      "صورت کسر: $\\frac{1}{b} + \\frac{1}{a} = \\frac{a + b}{ab}$.",
      "مخرج کسر: $\\frac{x(a + b)}{ab}$.",
      "تقسیم دو کسر: $\\frac{a + b}{ab} \\div \\frac{x(a + b)}{ab} = \\frac{1}{x}$."
    ],
    "alternativeSolution": "ضرب صورت و مخرج کسر بزرگ در $ab$: $\\frac{a + b}{x(a + b)} = \\frac{1}{x}$.",
    "commonMistake": "جابه‌جا نوشتن دور در دور و نزدیک در نزدیک و به دست آوردن $x$.",
    "suggestedTimeSec": 135,
    "rewardOC": 0,
    "validationStatus": "verified",
    "evaluationMode": "mcq"
  }
];

export function getQuestionById(id) {
  return QUESTION_BANK.find((q) => q.id === id) || null;
}

export function getRetryVariant(baseQuestionId) {
  return QUESTION_BANK.find((q) => q.variantOf === baseQuestionId) || getQuestionById(baseQuestionId);
}
