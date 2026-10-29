import { ENV } from '../config/constants';
import { mockAccounts } from '../data/accounts';
import { mockBills } from '../data/bills';
import { mockCards } from '../data/cards';
import { mockBeneficiaries } from '../data/beneficiaries';
import { mockSpendingBreakdown } from '../data/spending';
import { mockLoanProducts } from '../data/products';
import { DEMO_SALARY } from '../lib/loanOptions';
import { loanReach } from '../lib/loans';
import type { Account, Beneficiary, Bill, Card, LoanBudget, SpendingBreakdown } from '../types';
import type { WelcomeSummary } from '../components/Chat/WelcomeView';

/**
 * The customer's banking snapshot for the welcome screen, from the server.
 *
 * The summary the assistant types before the user asks has to say what the
 * server would say: the same accounts, the same bills, the same month's
 * spending the chat cards draw. So the screen reads the bank endpoints the
 * agent's tools read, keyed by the chat session where the server draws
 * figures per session (spending, and the salary rows in the transactions).
 * Nothing here is invented: a part that fails to load is simply absent, and
 * the summary leaves that figure out. Only CHAT_AGENT=mock uses fixtures.
 */

export interface BankSnapshot {
    accounts: Account[] | null;
    beneficiaries: Beneficiary[] | null;
    bills: Bill[] | null;
    cards: Card[] | null;
    spending: { breakdown: SpendingBreakdown[]; totalSpending: number } | null;
    /** The monthly salary credit, from the latest salary row. */
    salary: number | null;
    /** Where it came from. */
    source: 'api' | 'mock';
}

/** Bills that come every month. A credit card or a traffic fine does not. */
const MONTHLY_BILLS: ReadonlyArray<Bill['type']> = ['electricity', 'water', 'internet', 'phone'];
const TIMEOUT_MS = 12_000;

function apiRoot(): string | null {
    const base = ENV.API_CALLBACK_URL;
    if (!base) return null;
    return base.replace(/\/+$/, '').replace(/\/api$/i, '');
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return null;
        return (await response.json()) as T;
    } catch (error) {
        if (!signal?.aborted) console.warn(`BankSnapshotService: ${url} failed`, error);
        return null;
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
    }
}

export class BankSnapshotService {
    /** The fixtures, for the offline demo. */
    static mock(): BankSnapshot {
        return {
            accounts: mockAccounts,
            beneficiaries: mockBeneficiaries,
            bills: mockBills,
            cards: mockCards,
            spending: {
                breakdown: mockSpendingBreakdown,
                totalSpending: mockSpendingBreakdown.reduce((sum, row) => sum + row.amount, 0),
            },
            salary: DEMO_SALARY,
            source: 'mock',
        };
    }

    /**
     * Everything the welcome screen needs, from the server, in parallel.
     * Null when no API callback is configured.
     */
    static async fetch(sessionId: string, signal?: AbortSignal): Promise<BankSnapshot | null> {
        if (ENV.CHAT_AGENT === 'mock') return BankSnapshotService.mock();
        const root = apiRoot();
        if (!root) return null;
        const session = encodeURIComponent(sessionId);

        const [accounts, beneficiaries, bills, cards, spending, salaryRows] = await Promise.all([
            getJson<{ accounts?: Account[] }>(`${root}/api/accounts`, signal),
            getJson<{ beneficiaries?: Beneficiary[] }>(`${root}/api/beneficiaries`, signal),
            getJson<{ bills?: Bill[] }>(`${root}/api/bills`, signal),
            getJson<{ cards?: Card[] }>(`${root}/api/cards`, signal),
            getJson<{ breakdown?: SpendingBreakdown[]; totalSpending?: number }>(
                `${root}/api/spending/breakdown?sessionId=${session}&period=current_month`,
                signal
            ),
            getJson<{ transactions?: { amount: number }[] }>(
                `${root}/api/transactions?sessionId=${session}&category=salary&direction=in&limit=1`,
                signal
            ),
        ]);

        const rows = Array.isArray(spending?.breakdown)
            ? spending!.breakdown!.filter(r => Number.isFinite(r.amount) && r.amount >= 0)
            : null;
        const total = rows
            ? Number.isFinite(spending?.totalSpending)
                ? spending!.totalSpending!
                : rows.reduce((sum, r) => sum + r.amount, 0)
            : null;
        const salary = salaryRows?.transactions?.[0]?.amount;

        return {
            accounts: Array.isArray(accounts?.accounts) ? accounts!.accounts! : null,
            beneficiaries: Array.isArray(beneficiaries?.beneficiaries) ? beneficiaries!.beneficiaries! : null,
            bills: Array.isArray(bills?.bills) ? bills!.bills! : null,
            cards: Array.isArray(cards?.cards) ? cards!.cards! : null,
            spending: rows && total !== null ? { breakdown: rows, totalSpending: total } : null,
            salary: typeof salary === 'number' && salary > 0 ? salary : null,
            source: 'api',
        };
    }

    /** The customer's month, from the snapshot, for sizing a loan. Null without a salary or spending figure. */
    static budget(snapshot: BankSnapshot): LoanBudget | null {
        if (snapshot.salary == null || !snapshot.spending) return null;
        const latest = new Map<Bill['type'], Bill>();
        for (const bill of snapshot.bills ?? []) {
            if (!MONTHLY_BILLS.includes(bill.type)) continue;
            const seen = latest.get(bill.type);
            if (!seen || bill.dueDate > seen.dueDate) latest.set(bill.type, bill);
        }
        return {
            income: snapshot.salary,
            spending: snapshot.spending.totalSpending,
            bills: [...latest.values()].reduce((sum, bill) => sum + bill.amount, 0),
        };
    }

    /**
     * What the welcome screen says. Every figure comes from the snapshot; a
     * part that did not load leaves its figure out rather than guessing.
     */
    static welcomeSummary(snapshot: BankSnapshot): WelcomeSummary {
        // The agent counts "pending" as status pending; overdue bills are their own, more urgent, figure.
        const pending = (snapshot.bills ?? []).filter(b => b.status === 'pending');
        const overdue = (snapshot.bills ?? []).filter(b => b.status === 'overdue');
        const budget = BankSnapshotService.budget(snapshot);
        // The loan to lead with: the personal loan, sized to this month. The
        // agent checks eligibility when the user opens it; this only sizes it.
        const personal = mockLoanProducts.find(p => p.type === 'personal_loan');
        const reach = budget && personal?.loan ? loanReach(personal.loan, budget) : null;

        return {
            totalBalance: snapshot.accounts ? snapshot.accounts.reduce((sum, acc) => sum + acc.balance, 0) : null,
            accounts: snapshot.accounts?.length ?? 0,
            monthlySpending: snapshot.spending?.totalSpending ?? null,
            spendingCategories: snapshot.spending?.breakdown.length ?? 0,
            pendingBills: snapshot.bills
                ? { count: pending.length, amount: pending.reduce((sum, b) => sum + b.amount, 0) }
                : null,
            overdueBills: snapshot.bills
                ? { count: overdue.length, amount: overdue.reduce((sum, b) => sum + b.amount, 0) }
                : null,
            activeCards: snapshot.cards ? snapshot.cards.filter(c => c.status === 'active').length : null,
            loan: reach && personal
                ? {
                    name: personal.name,
                    nameAr: personal.nameAr || personal.name,
                    upTo: reach.amount,
                    monthly: reach.monthly,
                    months: reach.months,
                }
                : null,
        };
    }
}

export default BankSnapshotService;
