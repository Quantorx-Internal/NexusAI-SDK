import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { color, border, radius, layout, text } from '../../theme/tokens';

/**
 * Section header — rowLabel at weight 600 in textSecondary, with an optional
 * count in caption. 4px inset, 8px above the card group it labels.
 */
interface SectionHeaderProps {
    title: string;
    count?: number | string;
}

export function SectionHeader({ title, count }: SectionHeaderProps) {
    return (
        <View style={styles.header}>
            <Text style={text('rowLabel', { fontWeight: '600', color: color.text.secondary })}>
                {title}
            </Text>
            {count !== undefined && count !== '' && (
                <Text style={text('caption')}>{count}</Text>
            )}
        </View>
    );
}

/** Empty state — dashed border, no icon. */
export function EmptyState({ title, note }: { title: string; note?: string }) {
    return (
        <View style={styles.empty}>
            <Text style={text('rowValue', { color: color.text.secondary })}>{title}</Text>
            {note ? <Text style={[text('caption'), styles.note]}>{note}</Text> : null}
        </View>
    );
}

/**
 * Loading — surface3 blocks at the exact slot heights of the real card, so
 * nothing shifts when data arrives.
 */
export function SkeletonRows({ rows = 3, height = 64 }: { rows?: number; height?: number }) {
    return (
        <View style={styles.skeleton}>
            {Array.from({ length: rows }).map((_, index) => (
                <View key={index} style={[styles.skeletonRow, { height }]} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    empty: {
        borderWidth: border.hairline,
        borderColor: color.borderStrong,
        borderStyle: 'dashed',
        borderRadius: radius.card,
        padding: layout.cardPadding,
        alignItems: 'center',
        gap: 4,
    },
    note: { textAlign: 'center' },
    skeleton: { gap: 8 },
    skeletonRow: { backgroundColor: color.surface3, borderRadius: radius.inner },
});

export default SectionHeader;
