import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { Card, ResultBand, ResultBody, DetailRow, CopyField } from '../../ui';
import { color, layout, size, text, iconStroke } from '../../../theme/tokens';
import { formatCurrency, formatTime } from '../../../lib/utils';
import { TransferSuccess } from '../../../types';

/**
 * Family C · TransferSuccess.
 *
 * Restrained on purpose: this card gets screenshotted and forwarded, so it reads
 * as a receipt, not a celebration. Success band, no buttons, copyable reference.
 *
 * Hierarchy: outcome + time (band) → amount (hero) → recipient → reference.
 * Time sits in the band because "when" is the second thing a receipt must answer.
 */

interface TransferSuccessBlockProps {
    success: TransferSuccess;
    locale?: 'en' | 'ar';
}

export function TransferSuccessBlock({ success, locale = 'en' }: TransferSuccessBlockProps) {
    const isAr = locale === 'ar';

    const t = {
        title: isAr ? 'تم إرسال التحويل' : 'Transfer sent',
        amountSent: isAr ? 'المبلغ المرسل' : 'Amount sent',
        to: isAr ? 'إلى' : 'To',
        from: isAr ? 'من' : 'From',
        reference: isAr ? 'رقم المرجع' : 'Reference',
        copied: isAr ? 'تم النسخ' : 'Copied',
        pending: isAr ? 'المرجع قيد الإصدار' : 'Pending reference',
        today: isAr ? 'اليوم' : 'Today',
    };

    const reference = success.transactionId || success.transferId || '';
    const when = success.completedAt
        ? `${t.today}, ${formatTime(success.completedAt, locale)}`
        : null;

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
                {success.amount !== undefined ? (
                    <View>
                        <Text style={text('caption')}>{t.amountSent}</Text>
                        <Text
                            style={[text('hero'), styles.tabular]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            {formatCurrency(success.amount, success.currency || 'SAR', locale)}
                        </Text>
                    </View>
                ) : null}

                <View style={styles.rows}>
                    {success.beneficiaryName ? (
                        <DetailRow label={t.to} value={success.beneficiaryName} />
                    ) : null}
                    {success.fromAccountName ? (
                        <DetailRow label={t.from} value={success.fromAccountName} />
                    ) : null}
                </View>

                <View style={styles.referenceGroup}>
                    <Text style={text('caption')}>{t.reference}</Text>
                    <CopyField value={reference} copiedLabel={t.copied} pendingLabel={t.pending} />
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

export default TransferSuccessBlock;
