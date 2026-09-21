import React from 'react';
import { View, StyleSheet } from 'react-native';
import { color, instrument } from '../../theme/tokens';

/**
 * Page dots under an instrument scroller — 5pt, the active one stretched to
 * 16×5. Instruments are wide enough that only one and a bit fit on screen, so
 * the count is not otherwise discoverable.
 */
export function PageDots({ count, active }: { count: number; active: number }) {
    if (count <= 1) return null;
    return (
        <View style={styles.row}>
            {Array.from({ length: count }).map((_, index) => (
                <View
                    key={index}
                    style={[
                        styles.dot,
                        index === active ? styles.active : styles.inactive,
                    ]}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: instrument.dotGap,
        marginTop: 10,
        paddingHorizontal: 4,
    },
    dot: { height: instrument.dot, borderRadius: instrument.dot / 2 },
    active: { width: instrument.dotActiveWidth, backgroundColor: color.brand[600] },
    inactive: { width: instrument.dot, backgroundColor: color.borderStrong },
});

export default PageDots;
