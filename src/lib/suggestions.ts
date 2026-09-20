import { Account, Beneficiary, Bill, Card } from '../types';

/**
 * Composer suggestions (design §9).
 *
 * "Suggestions are computed, not canned." The first chip is the highest-value
 * action derivable from the user's own data — an overdue bill, a frozen card, a
 * low balance — and only the remainder are standing intents. Chips regenerate
 * after every assistant turn and never repeat the answer just given.
 */

export interface Suggestion {
    id: string;
    label: string;
    /** What gets sent when the chip is tapped. */
    message: string;
    /** The computed lead chip, rendered with the sparkle. */
    primary?: boolean;
}

export interface SuggestionContext {
    accounts?: Account[];
    bills?: Bill[];
    cards?: Card[];
    locale?: 'en' | 'ar';
    /** Messages already sent — a chip never repeats the last answer. */
    exclude?: string[];
}

/** Below this, "low balance" is worth surfacing unprompted. */
const LOW_BALANCE = 1000;

const isOverdue = (bill: Bill) =>
    bill.status !== 'paid' &&
    (bill.status === 'overdue' || new Date(bill.dueDate) < new Date());

/**
 * The one computed chip. Ordered by how much it costs the user to miss it:
 * an overdue bill accrues charges, a frozen card blocks spending, a low balance
 * is merely worth knowing.
 */
function leadSuggestion(ctx: SuggestionContext): Suggestion | null {
    const isAr = ctx.locale === 'ar';

    const overdue = (ctx.bills || []).filter(isOverdue);
    if (overdue.length > 0) {
        // Largest overdue bill — the most expensive thing to keep ignoring.
        const bill = [...overdue].sort((a, b) => b.amount - a.amount)[0];
        const provider = isAr ? bill.providerNameAr : bill.providerName;
        return {
            id: `lead-bill-${bill.id}`,
            label: isAr ? `ادفع فاتورة ${provider} المتأخرة` : `Pay the overdue ${provider} bill`,
            message: isAr ? `ادفع فاتورة ${provider}` : `Pay my ${provider} bill`,
            primary: true,
        };
    }

    const frozen = (ctx.cards || []).find(card => card.status === 'frozen');
    if (frozen) {
        const name = isAr ? frozen.nameAr : frozen.name;
        return {
            id: `lead-card-${frozen.id}`,
            label: isAr ? `إلغاء تجميد ${name}` : `Unfreeze my ${name}`,
            message: isAr ? `ألغِ تجميد ${name}` : `Unfreeze my ${name}`,
            primary: true,
        };
    }

    const low = (ctx.accounts || []).find(acc => acc.balance < LOW_BALANCE);
    if (low) {
        const name = isAr ? low.nameAr : low.name;
        return {
            id: `lead-balance-${low.id}`,
            label: isAr ? `${name} منخفض` : `${name} is low`,
            message: isAr ? `اعرض رصيد ${name}` : `Show me my ${name} balance`,
            primary: true,
        };
    }

    return null;
}

/** The three standing intents, used when nothing needs attention. */
function standingIntents(locale: 'en' | 'ar'): Suggestion[] {
    const isAr = locale === 'ar';
    return [
        {
            id: 'intent-balance',
            label: isAr ? 'الرصيد الرئيسي' : 'Main balance',
            message: isAr ? 'اعرض رصيدي' : 'Show my balance',
        },
        {
            id: 'intent-spending',
            label: isAr ? 'مصاريفي' : 'My spending',
            message: isAr ? 'اعرض مصاريفي' : 'Show me my spending',
        },
        {
            id: 'intent-activity',
            label: isAr ? 'آخر حركاتي' : 'Recent activity',
            message: isAr ? 'وش آخر حركاتي؟' : 'Show my recent transactions',
        },
        {
            id: 'intent-bills',
            label: isAr ? 'فواتيري' : 'My bills',
            message: isAr ? 'اعرض فواتيري' : 'Show me my bills',
        },
        {
            id: 'intent-freeze',
            label: isAr ? 'تجميد بطاقة' : 'Freeze a card',
            message: isAr ? 'جمّد بطاقتي' : 'Freeze my card',
        },
    ];
}

