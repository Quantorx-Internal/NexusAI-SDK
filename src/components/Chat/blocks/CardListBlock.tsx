import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Snowflake } from 'lucide-react-native';
import { SectionHeader, StatusPill } from '../../ui';
import { color, layout, radius, text, elevation, iconStroke, size } from '../../../theme/tokens';
import { Card as BankCard } from '../../../types';

/**
 * Family A · CardList — the one place a dark surface appears.
 *
 * A bank card is drawn as the physical object rather than as another purple
 * panel: true 1.586 ratio at 240×151, ink surface for credit with a single
 * brand disc bleeding off the corner, surface-3 for debit. Three elements only —
 * name, number (mono, tracked), network. The chip stands in for chip art; a
 * frozen card swaps the chip for the status pill and nothing else changes.
 */

interface CardListBlockProps {
    cards: BankCard[];
    title?: string;
    locale?: 'en' | 'ar';
    onSelect?: (card: BankCard) => void;
}

const CARD_W = 240;
const CARD_H = 151;
const DISC = CARD_W * 0.59;

/**
 * Two values the token set deliberately does not cover.
 * CHIP_GOLD stands in for real chip art; ON_INK is the secondary text colour on
 * the one dark surface, where the neutral ramp does not apply.
 * Replace CHIP_GOLD when the official chip / network marks land.
 */
const CHIP_GOLD = '#D8B36A';
const ON_INK = 'rgba(255,255,255,0.64)';

export function CardListBlock({ cards, title, locale = 'en', onSelect }: CardListBlockProps) {
    if (cards.length === 0) return null;

    return (
        <View>
            {title ? <SectionHeader title={title} count={cards.length} /> : null}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scroller}
                snapToInterval={CARD_W + layout.scrollerGap}
                decelerationRate="fast"
            >
                {cards.map(card => (
                    <BankCardTile key={card.id} card={card} locale={locale} onSelect={onSelect} />
                ))}
            </ScrollView>
        </View>
    );
}

function BankCardTile({
    card,
    locale,
    onSelect,
}: {
    card: BankCard;
    locale: 'en' | 'ar';
    onSelect?: (card: BankCard) => void;
}) {
    const isAr = locale === 'ar';
    const name = isAr ? card.nameAr : card.name;
    const isCredit = card.type === 'credit';
    const frozen = card.status === 'frozen';

    // Ink for credit, light for debit — the only two surfaces a card can have.
    const fg = isCredit ? color.text.inverse : color.text.primary;
    const dim = isCredit ? ON_INK : color.text.tertiary;

    const networkMark = card.cardNetwork === 'mada' ? 'mada' : card.cardNetwork.toUpperCase();

    return (
        <Pressable
            onPress={onSelect ? () => onSelect(card) : undefined}
            disabled={!onSelect}
            style={({ pressed }) => [
                styles.card,
                isCredit ? styles.credit : styles.debit,
                pressed && elevation.pressed,
            ]}
        >
            {/* One brand gesture on the dark surface: a disc at 55% of the card
                width, bleeding past the corner. */}
            {isCredit && <View style={styles.disc} />}

            <View style={styles.cardTop}>
                <Text style={text('rowValue', { color: fg })} numberOfLines={1}>
                    {name}
                </Text>
                {frozen ? (
                    <StatusPill
                        label={isAr ? 'مجمدة' : 'Frozen'}
                        tone="info"
                        icon={
                            <Snowflake size={11} color={color.info.fg} strokeWidth={iconStroke} />
                        }
                    />
                ) : (
                    <View style={styles.chip} />
                )}
            </View>

            <View style={styles.cardBottom}>
                <Text style={[styles.number, { color: fg }]} numberOfLines={1}>
                    ••••{'  '}{card.lastFourDigits}
                </Text>
                <View style={styles.cardFooter}>
                    <Text style={text('caption', { color: dim })}>{card.expiryDate}</Text>
                    <Text style={text('rowLabel', { color: fg, fontWeight: '700' })}>
                        {networkMark}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    scroller: { gap: layout.scrollerGap, paddingRight: layout.scrollerPeek },
    card: {
        width: CARD_W,
        height: CARD_H,
        borderRadius: 14,
        padding: layout.cardPadding,
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    credit: { backgroundColor: color.ink },
    debit: { backgroundColor: color.surface3 },
    // Starts at 43% of the card width and bleeds past the right edge and the top,
    // so the title stays clear of it and the chip sits on the brand colour.
    disc: {
        position: 'absolute',
        width: DISC,
        height: DISC,
        borderRadius: DISC / 2,
        backgroundColor: color.brand[600],
        left: CARD_W * 0.43,
        top: CARD_H * 0.33 - DISC / 2,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    chip: {
        width: 28,
        height: 20,
        borderRadius: 4,
        backgroundColor: CHIP_GOLD,
    },
    cardBottom: { gap: 6 },
    number: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 16 * 0.14,
        fontVariant: ['tabular-nums'],
    },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

export default CardListBlock;
