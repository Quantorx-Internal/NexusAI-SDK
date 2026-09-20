import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { color, radius, border, layout } from '../../theme/tokens';

/**
 * The one card chassis. Every card is the same white surface, 1px border,
 * 16px radius, 16px padding — families differ by a single consistent signal,
 * never by wholesale colour changes.
 *
 *  - `info`     (default) neutral hairline border. Family D, and Family A groups.
 *  - `decision` 1.5px brand border. Family B only — a card you must authorize.
 *  - `done`     neutral border, no padding (the success band supplies its own).
 *                Family C.
 *  - `flush`    neutral border, zero padding — for row containers that manage
 *                their own insets (BillList, SubscriptionList, SpendingInsights).
 */
export type CardVariant = 'info' | 'decision' | 'done' | 'flush';

interface CardProps {
    children: React.ReactNode;
    variant?: CardVariant;
    style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, variant = 'info', style }) => (
    <View style={[styles.base, styles[variant], style]}>{children}</View>
);

const styles = StyleSheet.create({
    base: {
        backgroundColor: color.surface,
        borderRadius: radius.card,
        overflow: 'hidden',
    },
    info: {
        borderWidth: border.hairline,
        borderColor: color.border,
        padding: layout.cardPadding,
    },
    decision: {
        borderWidth: border.decision,
        borderColor: color.borderBrand,
        padding: layout.cardPadding,
    },
    done: {
        borderWidth: border.hairline,
        borderColor: color.border,
    },
    flush: {
        borderWidth: border.hairline,
        borderColor: color.border,
    },
});

export default Card;
