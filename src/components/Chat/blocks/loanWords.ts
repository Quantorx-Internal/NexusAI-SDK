import type { LoanFit } from '../../../types';
import { normalizeDigits } from '../../../lib/utils';

/**
 * Words and number formats for the two loan cards.
 *
 * One currency format everywhere: Latin digits, "en-US" grouping, and the
 * currency word after the number ("2,212.99 ر.س", "2,212.99 SAR"). Intl with
 * ar-SA would emit Arabic-Indic digits and a different symbol, and Cairo has
 * no ﷼ glyph, so the loan cards never go through formatCurrency.
 */

export type LoanLocale = 'en' | 'ar';

export const CURRENCY_WORD: Record<LoanLocale, string> = { en: 'SAR', ar: 'ر.س' };

/** "2,212.99 ر.س" — a whole amount with the currency word. */
export function money(amount: number, locale: LoanLocale, decimals: 0 | 2 = 0): string {
    return `${plain(amount, decimals)} ${CURRENCY_WORD[locale]}`;
}

/** "2,212.99" — the number alone, Latin digits, en-US grouping. */
export function plain(amount: number, decimals: 0 | 2 = 0): string {
    return amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** The integer part and the decimal part, so the decimals can be set smaller on the hero. */
export function splitPlain(amount: number): { head: string; decimals: string } {
    const whole = plain(amount, 2);
    const at = whole.lastIndexOf('.');
    return at === -1 ? { head: whole, decimals: '' } : { head: whole.slice(0, at), decimals: whole.slice(at) };
}

/** "250 ألف", "5 مليون", "250K", "5M" — tick labels under the amount slider. */
export function compact(amount: number, locale: LoanLocale): string {
    const ar = locale === 'ar';
    const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));
    if (amount >= 1_000_000) return ar ? `${trim(amount / 1_000_000)} مليون` : `${trim(amount / 1_000_000)}M`;
    if (amount >= 1_000) return ar ? `${trim(amount / 1_000)} ألف` : `${trim(amount / 1_000)}K`;
    return plain(amount);
}

/** "20 أكتوبر، 11:40 ص" / "20 Oct, 11:40 AM" — the submitted stamp, in Latin digits. */
export function stamp(iso: string, locale: LoanLocale): string {
    try {
        const date = new Date(iso);
        const day = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
            day: 'numeric',
            month: locale === 'ar' ? 'long' : 'short',
        }).format(date);
        const time = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
            hour: 'numeric',
            minute: '2-digit',
        }).format(date);
        // Fold Arabic-Indic digits to Latin, keep the month name and the ص/م marker.
        return `${latinDigits(day)}، ${latinDigits(time)}`.replace('، ', locale === 'ar' ? '، ' : ', ');
    } catch (e) {
        return '';
    }
}

function latinDigits(text: string): string {
    return text.replace(/[٠-٩۰-۹]/g, d => normalizeDigits(d));
}

/** The tone each fit takes, in the system's existing semantic vocabulary. */
export const FIT_TONE = {
    comfortable: 'success',
    tight: 'warning',
    risky: 'danger',
} as const satisfies Record<LoanFit, 'success' | 'warning' | 'danger'>;

