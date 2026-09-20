import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { Card, ResultBand, ResultBody, DetailRow } from '../../ui';
import { color, layout, size, text, iconStroke } from '../../../theme/tokens';
import { CardAction, CardActionSuccess } from '../../../types';

/**
 * Family C · CardActionSuccess.
 *
 * The one receipt with no number and therefore no hero: the confirmation message
 * is body text in secondary, and the title is the action in the past tense
 * ("Card frozen", "PIN reset", "Daily limit updated").
 *
 * The payload carries no timestamp, so the band shows no time rather than
 * fabricating one.
 */

interface CardActionSuccessBlockProps {
    success: CardActionSuccess;
    locale?: 'en' | 'ar';
}

const pastTense: Record<CardAction, { en: string; ar: string }> = {
    freeze: { en: 'Card frozen', ar: 'تم تجميد البطاقة' },
    unfreeze: { en: 'Card unfrozen', ar: 'تم إلغاء تجميد البطاقة' },
    set_daily_limit: { en: 'Daily limit updated', ar: 'تم تحديث الحد اليومي' },
    set_transaction_limit: { en: 'Transaction limit updated', ar: 'تم تحديث حد المعاملة' },
    toggle_international: { en: 'International payments updated', ar: 'تم تحديث المدفوعات الدولية' },
    toggle_online: { en: 'Online payments updated', ar: 'تم تحديث المدفوعات عبر الإنترنت' },
    request_replacement: { en: 'Replacement requested', ar: 'تم طلب بطاقة بديلة' },
    reset_pin: { en: 'PIN reset', ar: 'تم إعادة تعيين الرمز السري' },
};

export function CardActionSuccessBlock({ success, locale = 'en' }: CardActionSuccessBlockProps) {
    const isAr = locale === 'ar';
    const message = isAr ? success.messageAr : success.message;

    const t = {
        card: isAr ? 'البطاقة' : 'Card',
        done: isAr ? 'تم' : 'Done',
    };

    const title = pastTense[success.action]?.[locale] || t.done;

    return (
        <Card variant="done">
            <ResultBand
                title={title}
                tone="success"
                icon={
                    <Check size={size.icon.lg} color={color.text.inverse} strokeWidth={iconStroke} />
                }
            />

            <ResultBody gap={layout.rowGap}>
                <DetailRow
                    label={t.card}
                    value={success.cardName || `${t.card} ${success.cardId.slice(-4)}`}
                />
                {message ? (
                    <Text style={text('body', { color: color.text.secondary })}>{message}</Text>
                ) : null}
            </ResultBody>
        </Card>
    );
}

const styles = StyleSheet.create({});

export default CardActionSuccessBlock;
