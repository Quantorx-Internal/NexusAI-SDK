import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { Card, SectionHeader, StatusPill, IconBox, iconOn, RowDivider, EmptyState } from '../../ui';
import { color, layout, radius, size, text, iconStroke } from '../../../theme/tokens';
import { formatCurrency, formatTime } from '../../../lib/utils';
import { Transaction } from '../../../types';
import { transactionVisual } from './transactionVisuals';

/**
 * Family D · TransactionList.
 *
 * Not covered by the design document — built from the system's Family D rules:
 * one neutral container, rows on hairlines, section header above, no card shouts.
 *
 * Two additions the other list cards don't need:
 *  - a money-in / money-out pair at the top, because "what went out" is the
 *    question a transaction list is usually opened to answer;
 *  - day grouping, because a flat list of 10 rows with timestamps is unreadable
 *    without knowing where one day ends and the next begins.
 *
 * Direction is carried by sign and colour: money in is success with "+", money
 * out is plain primary text with "−". Debits are NOT red — red stays reserved
 * for genuinely bad states (overdue, reversed), or every row would be an alarm.
 */

interface TransactionListBlockProps {
    transactions: Transaction[];
    title?: string;
    locale?: 'en' | 'ar';
    onSelect?: (transaction: Transaction) => void;
    /** The list was promised by the assistant but could not be fetched. */
    unavailable?: boolean;
}

