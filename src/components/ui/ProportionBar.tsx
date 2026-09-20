import React from 'react';
import { View, StyleSheet } from 'react-native';
import { color, radius } from '../../theme/tokens';

/**
 * Proportion bar — 6h, r3, surface3 track, brand-600 fill.
 *
 * A bar always means "share of the total". It never encodes change over time;
 * that is text only (↑ danger, ↓ success), because a bar that sometimes means
 * share and sometimes means delta can't be read at a glance.
 */
export function ProportionBar({ percent }: { percent: number }) {
    const width = Math.max(0, Math.min(100, percent));
    return (
        <View style={styles.track}>
            <View style={[styles.fill, { width: `${width}%` }]} />
        </View>
    );
}

/**
 * The rank-ordered ramp used by the stacked bar: brand 600 → 100.
 * Six steps, which is exactly top-5 categories plus the "N more" remainder.
 */
export const RAMP = [
    color.brand[600],
    color.brand[500],
    color.brand[400],
    color.brand[300],
    color.brand[200],
    color.brand[100],
] as const;

export const rampAt = (index: number) => RAMP[Math.min(index, RAMP.length - 1)];

/**
 * Stacked variant — 8h, 2px segment gaps, one segment per rank.
 * Replaces seven per-row bars in SpendingBreakdown, which cost ~36pt each.
 */
export function StackedBar({ segments }: { segments: { percent: number }[] }) {
    const total = segments.reduce((sum, s) => sum + s.percent, 0) || 1;
    return (
        <View style={styles.stack}>
            {segments.map((segment, index) => (
                <View
                    key={index}
                    style={{
                        flex: Math.max(segment.percent, 0.001) / total,
                        backgroundColor: rampAt(index),
                        borderRadius: 4,
                    }}
                />
            ))}
        </View>
    );
}

/** 10×10 r3 colour key that ties a row to its stacked-bar segment. */
export function RampKey({ index }: { index: number }) {
    return <View style={[styles.key, { backgroundColor: rampAt(index) }]} />;
}

const styles = StyleSheet.create({
    track: {
        height: 6,
        borderRadius: radius.bar,
        backgroundColor: color.surface3,
        overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: radius.bar, backgroundColor: color.brand[600] },
    stack: { height: 8, flexDirection: 'row', gap: 2 },
    key: { width: 10, height: 10, borderRadius: 3 },
});

export default ProportionBar;
