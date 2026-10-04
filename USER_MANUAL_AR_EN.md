# Qist user manual / دليل استخدام قسط

Qist (قسط) tracks installment sales: customers, contracts, monthly installments, full and partial payments, and who did what.
نظام قسط يتابع البيع بالأقساط: العملاء والعقود والأقساط الشهرية والدفعات الكاملة والجزئية، ومن قام بكل عملية.

**Contents / المحتويات**

1. First-time setup / الإعداد لأول مرة
2. Sign in, password and sign out / الدخول وكلمة المرور والخروج
3. Roles: Engineer and Manager / الصلاحيات: المهندس والمدير
4. Navigation, language and theme / التنقل واللغة والمظهر
5. Create a contract (plan) / إنشاء عقد (خطة)
6. Amounts and dates / المبالغ والتواريخ
7. Record a payment: full or partial / تسجيل دفعة كاملة أو جزئية
8. Undo a payment recorded by mistake / إلغاء دفعة مسجلة بالخطأ
9. A month that will not be paid / شهر لن يُدفع
10. Reading the schedule / قراءة جدول الأقساط
11. Tracking, search and filters / المتابعة والبحث والتصفية
12. Print statement (PDF) and export CSV / طباعة الكشف PDF وتصدير CSV
13. Delete a contract / حذف عقد
14. System settings (Engineer only) / إعدادات النظام (للمهندس فقط)
15. Rules and limits / القواعد والحدود
16. Common messages and fixes / رسائل شائعة وحلولها

---

## 1. First-time setup / الإعداد لأول مرة

The first time Qist opens on a new database, it shows **Create the engineer account**. Enter your full name, a username (3–32 English letters, numbers, `.` `_` `-`) and a password of at least 8 characters, then confirm it. This screen appears only once; after that, the engineer creates every other account from System settings.

عند فتح قسط لأول مرة على قاعدة بيانات جديدة تظهر شاشة **إنشاء حساب المهندس**. أدخل اسمك الكامل واسم مستخدم (3–32 حرفاً إنجليزياً أو رقماً أو `.` `_` `-`) وكلمة مرور لا تقل عن 8 أحرف ثم أكدها. تظهر هذه الشاشة مرة واحدة فقط، وبعدها ينشئ المهندس جميع الحسابات الأخرى من إعدادات النظام.

## 2. Sign in, password and sign out / الدخول وكلمة المرور والخروج

- **Sign in** with the username and password the engineer gave you. You stay signed in on that browser for 7 days.
- **Account menu:** click your name in the top corner to **Change my password** (you need your current password) or **Sign out**.
- **Locked out:** after 5 wrong passwords, that username is blocked for 15 minutes. Wait, or ask the engineer to set a new password.
- **Forgot your password:** ask the engineer to use **Reset password** in System settings.

- **سجّل الدخول** باسم المستخدم وكلمة المرور التي أعطاك إياها المهندس. يبقى الدخول فعالاً على هذا المتصفح 7 أيام.
- **قائمة الحساب:** اضغط اسمك أعلى الشاشة لاختيار **تغيير كلمة المرور** (تحتاج كلمة المرور الحالية) أو **تسجيل الخروج**.
- **إيقاف مؤقت:** بعد 5 محاولات خاطئة يُوقف اسم المستخدم 15 دقيقة. انتظر أو اطلب من المهندس تعيين كلمة مرور جديدة.
- **نسيت كلمة المرور:** اطلب من المهندس استخدام **كلمة مرور جديدة** في إعدادات النظام.

## 3. Roles: Engineer and Manager / الصلاحيات: المهندس والمدير

| | Engineer / المهندس | Manager / المدير |
|---|---|---|
| Customers & contracts / العملاء والعقود | All managers' / لجميع المدراء | Only their own / الخاصة به فقط |
| Create contracts / إنشاء العقود | Yes, chooses the manager / نعم، ويختار المدير | Yes, in their own list / نعم، في قائمته |
| Payments, undo, "not paid" / الدفعات والإلغاء و«غير مدفوع» | Any contract / أي عقد | Own contracts / عقوده فقط |
| Delete contracts / حذف العقود | Any / أي عقد | Own only / عقوده فقط |
| Print statement, export CSV / طباعة الكشف وتصدير CSV | Yes / نعم | Own data / بياناته فقط |
| System settings, users, activity log / الإعدادات والمستخدمون وسجل النشاط | Yes / نعم | No / لا |

