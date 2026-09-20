import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Flag } from 'lucide-react-native';
import { Card, SectionHeader, StatusPill, IconBox, iconOn, RowDivider } from '../../ui';
import { color, layout, size, text, iconStroke } from '../../../theme/tokens';
import { formatCurrency, formatDateShort } from '../../../lib/utils';
import { Bill } from '../../../types';
import { billVisual } from './billVisuals';

/**
 * Family D · BillList.
 *
 * One container, rows separated by hairlines — five separately bordered cards
 * cost ~100pt of chrome and made the thread scroll forever. One container reads
 * as one answer.
 *
 * Urgency without shouting: overdue changes exactly three things — the amount
 * colour, the pill, and a small flag when the bill is priority. The row
 * background and the type icon stay calm, so a list of five overdue bills is
 * still readable.
 */

interface BillListBlockProps {
    bills: Bill[];
    locale?: 'en' | 'ar';
    onSelect?: (bill: Bill) => void;
}

export function BillListBlock({ bills, locale = 'en', onSelect }: BillListBlockProps) {
    if (bills.length === 0) return null;
    const isAr = locale === 'ar';

    const t = {
        title: isAr ? 'الفواتير المستحقة' : 'Pending bills',
        acct: isAr ? 'حساب' : 'Acct',
        overdue: isAr ? 'متأخرة' : 'Overdue',
        due: isAr ? 'تستحق' : 'Due',
        paid: isAr ? 'مدفوعة' : 'Paid',
    };

    return (
        <View>
            <SectionHeader title={t.title} count={bills.length} />
            <Card variant="flush" style={styles.container}>
                {bills.map((bill, index) => (
                    <React.Fragment key={bill.id}>
                        {index > 0 && <RowDivider />}
                        <BillRow bill={bill} locale={locale} labels={t} onSelect={onSelect} />
                    </React.Fragment>
                ))}
            </Card>
        </View>
    );
}

function BillRow({
    bill,
    locale,
    labels,
    onSelect,
}: {
    bill: Bill;
    locale: 'en' | 'ar';
    labels: Record<string, string>;
    onSelect?: (bill: Bill) => void;
}) {
    const providerName = locale === 'ar' ? bill.providerNameAr : bill.providerName;
    const isPaid = bill.status === 'paid';
    const overdue = !isPaid && (bill.status === 'overdue' || new Date(bill.dueDate) < new Date());

    const { Icon, tone } = billVisual(bill.type);
    const dueText = formatDateShort(bill.dueDate, locale);

    const pill = isPaid
        ? { label: labels.paid, tone: 'success' as const, dot: false }
        : overdue
            ? { label: `${labels.overdue} · ${dueText}`, tone: 'danger' as const, dot: true }
            : { label: `${labels.due} ${dueText}`, tone: 'warning' as const, dot: true };

    return (
        <Pressable
            onPress={onSelect ? () => onSelect(bill) : undefined}
            disabled={!onSelect || isPaid}
            style={({ pressed }) => [
                styles.row,
                pressed && onSelect && !isPaid && styles.pressed,
            ]}
        >
            <IconBox box={size.iconBox.md} tone={tone}>
                <Icon size={size.icon.md} color={iconOn(tone)} strokeWidth={iconStroke} />
            </IconBox>

            <View style={styles.rowText}>
                <View style={styles.nameRow}>
                    <Text
                        style={text('rowValue', isPaid ? { color: color.text.secondary } : undefined)}
                        numberOfLines={1}
                    >
                        {providerName}
                    </Text>
                    {bill.isPriority && !isPaid ? (
                        <Flag size={12} color={color.danger.fg} strokeWidth={iconStroke} />
                    ) : null}
                </View>
                <Text style={text('caption')} numberOfLines={1}>
                    {labels.acct} {bill.accountNumber}
                </Text>
            </View>

            <View style={styles.rowRight}>
                <Text
                    style={[
                        text('rowValue', {
                            fontWeight: '700',
                            color: isPaid
                                ? color.text.tertiary
                                : overdue
                                    ? color.danger.fg
                                    : color.text.primary,
                        }),
                        styles.tabular,
                    ]}
                    numberOfLines={1}
                >
                    {formatCurrency(bill.amount, 'SAR', locale)}
                </Text>
                <StatusPill label={pill.label} tone={pill.tone} dot={pill.dot} />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: { paddingVertical: 4 },
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
    rowRight: { alignItems: 'flex-end', gap: 4 },
    tabular: { fontVariant: ['tabular-nums'] },
});

export default BillListBlock;
