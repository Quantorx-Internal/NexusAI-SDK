import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { color, radius, size, Tone, toneSet } from '../../theme/tokens';

/**
 * Icon containers. Three shapes, each with a fixed meaning:
 *  - `square` (r10)  categories and list rows — tinted semantic bg + fg icon
 *  - `circle`        people, status and hero moments — solid fg + white icon
 *  - bare icons (copy, chevron, eye) are rendered inline by callers in
 *    textSecondary, with no container.
 */
interface IconBoxProps {
    shape?: 'square' | 'circle';
    box?: number;
    tone?: Tone;
    /** Explicit background, overriding the tone's tint. */
    background?: string;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export function IconBox({
    shape = 'square',
    box = size.iconBox.md,
    tone = 'brandTint',
    background,
    children,
    style,
}: IconBoxProps) {
    const set = toneSet(tone);
    return (
        <View
            style={[
                styles.base,
                {
                    width: box,
                    height: box,
                    borderRadius: shape === 'circle' ? radius.pill : radius.iconSquare,
                    backgroundColor: background ?? (shape === 'circle' ? set.fg : set.bg),
                },
                style,
            ]}
        >
            {children}
        </View>
    );
}

/** The colour an icon should take inside a square container of this tone. */
export const iconOn = (tone: Tone, shape: 'square' | 'circle' = 'square') =>
    shape === 'circle' ? color.text.inverse : toneSet(tone).fg;

const styles = StyleSheet.create({
    base: { alignItems: 'center', justifyContent: 'center' },
});

export default IconBox;
