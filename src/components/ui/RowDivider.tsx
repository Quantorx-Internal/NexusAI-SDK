import React from 'react';
import { View, StyleSheet } from 'react-native';
import { color, layout, border } from '../../theme/tokens';

/**
 * Hairline between rows in a list container, inset 16 from the leading edge so
 * the rows read as one block rather than as stacked cards.
 *
 * Rendered as a sibling rather than as a row border: a border with a margin
 * would shift the row's own content.
 */
export function RowDivider({ inset = layout.cardPadding }: { inset?: number }) {
    return <View style={[styles.divider, { marginHorizontal: inset }]} />;
}

const styles = StyleSheet.create({
    divider: { height: border.hairline, backgroundColor: color.border },
});

export default RowDivider;
