import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import { layout, radius, size, text, iconStroke, Tone, toneSet } from '../../theme/tokens';
import { useLayoutRTL, row, alignText } from '../../contexts/LayoutDirectionContext';

/**
 * Inline alert — a tinted strip inside a card, for a step that failed.
 *
 * Danger is reserved for data and failures, never for a pending decision, so
 * this appears only when a request died: above the CTA, so the way to retry
 * is right under the reason.
 */
interface InlineAlertProps {
    message: string;
    tone?: Tone;
}

export function InlineAlert({ message, tone = 'danger' }: InlineAlertProps) {
    const set = toneSet(tone);
    const flip = useLayoutRTL();
    return (
        <View style={[styles.strip, row(flip), { backgroundColor: set.bg, borderColor: set.border }]} accessibilityRole="alert">
            <CircleAlert size={size.icon.sm} color={set.fg} strokeWidth={iconStroke} />
            <Text style={[text('caption', { color: set.fgStrong }), styles.message, alignText(flip)]}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    strip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: layout.rowGap,
        borderRadius: radius.inner,
        borderWidth: 1,
    },
    message: { flex: 1 },
});

export default InlineAlert;
