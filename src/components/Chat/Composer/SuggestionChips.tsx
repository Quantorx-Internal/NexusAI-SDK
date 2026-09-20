import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { color, composer, radius, text, iconStroke } from '../../../theme/tokens';
import { Suggestion, EntityCandidate } from '../../../lib/suggestions';

/**
 * The chip row above the composer. Two modes, one component:
 *
 *  - suggestions: computed actions, the lead one carrying a sparkle
 *  - entity candidates: when the parser sees an open slot ("send 500 to …"),
 *    the row swaps to payees / accounts / cards / bills for that slot
 *
 * A horizontal list rather than a dropdown or a keyboard accessory view, so it
 * stays visible above the keyboard and never covers the thread.
 */

interface SuggestionChipsProps {
    suggestions?: Suggestion[];
    candidates?: EntityCandidate[];
    /** Label shown before the candidate row, e.g. "To". */
    slotLabel?: string;
    onSuggestion?: (suggestion: Suggestion) => void;
    onCandidate?: (candidate: EntityCandidate) => void;
    isRTL?: boolean;
}

export function SuggestionChips({
    suggestions,
    candidates,
    slotLabel,
    onSuggestion,
    onCandidate,
    isRTL,
}: SuggestionChipsProps) {
    const showCandidates = Boolean(candidates && candidates.length > 0);
    const data: any[] = showCandidates ? candidates! : suggestions || [];
    if (data.length === 0) return null;

    return (
        <View style={styles.wrap}>
            {showCandidates && slotLabel ? (
                <Text style={[text('caption'), styles.slotLabel]}>{slotLabel}</Text>
            ) : null}
            <FlatList
                horizontal
                data={data}
                // Tapping a chip must not dismiss the keyboard mid-sentence.
                keyboardShouldPersistTaps="always"
                showsHorizontalScrollIndicator={false}
                inverted={isRTL}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.row}
                renderItem={({ item }) =>
                    showCandidates ? (
                        <CandidateChip
                            candidate={item as EntityCandidate}
                            onPress={() => onCandidate?.(item)}
                        />
                    ) : (
                        <SuggestionChip
                            suggestion={item as Suggestion}
                            onPress={() => onSuggestion?.(item)}
                        />
                    )
                }
            />
        </View>
    );
}

function SuggestionChip({
    suggestion,
    onPress,
}: {
    suggestion: Suggestion;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.chip,
                suggestion.primary && styles.chipPrimary,
                pressed && styles.chipPressed,
            ]}
        >
            {suggestion.primary && (
                <Sparkles size={13} color={color.brand[600]} strokeWidth={iconStroke} />
            )}
            <Text
                style={text('badge', {
                    fontSize: 13,
                    lineHeight: 18,
                    fontWeight: '600',
                    color: suggestion.primary ? color.brand[600] : color.text.primary,
                })}
                numberOfLines={1}
            >
                {suggestion.label}
            </Text>
        </Pressable>
    );
}

function CandidateChip({
    candidate,
    onPress,
}: {
    candidate: EntityCandidate;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
        >
            <View style={styles.avatar}>
                <Text
                    style={text('badge', { color: color.brand[600], fontWeight: '700' })}
                >
                    {candidate.initials}
                </Text>
            </View>
            <Text
                style={text('badge', {
                    fontSize: 13,
                    lineHeight: 18,
                    fontWeight: '600',
                })}
                numberOfLines={1}
            >
                {candidate.label}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    slotLabel: { paddingLeft: composer.barPadStart },
    row: { gap: composer.chipGap, paddingHorizontal: composer.barPadStart },
    chip: {
        height: composer.chipHeight,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: composer.chipPadH,
        borderRadius: radius.pill,
        backgroundColor: color.surface2,
        borderWidth: 1,
        borderColor: color.border,
        maxWidth: 260,
    },
    chipPrimary: {
        backgroundColor: color.brand[50],
        borderColor: color.brand[200],
    },
    chipPressed: { backgroundColor: color.surface3 },
    avatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: color.brand[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default SuggestionChips;
