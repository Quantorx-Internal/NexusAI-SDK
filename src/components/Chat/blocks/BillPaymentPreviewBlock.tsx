import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, DetailRow, ActionRow, StatusPill, IconBox, iconOn } from '../../ui';
import { color, layout, radius, size, text, iconStroke } from '../../../theme/tokens';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { BillPaymentPreview } from '../../../types';
import { billVisual } from './billVisuals';

/**
 * Family B · BillPaymentPreview.
 *
 * The amount is the hero; the provider block carries the bill's type icon and
 * the due-date line, which turns danger when overdue. The due date lives with
 * the provider rather than in the terms because it is a fact about the bill,
 * not a term of the payment.
 */

interface BillPaymentPreviewBlockProps {
    preview: BillPaymentPreview;
    locale?: 'en' | 'ar';
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmedLabel?: string;
    working?: boolean;
}

export function BillPaymentPreviewBlock({
    preview,
    locale = 'en',
    onConfirm,
    onCancel,
    confirmedLabel,
    working,
}: BillPaymentPreviewBlockProps) {
    const isAr = locale === 'ar';

    const t = {
        title: isAr ? 'مراجعة الدفع' : 'Review payment',
        awaiting: isAr ? 'بانتظار التأكيد' : 'Awaiting confirmation',
        confirmed: isAr ? 'تم التأكيد' : 'Confirmed',
        amount: isAr ? 'المبلغ' : 'Amount',
        from: isAr ? 'من' : 'From',
        due: isAr ? 'تستحق في' : 'Due',
        wasDue: isAr ? 'كانت مستحقة في' : 'was due',
        overdue: isAr ? 'متأخرة' : 'Overdue',
        confirm: isAr ? 'تأكيد الدفع' : 'Confirm payment',
        cancel: isAr ? 'إلغاء' : 'Cancel',
    };

    const overdue =
        preview.status === 'overdue' ||
        (preview.dueDate ? new Date(preview.dueDate) < new Date() : false);

    const { Icon, tone } = billVisual(preview.billType);
    const dueTone = overdue ? color.danger.fg : color.text.tertiary;

    const providerName =
        preview.providerName || (preview as any).billName || preview.billId;
    // A confirmed card stops asking for a decision: neutral border, success pill.
    const done = Boolean(confirmedLabel);

    return (
        <Card variant={done ? 'info' : 'decision'}>
            <View style={styles.header}>
                <Text style={text('cardTitle')} numberOfLines={1}>
                    {t.title}
                </Text>
                <StatusPill
                    label={done ? t.confirmed : t.awaiting}
                    tone={done ? 'success' : 'brandTint'}
                    dot={!done}
                />
            </View>

            <View style={styles.hero}>
                <Text style={text('caption')}>{t.amount}</Text>
                <Text style={[text('hero'), styles.tabular]} numberOfLines={1} adjustsFontSizeToFit>
                    {formatCurrency(preview.amount, 'SAR', locale)}
                </Text>
            </View>

            <View style={styles.object}>
                <IconBox box={size.iconBox.md} tone={overdue ? 'danger' : tone}>
                    <Icon
                        size={size.icon.md}
                        color={iconOn(overdue ? 'danger' : tone)}
                        strokeWidth={iconStroke}
                    />
                </IconBox>
                <View style={styles.objectText}>
                    <Text style={text('rowValue')} numberOfLines={1}>
                        {providerName}
                    </Text>
                    {preview.dueDate ? (
                        <Text style={text('caption', { color: dueTone })} numberOfLines={1}>
                            {overdue
                                ? `${t.overdue} · ${t.wasDue} ${formatDate(preview.dueDate, locale)}`
                                : `${t.due} ${formatDate(preview.dueDate, locale)}`}
                        </Text>
                    ) : null}
                </View>
            </View>

            <View style={styles.terms}>
                <DetailRow
                    label={t.from}
                    value={preview.fromAccountName || preview.fromAccountId || null}
                />
            </View>

            <ActionRow
                primaryLabel={onConfirm ? t.confirm : undefined}
                onPrimary={onConfirm}
                ghostLabel={onCancel ? t.cancel : undefined}
                onGhost={onCancel}
                working={working}
                confirmedLabel={confirmedLabel}
            />
        </Card>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: layout.sectionGap,
    },
    hero: { marginBottom: layout.sectionGap },
    tabular: { fontVariant: ['tabular-nums'] },
    object: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.rowGap,
        backgroundColor: color.surface2,
        borderRadius: radius.inner,
        padding: layout.rowGap,
        marginBottom: layout.sectionGap,
    },
    objectText: { flex: 1 },
    terms: { gap: layout.rowGap, marginBottom: layout.sectionGap },
});

export default BillPaymentPreviewBlock;
