import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react-native';
import { Card, StackedBar, RampKey, rampAt } from '../../ui';
import { color, layout, size, text, iconStroke } from '../../../theme/tokens';
import { formatCurrency, formatMonth } from '../../../lib/utils';
import { SpendingBreakdown } from '../../../types';

/**
 * Family D · SpendingBreakdown.
 *
 * Two changes fix the height problem. One stacked bar at the top replaces seven
 * per-row bars: a row's proportion is already stated in its text ("30%"), so a
 * bar per row repeated it and cost ~36pt each. And only the top five categories
 * are shown, with the remainder summed into an expandable "N more" row —
 * expanding pushes the card down, it never scrolls inside itself.
 *
 * Change vs. last period is text only (↑ danger, ↓ success). A bar always means
 * share of the total, never delta.
 */

interface SpendingBreakdownBlockProps {
    breakdown: SpendingBreakdown[];
    total: number;
    locale?: 'en' | 'ar';
    /** Defaults to the current month. */
    periodLabel?: string;
}

const VISIBLE = 5;

export function SpendingBreakdownBlock({
    breakdown,
    total,
    locale = 'en',
    periodLabel,
}: SpendingBreakdownBlockProps) {
    const [expanded, setExpanded] = useState(false);
    const isAr = locale === 'ar';

    if (breakdown.length === 0) return null;

    const t = {
        totalSpent: isAr ? 'إجمالي الإنفاق' : 'Total spent',
        transactions: isAr ? 'معاملة' : 'transactions',
        more: (n: number) => (isAr ? `${n} فئات أخرى` : `${n} more categories`),
        noSpending: isAr ? 'لا يوجد إنفاق في هذه الفترة' : 'No spending in this period',
    };

    // Rank order drives both the stacked bar and the colour keys.
    const ranked = [...breakdown].sort((a, b) => b.amount - a.amount);
    const head = ranked.slice(0, VISIBLE);
    const tail = ranked.slice(VISIBLE);

    const tailAmount = tail.reduce((sum, c) => sum + c.amount, 0);
    const tailPercent = tail.reduce((sum, c) => sum + c.percentage, 0);

    const segments = [
        ...head.map(c => ({ percent: c.percentage })),
        ...(tail.length > 0 ? [{ percent: tailPercent }] : []),
    ];

    const period = periodLabel ?? formatMonth(new Date(), locale);

    return (
        <Card variant="info">
            <View style={styles.header}>
                <Text style={text('caption')}>
                    {t.totalSpent}
                    {period ? ` · ${period}` : ''}
                </Text>
                <Text style={[text('hero'), styles.tabular]} numberOfLines={1} adjustsFontSizeToFit>
                    {formatCurrency(total, 'SAR', locale)}
                </Text>
            </View>

            {total > 0 ? (
                <View style={styles.bar}>
                    <StackedBar segments={segments} />
                </View>
            ) : (
                <Text style={[text('caption'), styles.bar]}>{t.noSpending}</Text>
            )}

            <View style={styles.rows}>
                {head.map((category, index) => (
                    <CategoryRow
                        key={category.categoryId}
                        category={category}
                        index={index}
                        locale={locale}
                        transactionsLabel={t.transactions}
                    />
                ))}

                {expanded &&
                    tail.map((category, index) => (
                        <CategoryRow
                            key={category.categoryId}
                            category={category}
                            index={VISIBLE + index}
                            locale={locale}
                            transactionsLabel={t.transactions}
                        />
                    ))}

                {tail.length > 0 && (
                    <Pressable
                        onPress={() => setExpanded(v => !v)}
                        style={({ pressed }) => [styles.moreRow, pressed && styles.morePressed]}
                    >
                        <View style={styles.rowLeft}>
                            <RampKey index={VISIBLE} />
                            <Text style={text('rowValue', { color: color.text.secondary })}>
                                {t.more(tail.length)}
                            </Text>
                        </View>
                        <View style={styles.rowLeft}>
                            <Text style={[text('rowValue'), styles.tabular]}>
                                {formatCurrency(tailAmount, 'SAR', locale)}
                            </Text>
                            {expanded ? (
                                <ChevronUp
                                    size={size.icon.md}
                                    color={color.text.secondary}
                                    strokeWidth={iconStroke}
                                />
                            ) : (
                                <ChevronDown
                                    size={size.icon.md}
                                    color={color.text.secondary}
                                    strokeWidth={iconStroke}
                                />
                            )}
                        </View>
                    </Pressable>
                )}
            </View>
        </Card>
    );
}

function CategoryRow({
    category,
    index,
    locale,
    transactionsLabel,
}: {
    category: SpendingBreakdown;
    index: number;
    locale: 'en' | 'ar';
    transactionsLabel: string;
}) {
    const name = locale === 'ar' ? category.categoryNameAr : category.categoryName;
    // Spending up is bad news, so ↑ is danger and ↓ is success.
    const up = category.change > 0;
    const Arrow = up ? TrendingUp : TrendingDown;
    const changeColor = up ? color.danger.fg : color.success.fg;

    return (
        <View style={styles.row}>
            <View style={styles.rowTop}>
                <View style={styles.rowLeft}>
                    <RampKey index={index} />
                    <Text style={text('rowValue')} numberOfLines={1}>
                        {name}
                    </Text>
                </View>
                <Text style={[text('rowValue'), styles.tabular]} numberOfLines={1}>
                    {formatCurrency(category.amount, 'SAR', locale)}
                </Text>
            </View>

            <View style={styles.rowBottom}>
                <Text style={text('caption')} numberOfLines={1}>
                    {category.transactionCount} {transactionsLabel} · {category.percentage.toFixed(0)}%
                </Text>
                {category.change !== 0 && (
                    <View style={styles.change}>
                        <Arrow size={14} color={changeColor} strokeWidth={iconStroke} />
                        <Text
                            style={text('caption', { color: changeColor, fontWeight: '600' })}
                        >
                            {Math.abs(category.change)}%
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: { marginBottom: layout.sectionGap },
    tabular: { fontVariant: ['tabular-nums'] },
    bar: { marginBottom: layout.sectionGap },
    rows: { gap: layout.rowGap },
    row: { gap: 2 },
    rowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: layout.rowGap,
    },
    rowBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: layout.rowGap,
        paddingLeft: 22,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: layout.rowGap, flexShrink: 1 },
    change: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    moreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: layout.rowGap,
        paddingVertical: 4,
    },
    morePressed: { opacity: 0.6 },
});

export default SpendingBreakdownBlock;
