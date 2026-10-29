/** Live responses never acquire locally generated banking figures. */
export function normaliseResponseData(parsed: any): any {
    const result = { ...parsed, ui: { ...parsed.ui }, dataUnavailable: [] as string[] };
    for (const [flag, field] of [
        ['showAccounts', 'accounts'], ['showBeneficiaries', 'beneficiaries'],
        ['showCards', 'cards'], ['showBills', 'bills'], ['showSubscriptions', 'subscriptions'],
    ]) {
        if (!result.ui[flag]) { delete result[field]; continue; }
        // An empty server list is meaningful; never replace it with fixtures.
        const rows = result[field] ?? result.ui[field];
        if (Array.isArray(rows)) result[field] = rows;
        else { result.ui[flag] = false; result.dataUnavailable.push(field); }
    }
    if (result.ui.showSpendingBreakdown) {
        const snapshot = result.ui.spending ?? result.spendingSummary;
        const rows = snapshot?.breakdown ?? result.spendingBreakdown;
        if (Array.isArray(rows) && rows.every(r => Number.isFinite(r.amount) && r.amount >= 0)) {
            result.spendingBreakdown = rows;
            if (snapshot) {
                const total = rows.reduce((sum, r) => sum + r.amount, 0);
                if (!Number.isFinite(snapshot.totalSpending) || Math.abs(total - snapshot.totalSpending) > 0.01) {
                    result.ui.showSpendingBreakdown = false;
                    result.dataUnavailable.push('spendingBreakdown');
                } else result.spendingSummary = snapshot;
            }
        } else {
            result.ui.showSpendingBreakdown = false;
            result.dataUnavailable.push('spendingBreakdown');
        }
    }
    if (!result.ui.showSpendingBreakdown) {
        delete result.spendingBreakdown;
        delete result.spendingSummary;
        delete result.ui.spending;
    }
    return result;
}
