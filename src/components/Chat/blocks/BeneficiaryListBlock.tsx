import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Globe, Check } from 'lucide-react-native';
import { SectionHeader } from '../../ui';
import { color, layout, radius, border, size, text, elevation, iconStroke } from '../../../theme/tokens';
import { initials } from '../../../lib/utils';
import { Beneficiary } from '../../../types';

/**
 * Family A · BeneficiaryList — horizontal chips, not portrait cards.
 *
 * 40pt avatar, name, and one caption line reading "bank · qualifier". At 64pt
 * tall instead of 150 the payee picker stops dominating the thread, and ~1.6
 * chips are visible so the cut-off third chip is itself the scroll cue.
 *
 * The caption is where a payee is actually distinguished, so it gets the room
 * that the old oversized avatar was taking. An international payee carries an
 * 18pt globe badge on the avatar and its country in the caption — previously a
 * local and an overseas payee looked identical, despite different fees and flow.
 */

interface BeneficiaryListBlockProps {
    beneficiaries: Beneficiary[];
    title?: string;
    locale?: 'en' | 'ar';
    onSelect?: (beneficiary: Beneficiary) => void;
    selectedId?: string;
}

const CHIP_WIDTH = 204;

/** Avatar fill rotates so adjacent payees differ; all three pass contrast on white initials. */
const AVATAR_RAMP = [color.brand[600], color.brand[500], color.brand[400]];

export function BeneficiaryListBlock({
    beneficiaries,
    title,
    locale = 'en',
    onSelect,
    selectedId,
}: BeneficiaryListBlockProps) {
    if (beneficiaries.length === 0) return null;

    return (
        <View>
            {title ? <SectionHeader title={title} count={beneficiaries.length} /> : null}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scroller}
                snapToInterval={CHIP_WIDTH + layout.scrollerGap}
                decelerationRate="fast"
            >
                {beneficiaries.map((beneficiary, index) => (
                    <BeneficiaryChip
                        key={beneficiary.id}
                        beneficiary={beneficiary}
                        index={index}
                        locale={locale}
                        onSelect={onSelect}
                        selected={selectedId === beneficiary.id}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

function BeneficiaryChip({
    beneficiary,
    index,
    locale,
    onSelect,
    selected,
}: {
    beneficiary: Beneficiary;
    index: number;
    locale: 'en' | 'ar';
    onSelect?: (beneficiary: Beneficiary) => void;
    selected?: boolean;
}) {
    const isAr = locale === 'ar';
    const name = isAr ? beneficiary.nameAr : beneficiary.name;
    const bank = isAr ? beneficiary.bankNameAr : beneficiary.bankName;
    const isInternational = beneficiary.type === 'international';

    // "bank · qualifier" — country for an overseas payee, account kind otherwise.
    const qualifier = isInternational
        ? (isAr ? beneficiary.countryAr : beneficiary.country) || (isAr ? 'دولي' : 'International')
        : beneficiary.accountType === 'business'
            ? isAr
                ? 'أعمال'
                : 'Business'
            : null;

    const caption = [bank, qualifier].filter(Boolean).join(' · ');
    const avatarColor = AVATAR_RAMP[index % AVATAR_RAMP.length];

    return (
        <Pressable
            onPress={onSelect ? () => onSelect(beneficiary) : undefined}
            disabled={!onSelect}
            style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && !selected && styles.chipPressed,
            ]}
        >
            <View>
                <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                    <Text style={text('rowValue', { color: color.text.inverse, fontWeight: '700' })}>
                        {initials(name)}
                    </Text>
                </View>
                {isInternational && (
                    <View style={styles.globeBadge}>
                        <Globe size={11} color={color.brand[600]} strokeWidth={iconStroke} />
                    </View>
                )}
            </View>

            <View style={styles.chipText}>
                <Text style={text('rowValue')} numberOfLines={1}>
                    {name}
                </Text>
                <Text style={text('caption')} numberOfLines={1}>
                    {caption}
                </Text>
            </View>

            {selected && (
                <View style={styles.check}>
                    <Check size={12} color={color.text.inverse} strokeWidth={3} />
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    scroller: { gap: layout.scrollerGap, paddingRight: layout.scrollerPeek },
    chip: {
        width: CHIP_WIDTH,
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: radius.card,
        backgroundColor: color.surface2,
    },
    chipSelected: {
        backgroundColor: color.surface,
        borderWidth: border.decision,
        borderColor: color.borderBrand,
    },
    chipPressed: { backgroundColor: color.surface3, ...elevation.pressed },
    avatar: {
        width: size.iconBox.lg,
        height: size.iconBox.lg,
        borderRadius: radius.avatar,
        alignItems: 'center',
        justifyContent: 'center',
    },
    globeBadge: {
        position: 'absolute',
        right: -4,
        bottom: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: color.surface,
        borderWidth: 1,
        borderColor: color.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipText: { flex: 1 },
    check: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: color.brand[600],
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default BeneficiaryListBlock;
