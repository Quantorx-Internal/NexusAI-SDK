/**
 * Money in one stable shape for both languages.
 *
 * The digits always come from en-US: Latin digits, "." for decimals and ","
 * for thousands. The phone's own Arabic format writes the decimal mark as a
 * comma on current iOS ("12,300,00"), which reads as twelve million.
 *
 * Arabic adds the locale's currency symbol after the number and wraps the
 * whole amount in a left-to-right isolate (U+2066 ... U+2069), so the
 * right-to-left sentence around it cannot move the minus to the far end
 * ("24.50-") or split the symbol from its number.
 */
function moneyParts(amount: number, currency: string, locale: 'en' | 'ar') {
    // Plain arithmetic: Hermes has no NumberFormat.formatToParts.
    const [whole, fraction] = Math.abs(amount).toFixed(2).split('.');
    const integer = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const symbol = currencySymbol(currency, locale);
    return { sign: amount < 0 ? '-' : '', integer, fraction, symbol };
}

const BIDI_MARKS = /[\u200e\u200f\u061c\u2066-\u2069]/g;

function currencySymbol(currency: string, locale: 'en' | 'ar'): string {
    try {
        const zero = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
            style: 'currency',
            currency,
        }).format(0);
        // Whatever is left once the digits, separators and spaces are gone.
        // "ر.س." loses its final dot: in a left-to-right run it lands on the wrong side.
        const symbol = zero
            .replace(BIDI_MARKS, '')
            .replace(/[0-9\u0660-\u0669.,\u066b\u066c\s\u00a0]+(?=$|[^.])/g, ' ')
            .trim()
            .replace(/\.$/, '');
        return symbol || currency;
    } catch (e) {
        return currency;
    }
}

const LTR_ISOLATE = '\u2066';
const POP_ISOLATE = '\u2069';

export function formatCurrency(
    amount: number,
    currency: string = 'SAR',
    locale: 'en' | 'ar' = 'en'
): string {
    if (locale === 'ar') {
        const { sign, integer, fraction, symbol } = moneyParts(amount, currency, locale);
        return `${LTR_ISOLATE}${sign}${integer}.${fraction}\u00a0${symbol}${POP_ISOLATE}`;
    }
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
        }).format(amount);
    } catch (e) {
        return `${currency} ${amount.toFixed(2)}`;
    }
}

/**
 * Arabic dates in the Gregorian calendar with Latin digits, the same as the
 * web app and the English screens. Plain ar-SA gives the Hijri calendar, so
 * the same bill read "29 Dec" in English and "28 جمادى الآخرة" in Arabic.
 */
export const AR_DATE_LOCALE = 'ar-SA-u-ca-gregory-nu-latn';

export function formatDate(
    date: string | Date,
    locale: 'en' | 'ar' = 'en'
): string {
    const localeCode = locale === 'ar' ? AR_DATE_LOCALE : 'en-US';
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
 * Both parts render inside one Text, so the Arabic isolate opens in `head`
 * and closes in `decimals`.
 */
export function splitAmount(
    amount: number,
    currency: string = 'SAR',
    locale: 'en' | 'ar' = 'en'
): { head: string; decimals: string } {
    if (locale === 'ar') {
        const { sign, integer, fraction, symbol } = moneyParts(amount, currency, locale);
        return {
            head: `${LTR_ISOLATE}${sign}${integer}`,
            decimals: `.${fraction}\u00a0${symbol}${POP_ISOLATE}`,
        };
    }
    // English keeps Intl's own spacing ("$2,000", "SAR 2,000"); en-US always
    // marks decimals with ".", so the last one is the cut.
    const whole = formatCurrency(amount, currency, locale);
    const at = whole.lastIndexOf('.');
    return at === -1 ? { head: whole, decimals: '' } : { head: whole.slice(0, at), decimals: whole.slice(at) };
}

/** Month name for a period label, e.g. "September". */
export function formatMonth(date: string | Date, locale: 'en' | 'ar' = 'en'): string {
    try {
        return new Intl.DateTimeFormat(locale === 'ar' ? AR_DATE_LOCALE : 'en-US', {
            month: 'long',
        }).format(new Date(date));
    } catch (e) {
        return '';
    }
}

/** Short time, e.g. "5:19 PM" — the "when" on a receipt band. */
export function formatTime(date: string | Date, locale: 'en' | 'ar' = 'en'): string {
    try {
        return new Intl.DateTimeFormat(locale === 'ar' ? AR_DATE_LOCALE : 'en-US', {
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
        return new Intl.DateTimeFormat(locale === 'ar' ? AR_DATE_LOCALE : 'en-GB', {
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

/**
 * Keep number ranges ("5–25", "12-60", "1-2") in reading order inside
 * Arabic text. Right to left, the two numbers swap places around the dash
 * and "5–25 سنة" shows as "25–5". Each range becomes one left-to-right
 * isolate; other text is untouched.
 */
export function isolateRanges(text: string): string {
    // U+2060 around the dash keeps the line from breaking inside the range.
    return text.replace(
        /(\d[\d.,]*)\s?([–-])\s?(\d[\d.,]*)/g,
        (_, low, dash, high) => `${LTR_ISOLATE}${low}\u2060${dash}\u2060${high}${POP_ISOLATE}`
    );
}

/** A signed amount ("+450.00", "−24.50") kept whole in Arabic. */
export function formatSignedCurrency(
    amount: number,
    currency: string,
    locale: 'en' | 'ar',
    sign: '+' | '−'
): string {
    const value = formatCurrency(Math.abs(amount), currency, locale);
    return locale === 'ar' ? `${LTR_ISOLATE}${sign}${value}${POP_ISOLATE}` : `${sign}${value}`;
}
