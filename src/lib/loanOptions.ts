/**
 * Which loans the user can apply for, checked by the app.
 *
 * Mirrors the server's loan-options logic so the offline fallback draws the
 * same cards a live reply would: each loan's conditions are checked in one
 * place, and the card says only what each loan requires, never what the
 * profile holds.
 */

import { mockLoanProducts } from '../data/products';
import { mockSpendingBreakdown } from '../data/spending';
import { mockBills } from '../data/bills';
import { fitLoan, loanReach, rateLabel, tenureLabel, tenureRange } from './loans';
import type {
    Bill,
    BilingualText,
    LoanApplicantProfile,
    LoanBudget,
    LoanOfferUI,
    LoanOption,
    LoanOptionsUI,
    LoanProduct,
    Product,
} from '../types';

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * The demo customer. A salary of 14,250 against the demo spending and bills
 * lands the personal loan comfortable, the car loan tight and the mortgage
 * over budget, so every state of the cards is reachable offline. The old
 * 18,500 demo earner carried everything comfortably.
 */
export const DEMO_SALARY = 14250;

export const demoProfile: LoanApplicantProfile = {
    age: 34,
    isEmployed: true,
    monthlySalary: DEMO_SALARY,
    accountAgeMonths: 4,
};

/** Bills that come every month. A credit card or a traffic fine does not. */
const MONTHLY_BILLS: ReadonlyArray<Bill['type']> = ['electricity', 'water', 'internet', 'phone'];

/**
 * The customer's month, from what they can see in the app: the salary, the
 * spending card, and the latest bill of each monthly kind (so last month's
 * paid one is not counted twice).
 */
export function demoBudget(salary: number = DEMO_SALARY): LoanBudget {
    const latest = new Map<Bill['type'], Bill>();
    for (const bill of mockBills) {
        if (!MONTHLY_BILLS.includes(bill.type)) continue;
        const seen = latest.get(bill.type);
        if (!seen || bill.dueDate > seen.dueDate) latest.set(bill.type, bill);
    }
    return {
        income: salary,
        spending: mockSpendingBreakdown.reduce((sum, item) => sum + item.amount, 0),
        bills: [...latest.values()].reduce((sum, bill) => sum + bill.amount, 0),
    };
}

/** The card's copy of a product: the server's product shape, nothing from the rules. */
function cardFields(product: LoanProduct): Product {
    const { eligibility: _rules, loan: _loan, rateText: _rate, tenureText: _tenure, ...fields } = product;
    return fields;
}

/** The conditions of a loan this profile does not meet yet, as the card states them. */
export function blockersFor(product: LoanProduct, profile: LoanApplicantProfile): BilingualText[] {
    const rule = product.eligibility;
    const blockers: BilingualText[] = [];
    if (rule.requiresEmployment && !profile.isEmployed) {
        blockers.push({ en: 'For employed customers', ar: 'للموظفين فقط' });
    }
    if (rule.minSalary && profile.monthlySalary < rule.minSalary) {
        blockers.push({
            en: `Needs a salary of ${fmt(rule.minSalary)} SAR or more`,
            ar: `يحتاج راتب ${fmt(rule.minSalary)} ر.س أو أكثر`,
        });
    }
    if (rule.minAge && profile.age < rule.minAge) {
        blockers.push({ en: `From age ${rule.minAge}`, ar: `من عمر ${rule.minAge} سنة` });
    }
    if (rule.maxAge && profile.age > rule.maxAge) {
        blockers.push({ en: `Up to age ${rule.maxAge}`, ar: `حتى عمر ${rule.maxAge} سنة` });
    }
    if (rule.minAccountAge && profile.accountAgeMonths < rule.minAccountAge) {
        blockers.push({
            en: `After ${tenureLabel(rule.minAccountAge, 'en', false)} with the bank`,
            ar: `بعد ${tenureLabel(rule.minAccountAge, 'ar', false)} مع البنك`,
        });
    }
    return blockers;
}