Each manager has a private customer list: other managers cannot see, pay, change or delete anything in it. The server enforces this, not just the screen.
لكل مدير قائمة عملاء خاصة: لا يستطيع المدراء الآخرون رؤيتها أو الدفع عليها أو تعديلها أو حذفها. يفرض الخادم هذه القواعد وليس الشاشة فقط.

## 4. Navigation, language and theme / التنقل واللغة والمظهر

Use the ☰ icon to open **Overview**, **Debt ledger**, **User guide**, and (engineer) **System settings**. The sun/moon switch changes light/dark mode and remembers your choice. **العربية / English** switches the interface language.
استخدم أيقونة ☰ لفتح **النظرة العامة** و**سجل الديون** و**دليل الاستخدام** و(للمهندس) **إعدادات النظام**. يغير مفتاح الشمس والقمر الوضع الفاتح والداكن ويحفظ اختيارك. يغير زر **العربية / English** لغة الواجهة.

## 5. Create a contract (plan) / إنشاء عقد (خطة)

1. Click **New plan**.
2. **Engineer only:** choose the **Manager** who owns this customer list.
3. Choose an existing customer from that list, or **+ Create new buyer** and enter the name and optional phone. New customers get an automatic `B-` ID; pick the same customer for later purchases to keep one ID.
4. Fill in the amounts and dates (section 6), check the preview, then **Save plan**. The contract gets a `D-` ID and records who created it.

1. اضغط **خطة جديدة**.
2. **للمهندس فقط:** اختر **المدير** صاحب قائمة العملاء.
3. اختر عميلاً موجوداً من القائمة أو **+ إضافة مشتري جديد** وأدخل الاسم والهاتف (اختياري). يحصل العميل الجديد على رقم `B-` تلقائياً، واختره نفسه عند الشراء مرة أخرى للحفاظ على رقمه.
4. أدخل المبالغ والتواريخ (القسم 6)، راجع المعاينة ثم **احفظ الخطة**. يحصل العقد على رقم `D-` ويُسجل من أنشأه.

## 6. Amounts and dates / المبالغ والتواريخ

Enter product, currency (USD or IQD), overall price, initial payment already received, term in months, period between installments in months, and the **first** installment due date. The term must be divisible by the period: 12 months every 2 months = 6 installments. Leave the installment amount blank to calculate it automatically, or enter an agreed amount that fits the term; the last installment adjusts to the exact remaining balance.
أدخل المنتج والعملة (دولار أو دينار) والسعر الكلي والمقدمة المستلمة والمدة بالأشهر والفترة بين الأقساط بالأشهر وتاريخ استحقاق **أول** قسط. يجب أن تقبل المدة القسمة على الفترة: 12 شهراً كل شهرين = 6 أقساط. اترك مبلغ القسط فارغاً لحسابه تلقائياً أو أدخل مبلغاً متفقاً عليه يتوافق مع المدة، ويُعدل القسط الأخير ليطابق الرصيد المتبقي بدقة.

## 7. Record a payment: full or partial / تسجيل دفعة كاملة أو جزئية

1. **From the ledger:** **Mark paid** opens the oldest overdue installment of that contract, or this month's if nothing is overdue.
   **From the plan page:** every open month has **Pay / part** (or **Pay rest / part** if it is already partly paid).
2. The dialog shows what is left on that installment. Enter the **amount received**, or use **Full** / **Half**.
3. Less than the amount left → saved as a **partial payment**; the rest stays due on the same month. The dialog shows what will remain and the new contract balance.
4. Confirm only after you have the money: **Confirm paid** or **Record partial payment**.

Every payment gets its own receipt number (`R-…`), date and the name of who received it. A payment can never be more than what is left on its installment. You can pay a month in as many parts as needed.

1. **من السجل:** زر **تسجيل الدفع** يفتح أقدم قسط متأخر في العقد، أو قسط هذا الشهر إن لم يوجد متأخر.
   **من صفحة الخطة:** لكل شهر مفتوح زر **دفع / جزء** (أو **دفع الباقي / جزء** إذا كان مدفوعاً جزئياً).
