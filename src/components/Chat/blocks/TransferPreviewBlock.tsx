import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Wallet, ArrowDown } from 'lucide-react-native';
import { Card, DetailRow, ActionRow, StatusPill, IconBox, iconOn } from '../../ui';
import { color, layout, radius, size, text, iconStroke } from '../../../theme/tokens';
import { formatCurrency, initials } from '../../../lib/utils';
import { TransferPreview } from '../../../types';

/**
 * Family B · TransferPreview — the reference decision card.
 *
 * Signal: 1.5px brand border, brand pill, primary button. This is the only card
 * type that carries both a hero amount and buttons.
 *
 * Hierarchy: amount → who/where → terms → total → actions. The converted amount
 * sits directly under the hero as a caption, so the user sees what the recipient
 * actually gets before reading the terms.
 */

interface TransferPreviewBlockProps {
    preview: TransferPreview;
    locale?: 'en' | 'ar';
    onConfirm?: () => void;
    onEdit?: () => void;
    onCancel?: () => void;
    /** Replaces the whole action row once the transfer is authorized. */
    confirmedLabel?: string;
    working?: boolean;
}

const purposeLabels: Record<string, Record<string, string>> = {
    en: {
        family_support: 'Family support',
        salary: 'Salary',
        investment: 'Investment',
        education: 'Education',
        medical: 'Medical',
        business: 'Business',
        other: 'Other',
    },
    ar: {
        family_support: 'إعالة الأسرة',
        salary: 'راتب',
        investment: 'استثمار',
        education: 'تعليم',
        medical: 'طبي',
        business: 'أعمال',
        other: 'أخرى',
    },
};