export const LOAN_WORDS = {
    ar: {
        monthly: 'القسط الشهري',
        amount: 'المبلغ',
        tenure: 'المدة',
        rate: 'نسبة الربح',
        cost: 'تكلفة التمويل',
        fees: 'الرسوم',
        noFees: 'بدون رسوم',
        total: 'إجمالي السداد',
        less: 'أقل',
        more: 'أكثر',
        apply: 'قدّم بهذي الشروط',
        beforeApply: 'قبل التقديم',
        applied: 'تم التقديم',
        appliedAt: (when: string) => `تم التقديم · ${when}`,
        failed: 'ما قدرنا نرسل الطلب. جرّب مرة ثانية.',
        disclaimer: 'أرقام تقديرية. النسبة النهائية والموافقة تعتمد على سياسة البنك والتحقق.',
        salary: 'من راتبك',
        committed: 'مصاريفك',
        installment: 'القسط',
        left: 'يبقى لك',
        short: 'العجز',
        fit: {
            comfortable: 'مريح لميزانيتك',
            tight: 'ضيّق على ميزانيتك',
            risky: 'فوق ميزانيتك',
        },
        advisor: 'مستشارك',
        thinking: 'المستشار يراجع الخطة',
        year: 'سنة',
    },
    en: {
        monthly: 'Monthly installment',
        amount: 'Amount',
        tenure: 'Term',
        rate: 'Rate',
        cost: 'Cost of financing',
        fees: 'Fees',
        noFees: 'No fees',
        total: 'Total you repay',
        less: 'Less',
        more: 'More',
        apply: 'Apply with these terms',
        beforeApply: 'Before you apply',
        applied: 'Applied',
        appliedAt: (when: string) => `Applied · ${when}`,
        failed: 'We could not send the application. Please try again.',
        disclaimer: 'Indicative figures. The final rate and approval depend on bank policy and verification.',
        salary: 'Of your salary',
        committed: 'Your costs',
        installment: 'Installment',
        left: 'Left for you',
        short: 'Short by',
        fit: {
            comfortable: 'Fits your budget',
            tight: 'Tight on your budget',
            risky: 'Over your budget',
        },
        advisor: 'Your advisor',
        thinking: 'Your advisor is looking at this plan',
        year: 'yrs',
    },
} as const;

export const LOAN_LIST_WORDS = {
    ar: {
        title: 'القروض المتاحة لك',
        count: (n: number) => `${n} ${n === 1 ? 'عرض' : n === 2 ? 'عرضين' : n <= 10 ? 'عروض' : 'عرض'}`,
        subtitle: 'تحققنا من شروط كل قرض على راتبك وحسابك، ومن كم تحمل ميزانيتك منه.',
        featured: 'الأنسب لك',
        estimated: 'قسط تقديري',
        perMonth: '/ شهر',
        amount: 'المبلغ',
        others: 'قروض ثانية',
        unavailable: 'غير متاحة لك حالياً',
        upTo: 'حتى',
        onRequest: 'حسب الطلب',
        fit: {
            comfortable: 'مريح',
            tight: 'ضيّق',
            risky: 'فوق ميزانيتك',
            unknown: 'غير محدد',
        },
        fitLong: {
            comfortable: 'مريح لميزانيتك',
            tight: 'ضيّق على ميزانيتك',
            risky: 'فوق ميزانيتك',
        },
        none: 'ما فيه تمويلات متاحة حالياً',
        noneNote: 'الشروط موضحة تحت كل قرض.',
        disclaimer: 'المبالغ بالريال وتقديرية على أطول مدة. الموافقة تعتمد على سياسة البنك والتحقق.',
    },
    en: {
        title: 'Loans you can apply for',
        count: (n: number) => `${n} ${n === 1 ? 'offer' : 'offers'}`,
        subtitle: 'Each one checked against your salary and account, and how much of it your budget carries.',
        featured: 'Best fit for you',
        estimated: 'Estimated installment',
        perMonth: '/ month',
        amount: 'Amount',
        others: 'Other loans',
        unavailable: 'Not available to you yet',
        upTo: 'Up to',
        onRequest: 'On request',
        fit: {
            comfortable: 'Comfortable',
            tight: 'Tight',
            risky: 'Over budget',
            unknown: 'Unknown',
        },
        fitLong: {
            comfortable: 'Fits your budget',
            tight: 'Tight on your budget',
            risky: 'Over your budget',
        },
        none: 'No financing is available right now',
        noneNote: 'The conditions are listed under each loan.',
        disclaimer: 'Amounts in SAR, indicative over the longest term. Approval depends on bank policy and verification.',
    },
} as const;