function option(product: LoanProduct, profile: LoanApplicantProfile, budget: LoanBudget | null): LoanOption {
    const { loan } = product;
    const amounts = loan
        ? { min: loan.minAmount, max: loan.maxAmount }
        : product.minAmount != null && product.maxAmount != null
            ? { min: product.minAmount, max: product.maxAmount }
            : undefined;
    return {
        product: cardFields(product),
        loanCard: Boolean(loan),
        rate: loan
            ? { en: rateLabel(loan, 'en'), ar: rateLabel(loan, 'ar') }
            : product.rateText ?? { en: '', ar: '' },
        ...(amounts && { amounts }),
        tenure: loan
            ? { en: tenureRange(loan.minMonths, loan.maxMonths, 'en'), ar: tenureRange(loan.minMonths, loan.maxMonths, 'ar') }
            : product.tenureText ?? { en: '', ar: '' },
        reach: loan && budget ? loanReach(loan, budget) : null,
        blockers: blockersFor(product, profile),
    };
}

/**
 * Without a stated need, the loan an advisor leads with: the most general one
 * first. Ranking by how much of its range the month covers put the micro loan
 * on top, because 10,000 is all of its range.
 */
const GENERAL_FIRST = ['personal_loan', 'auto_loan', 'debt_consolidation', 'micro_loan', 'mortgage'];

/**
 * The loan to feature as the best fit: the agent's pick when the user can
 * apply for it and their month carries some of it; else the most general loan
 * their month carries, a comfortable one before a tight one. None when no
 * loan fits at all: "best fit" over "over your budget" contradicts itself.
 */
function featuredOf(available: LoanOption[], pick?: string | null): string | null {
    const shaped = available.filter(o => o.loanCard && o.reach);
    if (pick && shaped.some(o => o.product.id === pick)) return pick;
    const order = (o: LoanOption) => {
        const general = GENERAL_FIRST.indexOf(o.product.type);
        return (o.reach!.fit === 'comfortable' ? 0 : 100) + (general < 0 ? 50 : general);
    };
    const best = [...shaped].sort((a, b) => order(a) - order(b))[0];
    return best?.product.id ?? null;
}

/**
 * Every loan, split by whether the profile meets its conditions. The ones
 * the user can apply for come in the order an advisor would show them: the
 * ones their month carries comfortably first, priced-on-request last.
 */
export function optionsFor(
    profile: LoanApplicantProfile,
    budget: LoanBudget | null,
    pick?: string | null,
    catalogue: LoanProduct[] = mockLoanProducts
): LoanOptionsUI {
    const options = catalogue.map(p => option(p, profile, budget));
    const rank = (o: LoanOption) => (!o.loanCard ? 3 : o.reach?.fit === 'comfortable' ? 0 : o.reach ? 1 : 2);
    const available = options.filter(o => !o.blockers.length).sort((a, b) => rank(a) - rank(b));
    return {
        available,
        unavailable: options.filter(o => o.blockers.length),
        featured: featuredOf(available, pick),
    };
}

/** The demo customer's loan list. */
export function demoLoanOptions(pick?: string | null): LoanOptionsUI {
    return optionsFor(demoProfile, demoBudget(), pick);
}

/**
 * The loan card for a product, at the amount and tenure asked for, moved
 * inside the product's limits. With the customer's budget, the card also says
 * how the plan fits. Undefined for a product with no loan card.
 */
export function loanOffer(
    id: string,
    amount?: number | null,
    months?: number | null,
    budget: LoanBudget | null = demoBudget(),
    catalogue: LoanProduct[] = mockLoanProducts
): LoanOfferUI | undefined {
    const product = catalogue.find(p => p.id === id);
    if (!product?.loan) return undefined;
    return { product: cardFields(product), terms: product.loan, ...fitLoan(product.loan, amount, months), budget };
}

/** The loan product a message names, by id, English name or Arabic name. */
export function findLoanProduct(text: string, catalogue: LoanProduct[] = mockLoanProducts): LoanProduct | undefined {
    const lower = text.toLowerCase();
    return catalogue.find(
        p => lower.includes(p.id) || lower.includes(p.name.toLowerCase()) || (p.nameAr ? text.includes(p.nameAr) : false)
    );
}
