import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart3, TriangleAlert, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react-native';
import { Card, SectionHeader, IconBox, iconOn, RowDivider } from '../../ui';
import { color, layout, size, text, iconStroke, Tone } from '../../../theme/tokens';
import { SpendingInsight } from '../../../types';

/**
 * Family D · SpendingInsights — one list, not four coloured cards.
 *
 * An insight is a sentence, so the amount and the percentage are set inline
 * within it (bold, with the percentage coloured by direction) rather than
 * pulled out as separate fields. The type shows twice and quietly: the 36pt
 * icon tint, and a caption under the sentence.
 */

interface SpendingInsightsBlockProps {
    insights: SpendingInsight[];
    locale?: 'en' | 'ar';
}

function visual(insight: SpendingInsight): { Icon: any; tone: Tone } {
    switch (insight.type) {
        case 'comparison':
            return { Icon: BarChart3, tone: 'info' };
        case 'unusual':
            return { Icon: TriangleAlert, tone: 'warning' };
        case 'subscription':
            return { Icon: RefreshCw, tone: 'brandTint' };
        case 'trend':
            // A trend's tint follows its direction: more spending is bad news.
            return (insight.changePercent ?? 0) > 0
                ? { Icon: TrendingUp, tone: 'danger' }
                : { Icon: TrendingDown, tone: 'success' };
        default:
            return { Icon: BarChart3, tone: 'info' };
    }
}

const typeLabels: Record<SpendingInsight['type'], { en: string; ar: string }> = {
    comparison: { en: 'Comparison', ar: 'مقارنة' },
    unusual: { en: 'Unusual activity', ar: 'نشاط غير معتاد' },
    subscription: { en: 'Subscription', ar: 'اشتراك' },
    trend: { en: 'Trend', ar: 'اتجاه' },
};

/**
 * Highlight the numbers inside the sentence.
 *
 * The message is server prose, so the amount is not guaranteed to match any
 * format we could build — we bold whatever reads as a currency amount or a
 * percentage and leave the rest alone. A sentence with no matches renders
 * unchanged rather than losing its numbers to a failed lookup.
 */
// A number must START with a digit. Allowing the separator class to open the
// match let a bare comma begin it, so ", SAR" was captured instead of
// "SAR 1,676.00" and the amount lost its emphasis.
const NUM = String.raw`[\d٠-٩][\d٠-٩,،٬]*(?:[.٫][\d٠-٩]+)?`;
const CUR = String.raw`(?:SAR|ر\.?\s?س\.?)`;
const NUMERIC = new RegExp(`(${CUR}\\s?${NUM}|${NUM}\\s?${CUR}|${NUM}\\s?%)`, 'g');

function Sentence({ message, changePercent }: { message: string; changePercent?: number }) {
    // split() with a single capture group puts the matches at odd indices —
    // reading the position is deterministic, unlike re-testing a /g regex whose
    // lastIndex carries between calls.
    const parts = message.split(NUMERIC);
    if (parts.length === 1) {
        return <Text style={text('body')}>{message}</Text>;
    }

    return (
        <Text style={text('body')}>
            {parts.map((part, index) => {
                if (index % 2 === 0) {
                    return <Text key={index}>{part}</Text>;
                }

                const isPercent = part.includes('%');
                const tint =
                    isPercent && changePercent !== undefined
                        ? changePercent > 0
                            ? color.danger.fg
                            : color.success.fg
                        : color.text.primary;

                return (
                    <Text key={index} style={text('body', { fontWeight: '700', color: tint })}>
                        {part}
                    </Text>
                );
            })}
        </Text>
    );
}

export function SpendingInsightsBlock({ insights, locale = 'en' }: SpendingInsightsBlockProps) {
    if (!insights || insights.length === 0) return null;
    const isAr = locale === 'ar';

    return (
        <View>
            <SectionHeader
                title={isAr ? 'رؤى الإنفاق' : 'Worth knowing'}
                count={insights.length}
            />
            <Card variant="flush" style={styles.container}>
                {insights.map((insight, index) => {
                    const { Icon, tone } = visual(insight);
                    const message = isAr ? insight.messageAr : insight.message;

                    return (
                        <React.Fragment key={index}>
                            {index > 0 && <RowDivider />}
                            <View style={styles.row}>
                                <IconBox box={size.iconBox.md} tone={tone}>
                                    <Icon
                                        size={size.icon.md}
                                        color={iconOn(tone)}
                                        strokeWidth={iconStroke}
                                    />
                                </IconBox>
                                <View style={styles.rowText}>
                                    <Sentence
                                        message={message || ''}
                                        changePercent={insight.changePercent}
                                    />
                                    <Text style={text('caption')}>
                                        {typeLabels[insight.type]?.[locale] || insight.type}
                                    </Text>
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
        alignItems: 'flex-start',
        gap: layout.rowGap,
        paddingVertical: layout.listRowPadV,
        paddingHorizontal: layout.cardPadding,
    },
    rowText: { flex: 1, gap: 2 },
});

export default SpendingInsightsBlock;
