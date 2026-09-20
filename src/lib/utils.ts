export function formatCurrency(
    amount: number,
    currency: string = 'SAR',
    locale: 'en' | 'ar' = 'en'
): string {
    // Use consistent locale codes
    const localeCode = locale === 'ar' ? 'ar-SA' : 'en-US';

    try {
        return new Intl.NumberFormat(localeCode, {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
        }).format(amount);
    } catch (e) {
        return `${currency} ${amount.toFixed(2)}`;
    }
}

export function formatDate(
    date: string | Date,
    locale: 'en' | 'ar' = 'en'
): string {
    const localeCode = locale === 'ar' ? 'ar-SA' : 'en-US';
    try {
        return new Intl.DateTimeFormat(localeCode, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(new Date(date));
    } catch (e) {
        return new Date(date).toLocaleDateString();
    }
}

/**
 * Split a formatted amount into its integer part and its decimal part so the
 * decimals can be dimmed (account tiles: 24/32 integer, 18/600 tertiary decimals).
 *
 * Uses Intl parts rather than splitting on "." — the Arabic locale uses U+066B
 * as its decimal separator, so a literal "." split silently fails there.
 */
export function splitAmount(
    amount: number,
    currency: string = 'SAR',
    locale: 'en' | 'ar' = 'en'
): { head: string; decimals: string } {
    const localeCode = locale === 'ar' ? 'ar-SA' : 'en-US';
    try {
        const parts = new Intl.NumberFormat(localeCode, {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
        }).formatToParts(amount);

        const cut = parts.findIndex(p => p.type === 'decimal');
        if (cut === -1) return { head: formatCurrency(amount, currency, locale), decimals: '' };

        return {
            head: parts.slice(0, cut).map(p => p.value).join(''),
            decimals: parts.slice(cut).map(p => p.value).join(''),
        };
    } catch (e) {
        const whole = formatCurrency(amount, currency, locale);
        const at = whole.lastIndexOf('.');
        return at === -1
            ? { head: whole, decimals: '' }
            : { head: whole.slice(0, at), decimals: whole.slice(at) };
    }
}

/** Month name for a period label, e.g. "September". */
export function formatMonth(date: string | Date, locale: 'en' | 'ar' = 'en'): string {
    try {
        return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
            month: 'long',
        }).format(new Date(date));
    } catch (e) {
        return '';
    }
}

/** Short time, e.g. "5:19 PM" — the "when" on a receipt band. */
export function formatTime(date: string | Date, locale: 'en' | 'ar' = 'en'): string {
    try {
        return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(date));
    } catch (e) {
        return '';
    }
}

/** Initials for an avatar — first letters of the first two words. */
export function initials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

/**
 * Compact date for list pills — "29 Dec". The long form ("Dec 29, 2024") pushed
 * the pill wide enough to truncate the provider name beside it.
 */
export function formatDateShort(date: string | Date, locale: 'en' | 'ar' = 'en'): string {
    try {
        return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
            day: 'numeric',
            month: 'short',
        }).format(new Date(date));
    } catch (e) {
        return formatDate(date, locale);
    }
}

/**
 * Digits a numeric field may legitimately receive: Latin, Arabic-Indic (٠-٩,
 * what an Arabic keyboard produces), and Extended Arabic-Indic (۰-۹, Persian
 * and Urdu keyboards).
 */
export const DIGIT_CHARS = /[0-9٠-٩۰-۹]/;

/** Same set, for stripping everything that is not a digit. */
export const NON_DIGIT_CHARS = /[^0-9٠-٩۰-۹]/g;

/**
 * Fold any digit script to Latin so the value can be parsed and sent.
 *
 * `parseFloat('٢٠٠')` is NaN and `'١٢٣٤٥٦'.replace(/\D/g,'')` is empty — JS
 * digit classes only ever meant 0-9 — so a user on an Arabic keyboard could not
 * enter an amount or an OTP at all. Arabic also uses its own separators:
 * ٫ (U+066B) for the decimal point and ٬ (U+066C) for thousands.
 */
export function normalizeDigits(input: string): string {
    if (!input) return '';
    return input
        // Arabic-Indic ٠-٩
        .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
        // Extended Arabic-Indic ۰-۹
        .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
        // Arabic decimal separator → "."
        .replace(/٫/g, '.')
        // Thousands separators and spacing of every flavour
        .replace(/[٬،,  \s']/g, '');
}

/** Parse an amount typed in any digit script. NaN when it isn't a number. */
export function parseAmountInput(input: string): number {
    return parseFloat(normalizeDigits(input));
}

/** Keep only digits, in whichever script the user is typing. */
export function keepDigits(input: string): string {
    return (input || '').replace(NON_DIGIT_CHARS, '');
}
