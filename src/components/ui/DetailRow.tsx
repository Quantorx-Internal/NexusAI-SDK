import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { color, border, layout, text } from '../../theme/tokens';

/**
 * Detail row — label left, value right, 12 gap, baseline aligned.
 *
 * The value flex-shrinks and may run to two lines; the label never does.
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
    return (
        <View style={[styles.row, total && styles.totalRow]}>
            <Text style={total ? text('rowValue') : text('rowLabel')} numberOfLines={1}>
                {label}
            </Text>
            {children ?? (
                <Text
                    style={[
                        total ? text('amount') : text('rowValue'),
                        styles.value,
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
    value: { flexShrink: 1, textAlign: 'right' },
    struck: { color: color.text.tertiary, textDecorationLine: 'line-through' },
});

export default DetailRow;
