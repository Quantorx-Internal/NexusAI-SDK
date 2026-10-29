import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { color, radius, size, Tone, toneSet } from '../../theme/tokens';

/**
 * Icon containers. Two shapes, each with a fixed meaning:
 *  - `square` (r10)  categories and list rows: one quiet well for every
 *    category (pale neutral fill, hairline, ink icon). A different pastel per
 *    category (amber bolt, lavender wifi, mint phone) read as a generated kit,
 *    and it spent colour on the type of a bill, which says nothing. Colour is
 *    kept for status, and status lives in the tags beside the row.
 *  - `circle`        people, status and hero moments: solid fg + white icon.
 *  - bare icons (copy, chevron, eye) are rendered inline by callers in
 *    textSecondary, with no container.
 *
 * `tone` is still accepted so callers need not change; a square ignores it.
 */
interface IconBoxProps {
    shape?: 'square' | 'circle';
    box?: number;
    tone?: Tone;
    /** Explicit background, overriding the well. */
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
    const square = shape === 'square';
    const well = square && !background;
    return (
        <View
            style={[
                styles.base,
                {
                    width: box,
                    height: box,
                    borderRadius: square ? radius.iconSquare : radius.pill,
                    backgroundColor: background ?? (square ? color.surface2 : toneSet(tone).fg),
                },
                well && styles.well,
                style,
            ]}
        >
            {children}
        </View>
    );
}

/** The colour an icon should take inside a container of this shape. */
export const iconOn = (_tone: Tone, shape: 'square' | 'circle' = 'square') =>
    shape === 'circle' ? color.text.inverse : color.text.primary;

const styles = StyleSheet.create({
    base: { alignItems: 'center', justifyContent: 'center' },
    well: { borderWidth: StyleSheet.hairlineWidth, borderColor: color.border },
});

export default IconBox;