2. تعرض النافذة المتبقي على القسط. أدخل **المبلغ المستلم** أو استخدم **كامل** / **النصف**.
3. المبلغ الأقل من المتبقي يُحفظ **دفعة جزئية** ويبقى الباقي مستحقاً على الشهر نفسه. تعرض النافذة ما سيتبقى والرصيد الجديد للعقد.
4. أكد فقط بعد استلام المال: **تأكيد الدفع** أو **تسجيل دفعة جزئية**.

لكل دفعة رقم إيصال (`R-…`) وتاريخ واسم من استلمها. لا يمكن أن تتجاوز الدفعة المتبقي على القسط، ويمكن دفع الشهر على أجزاء متعددة.

## 8. Undo a payment recorded by mistake / إلغاء دفعة مسجلة بالخطأ

On the plan page, click **↶** next to the payment, add a reason if you like, then **Undo payment**. The amount goes back onto that installment and the balance. The payment is not erased: it stays in the list crossed out, with who reversed it and why, and it is written to the activity log.
If the month was already closed as **Not paid**, first use **Undo "not paid"** (section 9), then undo the payment.

في صفحة الخطة اضغط **↶** بجانب الدفعة، وأضف سبباً إن أردت، ثم **إلغاء الدفعة**. يعود المبلغ إلى القسط والرصيد. لا تُمحى الدفعة بل تبقى في القائمة مشطوبة مع اسم من ألغاها والسبب، وتُسجل في سجل النشاط.
إذا كان الشهر مغلقاً كـ **غير مدفوع** فاستخدم أولاً **تراجع عن "غير مدفوع"** (القسم 9) ثم ألغِ الدفعة.

## 9. A month that will not be paid / شهر لن يُدفع

For a due or overdue month that the customer will not pay (fully), click **Not paid → next month** and confirm:

- The month is **closed** with whatever was already paid on it (that money is kept).
- The **unpaid part** becomes a **new installment added at the end** of the schedule, on the same day of the month, one period after the last installment. The dialog shows its number and due date before you confirm.
- The contract total stays complete, so nothing is lost from the debt.

**Undo "not paid"** reopens the month and removes the added installment, as long as nothing has been paid on that added installment yet (undo those payments first if needed).

لشهر مستحق أو متأخر لن يدفعه العميل (كاملاً) اضغط **غير مدفوع ← شهر جديد** ثم أكد:

- يُغلق الشهر بما دُفع منه سابقاً (ويبقى ذلك المبلغ محفوظاً).
- يصبح **الجزء غير المدفوع** قسطاً **جديداً في نهاية الجدول** بنفس يوم الشهر وبعد فترة واحدة من آخر قسط. تعرض النافذة رقمه وتاريخ استحقاقه قبل التأكيد.
- يبقى إجمالي العقد مكتملاً فلا يضيع شيء من الدين.

**تراجع عن "غير مدفوع"** يعيد فتح الشهر ويحذف القسط المضاف، ما لم يُدفع على القسط المضاف شيء (ألغِ تلك الدفعات أولاً عند الحاجة).

## 10. Reading the schedule / قراءة جدول الأقساط

| Status / الحالة | Meaning / المعنى |
|---|---|
| Scheduled / مجدول | Not due yet, nothing paid / لم يحن موعده ولم يُدفع |
| Partly paid / مدفوع جزئياً | Part paid; the "left" amount is still due / دُفع جزء ويبقى «المتبقي» مستحقاً |
| Overdue / متأخر | Due date passed with money still left (may also show "partly paid") / فات موعده وما زال عليه مبلغ |
| Paid / مدفوع | Fully paid / مسدد بالكامل |
| Not paid → #n / غير مدفوع ← #n | Closed; unpaid part moved to installment n / مغلق ونُقل الباقي إلى القسط n |

- The current month is highlighted. Added installments show **carried from #k**.
- The Amount column shows what was paid and what is left on partly paid months.
- **Payments received** lists every payment (amount, date, receipt, who received it); reversed ones are crossed out.

- يُميز الشهر الحالي. الأقساط المضافة تظهر **مرحّل من #k**.
- يعرض عمود المبلغ المدفوع والمتبقي للأشهر المدفوعة جزئياً.
- يعرض عمود **الدفعات المستلمة** كل دفعة (المبلغ والتاريخ والإيصال ومن استلمها)، والملغاة تظهر مشطوبة.