export function TransferPreviewBlock({
    preview,
    locale = 'en',
    onConfirm,
    onEdit,
    onCancel,
    confirmedLabel,
    working,
}: TransferPreviewBlockProps) {
    const isAr = locale === 'ar';

    const t = {
        title: isAr ? 'مراجعة التحويل' : 'Review transfer',
        awaiting: isAr ? 'بانتظار التأكيد' : 'Awaiting confirmation',
        confirmed: isAr ? 'تم التأكيد' : 'Confirmed',
        amount: isAr ? 'المبلغ' : 'Amount',
        receives: isAr ? 'يستلم المستفيد' : 'Recipient receives',
        from: isAr ? 'من' : 'From',
        to: isAr ? 'إلى' : 'To',
        type: isAr ? 'نوع التحويل' : 'Transfer type',
        national: isAr ? 'محلي' : 'National',
        international: isAr ? 'دولي' : 'International',
        rate: isAr ? 'سعر الصرف' : 'Exchange rate',
        fee: isAr ? 'الرسوم' : 'Fee',
        purpose: isAr ? 'الغرض' : 'Purpose',
        total: isAr ? 'إجمالي المبلغ المخصوم' : 'Total debited',
        confirm: isAr ? 'تأكيد التحويل' : 'Confirm transfer',
        edit: isAr ? 'تعديل' : 'Edit',
        cancel: isAr ? 'إلغاء' : 'Cancel',
        account: isAr ? 'حساب' : 'Account',
        beneficiary: isAr ? 'مستفيد' : 'Beneficiary',
    };

    const fromName =
        preview.fromAccountName ||
        (preview.fromAccountId ? `${t.account} ${preview.fromAccountId.slice(-4)}` : t.account);
    const toName =
        preview.beneficiaryName ||
        (preview.beneficiaryId ? `${t.beneficiary} ${preview.beneficiaryId.slice(-4)}` : t.beneficiary);

    // The destination currency is only known when the payload carries it; without
    // it we fall back to the SAR-settlement reading the API has always used.
    const destCurrency = preview.convertedCurrency;
    const isInternational = preview.type === 'international';
    const total = preview.totalAmount ?? preview.amount + (preview.fees || 0);
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

            {/* Amount — hero, with what the recipient gets directly beneath it. */}
            <View style={styles.hero}>
                <Text style={text('caption')}>{t.amount}</Text>
                <Text style={[text('hero'), styles.tabular]} numberOfLines={1} adjustsFontSizeToFit>
                    {formatCurrency(preview.amount, preview.currency, locale)}
                </Text>
                {preview.convertedAmount ? (
                    <Text style={text('caption')} numberOfLines={1}>
                        {t.receives}{' '}
                        {formatCurrency(preview.convertedAmount, destCurrency || 'SAR', locale)}
                    </Text>
                ) : null}
            </View>

            {/* Who / where. Vertical with a down arrow so the flow reads the same
                in both directions — a horizontal arrow would have to mirror. */}
            <View style={styles.flow}>
                <View style={styles.flowRow}>
                    <IconBox box={size.iconBox.sm} tone="brandTint">
                        <Wallet
                            size={size.icon.sm}
                            color={iconOn('brandTint')}
                            strokeWidth={iconStroke}
                        />
                    </IconBox>
                    <View style={styles.flowText}>
                        <Text style={text('caption')}>{t.from}</Text>
                        <Text style={text('rowValue')} numberOfLines={1}>
                            {fromName}
                        </Text>
                    </View>
                </View>

                <View style={styles.arrowRail}>
                    <ArrowDown
                        size={size.icon.sm}
                        color={color.text.tertiary}
                        strokeWidth={iconStroke}
                    />
                    <View style={styles.divider} />
                </View>

                <View style={styles.flowRow}>
                    <View style={styles.avatar}>
                        <Text style={text('caption', { color: color.text.inverse, fontWeight: '700' })}>
                            {initials(toName)}
                        </Text>
                    </View>
                    <View style={styles.flowText}>
                        <Text style={text('caption')}>{t.to}</Text>
                        <Text style={text('rowValue')} numberOfLines={2}>
                            {toName}
                            {preview.beneficiaryBank ? (
                                <Text style={text('caption')}> · {preview.beneficiaryBank}</Text>
                            ) : null}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Terms */}
            <View style={styles.terms}>
                {preview.type ? (
                    <DetailRow label={t.type} value={isInternational ? t.international : t.national} />
                ) : null}

                {preview.exchangeRate ? (
                    <DetailRow
                        label={t.rate}
                        value={`1 ${preview.currency} = ${preview.exchangeRate.toFixed(2)} ${destCurrency || 'SAR'}`}
                    />
                ) : null}

                {preview.fees !== undefined ? (
                    <DetailRow
                        label={t.fee}
                        value={formatCurrency(preview.fees, preview.currency, locale)}
                    />
                ) : null}

                {preview.purpose ? (
                    <DetailRow
                        label={t.purpose}
                        value={purposeLabels[locale]?.[preview.purpose] || preview.purpose}
                    />
                ) : null}

                <DetailRow
                    label={t.total}
                    value={formatCurrency(total, preview.currency, locale)}
                    total
                />
            </View>

            <ActionRow
                primaryLabel={onConfirm ? t.confirm : undefined}
                onPrimary={onConfirm}
                secondaryLabel={onEdit ? t.edit : undefined}
                onSecondary={onEdit}
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
    flow: {
        backgroundColor: color.surface2,
        borderRadius: radius.inner,
        padding: layout.rowGap,
        marginBottom: layout.sectionGap,
    },
    flowRow: { flexDirection: 'row', alignItems: 'center', gap: layout.rowGap },
    flowText: { flex: 1 },
    arrowRail: { flexDirection: 'row', alignItems: 'center', gap: layout.rowGap, paddingVertical: 4 },
    divider: { flex: 1, height: 1, backgroundColor: color.border },
    avatar: {
        width: size.iconBox.sm,
        height: size.iconBox.sm,
        borderRadius: radius.avatar,
        backgroundColor: color.brand[600],
        alignItems: 'center',
        justifyContent: 'center',
    },
    terms: { gap: layout.rowGap, marginBottom: layout.sectionGap },
});

export default TransferPreviewBlock;
