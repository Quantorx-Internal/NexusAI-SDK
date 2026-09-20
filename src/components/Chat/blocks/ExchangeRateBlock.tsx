import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { Card } from '../../ui';
import { color, layout, size, text, iconStroke } from '../../../theme/tokens';
import { ExchangeRate } from '../../../types';

/**
 * Family D · ExchangeRate.
 *
 * Information, so: neutral chassis, no buttons. The rate is the hero because it
 * is the only thing on the card; the inverse sits under it as a caption because
 * "how many riyals per dollar" is how people actually think about it, and making
 * them do the division is the whole reason this card exists.
 *
 * Currency codes stay LTR even in Arabic — they are symbols, not words.
 */

interface ExchangeRateBlockProps {
    rate: ExchangeRate;
    locale?: 'en' | 'ar';
}

export function ExchangeRateBlock({ rate, locale = 'en' }: ExchangeRateBlockProps) {
    const isAr = locale === 'ar';
    if (!rate || typeof rate.rate !== 'number' || !isFinite(rate.rate)) return null;

    const t = {
        title: isAr ? 'سعر الصرف' : 'Exchange rate',
        updated: isAr ? 'آخر تحديث' : 'Updated',
        inverse: isAr ? 'أي' : 'That is',
    };

    // Trailing zeros carry no information on an FX rate, so trim them.
    const fmt = (value: number) =>
        value.toFixed(4).replace(/\.?0+$/, '');

    const updated = rate.timestamp ? formatUpdated(rate.timestamp, locale) : null;

    return (
        <Card variant="info">
            <Text style={text('caption')}>{t.title}</Text>

            <View style={styles.pair}>
                <Text style={text('cardTitle')}>{rate.from}</Text>
                <ArrowRight
                    size={size.icon.sm}
                    color={color.text.tertiary}
                    strokeWidth={iconStroke}
                />
                <Text style={text('cardTitle')}>{rate.to}</Text>
            </View>

            <Text style={[text('hero'), styles.tabular]} numberOfLines={1} adjustsFontSizeToFit>
                {`1 ${rate.from} = ${fmt(rate.rate)} ${rate.to}`}
            </Text>

            {rate.rate !== 0 && (
                <Text style={text('caption')} numberOfLines={1}>
                    {`${t.inverse} 1 ${rate.to} = ${fmt(1 / rate.rate)} ${rate.from}`}
                </Text>
            )}

            {updated ? (
                <Text style={[text('caption'), styles.updated]} numberOfLines={1}>
                    {t.updated} {updated}
                </Text>
            ) : null}
        </Card>
    );
}

function formatUpdated(timestamp: string, locale: 'en' | 'ar'): string {
    try {
        return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(timestamp));
    } catch (e) {
        return '';
    }
}

const styles = StyleSheet.create({
    pair: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, marginBottom: 4 },
    tabular: { fontVariant: ['tabular-nums'] },
    updated: { marginTop: layout.rowGap },
});

export default ExchangeRateBlock;
