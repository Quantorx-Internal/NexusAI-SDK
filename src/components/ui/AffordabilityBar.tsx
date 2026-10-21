import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusPill } from './StatusPill';
import { color, layout, loan, radius, text, toneSet, Tone } from '../../theme/tokens';
import type { LoanBudget } from '../../types';
import type { LoanAdvice } from '../../lib/loans';
import { useLayoutRTL, row, alignStart } from '../../contexts/LayoutDirectionContext';

/**
 * Affordability bar — the salary as one bar (design §5, shared element).
 *
 * One bar = the salary. Expenses (usual spending + monthly bills) take the
 * neutral part, the installment takes the fit colour, and what is left stays
 * white. Three equal columns underneath name each part; the remainder column
 * takes the fit colour too, and turns into the deficit when the month runs
 * short. The installment's share of the salary sits in its legend label, so
 * no number floats beside the bar.
 *
 * Over budget, the bar stays solid: a hatched fill needs a pattern RN Views
 * cannot draw cheaply, so the word and the deficit carry the alarm instead.
 */

export type AffordabilityFit = LoanAdvice['fit'];

interface AffordabilityBarProps {
    budget: LoanBudget;
    monthly: number;
    advice: LoanAdvice;
    labels: {
        salary: string;
        committed: string;
        installment: string;
        left: string;
        short: string;
        fit: Record<AffordabilityFit, string>;
    };
}

const FIT_TONE: Record<AffordabilityFit, Tone> = {
    comfortable: 'success',
    tight: 'warning',
    risky: 'danger',
};

const whole = (n: number) => Math.round(n).toLocaleString('en-US');

export function AffordabilityBar({ budget, monthly, advice, labels }: AffordabilityBarProps) {
    const tone = FIT_TONE[advice.fit];
    const set = toneSet(tone);
    const committed = budget.spending + budget.bills;
    const income = Math.max(budget.income, 1);
    const committedShare = Math.min(committed / income, 1);
    const installmentShare = Math.max(0, Math.min(monthly / income, 1 - committedShare));
    const leftShare = Math.max(0, 1 - committedShare - installmentShare);
    const short = advice.left < 0;
    const sharePct = `${Math.round(advice.share * 100)}%`;
    const flip = useLayoutRTL();

    return (
        <View style={styles.inset}>
            <View style={[styles.header, row(flip)]}>
                <View style={[styles.salary, row(flip)]}>
                    <Text style={text('rowLabel')}>{labels.salary}</Text>
                    <Text style={[text('rowValue'), styles.tabular]}>{whole(budget.income)}</Text>
                </View>
                <StatusPill label={labels.fit[advice.fit]} tone={tone} dot />
            </View>

            <View style={[styles.bar, row(flip)]}>
                <View style={[styles.segment, { flex: committedShare, backgroundColor: color.borderStrong }]} />
                {installmentShare > 0 ? (
                    <View style={[styles.segment, { flex: installmentShare, backgroundColor: set.fg }]} />
                ) : null}
                {leftShare > 0 ? (
                    <View style={[styles.segment, styles.remainder, { flex: leftShare }]} />
                ) : null}
            </View>

            <View style={[styles.legend, row(flip)]}>
                <LegendColumn
                    swatch={{ backgroundColor: color.borderStrong }}
                    label={labels.committed}
                    value={whole(committed)}
                />
                <LegendColumn
                    swatch={{ backgroundColor: set.fg }}
                    label={`${labels.installment} · ${sharePct}`}
                    value={whole(monthly)}
                />
                {short ? (
                    <LegendColumn
                        swatch={{ backgroundColor: color.danger.fg }}
                        label={labels.short}
                        value={whole(-advice.left)}
                        valueColor={color.danger.fg}
                    />
                ) : (
                    <LegendColumn
                        swatch={styles.remainderSwatch}
                        label={labels.left}
                        value={whole(advice.left)}
                        valueColor={set.fg}
                    />
                )}
            </View>
        </View>
    );
}

function LegendColumn({
    swatch,
    label,
    value,
    valueColor,
}: {
    swatch: object;
    label: string;
    value: string;
    valueColor?: string;
}) {
    const flip = useLayoutRTL();
    return (
        <View style={[styles.column, alignStart(flip)]}>
            <View style={[styles.columnLabel, row(flip)]}>
                <View style={[styles.swatch, swatch]} />
                <Text style={text('caption')} numberOfLines={1}>
                    {label}
                </Text>
            </View>
            <Text style={[text('rowValue', valueColor ? { color: valueColor } : undefined), styles.tabular]} numberOfLines={1}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    inset: {
        backgroundColor: color.surface2,
        borderRadius: radius.inner,
        padding: layout.rowGap,
        gap: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    salary: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    tabular: { fontVariant: ['tabular-nums'] },
    bar: {
        height: loan.bar,
        flexDirection: 'row',
        gap: loan.barGap,
        borderRadius: radius.bar,
        overflow: 'hidden',
    },
    segment: { height: '100%', borderRadius: radius.bar },
    remainder: {
        backgroundColor: color.surface,
        borderWidth: 1,
        borderColor: color.border,
    },
    legend: { flexDirection: 'row', gap: 8 },
    column: { flex: 1, gap: 2 },
    columnLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    swatch: { width: loan.swatch, height: loan.swatch, borderRadius: 2 },
    remainderSwatch: {
        backgroundColor: color.surface,
        borderWidth: 1,
        borderColor: color.borderStrong,
    },
});

export default AffordabilityBar;