function startOfDay(value: string | Date) {
    const d = new Date(value);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Today" / "Yesterday" / "Wed, 16 Sep" — sentence case, because Arabic has no caps. */
function dayLabel(date: string, locale: 'en' | 'ar'): string {
    const isAr = locale === 'ar';
    const day = startOfDay(date);
    const today = startOfDay(new Date());
    const dayMs = 86400000;

    if (day === today) return isAr ? 'اليوم' : 'Today';
    if (day === today - dayMs) return isAr ? 'أمس' : 'Yesterday';

    try {
        return new Intl.DateTimeFormat(isAr ? 'ar-SA' : 'en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        }).format(new Date(date));
    } catch (e) {
        return new Date(date).toDateString();
    }
}

export function TransactionListBlock({
    transactions,
    title,
    locale = 'en',
    onSelect,
    unavailable,
}: TransactionListBlockProps) {
    const isAr = locale === 'ar';
    const empty = !transactions || transactions.length === 0;

    // Say the list is missing rather than rendering nothing under a reply that
    // refers to it — silence is indistinguishable from the feature not existing.
    if (empty) {
        if (!unavailable) return null;
        return (
            <View>
                <SectionHeader title={title || (isAr ? 'آخر المعاملات' : 'Recent transactions')} />
                <EmptyState
                    title={isAr ? 'تعذّر تحميل المعاملات' : "Couldn't load transactions"}
                    note={isAr ? 'تحقق من اتصالك وحاول مرة أخرى.' : 'Check your connection and try again.'}
                />
            </View>
        );
    }

    const t = {
        title: title || (isAr ? 'آخر المعاملات' : 'Recent transactions'),
        count: (n: number) => (isAr ? `${n} معاملة` : `${n} transactions`),
        moneyOut: isAr ? 'المصروف' : 'Money out',
        moneyIn: isAr ? 'الوارد' : 'Money in',
    };

    const currency = transactions[0]?.currency || 'SAR';

    // Summarises the rows actually shown, which is what the card is a summary of;
    // the totals across the whole filter live in the assistant's sentence above.
    const moneyOut = transactions
        .filter(tx => tx.type === 'debit' && tx.status !== 'reversed')
        .reduce((sum, tx) => sum + tx.amount, 0);
    const moneyIn = transactions
        .filter(tx => tx.type === 'credit' && tx.status !== 'reversed')
        .reduce((sum, tx) => sum + tx.amount, 0);

    // Group by day, preserving the server's ordering.
    const groups: { key: number; label: string; rows: Transaction[] }[] = [];
    transactions.forEach(tx => {
        const key = startOfDay(tx.date);
        const last = groups[groups.length - 1];
        if (last && last.key === key) {
            last.rows.push(tx);
        } else {
            groups.push({ key, label: dayLabel(tx.date, locale), rows: [tx] });
        }
    });

    return (
        <View>
            <SectionHeader title={t.title} count={t.count(transactions.length)} />

            <View style={styles.totals}>
                <TotalBlock
                    label={t.moneyOut}
                    value={formatCurrency(moneyOut, currency, locale)}
                    tone="out"
                />
                <TotalBlock
                    label={t.moneyIn}
                    value={formatCurrency(moneyIn, currency, locale)}
                    tone="in"
                />
            </View>

            <Card variant="flush" style={styles.container}>
                {groups.map((group, groupIndex) => (
                    <View key={group.key}>
                        <View
                            style={[styles.dayHeader, groupIndex > 0 && styles.dayHeaderSubsequent]}
                        >
                            <Text style={text('caption')}>{group.label}</Text>
                        </View>
                        {group.rows.map((tx, rowIndex) => (
                            <React.Fragment key={tx.id}>
                                {rowIndex > 0 && <RowDivider />}
                                <TransactionRow tx={tx} locale={locale} onSelect={onSelect} />
                            </React.Fragment>
                        ))}
                    </View>
                ))}
            </Card>
        </View>
    );
}

function TotalBlock({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: 'in' | 'out';
}) {
    const Icon = tone === 'in' ? ArrowDownLeft : ArrowUpRight;
    return (
        <View style={styles.total}>
            <IconBox
                box={size.iconBox.sm}
                tone={tone === 'in' ? 'success' : 'danger'}
            >
                <Icon
                    size={size.icon.xs}
                    color={iconOn(tone === 'in' ? 'success' : 'danger')}
                    strokeWidth={iconStroke}
                />
            </IconBox>
            <View style={styles.totalText}>
                <Text style={text('caption')} numberOfLines={1}>
                    {label}
                </Text>
                <Text style={[text('rowValue'), styles.tabular]} numberOfLines={1}>
                    {value}
                </Text>
            </View>
        </View>
    );
}

function TransactionRow({
    tx,
    locale,
    onSelect,
}: {
    tx: Transaction;
    locale: 'en' | 'ar';
    onSelect?: (transaction: Transaction) => void;
}) {
    const isAr = locale === 'ar';
    const name = (isAr ? tx.merchantNameAr : tx.merchantName) || tx.merchantName;
    const description = isAr ? tx.descriptionAr : tx.description;
    const { Icon, tone } = transactionVisual(tx.category);

    const isCredit = tx.type === 'credit';
    const reversed = tx.status === 'reversed';
    const pending = tx.status === 'pending';

    const amountColor = reversed
        ? color.text.tertiary
        : isCredit
            ? color.success.fg
            : color.text.primary;

    const meta = [formatTime(tx.date, locale), description].filter(Boolean).join(' · ');

    return (
        <Pressable
            onPress={onSelect ? () => onSelect(tx) : undefined}
            disabled={!onSelect}
            style={({ pressed }) => [styles.row, pressed && onSelect && styles.pressed]}
        >
            <IconBox box={size.iconBox.md} tone={tone}>
                <Icon size={size.icon.md} color={iconOn(tone)} strokeWidth={iconStroke} />
            </IconBox>

            <View style={styles.rowText}>
                <View style={styles.nameRow}>
                    <Text
                        style={text('rowValue', reversed ? { color: color.text.secondary } : undefined)}
                        numberOfLines={1}
                    >
                        {name}
                    </Text>
                    {pending && (
                        <StatusPill label={isAr ? 'معلقة' : 'Pending'} tone="warning" dot />
                    )}
                    {reversed && (
                        <StatusPill label={isAr ? 'مستردة' : 'Reversed'} tone="neutralTint" />
                    )}
                </View>
                {meta ? (
                    <Text style={text('caption')} numberOfLines={1}>
                        {meta}
                    </Text>
                ) : null}
            </View>

            <Text
                style={[
                    text('rowValue', { fontWeight: '700', color: amountColor }),
                    styles.tabular,
                    reversed && styles.struck,
                ]}
                numberOfLines={1}
            >
                {isCredit ? '+' : '−'}
                {formatCurrency(tx.amount, tx.currency, locale)}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    totals: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    total: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: layout.rowGap,
        borderRadius: radius.inner,
        backgroundColor: color.surface2,
    },
    totalText: { flex: 1 },
    container: { paddingBottom: 4 },
    dayHeader: {
        paddingHorizontal: layout.cardPadding,
        paddingTop: layout.rowGap,
        paddingBottom: 4,
    },
    dayHeaderSubsequent: {
        borderTopWidth: 1,
        borderTopColor: color.border,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.rowGap,
        paddingVertical: layout.listRowPadV,
        paddingHorizontal: layout.cardPadding,
    },
    pressed: { backgroundColor: color.surface2 },
    rowText: { flex: 1, gap: 2 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tabular: { fontVariant: ['tabular-nums'] },
    struck: { textDecorationLine: 'line-through' },
});

export default TransactionListBlock;
