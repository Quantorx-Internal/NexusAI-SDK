import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, I18nManager } from 'react-native';
import { Sparkles, RotateCcw, FileText, HandCoins, Wallet, Clock, Receipt } from 'lucide-react-native';
import { color, layout, radius, size, text, iconStroke, Tone, toneSet, welcome } from '../../theme/tokens';
import { useLayoutRTL, row, alignText, alignStart } from '../../contexts/LayoutDirectionContext';
import { Locale } from '../../contexts/LocaleContext';
import { CURRENCY_WORD, plain } from './blocks/loanWords';
import { tenureLabel } from '../../lib/loans';

/**
 * Welcome · answer before you ask (design §8b).
 *
 * The assistant types out a short summary when the screen opens: the
 * balance, the month's spending and what is pending, with the amounts as
 * coloured tags the user can tap to ask about them. Under it, a stack of
 * three things it can do right now (pay every bill, a loan it has already
 * sized, analyse the month); tapping the stack shows the next one. "Replay"
 * types the summary again. Quick actions are pills; financing is filled.
 *
 * Digits stay Latin with the currency word after the number, as on every
 * card, so one system runs through the whole chat.
 */

/**
 * What the assistant can say. A null figure means that part did not load
 * from the server, and the summary leaves it out rather than guessing.
 */
export interface WelcomeSummary {
    totalBalance: number | null;
    /** How many accounts the balance adds up. */
    accounts?: number;
    monthlySpending: number | null;
    /** How many categories the spending card shows. */
    spendingCategories?: number;
    /** Bills with status pending, as the agent counts them. */
    pendingBills: { count: number; amount: number } | null;
    /** Bills past their due date, counted apart because they are the urgent ones. */
    overdueBills?: { count: number; amount: number } | null;
    activeCards: number | null;
    /** A loan the app already sized for this customer, for the stack. */
    loan?: { name: string; nameAr: string; upTo: number; monthly: number; months: number } | null;
}

interface WelcomeViewProps {
    /** Null while the snapshot is loading, or when nothing could be loaded. */
    summary: WelcomeSummary | null;
    /** The snapshot is still on its way: a skeleton instead of a summary. */
    loading?: boolean;
    locale: Locale;
    isRTL?: boolean;
    onQuickAction: (action: string) => void;
}

/** One piece of the typed summary: plain words, or a tag that asks about a figure. */
type Segment =
    | { kind: 'text'; text: string }
    | { kind: 'tag'; text: string; tone: Tone; message: string };

interface Suggestion {
    id: string;
    Icon: typeof FileText;
    tone: Tone;
    title: string;
    subtitle: string;
    cta: string;
    message: string;
}

/** Characters per second while the summary types. Fast enough to read along, slow enough to feel typed. */
const TYPING_CPS = 28;
const TYPING_START_MS = 350;

