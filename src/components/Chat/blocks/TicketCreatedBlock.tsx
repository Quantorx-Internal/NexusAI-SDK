import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ticket } from 'lucide-react-native';
import { Card, ResultBand, ResultBody, DetailRow, CopyField } from '../../ui';
import { color, layout, size, text, iconStroke } from '../../../theme/tokens';
import { TicketCreated } from '../../../types';

/**
 * Family C · TicketCreated — the one card in this family that uses the info band,
 * not success.
 *
 * Nothing has been resolved; the honest signal is "logged". Green stays reserved
 * for money that actually moved, so a support ticket never reads as a fix.
 */

interface TicketCreatedBlockProps {
    ticket: TicketCreated;
    locale?: 'en' | 'ar';
}

export function TicketCreatedBlock({ ticket, locale = 'en' }: TicketCreatedBlockProps) {
    const isAr = locale === 'ar';

    const t = {
        title: isAr ? 'تم فتح تذكرة دعم' : 'Support ticket opened',
        number: isAr ? 'رقم التذكرة' : 'Ticket number',
        resolution: isAr ? 'الوقت المقدر للحل' : 'Estimated resolution',
        note: isAr
            ? 'سنرسل التحديثات عبر الرسائل القصيرة والبريد الإلكتروني.'
            : "We'll send updates by SMS and email.",
        copied: isAr ? 'تم النسخ' : 'Copied',
        pending: isAr ? 'الرقم قيد الإصدار' : 'Pending number',
    };

    return (
        <Card variant="done">
            <ResultBand
                title={t.title}
                tone="info"
                icon={
                    <Ticket size={size.icon.lg} color={color.text.inverse} strokeWidth={iconStroke} />
                }
            />

            <ResultBody gap={layout.rowGap}>
                <View style={styles.referenceGroup}>
                    <Text style={text('caption')}>{t.number}</Text>
                    <CopyField
                        value={ticket.ticketNumber}
                        copiedLabel={t.copied}
                        pendingLabel={t.pending}
                    />
                </View>

                <DetailRow
                    label={t.resolution}
                    value={ticket.estimatedResolutionTime || null}
                />

                <Text style={text('caption')}>{t.note}</Text>
            </ResultBody>
        </Card>
    );
}

const styles = StyleSheet.create({
    referenceGroup: { gap: 6 },
});

export default TicketCreatedBlock;