## 11. Tracking, search and filters / المتابعة والبحث والتصفية

Unpaid amounts past their due date stay overdue; paying the current month does not clear older months. The overview shows outstanding balance, total collected (including initial payments), due this month and overdue, all counting partial payments. Search by customer, phone, ID or product; filter by active, overdue or settled. The **engineer** can also filter by **manager** (or Unassigned). USD and IQD totals are never combined.
تبقى المبالغ غير المدفوعة بعد موعدها متأخرة، ودفع الشهر الحالي لا يلغي الأشهر السابقة. تعرض النظرة العامة الرصيد المتبقي والمستلم (مع المقدمات) والمستحق هذا الشهر والمتأخر، وكلها تحتسب الدفعات الجزئية. ابحث بالعميل أو الهاتف أو الرقم أو المنتج، وصفِّ إلى نشطة أو متأخرة أو مسددة. يستطيع **المهندس** أيضاً التصفية حسب **المدير** (أو غير المخصص). لا تُجمع إجماليات الدولار والدينار أبداً.

## 12. Print statement (PDF) and export CSV / طباعة الكشف PDF وتصدير CSV

**Print statement (PDF)** on a plan page prints **one A4 page** (choose "Save as PDF" in the print window). It includes:
- customer (name, ID, phone), manager, who created the contract and when, product and term;
- price, initial payment, financed amount, paid in installments, remaining, fully paid count, overdue, next due, status;
- every installment with amount, paid amount, status or payment date, receipt numbers and who received them (closed months show "Not paid → #n");
- signature lines for the manager and the customer.

**Export CSV** downloads every contract you can see (managers: their own), one row per installment, with manager, customer, amounts, paid, left, status and all payments.