const arCount = (n: number, one: string, two: string, few: string, many: string) =>
    n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`;

function buildSegments(summary: WelcomeSummary | null, locale: Locale): Segment[] {
    const isAr = locale === 'ar';
    const currency = CURRENCY_WORD[locale];
    const name = isAr ? 'محمد' : 'Mohammed';
    const hasBalance = summary?.totalBalance != null;
    const hasSpending = summary?.monthlySpending != null;
    const bills = summary?.pendingBills ?? null;

    // Nothing loaded: a greeting, and the question. The figures come when they come.
    if (!summary || (!hasBalance && !hasSpending && !bills && !summary.overdueBills)) {
        return [{ kind: 'text', text: isAr ? `هلا ${name}. كيف أقدر أفيدك اليوم؟` : `Hello ${name}. How can I help you today?` }];
    }

    const overdue = summary.overdueBills ?? null;
    const balance = hasBalance ? `${plain(summary.totalBalance!, 2)} ${currency}` : '';
    const spending = hasSpending ? `${plain(summary.monthlySpending!)} ${currency}` : '';
    const billsAmount = bills ? `${plain(bills.amount)} ${currency}` : '';
    const overdueAmount = overdue ? `${plain(overdue.amount)} ${currency}` : '';

    if (isAr) {
        const segments: Segment[] = [{ kind: 'text', text: `هلا ${name}.` }];
        if (hasBalance) {
            segments.push({ kind: 'text', text: ' رصيدك ' }, { kind: 'tag', text: balance, tone: 'brandTint', message: 'اعرض رصيدي' });
        }
        if (hasSpending) {
            segments.push(
                { kind: 'text', text: hasBalance ? '، وصرفت ' : ' صرفت ' },
                { kind: 'tag', text: spending, tone: 'neutralTint', message: 'اعرض مصاريفي' },
                { kind: 'text', text: ' هالشهر.' }
            );
        } else if (hasBalance) {
            segments.push({ kind: 'text', text: '.' });
        }
        if (bills && bills.count > 0) {
            segments.push(
                { kind: 'text', text: ' عندك ' },
                { kind: 'tag', text: arCount(bills.count, 'فاتورة', 'فاتورتين', 'فواتير', 'فاتورة'), tone: 'warning', message: 'اعرض فواتيري' },
                { kind: 'text', text: ` معلّقة بـ ${billsAmount}` }
            );
            if (overdue && overdue.count > 0) {
                segments.push(
                    { kind: 'text', text: '، و' },
                    { kind: 'tag', text: arCount(overdue.count, 'فاتورة', 'فاتورتين', 'فواتير', 'فاتورة'), tone: 'danger', message: 'اعرض فواتيري المتأخرة' },
                    { kind: 'text', text: ` متأخرة بـ ${overdueAmount}` }
                );
            }
            segments.push({ kind: 'text', text: '، وأقدر أدفعها كلها الآن.' });
        } else if (overdue && overdue.count > 0) {
            segments.push(
                { kind: 'text', text: ' عندك ' },
                { kind: 'tag', text: arCount(overdue.count, 'فاتورة', 'فاتورتين', 'فواتير', 'فاتورة'), tone: 'danger', message: 'اعرض فواتيري المتأخرة' },
                { kind: 'text', text: ` متأخرة بـ ${overdueAmount}، وأقدر أدفعها الآن.` }
            );
        } else if (bills) {
            segments.push({ kind: 'text', text: ' ما عندك فواتير معلّقة.' });
        }
        return segments;
    }

    const segments: Segment[] = [{ kind: 'text', text: `Hello ${name}.` }];
    if (hasBalance) {
        segments.push({ kind: 'text', text: ' Your balance is ' }, { kind: 'tag', text: balance, tone: 'brandTint', message: 'Show my balance' });
    }
    if (hasSpending) {
        segments.push(
            { kind: 'text', text: hasBalance ? ', and you spent ' : ' You spent ' },
            { kind: 'tag', text: spending, tone: 'neutralTint', message: 'Show me my spending' },
            { kind: 'text', text: ' this month.' }
        );
    } else if (hasBalance) {
        segments.push({ kind: 'text', text: '.' });
    }
    if (bills && bills.count > 0) {
        segments.push(
            { kind: 'text', text: ' You have ' },
            { kind: 'tag', text: `${bills.count} ${bills.count === 1 ? 'bill' : 'bills'}`, tone: 'warning', message: 'Show me my bills' },
            { kind: 'text', text: ` pending, ${billsAmount} in all` }
        );
        if (overdue && overdue.count > 0) {
            segments.push(
                { kind: 'text', text: ', and ' },
                { kind: 'tag', text: `${overdue.count} overdue`, tone: 'danger', message: 'Show me my overdue bills' },
                { kind: 'text', text: ` worth ${overdueAmount}` }
            );
        }
        segments.push({ kind: 'text', text: ', and I can pay them now.' });
    } else if (overdue && overdue.count > 0) {
        segments.push(
            { kind: 'text', text: ' You have ' },
            { kind: 'tag', text: `${overdue.count} overdue ${overdue.count === 1 ? 'bill' : 'bills'}`, tone: 'danger', message: 'Show me my overdue bills' },
            { kind: 'text', text: ` worth ${overdueAmount}, and I can pay them now.` }
        );
    } else if (bills) {
        segments.push({ kind: 'text', text: ' Nothing is pending.' });
    }
    return segments;
}

function buildSuggestions(summary: WelcomeSummary, locale: Locale): Suggestion[] {
    const isAr = locale === 'ar';
    const currency = CURRENCY_WORD[locale];
    const out: Suggestion[] = [];
    const bills = summary.pendingBills;

    if (bills && bills.count > 0) {
        out.push({
            id: 'bills',
            Icon: FileText,
            tone: 'warning',
            title: isAr ? `ادفع ${arCount(bills.count, 'فاتورة', 'فاتورتين', 'فواتير', 'فاتورة')} بضغطة وحدة` : `Pay ${bills.count} bills in one tap`,
            subtitle: isAr
                ? `إجمالي ${plain(bills.amount, 2)} ${currency} من الحساب الرئيسي`
                : `${plain(bills.amount, 2)} ${currency} in all, from the Main Account`,
            cta: isAr ? 'ادفعها كلها' : 'Pay them all',
            message: isAr ? 'ادفع كل فواتيري المعلّقة' : 'Pay all my pending bills',
        });
    }
    if (summary.loan) {
        const { loan } = summary;
        const name = isAr ? loan.nameAr : loan.name;
        out.push({
            id: 'loan',
            Icon: HandCoins,
            tone: 'brandTint',
            title: isAr ? `${name} جاهز لك` : `A ${name} sized for you`,
            subtitle: isAr
                ? `حتى ${plain(loan.upTo)} ${currency} · القسط من ${plain(Math.round(loan.monthly))} ${currency} على ${tenureLabel(loan.months, 'ar')}`
                : `Up to ${plain(loan.upTo)} ${currency} · from ${plain(Math.round(loan.monthly))} ${currency} a month over ${tenureLabel(loan.months, 'en')}`,
            cta: isAr ? 'شوف التفاصيل' : 'See the details',
            message: isAr ? `أبي أشوف ${name}` : `Show me the ${name}`,
        });
    }
    if (summary.monthlySpending != null) {
        out.push({
            id: 'spending',
            Icon: Wallet,
            tone: 'brandTint',
            title: isAr ? 'حلّل مصاريف الشهر' : "Analyse this month's spending",
            subtitle: isAr
                ? `${plain(summary.monthlySpending)} ${currency}${summary.spendingCategories ? ` في ${arCount(summary.spendingCategories, 'فئة', 'فئتين', 'فئات', 'فئة')}` : ''}`
                : `${plain(summary.monthlySpending)} ${currency}${summary.spendingCategories ? ` across ${summary.spendingCategories} categories` : ''}`,
            cta: isAr ? 'حلّلها' : 'Analyse it',
            message: isAr ? 'حلّل مصاريفي هالشهر' : 'Analyse my spending this month',
        });
    }
    return out;
}

const QUICK = {
    ar: [
        { id: 'spending', label: 'مصاريفي', Icon: Wallet, message: 'أبي أشوف مصاريفي' },
        { id: 'activity', label: 'حركاتي', Icon: Clock, message: 'وش آخر حركاتي؟' },
        { id: 'bills', label: 'فواتيري', Icon: Receipt, message: 'أبي أدفع فواتيري' },
        { id: 'loans', label: 'تمويل', Icon: HandCoins, message: 'أبي تمويل', filled: true },
    ],
    en: [
        { id: 'spending', label: 'My spending', Icon: Wallet, message: 'Show me my spending' },
        { id: 'activity', label: 'Activity', Icon: Clock, message: 'Show my recent transactions' },
        { id: 'bills', label: 'My bills', Icon: Receipt, message: 'Show me my bills' },
        { id: 'loans', label: 'Financing', Icon: HandCoins, message: 'I want financing', filled: true },
    ],
} as const;

const WORDS = {
    ar: { summaryTitle: 'ملخصك قبل ما تسأل', replay: 'أعد', canDo: 'أقدر أسويها لك الآن', next: 'التالي', of: (i: number, n: number) => `${i} / ${n}` },
    en: { summaryTitle: 'Your summary, before you ask', replay: 'Replay', canDo: 'I can do these for you now', next: 'Next', of: (i: number, n: number) => `${i} / ${n}` },
} as const;

export function WelcomeView({ summary, loading = false, locale, isRTL = false, onQuickAction }: WelcomeViewProps) {
    const words = WORDS[locale];
    const flip = useLayoutRTL();
    const segments = useMemo(() => (loading ? [] : buildSegments(summary, locale)), [summary, locale, loading]);
    const suggestions = useMemo(() => (summary ? buildSuggestions(summary, locale) : []), [summary, locale]);
    const total = useMemo(() => segments.reduce((n, s) => n + s.text.length, 0), [segments]);

    // Typing: one counter over every character; a tag appears whole once reached.
    const [typed, setTyped] = useState(0);
    const [run, setRun] = useState(0);
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        setTyped(0);
        const start = setTimeout(() => {
            timer.current = setInterval(() => {
                setTyped(n => {
                    if (n + 1 >= total && timer.current) {
                        clearInterval(timer.current);
                        timer.current = null;
                    }
                    return Math.min(total, n + 1);
                });
            }, 1000 / TYPING_CPS);
        }, TYPING_START_MS);
        return () => {
            clearTimeout(start);
            if (timer.current) clearInterval(timer.current);
            timer.current = null;
        };
    }, [total, run]);
    const replay = useCallback(() => setRun(r => r + 1), []);
    const done = typed >= total;

    const [index, setIndex] = useState(0);
    const current = suggestions[index % Math.max(suggestions.length, 1)];
    const next = useCallback(() => setIndex(i => (i + 1) % Math.max(suggestions.length, 1)), [suggestions.length]);

    return (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Title row: what this is, and replay. */}
            <View style={[styles.titleRow, row(flip)]}>
                <View style={[styles.title, row(flip)]}>
                    <Sparkles size={size.icon.sm} color={color.brand[600]} strokeWidth={iconStroke} />
                    <Text style={text('rowLabel', { fontWeight: '600', color: color.brand[600] })}>{words.summaryTitle}</Text>
                </View>
                <Pressable
                    onPress={replay}
                    disabled={!done}
                    accessibilityRole="button"
                    accessibilityLabel={words.replay}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={({ pressed }) => [styles.replay, row(flip), (pressed || !done) && { opacity: 0.5 }]}
                >
                    <RotateCcw size={size.icon.xs} color={color.text.tertiary} strokeWidth={iconStroke} />
                    <Text style={text('caption')}>{words.replay}</Text>
                </Pressable>
            </View>

            {/* The summary, typed. Words are laid out as tokens so the tags can sit inline. */}
            {loading ? (
                <View style={styles.skeleton} accessibilityRole="progressbar">
                    <View style={[styles.skeletonLine, { width: '92%' }]} />
                    <View style={[styles.skeletonLine, { width: '78%' }]} />
                    <View style={[styles.skeletonLine, { width: '60%' }]} />
                </View>
            ) : (
                <TypedSummary segments={segments} typed={typed} flip={flip} onTag={onQuickAction} />
            )}

            {/* The stack: three things the assistant can do now. */}
            {suggestions.length > 0 && current ? (
                <View style={styles.stackSection}>
                    <View style={[styles.stackHeader, row(flip)]}>
                        <Text style={text('caption')}>{words.canDo}</Text>
                        <Text style={[text('caption'), styles.tabular]}>{words.of(index + 1, suggestions.length)}</Text>
                    </View>
                    <View style={styles.stack}>
                        {suggestions.length > 2 ? <View style={[styles.stackGhost, styles.stackGhostFar]} /> : null}
                        {suggestions.length > 1 ? <View style={[styles.stackGhost, styles.stackGhostNear]} /> : null}
                        <Pressable
                            onPress={next}
                            accessibilityRole="button"
                            style={[styles.card, { borderColor: toneSet(current.tone).border }]}
                        >
                            <View style={[styles.cardHeader, row(flip)]}>
                                <View style={[styles.cardIcon, { backgroundColor: toneSet(current.tone).bg }]}>
                                    <current.Icon size={size.icon.lg} color={toneSet(current.tone).fg} strokeWidth={iconStroke} />
                                </View>
                                <View style={[styles.cardText, alignStart(flip)]}>
                                    <Text style={[text('cardTitle'), alignText(flip)]} numberOfLines={2}>
                                        {current.title}
                                    </Text>
                                    <Text style={[text('rowLabel'), styles.tabular, alignText(flip)]} numberOfLines={2}>
                                        {current.subtitle}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.cardActions, row(flip)]}>
                                <Pressable
                                    onPress={() => onQuickAction(current.message)}
                                    accessibilityRole="button"
                                    style={({ pressed }) => [styles.cta, { backgroundColor: pressed ? color.brand[700] : color.brand[600] }]}
                                >
                                    <Text style={text('button', { color: color.text.inverse })}>{current.cta}</Text>
                                </Pressable>
                                {suggestions.length > 1 ? (
                                    <Pressable onPress={next} accessibilityRole="button" style={styles.nextButton}>
                                        <Text style={text('button', { color: color.text.secondary })}>{words.next}</Text>
                                    </Pressable>
                                ) : null}
                            </View>
                        </Pressable>
                    </View>
                </View>
            ) : null}

            {/* Quick actions: pills, financing filled. */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.pills, row(flip)]}
                keyboardShouldPersistTaps="handled"
            >
                {QUICK[locale].map(action => {
                    const filled = 'filled' in action && action.filled;
                    const { Icon } = action;
                    return (
                        <Pressable
                            key={action.id}
                            onPress={() => onQuickAction(action.message)}
                            accessibilityRole="button"
                            style={({ pressed }) => [
                                styles.pill,
                                row(flip),
                                filled
                                    ? { backgroundColor: pressed ? color.brand[700] : color.brand[600], borderColor: 'transparent' }
                                    : pressed && { backgroundColor: color.surface2 },
                            ]}
                        >
                            <Icon size={size.icon.sm} color={filled ? color.text.inverse : color.brand[600]} strokeWidth={iconStroke} />
                            <Text style={text('button', { color: filled ? color.text.inverse : color.text.primary })}>{action.label}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </ScrollView>
    );
}

/**
 * The summary as a wrapping row of word tokens, so the tags render as real
 * pressable pills between words. Typing reveals characters left to right
 * through the segments; a tag shows whole as soon as its first character is
 * reached, so it never appears half-written.
 */
function TypedSummary({
    segments,
    typed,
    flip,
    onTag,
}: {
    segments: Segment[];
    typed: number;
    flip: boolean;
    onTag: (message: string) => void;
}) {
    const tokens: React.ReactNode[] = [];
    let offset = 0;
    segments.forEach((segment, si) => {
        const start = offset;
        offset += segment.text.length;
        if (typed <= start) return;
        if (segment.kind === 'tag') {
            const set = toneSet(segment.tone);
            tokens.push(
                <Pressable
                    key={`t${si}`}
                    onPress={() => onTag(segment.message)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                        styles.tag,
                        { backgroundColor: set.bg, borderColor: set.border },
                        pressed && { opacity: 0.7 },
                    ]}
                >
                    <Text style={[styles.tagText, styles.tabular, { color: set.fg }]}>{segment.text}</Text>
                </Pressable>
            );
            return;
        }
        const visible = segment.text.slice(0, Math.max(0, typed - start));
        // Keep punctuation glued to its word; split only on spaces.
        visible.split(' ').forEach((word, wi, all) => {
            if (!word) return;
            tokens.push(
                <Text key={`w${si}-${wi}`} style={styles.word}>
                    {word}
                </Text>
            );
            void all;
        });
    });

    return (
        <View style={[styles.summary, row(flip), flip ? { justifyContent: 'flex-start' } : null]} accessibilityRole="text">
            {tokens}
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: welcome.contentPadding,
        gap: welcome.sectionGap,
        paddingBottom: 24,
    },
    titleRow: { alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    title: { alignItems: 'center', gap: 6 },
    replay: { alignItems: 'center', gap: 4 },
    summary: {
        flexWrap: 'wrap',
        alignItems: 'center',
        columnGap: 6,
        rowGap: 8,
        minHeight: welcome.summaryLine * 3,
    },
    word: {
        fontSize: welcome.summarySize,
        lineHeight: welcome.summaryLine,
        fontWeight: '500',
        color: color.text.primary,
    },
    tag: {
        height: welcome.summaryLine - 6,
        paddingHorizontal: 10,
        borderRadius: radius.pill,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tagText: {
        fontSize: welcome.summarySize - 4,
        lineHeight: welcome.summaryLine - 8,
        fontWeight: '600',
    },
    tabular: { fontVariant: ['tabular-nums'] },
    skeleton: { gap: 12, minHeight: welcome.summaryLine * 3, justifyContent: 'center' },
    skeletonLine: { height: welcome.summaryLine - 14, borderRadius: radius.inner, backgroundColor: color.surface3 },
    stackSection: { gap: 8 },
    stackHeader: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
    stack: { paddingBottom: 12 },
    stackGhost: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 40,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: color.border,
        backgroundColor: color.surface,
    },
    stackGhostNear: { left: 8, right: 8, bottom: 6 },
    stackGhostFar: { left: 16, right: 16, bottom: 0, opacity: 0.6 },
    card: {
        backgroundColor: color.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        padding: layout.cardPadding,
        gap: layout.sectionGap,
    },
    cardHeader: { alignItems: 'flex-start', gap: layout.rowGap },
    cardIcon: {
        width: size.iconBox.lg + 8,
        height: size.iconBox.lg + 8,
        borderRadius: radius.inner,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardText: { flex: 1, gap: 2 },
    cardActions: { alignItems: 'center', gap: 8 },
    cta: {
        flex: 1,
        height: size.buttonPrimary,
        borderRadius: radius.button,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextButton: {
        height: size.buttonPrimary,
        paddingHorizontal: 14,
        borderRadius: radius.button,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pills: { gap: 8, paddingVertical: 2 },
    pill: {
        height: size.buttonPrimary + 4,
        paddingHorizontal: 16,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: color.border,
        backgroundColor: color.surface,
        alignItems: 'center',
        gap: 8,
    },
});

export default WelcomeView;
