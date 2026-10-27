import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { color, border, layout, text } from '../../theme/tokens';
import { useLayoutRTL, useVisualRTL, row, alignText } from '../../contexts/LayoutDirectionContext';

/**
 * Detail row — label at reading start, value at reading end, baseline aligned.
 *
 * Both sides may wrap; long translated labels cannot push the value offscreen.
 * `total` promotes the row: a hairline divider above, label at rowValue weight,
 * value at the amount role.
 */
interface DetailRowProps {
    label: string;
    /** Rendered as the value. Pass `null`/`undefined` to get the partial-data em dash. */
    value?: string | null;
    total?: boolean;
    /** Struck-through "old value" — used by CardPreview for the limit being replaced. */
    struck?: boolean;
    valueColor?: string;
    children?: React.ReactNode;
}

export function DetailRow({ label, value, total, struck, valueColor, children }: DetailRowProps) {
    const flip = useLayoutRTL();
    const visualRTL = useVisualRTL();
    return (
        <View style={[styles.row, row(flip), total && styles.totalRow]}>
            <Text style={[total ? text('rowValue') : text('rowLabel'), styles.label, alignText(flip, visualRTL)]} numberOfLines={2}>
                {label}
            </Text>
            {children ?? (
                <Text
                    style={[
                        total ? text('amount') : text('rowValue'),
                        styles.value,
                        { textAlign: flip ? 'left' : 'right', writingDirection: visualRTL ? 'rtl' : 'ltr' },
                        struck && styles.struck,
                        valueColor ? { color: valueColor } : null,
                    ]}
                    numberOfLines={2}
                >
                    {/* Partial data renders an em dash — the row never disappears, so
                        card heights stay stable as fields arrive. */}
                    {value == null || value === '' ? '—' : value}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: layout.rowGap,
    },
    totalRow: {
        borderTopWidth: border.hairline,
        borderTopColor: color.border,
        paddingTop: layout.rowGap,
        marginTop: 4,
    },
    label: { flexShrink: 1, maxWidth: '48%' },
    value: { flexShrink: 1, textAlign: 'right' },
    struck: { color: color.text.tertiary, textDecorationLine: 'line-through' },
});

export default DetailRow;