export function computeSuggestions(ctx: SuggestionContext): Suggestion[] {
    const locale = ctx.locale || 'en';
    const exclude = (ctx.exclude || []).map(m => m.trim().toLowerCase());
    const used = new Set(exclude);

    const lead = leadSuggestion({ ...ctx, locale });
    const rest = standingIntents(locale).filter(s => !used.has(s.message.toLowerCase()));

    const out: Suggestion[] = [];
    if (lead && !used.has(lead.message.toLowerCase())) out.push(lead);
    // One computed chip plus three standing ones.
    out.push(...rest.slice(0, lead ? 3 : 4));
    return out;
}

// --- Entity completion -----------------------------------------------------

export type EntitySlot = 'payee' | 'account' | 'card' | 'bill';

export interface EntityCandidate {
    id: string;
    label: string;
    sublabel?: string;
    initials: string;
}

export interface SlotMatch {
    slot: EntitySlot;
    /** What the user has typed for this slot so far. */
    query: string;
    /** Everything before the slot, so a tap can rebuild the whole line. */
    prefix: string;
    candidates: EntityCandidate[];
    /** The remainder of the top match, previewed as ghost text. */
    ghost: string;
}

const initialsOf = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
};

/**
 * Patterns that open a slot. Each captures everything before the slot value and
 * the partial value itself, so "send 500 to Ah" yields prefix "send 500 to " and
 * query "Ah".
 */
const PATTERNS: { slot: EntitySlot; re: RegExp }[] = [
    { slot: 'account', re: /^(.*\b(?:from|من)\s+)([^\s].*)?$/i },
    { slot: 'payee', re: /^(.*\b(?:send|transfer|pay to|to|حوّل|حول|إلى|الى)\s+)([^\s].*)?$/i },
    { slot: 'bill', re: /^(.*\b(?:pay|ادفع)\s+)([^\s].*)?$/i },
    { slot: 'card', re: /^(.*\b(?:freeze|unfreeze|card|جمّد|بطاقة)\s+)([^\s].*)?$/i },
];

export interface EntityData {
    beneficiaries?: Beneficiary[];
    accounts?: Account[];
    cards?: Card[];
    bills?: Bill[];
}

function candidatesFor(
    slot: EntitySlot,
    data: EntityData,
    locale: 'en' | 'ar'
): EntityCandidate[] {
    const isAr = locale === 'ar';
    switch (slot) {
        case 'payee':
            return (data.beneficiaries || []).map(b => ({
                id: b.id,
                label: (isAr ? b.nameAr : b.name) || b.name,
                sublabel: (isAr ? b.bankNameAr : b.bankName) || b.bankName,
                initials: initialsOf(b.name),
            }));
        case 'account':
            return (data.accounts || []).map(a => ({
                id: a.id,
                label: (isAr ? a.nameAr : a.name) || a.name,
                sublabel: a.accountNumber,
                initials: initialsOf(a.name),
            }));
        case 'card':
            return (data.cards || []).map(c => ({
                id: c.id,
                label: (isAr ? c.nameAr : c.name) || c.name,
                sublabel: `•••• ${c.lastFourDigits}`,
                initials: initialsOf(c.name),
            }));
        case 'bill':
            return (data.bills || []).map(b => ({
                id: b.id,
                label: (isAr ? b.providerNameAr : b.providerName) || b.providerName,
                sublabel: b.accountNumber,
                initials: initialsOf(b.providerName),
            }));
        default:
            return [];
    }
}

/**
 * Find the entity slot the user is currently filling, if any.
 * Returns null when the text opens no slot — the chip row then stays on
 * suggestions rather than flickering between the two.
 */
export function matchEntitySlot(
    text: string,
    data: EntityData,
    locale: 'en' | 'ar' = 'en'
): SlotMatch | null {
    const value = text || '';
    if (!value.trim()) return null;

    for (const { slot, re } of PATTERNS) {
        const m = value.match(re);
        if (!m) continue;

        const prefix = m[1] ?? '';
        const query = (m[2] ?? '').trim();

        const all = candidatesFor(slot, data, locale);
        if (all.length === 0) continue;

        const q = query.toLowerCase();
        const matches = q
            ? all.filter(c => c.label.toLowerCase().includes(q))
            : all;
        if (matches.length === 0) continue;

        // Ghost text only previews a genuine prefix match — completing from the
        // middle of a name would show letters the user never typed.
        const top = matches[0];
        const ghost =
            q && top.label.toLowerCase().startsWith(q)
                ? top.label.slice(query.length)
                : '';

        return { slot, query, prefix, candidates: matches, ghost };
    }

    return null;
}
