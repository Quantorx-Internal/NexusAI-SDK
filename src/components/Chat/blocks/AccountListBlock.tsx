import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Pressable,
    NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Wallet, PiggyBank, EyeOff } from 'lucide-react-native';
import { SectionHeader, InstrumentSurface, PageDots, InstrumentPalette } from '../../ui';
import { color, instrument, font, text, iconStroke, radius } from '../../../theme/tokens';
import { splitAmount } from '../../../lib/utils';
import { Account } from '../../../types';

/**
 * Family A · AccountList — 272×168 gradient instruments (design §A, round 2).
 *
 * Accounts are objects, not list rows, so they carry the gradient: current on
 * the brand ramp, savings on ink. Anatomy top to bottom: a frosted icon square
 * with the name and type beside it, the Default pill opposite, then "Available"
 * over the balance, with the masked number set against it bottom-right.
 *
 * The balance dims its decimals — the riyals are what people read, the halalas
 * are not.
 */

interface AccountListBlockProps {
    accounts: Account[];
    title?: string;
    locale?: 'en' | 'ar';
    onSelect?: (account: Account) => void;
    /** Id of the account already chosen in this flow. */
    selectedId?: string;
    isRTL?: boolean;
}

const STRIDE = instrument.width + instrument.gap;

export function AccountListBlock({
    accounts,
    title,
    locale = 'en',
    onSelect,
    selectedId,
    isRTL,
}: AccountListBlockProps) {
    const [page, setPage] = useState(0);

    const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        setPage(Math.round(e.nativeEvent.contentOffset.x / STRIDE));
    }, []);

    if (accounts.length === 0) return null;

    return (
        <View>
            {title ? <SectionHeader title={title} count={accounts.length} /> : null}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scroller}
                snapToInterval={STRIDE}
                decelerationRate="fast"
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {accounts.map(account => (
                    <AccountInstrument
                        key={account.id}
                        account={account}
                        locale={locale}
                        onSelect={onSelect}
                        selected={selectedId === account.id}
                        isRTL={isRTL}
                    />
                ))}
            </ScrollView>
            <PageDots count={accounts.length} active={page} />
        </View>
    );
}

function AccountInstrument({
    account,
    locale,
    onSelect,
    selected,
    isRTL,
}: {
    account: Account;
    locale: 'en' | 'ar';
    onSelect?: (account: Account) => void;
    selected?: boolean;
    isRTL?: boolean;
}) {
    const [visible, setVisible] = useState(true);
    const isAr = locale === 'ar';
    const isSavings = account.type === 'savings';
    const palette: InstrumentPalette = isSavings ? 'ink' : 'brand';
    const Icon = isSavings ? PiggyBank : Wallet;

    const { head, decimals } = splitAmount(account.balance, account.currency, locale);

    const t = {
        available: isAr ? 'المتاح' : 'Available',
        current: isAr ? 'جاري' : 'Current',
        savings: isAr ? 'توفير' : 'Savings',
        default: isAr ? 'افتراضي' : 'Default',
    };

    return (
        <Pressable
            onPress={onSelect ? () => onSelect(account) : undefined}
            disabled={!onSelect}
        >
            {({ pressed }) => (
                <InstrumentSurface
                    palette={palette}
                    height={instrument.accountHeight}
                    selected={selected}
                    pressed={pressed}
                    mirrored={isRTL}
                >
                    <View style={styles.header}>
                        <View style={styles.frostIcon}>
                            <Icon
                                size={18}
                                color={instrument.onSurfaceStrong}
                                strokeWidth={iconStroke}
                            />
                        </View>

                        <View style={styles.headerText}>
                            <Text style={styles.name} numberOfLines={1}>
                                {isAr ? account.nameAr : account.name}
                            </Text>
                            <Text style={styles.type} numberOfLines={1}>
                                {isSavings ? t.savings : t.current}
                            </Text>
                        </View>

                        {account.isDefault ? (
                            <View style={styles.pill}>
                                <Text style={styles.pillText}>{t.default}</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Pressing the balance area toggles visibility. The spec
                        shows an eye only in the hidden state (•••••• + eye-off);
                        a persistent toggle stole enough width to truncate the
                        balance at 272pt. */}
                    <Pressable
                        onPress={() => setVisible(v => !v)}
                        hitSlop={8}
                        style={styles.footer}
                    >
                        <Text style={styles.caption}>{t.available}</Text>
                        <View style={styles.balanceRow}>
                            {visible ? (
                                <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
                                    {head}
                                    <Text style={styles.decimals}>{decimals}</Text>
                                </Text>
                            ) : (
                                <View style={styles.hiddenGroup}>
                                    <Text style={styles.balance} numberOfLines={1}>
                                        ••••••
                                    </Text>
                                    <EyeOff
                                        size={16}
                                        color={instrument.onSurface}
                                        strokeWidth={iconStroke}
                                    />
                                </View>
                            )}

                            <Text style={styles.number} numberOfLines={1}>
                                {account.accountNumber.replace(/^\*+/, '•• ')}
                            </Text>
                        </View>
                    </Pressable>

                </InstrumentSurface>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    scroller: { gap: instrument.gap, paddingRight: instrument.peek },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    frostIcon: {
        width: instrument.iconSquare,
        height: instrument.iconSquare,
        borderRadius: instrument.iconRadius,
        backgroundColor: instrument.frostFill,
        borderWidth: 1,
        borderColor: instrument.frostBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
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
    pill: {
        height: instrument.pillHeight,
        paddingHorizontal: 10,
        borderRadius: radius.pill,
        backgroundColor: instrument.pillFill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillText: {
        fontSize: 11,
        fontWeight: '600',
        fontFamily: font.family,
        color: instrument.onSurfaceStrong,
    },
    footer: { marginTop: 'auto' },
    caption: {
        fontSize: 12,
        lineHeight: 16,
        fontFamily: font.family,
        color: instrument.onSurface,
        marginBottom: 2,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        // 6 rather than 8: at 272pt the balance and the masked number together
        // sit ~3pt over the 236pt content width, and both were ellipsising.
        gap: 6,
    },
    balance: {
        fontSize: instrument.balanceSize,
        lineHeight: instrument.balanceLine,
        fontWeight: '700',
        fontFamily: font.family,
        color: instrument.onSurfaceStrong,
        fontVariant: ['tabular-nums'],
        flexShrink: 1,
    },
    decimals: {
        fontSize: instrument.decimalsSize,
        fontWeight: '600',
        color: instrument.onSurface,
    },
    hiddenGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    number: {
        fontSize: 12,
        paddingBottom: 4,
        // The number identifies the account — it must never ellipsise; the
        // balance is the flexible one.
        flexShrink: 0,
        fontFamily: font.mono,
        color: instrument.onSurface,
        // Masked numbers stay LTR in every locale.
        writingDirection: 'ltr',
    },
});

export default AccountListBlock;
