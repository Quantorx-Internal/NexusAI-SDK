import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Bot } from 'lucide-react-native';
import { color, composer, radius, layout, size, text, iconStroke } from '../../theme/tokens';

/**
 * Working state (design §9): three brand-ramp dots plus a verb-first status.
 *
 * The dots run 600 / 400 / 200 down the brand ramp rather than three greys, so
 * the wait reads as the assistant thinking rather than the UI stalling. The
 * status is a verb first — "Checking Ahmed's details" — because what it is doing
 * is more useful than that it is busy.
 */

interface TypingIndicatorProps {
    isVisible: boolean;
    /** Verb-first status, e.g. "Checking Ahmed's details". */
    status?: string;
    locale?: 'en' | 'ar';
}

const RAMP = [color.brand[600], color.brand[400], color.brand[200]];

export function TypingIndicator({ isVisible, status, locale = 'en' }: TypingIndicatorProps) {
    const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

    useEffect(() => {
        if (!isVisible) return;

        const animations = dots.map((value, index) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(index * 150),
                    Animated.timing(value, { toValue: -5, duration: 300, useNativeDriver: true }),
                    Animated.timing(value, { toValue: 0, duration: 300, useNativeDriver: true }),
                    Animated.delay(450 - index * 150),
                ])
            )
        );

        animations.forEach(a => a.start());
        return () => {
            animations.forEach(a => a.stop());
            dots.forEach(d => d.setValue(0));
        };
    }, [isVisible, dots]);

    if (!isVisible) return null;

    const label = status || (locale === 'ar' ? 'جارٍ العمل…' : 'Working…');

    return (
        <View style={styles.container}>
            <View style={styles.avatar}>
                <Bot size={16} color={color.brand[600]} strokeWidth={iconStroke} />
            </View>

            <View style={styles.bubble}>
                <View style={styles.dots}>
                    {dots.map((value, index) => (
                        <Animated.View
                            key={index}
                            style={[
                                styles.dot,
                                { backgroundColor: RAMP[index], transform: [{ translateY: value }] },
                            ]}
                        />
                    ))}
                </View>
                <Text style={text('rowValue', { color: color.text.secondary })} numberOfLines={1}>
                    {label}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.rowGap,
        marginBottom: layout.messageGap,
    },
    avatar: {
        width: size.iconBox.sm,
        height: size.iconBox.sm,
        borderRadius: radius.pill,
        backgroundColor: color.brand[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    bubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radius.card,
        backgroundColor: color.surface2,
        alignSelf: 'flex-start',
    },
    dots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dot: {
        width: composer.working.dot,
        height: composer.working.dot,
        borderRadius: composer.working.dot / 2,
    },
});

export default TypingIndicator;
