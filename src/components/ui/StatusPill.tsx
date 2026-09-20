import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { color, radius, size, text, Tone, toneSet } from '../../theme/tokens';

/**
 * Status pill — 20h, 2/8 padding, badge type, 6px dot.
 *
 * The dot appears only when the pill describes a live state (awaiting, pending,
 * active, frozen, overdue) — not when it labels a finished fact (paid) or a
 * category ("Cards", "Travel").
 *
 * `outlined` is reserved for Priority, the one status that must sit next to a
 * filled pill without competing. Max one filled + one outlined per row.
 */
interface StatusPillProps {
    label: string;
    tone?: Tone;
    dot?: boolean;
    outlined?: boolean;
    icon?: React.ReactNode;
}

export function StatusPill({
    label,
    tone = 'neutralTint',
    dot = false,
    outlined = false,
    icon,
}: StatusPillProps) {
    const set = toneSet(tone);
    return (
        <View
            style={[
                styles.pill,
                outlined
                    ? { borderWidth: 1, borderColor: set.border, backgroundColor: 'transparent' }
                    : { backgroundColor: set.bg },
            ]}
        >
            {dot && <View style={[styles.dot, { backgroundColor: set.fg }]} />}
            {icon}
            <Text style={[text('badge', { color: set.fg }), styles.label]} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    pill: {
        height: size.pill,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.pill,
        gap: 4,
        alignSelf: 'flex-start',
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    // Badge type carries no tracking and no uppercasing — Arabic has neither.
    label: { textTransform: 'none' },
});

export default StatusPill;
