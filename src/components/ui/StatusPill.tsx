import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { radius, size, text, Tone, toneSet } from '../../theme/tokens';
import { useLayoutRTL, row } from '../../contexts/LayoutDirectionContext';

/**
 * Status tag — "Overdue · 29 Dec", "Pending", "Best for you".
 *
 * A small rounded tag: the tone's pale fill and its strong ink, no border and
 * no dot. The capsule-with-a-dot-and-a-border version read as a generated
 * kit; the fill already carries the status the dot repeated. Tags are
 * squarer than the action chips (fully round), so a status never looks
 * tappable.
 *
 * `dot` and `outlined` are still accepted so callers need not change. An
 * outlined tag (Priority, beside a filled one) keeps a hairline instead of
 * the fill.
 */
interface StatusPillProps {
    label: string;
    tone?: Tone;
    dot?: boolean;
    outlined?: boolean;
    icon?: React.ReactNode;
}

export function StatusPill({ label, tone = 'neutralTint', outlined = false, icon }: StatusPillProps) {
    const set = toneSet(tone);
    const flip = useLayoutRTL();
    return (
        <View
            style={[
                styles.tag,
                row(flip),
                outlined
                    ? { borderWidth: 1, borderColor: set.border, backgroundColor: 'transparent' }
                    : { backgroundColor: set.bg },
            ]}
        >
            {icon}
            <Text style={text('badge', { color: set.fgStrong })} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    tag: {
        minHeight: size.pill,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: radius.tag,
        alignSelf: 'flex-start',
    },
});

export default StatusPill;
