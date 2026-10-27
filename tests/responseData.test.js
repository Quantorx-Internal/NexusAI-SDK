import { expect, test } from 'bun:test';
import { normaliseResponseData } from '../src/services/responseData';

test('the captured text and card use the same server figures and period', () => {
    const breakdown = [{ categoryId: 'shopping', amount: 3851 }, { categoryId: 'other', amount: 2737 }];
    const spending = { breakdown, totalSpending: 6588, period: 'last_month', label: 'September 2026', labelAr: 'سبتمبر ٢٠٢٦' };
    const result = normaliseResponseData({ ui: { showSpendingBreakdown: true, spending } });
    expect(result.spendingBreakdown).toBe(breakdown);
    expect(result.spendingSummary.totalSpending).toBe(6588);
    expect(result.spendingSummary.period).toBe('last_month');
});
test('missing spending data never generates random figures, even on repeated replies', () => {
    for (let i = 0; i < 4; i++) {
        const result = normaliseResponseData({ ui: { showSpendingBreakdown: true } });
        expect(result.ui.showSpendingBreakdown).toBe(false);
        expect(result.spendingBreakdown).toBeUndefined();
        expect(result.dataUnavailable).toContain('spendingBreakdown');
    }
});
test('an empty server list stays empty and real subscription rows survive', () => {
    const subscriptions = [{ id: 'real', amount: 12 }];
    const result = normaliseResponseData({ ui: { showBills: true, showSubscriptions: true }, bills: [], subscriptions });
    expect(result.bills).toEqual([]);
    expect(result.subscriptions).toBe(subscriptions);
    expect(result.ui.showBills).toBe(true);
});
test('missing lists are marked unavailable and inconsistent totals are rejected', () => {
    const result = normaliseResponseData({ ui: { showCards: true, showSpendingBreakdown: true }, spendingBreakdown: [{ amount: 1 }], spendingSummary: { totalSpending: 999 } });
    expect(result.dataUnavailable).toEqual(['cards', 'spendingBreakdown']);
    expect(result.ui.showCards).toBe(false);
    expect(result.spendingBreakdown).toBeUndefined();
});
test('a false display flag cannot carry a stale card into another reply', () => {
    expect(normaliseResponseData({ ui: {}, spendingBreakdown: [{ amount: 5 }] }).spendingBreakdown).toBeUndefined();
});