زر **طباعة الكشف (PDF)** في صفحة الخطة يطبع **صفحة A4 واحدة** (اختر «حفظ كـ PDF» في نافذة الطباعة). يتضمن:
- العميل (الاسم والرقم والهاتف) والمدير ومن أنشأ العقد ومتى والمنتج والمدة؛
- السعر والمقدمة والمبلغ المقسط والمدفوع من الأقساط والمتبقي وعدد الأقساط المسددة والمتأخر والقسط القادم والحالة؛
- كل قسط بمبلغه والمدفوع منه وحالته أو تاريخ دفعه وأرقام الإيصالات ومن استلمها (الأشهر المغلقة تظهر «غير مدفوع ← #n»)؛
- خانات توقيع المدير والعميل.

زر **تصدير CSV** ينزل كل العقود التي تراها (المدير: عقوده فقط)، بسطر لكل قسط يتضمن المدير والعميل والمبالغ والمدفوع والمتبقي والحالة وجميع الدفعات.

## 13. Delete a contract / حذف عقد

On the plan page click **Delete contract**. The dialog shows the customer, product, amount and how many payments will be removed. Use **Print first** if you need a copy, tick **I understand this cannot be undone**, then **Delete permanently**. This removes the contract, its schedule and all its payments; the customer stays in the list. Managers can delete only their own contracts; the engineer can delete any. Every deletion is kept in the activity log with the contract's details.

في صفحة الخطة اضغط **حذف العقد**. تعرض النافذة العميل والمنتج والمبلغ وعدد الدفعات التي ستُحذف. استخدم **اطبع أولاً** إن كنت تحتاج نسخة، ثم ضع علامة على **أفهم أنه لا يمكن التراجع عن الحذف** واضغط **حذف نهائي**. يُحذف العقد وجدوله وجميع دفعاته ويبقى العميل في القائمة. المدير يحذف عقوده فقط والمهندس يحذف أي عقد، وتُسجل كل عملية حذف في سجل النشاط مع تفاصيل العقد.

## 14. System settings (Engineer only) / إعدادات النظام (للمهندس فقط)

Open from ☰ or the account menu.
افتحها من ☰ أو من قائمة الحساب.

**Users / المستخدمون**
- **Add user:** full name, username, role (Manager = own data only; Engineer = full access) and password.
- **Edit:** change name or role, or untick **Account active** to stop someone signing in (their data is kept). Changing role or disabling signs them out.
- **Reset password:** sets a new password and signs the user out everywhere.
- You cannot disable or demote yourself, and at least one active engineer must remain.

- **إضافة مستخدم:** الاسم الكامل واسم المستخدم والصلاحية (مدير = بياناته فقط، مهندس = صلاحية كاملة) وكلمة المرور.
- **تعديل:** تغيير الاسم أو الصلاحية، أو إلغاء علامة **الحساب فعال** لمنع الدخول (تبقى بياناته محفوظة). تغيير الصلاحية أو التعطيل يسجل خروجه.
- **كلمة مرور جديدة:** تعيين كلمة مرور جديدة وتسجيل خروج المستخدم من كل الأجهزة.
- لا يمكنك تعطيل حسابك أو تخفيض صلاحيتك، ويجب بقاء مهندس فعال واحد على الأقل.

**Activity log / سجل النشاط**
Records sign-ins (and failed attempts), sign-outs, new contracts, payments (full or partial), reversed payments, months marked not paid and undone, deleted contracts, and user/password changes, with time and user. Filter by user, action or text, then **Print / Save PDF**.
يسجل الدخول (والمحاولات الفاشلة) والخروج والعقود الجديدة والدفعات (كاملة أو جزئية) والدفعات الملغاة والأشهر غير المدفوعة والتراجع عنها والعقود المحذوفة وتغييرات المستخدمين وكلمات المرور، مع الوقت والمستخدم. صفِّ حسب المستخدم أو الإجراء أو النص ثم **طباعة / حفظ PDF**.

**Data / البيانات**
Customers saved before accounts existed are **unassigned** and visible only to the engineer. Choose a manager and **Assign all** to move them into that manager's list.
العملاء المحفوظون قبل إنشاء الحسابات **غير مخصصين** ولا يراهم إلا المهندس. اختر مديراً واضغط **تخصيص الكل** لنقلهم إلى قائمته.

## 15. Rules and limits / القواعد والحدود

- The initial payment is treated as already received. / تُعد المقدمة مستلمة.
- A payment cannot exceed what is left on its installment. / لا تتجاوز الدفعة المتبقي على قسطها.
- Contract terms (price, months, dates) cannot be edited after saving; delete and create the contract again. / لا يمكن تعديل شروط العقد بعد الحفظ؛ احذفه وأنشئه من جديد.
- No interest or penalties are added, and no messages are sent to customers. / لا تُضاف فوائد أو غرامات ولا تُرسل رسائل للعملاء.
- Month-end due dates adjust to the last day of shorter months. Dates use Baghdad time. / تُضبط تواريخ نهاية الشهر لآخر يوم في الأشهر الأقصر، والتواريخ بتوقيت بغداد.

## 16. Common messages and fixes / رسائل شائعة وحلولها

| Message / الرسالة | What to do / الحل |
|---|---|
| Wrong username or password / اسم المستخدم أو كلمة المرور غير صحيحة | Check spelling and keyboard language; ask the engineer to reset. / تحقق من الكتابة ولغة لوحة المفاتيح أو اطلب إعادة التعيين. |
| Too many attempts / محاولات كثيرة | Wait 15 minutes. / انتظر 15 دقيقة. |
| Amount is more than the … left / المبلغ أكبر من المتبقي | Enter at most the amount left on that month. / أدخل مبلغاً لا يتجاوز المتبقي على الشهر. |
| Already paid / القسط مسدد مسبقاً | That month is fully paid; choose another month. / الشهر مسدد؛ اختر شهراً آخر. |
| Reopen this month first / أعد فتح الشهر أولاً | Use Undo "not paid", then undo the payment. / استخدم «تراجع عن غير مدفوع» ثم ألغِ الدفعة. |
| Installment #n already has payments / القسط المرحّل عليه دفعات | Undo the payments on the added installment, then Undo "not paid". / ألغِ دفعات القسط المضاف ثم تراجع عن «غير مدفوع». |
| Engineer access only / صلاحية المهندس فقط | Only an engineer can open System settings. / إعدادات النظام للمهندس فقط. |
| Please sign in / يرجى تسجيل الدخول | Your session ended; sign in again. / انتهت الجلسة؛ سجّل الدخول مجدداً. |
