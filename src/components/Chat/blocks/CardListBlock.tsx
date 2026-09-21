import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Pressable,
    NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Snowflake } from 'lucide-react-native';
import { SectionHeader, InstrumentSurface, PageDots, InstrumentPalette } from '../../ui';
import { color, instrument, font, iconStroke, radius } from '../../../theme/tokens';
import { Card as BankCard } from '../../../types';

/**
 * Family A · CardList — 272×172 gradient instruments (design §A, round 2).
 *
 * The card is drawn as the physical object: name and type top-left, chip mark
 * top-right, the number in tracked mono across the middle, expiry and network
 * along the bottom. Credit takes the brand ramp, debit takes ink.
 *
 * A frozen card puts an info pill where the chip goes and drops to 92% opacity —
 * it reads as switched off without being greyed into illegibility.
 */

interface CardListBlockProps {
    cards: BankCard[];
    title?: string;
    locale?: 'en' | 'ar';
    onSelect?: (card: BankCard) => void;
    selectedId?: string;
    isRTL?: boolean;
}

const STRIDE = instrument.width + instrument.gap;

/**
 * Text stand-ins until the official marks land. The design calls for the real
 * VISA / mada / Mastercard assets, white on dark.
 */
const NETWORK_MARK: Record<string, string> = {
    visa: 'VISA',
    mastercard: 'Mastercard',
    mada: 'mada',
};

export function CardListBlock({
    cards,
    title,
    locale = 'en',
    onSelect,
    selectedId,
    isRTL,
}: CardListBlockProps) {
    const [page, setPage] = useState(0);

    const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        setPage(Math.round(e.nativeEvent.contentOffset.x / STRIDE));
    }, []);

    if (cards.length === 0) return null;

    return (
        <View>
            {title ? <SectionHeader title={title} count={cards.length} /> : null}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scroller}
                snapToInterval={STRIDE}
                decelerationRate="fast"
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {cards.map(card => (
                    <CardInstrument
                        key={card.id}
                        card={card}
                        locale={locale}
                        onSelect={onSelect}
                        selected={selectedId === card.id}
                        isRTL={isRTL}
                    />
                ))}
            </ScrollView>
            <PageDots count={cards.length} active={page} />
        </View>
    );
}

function CardInstrument({
    card,
    locale,
    onSelect,
    selected,
    isRTL,
}: {
    card: BankCard;
    locale: 'en' | 'ar';
    onSelect?: (card: BankCard) => void;
    selected?: boolean;
    isRTL?: boolean;
}) {
    const isAr = locale === 'ar';
    const isCredit = card.type === 'credit';
    const frozen = card.status === 'frozen';
    const palette: InstrumentPalette = isCredit ? 'brand' : 'ink';

    const t = {
        credit: isAr ? 'ائتمانية' : 'Credit',
        debit: isAr ? 'خصم' : 'Debit',
        frozen: isAr ? 'مجمدة' : 'Frozen',
        exp: isAr ? 'تنتهي' : 'Exp',
    };

    return (
        <Pressable onPress={onSelect ? () => onSelect(card) : undefined} disabled={!onSelect}>
            {({ pressed }) => (
                <InstrumentSurface
                    palette={palette}
                    height={instrument.cardHeight}
                    selected={selected}
                    pressed={pressed}
                    dimmed={frozen}
                    mirrored={isRTL}
                >
                    <View style={styles.header}>
                        <View style={styles.headerText}>
                            <Text style={styles.name} numberOfLines={1}>
                                {isAr ? card.nameAr : card.name}
                            </Text>
                            <Text style={styles.type} numberOfLines={1}>
                                {isCredit ? t.credit : t.debit}
                            </Text>
                        </View>

                        {/* The frozen pill takes the chip's place rather than
                            crowding in beside it. */}
                        {frozen ? (
                            <View style={styles.frozenPill}>
                                <Snowflake size={11} color={color.info.fg} strokeWidth={iconStroke} />
                                <Text style={styles.frozenText}>{t.frozen}</Text>
                            </View>
                        ) : (
                            <View style={styles.chip} />
                        )}
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.number} numberOfLines={1}>
                            {`••••  ${card.lastFourDigits}`}
                        </Text>
                        <View style={styles.bottomRow}>
                            <Text style={styles.expiry}>
                                {t.exp} {card.expiryDate}
                            </Text>
                            <Text style={styles.network}>
                                {NETWORK_MARK[card.cardNetwork] || card.cardNetwork.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </InstrumentSurface>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    scroller: { gap: instrument.gap, paddingRight: instrument.peek },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    headerText: { flex: 1 },
    name: {
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '700',
        fontFamily: font.family,
        color: instrument.onSurfaceStrong,
    },
    type: {
        fontSize: 12,
        lineHeight: 16,
        fontFamily: font.family,
        color: instrument.onSurface,
    },
    // Stands in for chip art until the real asset lands.
    chip: {
        width: 30,
        height: 22,
        borderRadius: 5,
        backgroundColor: '#D8B36A',
    },
    frozenPill: {
        height: instrument.pillHeight,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        borderRadius: radius.pill,
        backgroundColor: color.info.bg,
    },
    frozenText: {
        fontSize: 11,
        fontWeight: '600',
        fontFamily: font.family,
        color: color.info.fg,
    },
    footer: { marginTop: 'auto', gap: 10 },
    number: {
        fontSize: instrument.numberSize,
        fontFamily: font.mono,
        letterSpacing: instrument.numberTracking,
        color: instrument.onSurfaceStrong,
        fontVariant: ['tabular-nums'],
        // Card numbers stay LTR in every locale.
        writingDirection: 'ltr',
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    expiry: {
        fontSize: 12,
        fontFamily: font.family,
        color: instrument.onSurface,
    },
    network: {
        fontSize: 14,
        fontWeight: '700',
        fontStyle: 'italic',
        fontFamily: font.family,
        color: instrument.onSurfaceStrong,
    },
});

export default CardListBlock;
