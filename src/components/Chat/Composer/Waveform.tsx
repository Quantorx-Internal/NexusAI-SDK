import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { color, composer } from '../../../theme/tokens';
import { startLoop } from '../../../lib/animation';

/**
 * 15 bars, 4pt wide, 3pt apart, 6–36pt tall.
 *
 * `metering` is iOS/Android only — expo-av's own types say so — which means on
 * web `level` is permanently 0. Height therefore cannot be a pure function of
 * level: that left fifteen 4×6 bars sitting at their minimum, reading as a row
 * of dead dots. Instead every bar wanders continuously and `level` only scales
 * the amplitude, so the waveform is alive with or without metering.
 *
 * Each bar's target is recomputed per leg (current level × a random swing),
 * so its height is driven by one plain Animated.Value rather than a composed
 * node — see `startLoop`.
 */

/** Floor so the waveform still breathes in silence, or with no metering at all. */
const IDLE_AMPLITUDE = 0.34;
/** How much the outermost bars are damped relative to the centre. */
const EDGE_DAMPING = 0.55;

export function Waveform({ level = 0, active = true }: { level?: number; active?: boolean }) {
    const { bars, barWidth, barGap, barMin, barMax } = composer.listening;
    const span = barMax - barMin;

    const heights = useRef(
        Array.from({ length: bars }, () => new Animated.Value(barMin))
    ).current;

    // Read through a ref so a changing level never restarts the loops.
    const levelRef = useRef(level);
    useEffect(() => {
        levelRef.current = level;
    }, [level]);

    useEffect(() => {
        if (!active) {
            heights.forEach(h => h.setValue(barMin));
            return;
        }

        const mid = (bars - 1) / 2;

        const stops = heights.map((height, index) => {
            const distance = mid === 0 ? 0 : Math.abs(index - mid) / mid;
            // Centre-weighted, so it reads as a voice rather than an equaliser.
            const weight = 1 - distance * EDGE_DAMPING;

            return startLoop(height, () => {
                const amplitude = Math.max(IDLE_AMPLITUDE, Math.min(1, levelRef.current));
                const swing = 0.15 + Math.random() * 0.85;
                return {
                    toValue: barMin + swing * weight * amplitude * span,
                    // A distinct tempo per bar; a shared one beats into a blob.
                    duration: 260 + ((index * 83) % 220),
                };
            });
        });

        return () => stops.forEach(stop => stop());
    }, [active, heights, bars, barMin, span]);

    return (
        <View style={[styles.row, { gap: barGap }]}>
            {heights.map((height, index) => (
                <Animated.View
                    key={index}
                    style={{
                        width: barWidth,
                        height,
                        borderRadius: barWidth / 2,
                        backgroundColor: color.brand[600],
                    }}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: composer.listening.barMax,
    },
});

export default Waveform;
