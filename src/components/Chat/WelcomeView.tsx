import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, I18nManager } from 'react-native';
import { Eye, EyeOff, FileText, Wallet, Clock, Receipt, HandCoins, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { InstrumentSurface } from '../ui';
import { color, instrument, layout, radius, size, text, iconStroke, welcome } from '../../theme/tokens';
import { useLayoutRTL, row, alignText, alignStart, alignEnd } from '../../contexts/LayoutDirectionContext';
import { Locale } from '../../contexts/LocaleContext';
import { CURRENCY_WORD, plain, splitPlain } from './blocks/loanWords';

/**
 * Welcome · instrument hero (design §7b).
 *
 * Four equal tiles became one hero and three secondary figures: the balance
 * is the question most users open with, so it gets the instrument gradient
 * and the hero type; the month's spending and the cards sit inside it as
 * frosted stats. Pending bills become one tappable insight row, amber
 * because it is the one thing that is actually urgent. Colour otherwise
 * means something: brand purple on actions, nothing else.
 *
 * Quick actions are four equal tiles; financing is the fourth, marked with
 * the brand border and a "new" badge for launch. The eye hides every amount
 * on the screen, not only the balance. Digits are one system throughout:
 * Latin, with the currency word after the number, like every card.
 */

export interface WelcomeSummary {
    totalBalance: number;
    /** How many accounts the balance adds up. */
    accounts?: number;
    monthlySpending: number;
    pendingBills: { count: number; amount: number };
    activeCards: number;
}

interface WelcomeViewProps {
    summary: WelcomeSummary | null;
    locale: Locale;
    isRTL?: boolean;
    onQuickAction: (action: string) => void;
}

const WORDS = {
    ar: {
        hello: (name: string) => `هلا ${name}`,
        how: 'كيف أقدر أفيدك؟',
        total: 'إجمالي الرصيد',
        accounts: (n: number) => `${n} ${n === 1 ? 'حساب' : n === 2 ? 'حسابين' : n <= 10 ? 'حسابات' : 'حساب'}`,
        spending: 'مصروفات الشهر',
        cards: 'البطاقات',
        active: (n: number) => `${n} نشطة`,
        pending: (n: number) => `${n} ${n === 1 ? 'فاتورة معلّقة' : n === 2 ? 'فاتورتين معلّقتين' : n <= 10 ? 'فواتير معلّقة' : 'فاتورة معلّقة'}`,
        totalling: (amount: string) => `بإجمالي ${amount}`,
        pay: 'ادفع',
        payMessage: 'أبي أدفع فواتيري',
        hide: 'إخفاء المبالغ',
        show: 'إظهار المبالغ',
        newBadge: 'جديد',
        actions: [
            { id: 'spending', label: 'مصاريفي', Icon: Wallet, message: 'أبي أشوف مصاريفي' },
            { id: 'activity', label: 'آخر حركاتي', Icon: Clock, message: 'وش آخر حركاتي؟' },
            { id: 'bills', label: 'فواتيري', Icon: Receipt, message: 'أبي أدفع فواتيري' },
            { id: 'loans', label: 'تمويل', Icon: HandCoins, message: 'أبي تمويل', featured: true },
        ],
    },
    en: {
        hello: (name: string) => `Hello, ${name}`,
        how: 'How can I help?',
        total: 'Total balance',
        accounts: (n: number) => `${n} ${n === 1 ? 'account' : 'accounts'}`,
        spending: 'Monthly spending',
        cards: 'Cards',
        active: (n: number) => `${n} active`,
        pending: (n: number) => `${n} pending ${n === 1 ? 'bill' : 'bills'}`,
        totalling: (amount: string) => `totalling ${amount}`,
        pay: 'Pay',
        payMessage: 'Show me my bills',
        hide: 'Hide amounts',
        show: 'Show amounts',
        newBadge: 'New',
        actions: [
            { id: 'spending', label: 'My spending', Icon: Wallet, message: 'Show me my spending' },
            { id: 'activity', label: 'Recent activity', Icon: Clock, message: 'Show my recent transactions' },
            { id: 'bills', label: 'My bills', Icon: Receipt, message: 'Show me my bills' },
            { id: 'loans', label: 'Financing', Icon: HandCoins, message: 'I want financing', featured: true },
        ],
    },
} as const;

const MASK = '••••';

export function WelcomeView({ summary, locale, isRTL = false, onQuickAction }: WelcomeViewProps) {
    const isAr = locale === 'ar';
    const words = WORDS[locale];
    const flip = useLayoutRTL();
    const visualRTL = flip ? !I18nManager.isRTL : I18nManager.isRTL;
    const [hidden, setHidden] = useState(false);
    const [heroWidth, setHeroWidth] = useState(0);

    const clientName = isAr ? 'محمد' : 'Mohammed';
    const currency = CURRENCY_WORD[locale];
    const balance = splitPlain(summary?.totalBalance ?? 0);
    const amount = (value: number) => (hidden ? MASK : `${plain(value, 2)} ${currency}`);
    const EyeIcon = hidden ? EyeOff : Eye;
    const PayChevron = visualRTL ? ChevronLeft : ChevronRight;

    return (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Greeting: name and question on one line. */}
            <View style={[styles.greeting, row(flip)]}>
                <Text style={[text('amount', { fontSize: 26, lineHeight: 32 }), alignText(flip)]} numberOfLines={1}>
                    {words.hello(clientName)}
                </Text>
                <Text style={[text('body', { color: color.text.secondary }), alignText(flip)]} numberOfLines={1}>
                    {words.how}
                </Text>
            </View>

            {/* Hero: the balance, on the instrument gradient. */}
            {summary ? (
                <View onLayout={e => setHeroWidth(e.nativeEvent.layout.width)}>
                    {heroWidth > 0 ? (
                        <InstrumentSurface palette="brand" width={heroWidth} height={welcome.heroHeight} mirrored={visualRTL}>
                            <View style={styles.heroInner}>
                                <View style={[styles.heroTop, row(flip)]}>
                                    <Text style={[text('caption', { color: instrument.onSurface }), alignText(flip)]} numberOfLines={1}>
                                        {words.total}
                                        {summary.accounts ? ` · ${words.accounts(summary.accounts)}` : ''}
                                    </Text>
                                    <Pressable
                                        onPress={() => setHidden(h => !h)}
                                        accessibilityRole="button"
                                        accessibilityLabel={hidden ? words.show : words.hide}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        style={({ pressed }) => [styles.eye, pressed && { opacity: 0.7 }]}
                                    >
                                        <EyeIcon size={size.icon.md} color={instrument.onSurfaceStrong} strokeWidth={iconStroke} />
                                    </Pressable>
                                </View>

                                <View style={[styles.heroAmount, alignStart(flip)]}>
                                    <Text numberOfLines={1} adjustsFontSizeToFit style={alignText(flip)}>
                                        <Text style={[styles.heroHead, styles.tabular]}>{hidden ? MASK : balance.head}</Text>
                                        {!hidden ? (
                                            <Text style={[styles.heroDecimals, styles.tabular]}>{balance.decimals}</Text>
                                        ) : null}
                                        <Text style={text('caption', { color: instrument.onSurface })}>{` ${currency}`}</Text>
                                    </Text>
                                </View>

                                <View style={[styles.stats, row(flip)]}>
                                    <Stat label={words.spending} value={amount(summary.monthlySpending)} flip={flip} />
                                    <Stat label={words.cards} value={words.active(summary.activeCards)} flip={flip} />
                                </View>
                            </View>
                        </InstrumentSurface>
                    ) : (
                        <View style={{ height: welcome.heroHeight }} />
                    )}
                </View>
            ) : null}

            {/* Pending bills: the one urgent thing, as a tappable insight row. */}
            {summary && summary.pendingBills.count > 0 ? (
                <Pressable
                    onPress={() => onQuickAction(words.payMessage)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.summaryRow, row(flip), pressed && { backgroundColor: color.warning.border }]}
                >
                    <View style={styles.summaryIcon}>
                        <FileText size={size.icon.md} color={color.warning.fg} strokeWidth={iconStroke} />
                    </View>
                    <View style={[styles.summaryText, alignStart(flip)]}>
                        <Text style={[text('rowValue'), alignText(flip)]} numberOfLines={1}>
                            {words.pending(summary.pendingBills.count)}
                        </Text>
                        <Text style={[text('caption', { color: color.text.secondary }), styles.tabular, alignText(flip)]} numberOfLines={1}>
                            {words.totalling(amount(summary.pendingBills.amount))}
                        </Text>
                    </View>
                    <View style={[styles.summaryCta, row(flip)]}>
                        <Text style={text('rowValue', { color: color.warning.fgStrong })}>{words.pay}</Text>
                        <PayChevron size={size.icon.sm} color={color.warning.fgStrong} strokeWidth={iconStroke} />
                    </View>
                </Pressable>
            ) : null}

            {/* Quick actions: four equal tiles; financing is marked for launch. */}
            <View style={styles.grid}>
                {[0, 1].map(rowIndex => (
                    <View key={rowIndex} style={[styles.gridRow, row(flip)]}>
                        {words.actions.slice(rowIndex * 2, rowIndex * 2 + 2).map(action => {
                            const featured = 'featured' in action && action.featured;
                            const { Icon } = action;
                            return (
                                <Pressable
                                    key={action.id}
                                    onPress={() => onQuickAction(action.message)}
                                    accessibilityRole="button"
                                    style={({ pressed }) => [
                                        styles.tile,
                                        row(flip),
                                        featured && styles.tileFeatured,
                                        featured && { borderColor: color.borderBrand, backgroundColor: color.brand[50] },
                                        pressed && { backgroundColor: featured ? color.brand[100] : color.surface2 },
                                    ]}
                                >
                                    <View style={[styles.tileIcon, { backgroundColor: featured ? color.brand[100] : color.brandTint.bg }]}>
                                        <Icon size={size.icon.md} color={color.brand[600]} strokeWidth={iconStroke} />
                                    </View>
                                    <Text style={[text('rowLabel', { fontWeight: '600', color: color.text.primary }), styles.tileLabel, alignText(flip)]} numberOfLines={2}>
                                        {action.label}
                                    </Text>
                                    {featured ? (
                                        <View style={[styles.badge, { backgroundColor: color.brand[600] }]}>
                                            <Text style={text('badge', { color: color.text.inverse })}>{words.newBadge}</Text>
                                        </View>
                                    ) : null}
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

/** A frosted stat inside the hero. */
function Stat({ label, value, flip }: { label: string; value: string; flip: boolean }) {
    return (
        <View style={[styles.stat, alignStart(flip)]}>
            <Text style={[text('caption', { color: instrument.onSurface }), alignText(flip)]} numberOfLines={1}>
                {label}
            </Text>
            <Text style={[styles.statValue, styles.tabular, alignText(flip)]} numberOfLines={1} adjustsFontSizeToFit>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: welcome.contentPadding,
        gap: welcome.sectionGap,
        paddingBottom: 24,
    },
    greeting: { alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
    heroInner: { flex: 1, justifyContent: 'space-between' },
    heroTop: { alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    eye: {
        width: size.iconBox.sm,
        height: size.iconBox.sm,
        borderRadius: size.iconBox.sm / 2,
        backgroundColor: instrument.frostFill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroAmount: { marginTop: 4 },
    heroHead: {
        fontSize: welcome.heroSize,
        lineHeight: welcome.heroLine,
        fontWeight: '700',
        color: instrument.onSurfaceStrong,
    },
    heroDecimals: {
        fontSize: welcome.heroDecimals,
        lineHeight: welcome.heroLine,
        fontWeight: '600',
        color: instrument.onSurface,
    },
    tabular: { fontVariant: ['tabular-nums'] },
    stats: { gap: 10 },
    stat: {
        flex: 1,
        gap: 2,
        padding: layout.rowGap,
        borderRadius: welcome.summaryRadius,
        backgroundColor: instrument.frostFill,
        borderWidth: 1,
        borderColor: instrument.frostBorder,
    },
    statValue: {
        fontSize: welcome.statSize,
        lineHeight: 22,
        fontWeight: '700',
        color: instrument.onSurfaceStrong,
    },
    summaryRow: {
        alignItems: 'center',
        gap: layout.rowGap,
        padding: layout.rowGap,
        borderRadius: welcome.summaryRadius,
        backgroundColor: color.warning.bg,
        borderWidth: 1,
        borderColor: color.warning.border,
    },
    summaryIcon: {
        width: size.iconBox.lg,
        height: size.iconBox.lg,
        borderRadius: size.iconBox.lg / 2,
        backgroundColor: color.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryText: { flex: 1, gap: 2 },
    summaryCta: { alignItems: 'center', gap: 2 },
    grid: { gap: layout.rowGap },
    gridRow: { gap: layout.rowGap },
    tile: {
        flex: 1,
        minHeight: welcome.tileMinHeight,
        alignItems: 'center',
        gap: layout.rowGap,
        paddingHorizontal: layout.rowGap,
        paddingVertical: layout.rowGap,
        borderRadius: welcome.tileRadius,
        borderWidth: 1,
        borderColor: color.border,
        backgroundColor: color.surface,
    },
    tileFeatured: { borderWidth: 1.5 },
    tileIcon: {
        width: welcome.iconSquare,
        height: welcome.iconSquare,
        borderRadius: welcome.tileRadius,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tileLabel: { flex: 1 },
    badge: {
        paddingHorizontal: 6,
        height: size.pill,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default WelcomeView;
