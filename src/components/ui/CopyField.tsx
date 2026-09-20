import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Copy, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { color, radius, size, text, iconStroke } from '../../theme/tokens';

/**
 * Copy field — 40h, surface2, r10, 0/12 padding, mono value.
 *
 * The whole field is the press target. On copy the fill turns success-tinted and
 * the icon becomes a check with "Copied", reverting after 2s.
 *
 * Reference IDs stay Latin digits and LTR even in an Arabic UI: the field is a
 * forced-LTR island, because these strings are looked up character by character.
 */
interface CopyFieldProps {
    value?: string | null;
    copiedLabel?: string;
    /** Shown in tertiary when there is no reference yet. */
    pendingLabel?: string;
}

export function CopyField({ value, copiedLabel = 'Copied', pendingLabel = 'Pending reference' }: CopyFieldProps) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    if (!value) {
        return (
            <View style={styles.field}>
                <Text style={text('mono', { color: color.text.tertiary })} numberOfLines={1}>
                    {pendingLabel}
                </Text>
            </View>
        );
    }

    const handleCopy = async () => {
        await Clipboard.setStringAsync(value);
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [
                styles.field,
                copied && styles.copied,
                pressed && !copied && styles.pressed,
            ]}
        >
            <Text
                style={[
                    text('mono', { color: copied ? color.success.fgStrong : color.text.primary }),
                    styles.value,
                ]}
                numberOfLines={1}
            >
                {value}
            </Text>
            {copied ? (
                <View style={styles.copiedTag}>
                    <Check size={size.icon.xs} color={color.success.fg} strokeWidth={iconStroke} />
                    <Text style={text('caption', { color: color.success.fg })}>{copiedLabel}</Text>
                </View>
            ) : (
                <Copy size={size.icon.xs} color={color.text.secondary} strokeWidth={iconStroke} />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    field: {
        height: size.copyField,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: radius.button,
        backgroundColor: color.surface2,
    },
    pressed: { backgroundColor: color.surface3 },
    copied: { backgroundColor: color.success.bg },
    // Reference IDs are a forced-LTR island even in Arabic: they are read and
    // typed character by character. `writingDirection` is the supported prop here;
    // `direction` is not a valid React Native style.
    value: { flexShrink: 1, textAlign: 'left', writingDirection: 'ltr' },
    copiedTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

export default CopyField;
