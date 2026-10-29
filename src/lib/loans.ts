/**
 * What a loan costs, and whether the customer can carry it.
 *
 * Pure, so the loan card recalculates while the user drags a slider, and the
 * offline mock prices the very same loan the server would. The agent never
 * does these sums itself; it quotes the result.
 */

import type { LoanBudget, LoanFit, LoanTerms } from '../types';

export interface LoanQuote {
    amount: number;
    months: number;
    /** The installment, every month. */
    monthly: number;
    /** Interest or profit over the whole loan. */
    interest: number;
    fee: number;
    /** Every installment, plus the fee. */
    totalPayable: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * The nearest loan the product allows. A missing value takes the product's
 * usual one. The amount is kept as asked, inside the limits; the tenure also
 * lands on the product's step, so home financing stays in whole years.
 */
export function fitLoan(terms: LoanTerms, amount?: number | null, months?: number | null) {
    const wantedMonths = months ?? terms.defaultMonths;
    const steppedMonths =
        terms.minMonths + Math.round((wantedMonths - terms.minMonths) / terms.monthsStep) * terms.monthsStep;
    return {
        amount: Math.round(clamp(amount ?? terms.defaultAmount, terms.minAmount, terms.maxAmount)),
        months: clamp(steppedMonths, terms.minMonths, terms.maxMonths),
    };
}

/** One step up or down from `value`, onto the step grid that starts at `min`. */
export function nudge(value: number, direction: 1 | -1, min: number, max: number, step: number): number {
    const position = (value - min) / step;
    const next = direction > 0 ? Math.floor(position + 1e-9) + 1 : Math.ceil(position - 1e-9) - 1;
    return clamp(min + next * step, min, max);
}

/** The grid value nearest to `value`, inside the limits. */
export function snap(value: number, min: number, max: number, step: number): number {
    const stepped = min + Math.round((value - min) / step) * step;
    return clamp(stepped, min, max);
}

export function quoteLoan(terms: LoanTerms, amount: number, months: number): LoanQuote {
    const { rate, fee } = terms;
    let monthly: number;
    if (rate.kind === 'flat') {
        monthly = (amount * (1 + (rate.percent / 100) * months)) / months;
    } else {
        const r = rate.percent / 100 / 12;
        monthly = r === 0 ? amount / months : (amount * r) / (1 - (1 + r) ** -months);
    }
    monthly = round2(monthly);

    const repaid = round2(monthly * months);
    const feeAmount = round2(fee.kind === 'percent' ? (amount * fee.value) / 100 : fee.value);
    return {
        amount,
        months,
        monthly,
        interest: round2(repaid - amount),
        fee: feeAmount,
        totalPayable: round2(repaid + feeAmount),
    };
}

/** "12.5% a year", "1.5% a month, flat": how the rate reads on the card and to the agent. */
export function rateLabel(terms: LoanTerms, locale: 'en' | 'ar' = 'en'): string {
    const { kind, percent, startingFrom } = terms.rate;
    if (locale === 'ar') {
        const base = kind === 'flat' ? `${percent}% شهرياً، ثابت` : `${percent}% سنوياً`;
        return startingFrom ? `يبدأ من ${base}` : base;
    }
    const base = kind === 'flat' ? `${percent}% a month, flat` : `${percent}% a year`;
    return startingFrom ? `from ${base}` : base;
}

/**
 * "48 months", "20 years", "سنتين": a tenure as people say it. Arabic counts
 * take the plural from 3 to 10 and the singular from 11.
 */
export function tenureLabel(months: number, locale: 'en' | 'ar' = 'en', inYears = months % 12 === 0): string {
    const n = inYears ? months / 12 : months;
    if (locale === 'ar') {
        const [one, two, few, many] = inYears ? ['سنة', 'سنتين', 'سنوات', 'سنة'] : ['شهر', 'شهرين', 'أشهر', 'شهر'];
        if (n === 1) return one;
        if (n === 2) return two;
        return `${n} ${n <= 10 ? few : many}`;
    }
    const unit = inYears ? 'year' : 'month';
    return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

/** "1–5 years", "3–12 months": the tenures a loan offers. */
export function tenureRange(minMonths: number, maxMonths: number, locale: 'en' | 'ar' = 'en'): string {
    const years = minMonths % 12 === 0 && maxMonths % 12 === 0;
    const low = years ? minMonths / 12 : minMonths;
    if (locale === 'ar') {
        // The range is one left-to-right run, or the two numbers swap.
        const high = years ? maxMonths / 12 : maxMonths;
        const [one, , few, many] = years ? ['سنة', 'سنتين', 'سنوات', 'سنة'] : ['شهر', 'شهرين', 'أشهر', 'شهر'];
        const unit = high <= 2 ? one : high <= 10 ? few : many;
        return `\u2066${low}\u2060–\u2060${high}\u2069\u00a0${unit}`;
    }
    return `${low}–${tenureLabel(maxMonths, locale, years)}`;
}

export interface LoanPlan {
    amount: number;
    months: number;
    monthly: number;
    /** What stays from the salary each month on this plan, after the usual spending and bills. */
    left: number;
    /**
     * Interest saved against the plan on the card, for the same amount over a
     * different tenure. Below zero, it costs that much more. Zero for a smaller
     * amount: borrowing less always costs less, and calling that a saving misleads.
     */
    saves: number;
}

export interface LoanAdvice {
    fit: LoanFit;
    /** The installment as a share of the salary, 0 to 1. */
    share: number;
    /** The salary left each month after the usual spending and the bills. */
    free: number;
    /** What is left after the installment too. Below zero, the month runs short. */
    left: number;
    /**
     * A plan to point to. For a plan that does not fit: the same amount over
     * longer, or failing that the most the product lends over its longest
     * tenure. For a plan that fits: a shorter one that still fits and costs less.
     */
    suggestion: LoanPlan | null;
}

/** Comfortable: at most a quarter of the salary, with a tenth of it still spare. */
const COMFORTABLE_SHARE = 0.25;
const SPARE_SHARE = 0.1;
/** Tight: at most a third of the salary, the usual ceiling for an installment, and the month still covered. */
const MAX_SHARE = 1 / 3;
/** A shorter plan is worth mentioning when it saves at least this share of the amount. */
const WORTH_SAVING = 0.02;

function ceilings(budget: LoanBudget) {
    const free = budget.income - budget.spending - budget.bills;
    return {
        free,
        comfortable: Math.min(budget.income * COMFORTABLE_SHARE, free - budget.income * SPARE_SHARE),
        tight: Math.min(budget.income * MAX_SHARE, free),
    };
}

function tenures(terms: LoanTerms): number[] {
    const list: number[] = [];
    for (let m = terms.minMonths; m <= terms.maxMonths; m += terms.monthsStep) list.push(m);
    return list;
}

/**
 * A tenure people say: up to the next half year, when that still keeps the
 * plan on the right side of `ok`. 59 months reads as a sum; 5 years reads as
 * advice.
 */
function roundTenure(terms: LoanTerms, months: number, ok: (m: number) => boolean): number {
    if (terms.monthsStep >= 6) return months;
    const rounded = Math.min(terms.maxMonths, Math.ceil(months / 6) * 6);
    return ok(rounded) ? rounded : months;
}

/** The most the product lends for this installment over `months`, on its amount steps. */
function amountFor(terms: LoanTerms, monthly: number, months: number): number {
    const { kind, percent } = terms.rate;
    const r = percent / 100 / 12;
    const raw =
        kind === 'flat'
            ? (monthly * months) / (1 + (percent / 100) * months)
            : r === 0
                ? monthly * months
                : (monthly * (1 - (1 + r) ** -months)) / r;
    return Math.min(terms.maxAmount, Math.floor(raw / terms.amountStep) * terms.amountStep);
}

/** How a plan sits in the customer's month, and what to point to instead. */
export function adviseLoan(terms: LoanTerms, amount: number, months: number, budget: LoanBudget): LoanAdvice {
    const limit = ceilings(budget);
    const quote = quoteLoan(terms, amount, months);
    const fit: LoanFit =
        quote.monthly <= limit.comfortable ? 'comfortable' : quote.monthly <= limit.tight ? 'tight' : 'risky';

    const plan = (a: number, m: number): LoanPlan => {
        const other = quoteLoan(terms, a, m);
        return {
            amount: a,
            months: m,
            monthly: other.monthly,
            left: round2(limit.free - other.monthly),
            saves: a === amount ? round2(quote.interest - other.interest) : 0,
        };
    };
    const fitsUnder = (ceiling: number) => (m: number) => quoteLoan(terms, amount, m).monthly <= ceiling;

    let suggestion: LoanPlan | null = null;
    if (fit === 'comfortable') {
        const fits = (m: number) => m < months && fitsUnder(limit.comfortable)(m);
        const shorter = tenures(terms).find(fits);
        if (shorter) {
            const candidate = plan(amount, roundTenure(terms, shorter, fits));
            if (candidate.saves >= amount * WORTH_SAVING) suggestion = candidate;
        }
    } else {
        // Aim for comfortable. A plan past the ceiling settles for tight when nothing comfortable exists.
        const target = limit.comfortable > 0 ? limit.comfortable : fit === 'risky' ? limit.tight : 0;
        if (target > 0) {
            const fits = (m: number) => m > months && fitsUnder(target)(m);
            const longer = tenures(terms).find(fits);
            if (longer) {
                suggestion = plan(amount, roundTenure(terms, longer, fits));
            } else {
                const most = amountFor(terms, target, terms.maxMonths);
                if (most >= terms.minAmount) suggestion = plan(most, terms.maxMonths);
            }
        }
    }

    return {
        fit,
        share: budget.income > 0 ? Math.round((quote.monthly / budget.income) * 1000) / 1000 : 1,
        free: round2(limit.free),
        left: round2(limit.free - quote.monthly),
        suggestion,
    };
}

/**
 * How far a loan reaches within the customer's month: the most it lends over
 * its longest tenure at a comfortable fit, else at a tight one. Null when no
 * amount it offers fits at all. The loan list shows this for each loan, so
 * the user can see which ones are realistic before opening any.
 */
export function loanReach(terms: LoanTerms, budget: LoanBudget) {
    const limit = ceilings(budget);
    const months = terms.maxMonths;
    for (const [fit, ceiling] of [
        ['comfortable', limit.comfortable],
        ['tight', limit.tight],
    ] as const) {
        if (ceiling <= 0) continue;
        const amount = amountFor(terms, ceiling, months);
        if (amount >= terms.minAmount) {
            return { fit, amount, months, monthly: quoteLoan(terms, amount, months).monthly };
        }
    }
    return null;
}

/**
 * A loan as the advisor reads it: the figures the card shows and how the
 * plan sits in the customer's month, so a remark can be written from the
 * same numbers the card shows. `asked` lists what had to move to fit the
 * product's limits.
 */
export function describeLoan(
    offer: { product: { id: string; name: string }; terms: LoanTerms; amount: number; months: number; budget?: LoanBudget | null },
    asked: { amount?: number | null; months?: number | null } = {}
) {
    const { terms } = offer;
    const quote = quoteLoan(terms, offer.amount, offer.months);
    const moved: string[] = [];
    if (asked.amount != null && asked.amount !== offer.amount) {
        moved.push(`amount moved to ${offer.amount} SAR: this loan is ${terms.minAmount}-${terms.maxAmount} SAR`);
    }
    if (asked.months != null && asked.months !== offer.months) {
        const steps = terms.monthsStep > 1 ? `, in steps of ${terms.monthsStep}` : '';
        moved.push(`tenure moved to ${offer.months} months: this loan is ${terms.minMonths}-${terms.maxMonths} months${steps}`);
    }
    const budget = offer.budget;
    const fit = budget ? describeFit(terms, offer.amount, offer.months, budget) : undefined;
    return {
        productId: offer.product.id,
        product: offer.product.name,
        currency: 'SAR',
        amount: quote.amount,
        months: quote.months,
        monthlyInstallment: quote.monthly,
        rate: terms.rate.startingFrom ? `${rateLabel(terms)} (indicative)` : rateLabel(terms),
        costOfFinancing: quote.interest,
        fees: quote.fee,
        totalRepaid: quote.totalPayable,
        ...(moved.length > 0 && { moved }),
        ...(fit && { fit }),
    };
}

function describeFit(terms: LoanTerms, amount: number, months: number, budget: LoanBudget) {
    const advice = adviseLoan(terms, amount, months, budget);
    const { suggestion } = advice;
    return {
        verdict: advice.fit,
        shareOfSalary: `${Math.round(advice.share * 100)}%`,
        salary: budget.income,
        usualSpending: budget.spending,
        monthlyBills: budget.bills,
        leftAfterInstallment: advice.left,
        suggestion: suggestion && {
            amount: suggestion.amount,
            months: suggestion.months,
            monthlyInstallment: suggestion.monthly,
            leftAfterInstallment: suggestion.left,
            saves: suggestion.saves,
        },
    };
}
