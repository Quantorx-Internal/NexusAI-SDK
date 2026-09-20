import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Check } from 'lucide-react-native';
import { color, radius, size, layout, text, iconStroke } from '../../theme/tokens';

/**
 * Action row.
 *
 * Exactly one primary per card: 44h, full width, always first. Secondary and
 * ghost sit below at 40h with an 8 gap. A destructive-but-cancel action is a
 * ghost, never red — red is reserved for data (overdue, danger amounts).
 *
 * After a card is confirmed, the whole row is replaced by `confirmedAt`, so a
 * screenshot of a finished thread never shows live buttons.
 */

type ButtonKind = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
    label: string;
    kind?: ButtonKind;
    onPress?: () => void;
    disabled?: boolean;
    working?: boolean;
    style?: any;
}

export function Button({ label, kind = 'secondary', onPress, disabled, working, style }: ButtonProps) {
    const isPrimary = kind === 'primary';
    const inactive = disabled || working;

    return (
        <Pressable
            onPress={onPress}
            disabled={inactive}
            style={({ pressed }) => [
                styles.button,
                { height: isPrimary ? size.buttonPrimary : size.buttonSecondary },
                kind === 'primary' && styles.primary,
                kind === 'secondary' && styles.secondary,
                kind === 'ghost' && styles.ghost,
                pressed && !inactive && (isPrimary ? styles.primaryPressed : styles.secondaryPressed),
                disabled && styles.disabled,
                style,
            ]}
        >
            {working && (
                <ActivityIndicator
                    size="small"
                    color={isPrimary ? color.text.inverse : color.brand[600]}
                />
            )}
            <Text
                style={[
                    text('button', {
                        color: disabled
                            ? color.text.tertiary
                            : isPrimary
                                ? color.text.inverse
                                : color.text.primary,
                    }),
                ]}
                numberOfLines={1}
            >
                {label}
            </Text>
        </Pressable>
    );
}

interface ActionRowProps {
    primaryLabel?: string;
    onPrimary?: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
    ghostLabel?: string;
    onGhost?: () => void;
    disabled?: boolean;
    working?: boolean;
    /** When set, the buttons are replaced by a finished-state caption. */
    confirmedLabel?: string;
}

export function ActionRow({
    primaryLabel,
    onPrimary,
    secondaryLabel,
    onSecondary,
    ghostLabel,
    onGhost,
    disabled,
    working,
    confirmedLabel,
}: ActionRowProps) {
    if (confirmedLabel) {
        return (
            <View style={styles.confirmed}>
                <Check size={size.icon.xs} color={color.success.fg} strokeWidth={iconStroke} />
                <Text style={text('caption', { color: color.success.fg })}>{confirmedLabel}</Text>
            </View>
        );
    }

    const hasSecondRow = Boolean(secondaryLabel || ghostLabel);
    if (!primaryLabel && !hasSecondRow) return null;

    return (
        <View style={styles.row}>
            {primaryLabel && (
                <Button
                    label={primaryLabel}
                    kind="primary"
                    onPress={onPrimary}
                    disabled={disabled}
                    working={working}
                />
            )}
            {hasSecondRow && (
                <View style={styles.secondRow}>
                    {secondaryLabel && (
                        <Button
                            label={secondaryLabel}
                            kind="secondary"
                            onPress={onSecondary}
                            disabled={disabled || working}
                            style={styles.flex}
                        />
                    )}
                    {ghostLabel && (
                        <Button
                            label={ghostLabel}
                            kind="ghost"
                            onPress={onGhost}
                            disabled={disabled || working}
                            style={styles.flex}
                        />
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { gap: 8 },
    secondRow: { flexDirection: 'row', gap: 8 },
    flex: { flex: 1 },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: radius.button,
        paddingHorizontal: 12,
    },
    primary: { backgroundColor: color.brand[600] },
    primaryPressed: { backgroundColor: color.brand[700] },
    secondary: {
        backgroundColor: color.surface,
        borderWidth: 1,
        borderColor: color.border,
    },
    secondaryPressed: { backgroundColor: color.surface2 },
    ghost: { backgroundColor: 'transparent' },
    disabled: {
        backgroundColor: color.surface3,
        borderWidth: 0,
    },
    confirmed: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});

export default ActionRow;
