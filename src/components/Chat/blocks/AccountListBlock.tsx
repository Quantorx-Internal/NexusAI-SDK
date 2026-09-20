import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Eye, EyeOff, Check } from 'lucide-react-native';
import { SectionHeader } from '../../ui';
import { color, layout, radius, border, size, text, elevation, iconStroke } from '../../../theme/tokens';
import { splitAmount } from '../../../lib/utils';
import { Account } from '../../../types';

/**
 * Family A · AccountList.
 *
 * Accounts are tiles, not cards: surface-2 fill, no border, no label chrome.
 * Name and number share one line, and the balance carries the weight with its
 * decimals dimmed — the riyals are the number people read, the halalas are not.
 *
 * The whole tile is the press target; the eye is a bare icon inside it. A
 * selected tile turns white with a 1.5px brand border and a check badge, which
 * is the same selection signal used by beneficiary chips.
 */

interface AccountListBlockProps {
    accounts: Account[];
    title?: string;
    locale?: 'en' | 'ar';
    onSelect?: (account: Account) => void;
    /** Id of the account already chosen in this flow. */
    selectedId?: string;
}

const TILE_WIDTH = 224;

export function AccountListBlock({
    accounts,
    title,
    locale = 'en',
    onSelect,
    selectedId,
}: AccountListBlockProps) {
    if (accounts.length === 0) return null;

    return (
        <View>
            {title ? <SectionHeader title={title} count={accounts.length} /> : null}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scroller}
                // Peek: the next tile is deliberately visible, so the list never
                // ends in a meaningless clipped sliver.
                snapToInterval={TILE_WIDTH + layout.scrollerGap}
                decelerationRate="fast"
            >
                {accounts.map(account => (
                    <AccountTile
                        key={account.id}
                        account={account}
                        locale={locale}
                        onSelect={onSelect}
                        selected={selectedId === account.id}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

function AccountTile({
    account,
    locale,
    onSelect,
    selected,
}: {
    account: Account;
    locale: 'en' | 'ar';
    onSelect?: (account: Account) => void;
    selected?: boolean;
}) {
    const [visible, setVisible] = useState(true);
    const isAr = locale === 'ar';
    const displayName = isAr ? account.nameAr : account.name;
    const { head, decimals } = splitAmount(account.balance, account.currency, locale);

    const typeLabel = isAr
        ? account.type === 'savings'
            ? 'توفير'
            : 'جاري'
        : account.type === 'savings'
            ? 'Savings'
            : 'Current';
    const defaultLabel = isAr ? 'افتراضي' : 'Default';
    const subtitle = [typeLabel, account.isDefault ? defaultLabel : null].filter(Boolean).join(' · ');

    return (
        <Pressable
            onPress={onSelect ? () => onSelect(account) : undefined}
            disabled={!onSelect}
            style={({ pressed }) => [
                styles.tile,
                selected && styles.tileSelected,
                pressed && !selected && styles.tilePressed,
            ]}
        >
            {selected && (
                <View style={styles.checkBadge}>
                    <Check size={12} color={color.text.inverse} strokeWidth={3} />
                </View>
            )}

            <View style={styles.tileHeader}>
                <Text style={styles.nameLine} numberOfLines={1}>
                    <Text style={text('rowValue')}>{displayName} </Text>
                    <Text style={text('caption')}>{account.accountNumber}</Text>
                </Text>
                <Pressable
                    onPress={() => setVisible(v => !v)}
                    hitSlop={12}
                    style={styles.eye}
                >
                    {visible ? (
                        <Eye size={size.icon.xs} color={color.text.secondary} strokeWidth={iconStroke} />
                    ) : (
                        <EyeOff size={size.icon.xs} color={color.text.secondary} strokeWidth={iconStroke} />
                    )}
                </Pressable>
            </View>

            <Text style={text('caption')} numberOfLines={1}>
                {subtitle}
            </Text>

            <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
                {visible ? (
                    <>
                        <Text style={styles.balanceHead}>{head}</Text>
                        <Text style={styles.balanceDecimals}>{decimals}</Text>
                    </>
                ) : (
                    <Text style={styles.balanceHead}>••••••</Text>
                )}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    scroller: { gap: layout.scrollerGap, paddingRight: layout.scrollerPeek },
    tile: {
        width: TILE_WIDTH,
        paddingVertical: 14,
        paddingHorizontal: layout.cardPadding,
        borderRadius: radius.card,
        backgroundColor: color.surface2,
        gap: 4,
        justifyContent: 'space-between',
    },
    tileSelected: {
        backgroundColor: color.surface,
        borderWidth: border.decision,
        borderColor: color.borderBrand,
    },
    tilePressed: { backgroundColor: color.surface3, ...elevation.pressed },
    checkBadge: {
        position: 'absolute',
        top: -1,
        right: 12,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: color.brand[600],
        alignItems: 'center',
        justifyContent: 'center',
    },
    tileHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    nameLine: { flex: 1 },
    eye: { padding: 2 },
    balance: { marginTop: 6 },
    // 24/32 with the halalas dimmed to 18/600 tertiary.
    balanceHead: {
        fontSize: 24,
        lineHeight: 32,
        fontWeight: '700',
        color: color.text.primary,
        fontVariant: ['tabular-nums'],
    },
    balanceDecimals: {
        fontSize: 18,
        lineHeight: 32,
        fontWeight: '600',
        color: color.text.tertiary,
        fontVariant: ['tabular-nums'],
    },
});

export default AccountListBlock;
