import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { Card, ResultBand, ResultBody, DetailRow, CopyField } from '../../ui';
import { color, layout, size, text, iconStroke } from '../../../theme/tokens';
import { formatCurrency, formatTime } from '../../../lib/utils';
import { BillPaymentSuccess } from '../../../types';

/**
 * Family C · BillPaymentSuccess. Same chassis as TransferSuccess; only the body
 * rows differ.
 */

interface BillPaymentSuccessBlockProps {
    success: BillPaymentSuccess;
    locale?: 'en' | 'ar';
}

export function BillPaymentSuccessBlock({ success, locale = 'en' }: BillPaymentSuccessBlockProps) {
    const isAr = locale === 'ar';

    const t = {
        title: isAr ? 'تم دفع الفاتورة' : 'Bill paid',
        amountPaid: isAr ? 'المبلغ المدفوع' : 'Amount paid',
        provider: isAr ? 'المزود' : 'Provider',
        from: isAr ? 'من' : 'From',
        reference: isAr ? 'رقم المرجع' : 'Reference',
        copied: isAr ? 'تم النسخ' : 'Copied',
        pending: isAr ? 'المرجع قيد الإصدار' : 'Pending reference',
        today: isAr ? 'اليوم' : 'Today',
    };

    const when = success.paidAt ? `${t.today}, ${formatTime(success.paidAt, locale)}` : null;
    const providerName = success.providerName || (success as any).billName || success.billId;

    return (
        <Card variant="done">
            <ResultBand
                title={t.title}
                time={when}
                tone="success"
                icon={
                    <Check size={size.icon.lg} color={color.text.inverse} strokeWidth={iconStroke} />
                }
            />

            <ResultBody>
                <View>
                    <Text style={text('caption')}>{t.amountPaid}</Text>
                    <Text style={[text('hero'), styles.tabular]} numberOfLines={1} adjustsFontSizeToFit>
                        {formatCurrency(success.amount, 'SAR', locale)}
                    </Text>
                </View>

                <View style={styles.rows}>
                    <DetailRow label={t.provider} value={providerName} />
                    {success.fromAccountName ? (
                        <DetailRow label={t.from} value={success.fromAccountName} />
                    ) : null}
                </View>

                <View style={styles.referenceGroup}>
                    <Text style={text('caption')}>{t.reference}</Text>
                    <CopyField
                        value={success.reference}
                        copiedLabel={t.copied}
                        pendingLabel={t.pending}
                    />
                </View>
            </ResultBody>
        </Card>
    );
}

const styles = StyleSheet.create({
    tabular: { fontVariant: ['tabular-nums'] },
    rows: { gap: layout.rowGap },
    referenceGroup: { gap: 6 },
});

export default BillPaymentSuccessBlock;
