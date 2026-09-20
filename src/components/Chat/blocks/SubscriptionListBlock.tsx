import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, SectionHeader, StatusPill, RowDivider } from '../../ui';
import { color, layout, radius, size, text } from '../../../theme/tokens';
import { formatCurrency, formatDateShort, initials } from '../../../lib/utils';
import { Subscription } from '../../../types';

/**
 * Family D · SubscriptionList — the BillList row with a merchant initial in
 * place of a type icon (no logo field exists) and frequency + next date in the
 * caption.
 *
 * The section header carries the monthly total, which is the one number people
 * actually ask for. Inactive rows drop to secondary/tertiary with a neutral
 * pill, so what is still billing stays visually dominant.
 */

interface SubscriptionListBlockProps {
    subscriptions: Subscription[];
    locale?: 'en' | 'ar';
}

const frequencyLabels: Record<string, { en: string; ar: string }> = {
    weekly: { en: 'Weekly', ar: 'أسبوعيًا' },
    monthly: { en: 'Monthly', ar: 'شهريًا' },
    yearly: { en: 'Yearly', ar: 'سنويًا' },
};

/** Everything is normalised to a monthly figure so the total is comparable. */
const monthlyEquivalent = (subscription: Subscription) => {
    switch (subscription.frequency) {
        case 'weekly':
            return subscription.amount * 52 / 12;
        case 'yearly':
            return subscription.amount / 12;
        default:
            return subscription.amount;
    }
};

export function SubscriptionListBlock({ subscriptions, locale = 'en' }: SubscriptionListBlockProps) {
    if (subscriptions.length === 0) return null;
    const isAr = locale === 'ar';

    const t = {
        title: isAr ? 'الاشتراكات' : 'Subscriptions',
        active: isAr ? 'نشط' : 'Active',
        inactive: isAr ? 'متوقف' : 'Inactive',
        next: isAr ? 'التالي' : 'next',
        ended: isAr ? 'انتهى' : 'ended',
        perMonth: isAr ? '/ شهريًا' : '/ mo',
    };

    const monthlyTotal = subscriptions
        .filter(s => s.isActive)
        .reduce((sum, s) => sum + monthlyEquivalent(s), 0);

    return (
        <View>
            <SectionHeader
                title={t.title}
                count={`${formatCurrency(monthlyTotal, 'SAR', locale)} ${t.perMonth}`}
            />
            <Card variant="flush" style={styles.container}>
                {subscriptions.map((subscription, index) => {
                    const name = isAr ? subscription.nameAr : subscription.name;
                    const frequency =
                        frequencyLabels[subscription.frequency]?.[locale] || subscription.frequency;
                    const dimmed = !subscription.isActive;

                    return (
                        <React.Fragment key={subscription.id}>
                            {index > 0 && <RowDivider />}
                            <View style={styles.row}>
                                <View style={[styles.avatar, dimmed && styles.avatarDim]}>
                                    <Text
                                        style={text('rowLabel', {
                                            fontWeight: '700',
                                            color: dimmed ? color.text.tertiary : color.brand[600],
                                        })}
                                    >
                                        {initials(subscription.merchantName || name).charAt(0)}
                                    </Text>
                                </View>

                                <View style={styles.rowText}>
                                    <Text
                                        style={text(
                                            'rowValue',
                                            dimmed ? { color: color.text.secondary } : undefined
                                        )}
                                        numberOfLines={1}
                                    >
                                        {name}
                                    </Text>
                                    <Text style={text('caption')} numberOfLines={1}>
                                        {frequency} ·{' '}
                                        {dimmed
                                            ? `${t.ended} ${formatDateShort(subscription.nextBillingDate, locale)}`
                                            : `${t.next} ${formatDateShort(subscription.nextBillingDate, locale)}`}
                                    </Text>
                                </View>

                                <View style={styles.rowRight}>
                                    <Text
                                        style={[
                                            text('rowValue', {
                                                fontWeight: '700',
                                                color: dimmed
                                                    ? color.text.tertiary
                                                    : color.text.primary,
                                            }),
                                            styles.tabular,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {formatCurrency(
                                            subscription.amount,
                                            subscription.currency,
                                            locale
                                        )}
                                    </Text>
                                    <StatusPill
                                        label={subscription.isActive ? t.active : t.inactive}
                                        tone={subscription.isActive ? 'success' : 'neutralTint'}
                                        dot={subscription.isActive}
                                    />
                                </View>
                            </View>
                        </React.Fragment>
                    );
                })}
            </Card>
        </View>
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
    avatar: {
        width: size.iconBox.md,
        height: size.iconBox.md,
        borderRadius: radius.iconSquare,
        backgroundColor: color.brand[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarDim: { backgroundColor: color.surface3 },
    rowText: { flex: 1, gap: 2 },
    rowRight: { alignItems: 'flex-end', gap: 4 },
    tabular: { fontVariant: ['tabular-nums'] },
});

export default SubscriptionListBlock;
