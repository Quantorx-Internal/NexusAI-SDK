import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { color, layout, size, text, Tone, toneSet } from '../../theme/tokens';

/**
 * The Family C header band: one chassis, three bodies.
 *
 * A tinted band across the top carries the outcome and when it happened — the
 * two things a receipt must answer — then the body carries the numbers. There
 * are no buttons: these cards get screenshotted and forwarded, so every receipt
 * has to be self-sufficient inside its own border.
 *
 * TicketCreated uses `info`, not `success`: nothing has been resolved yet, and
 * green is kept for money that actually moved.
 */
interface ResultBandProps {
    title: string;
    /** "Today, 5:19 PM" — omitted entirely when the payload carries no timestamp. */
    time?: string | null;
    tone?: Tone;
    icon: React.ReactNode;
}

export function ResultBand({ title, time, tone = 'success', icon }: ResultBandProps) {
    const set = toneSet(tone);
    return (
        <View style={[styles.band, { backgroundColor: set.bg }]}>
            <View style={[styles.circle, { backgroundColor: set.fg }]}>{icon}</View>
            <View style={styles.titles}>
                <Text style={text('cardTitle', { color: set.fgStrong })} numberOfLines={2}>
                    {title}
                </Text>
                {time ? (
                    <Text style={text('caption', { color: set.fg })} numberOfLines={1}>
                        {time}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}

/** Standard body wrapper for a Family C card: 16 padding, 16 section gap. */
export function ResultBody({
    children,
    gap = layout.sectionGap,
}: {
    children: React.ReactNode;
    gap?: number;
}) {
    return <View style={[styles.body, { gap }]}>{children}</View>;
}

const styles = StyleSheet.create({
    band: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.rowGap,
        padding: layout.cardPadding,
    },
    circle: {
        width: size.iconBox.lg,
        height: size.iconBox.lg,
        borderRadius: size.iconBox.lg / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titles: { flex: 1 },
    body: { padding: layout.cardPadding },
});

export default ResultBand;
