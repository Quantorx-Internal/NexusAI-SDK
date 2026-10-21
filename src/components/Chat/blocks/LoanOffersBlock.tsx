import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { Card, StatusPill, IconBox, iconOn, EmptyState } from '../../ui';
import { color, border, layout, loan, radius, size, text, iconStroke, Tone, toneSet } from '../../../theme/tokens';
import { tenureLabel } from '../../../lib/loans';
import { LoanOption, LoanOptionsUI } from '../../../types';
import { productVisual } from './productVisuals';
import { CURRENCY_WORD, LOAN_LIST_WORDS, LoanLocale, money, plain } from './loanWords';
import { useLayoutRTL, row, alignText, alignStart, alignEnd } from '../../../contexts/LayoutDirectionContext';

/**
 * Family D · LoanOffers — the loans the user can apply for (design §5a).
 *
 * Information, not a decision: a neutral hairline card. The best fit sits on
 * top as a white block with the 1.5 brand-300 border (the "selected"
 * treatment), leading with the estimated installment, which is the number
 * that decides affordability. The rest are 60pt rows to compare at a glance:
 * name and terms on one side, how far the user's month carries it on the
 * other. Fit is one semantic dot + word, the same StatusPill grammar as
 * bills; the old green range bar read as a budget meter and is gone.
 *
 * Loans the user cannot have yet sit under their own label, dimmed, with the
 * condition as the meta line and nothing to press.
 */

interface LoanOffersBlockProps {
    options: LoanOptionsUI;
    locale?: LoanLocale;
    /** The newest reply: tapping a loan opens its card. Older lists are for reading. */
    live?: boolean;
    /** The loan the user already opened from this list. */
    chosen?: string;
    /** A request is in flight. */
    disabled?: boolean;
    onOpen?: (productId: string) => void;
}

type FitKey = 'comfortable' | 'tight' | 'risky' | 'unknown';

const FIT_TONE: Record<FitKey, Tone> = {
    comfortable: 'success',
    tight: 'warning',
    risky: 'danger',
    unknown: 'neutralTint',
};

const fitOf = (option: LoanOption): FitKey =>
    !option.loanCard ? 'unknown' : option.reach ? option.reach.fit : 'risky';

/** The figures the featured block leads with: the reach over the longest term, else the product's usual plan. */
function featuredPlan(option: LoanOption) {
    const { reach } = option;
    if (reach) return { amount: reach.amount, months: reach.months, monthly: reach.monthly };
    return null;
}

export function LoanOffersBlock({
    options,
    locale = 'en',
    live = true,
    chosen,
    disabled = false,
    onOpen,
}: LoanOffersBlockProps) {
    const words = LOAN_LIST_WORDS[locale];
    const { available, unavailable } = options;
    const featured = available.find(o => o.product.id === options.featured) ?? null;
    const others = available.filter(o => o !== featured);
    const open = live && !disabled && !chosen && onOpen ? onOpen : undefined;
    const flip = useLayoutRTL();

    return (
        <Card variant="info">
            <View style={[styles.header, row(flip)]}>
                <Text style={[text('cardTitle'), styles.title, alignText(flip)]} numberOfLines={1}>
                    {words.title}
                </Text>
                {available.length > 0 ? <Text style={text('caption')}>{words.count(available.length)}</Text> : null}
            </View>
            <Text style={[text('body', { color: color.text.secondary }), styles.subtitle, alignText(flip)]}>
                {available.length ? words.subtitle : words.noneNote}
            </Text>

            {available.length === 0 ? (
                <View style={styles.section}>
                    <EmptyState title={words.none} />
                </View>
            ) : null}

            {featured ? (
                <Featured
                    option={featured}
                    locale={locale}
                    opened={chosen === featured.product.id}
                    onOpen={open ? () => open(featured.product.id) : undefined}
                />
            ) : null}

            {others.length > 0 ? (
                <View style={styles.section}>
                    {featured ? <Text style={[text('caption'), styles.sectionLabel, alignText(flip)]}>{words.others}</Text> : null}
                    <View>
                        {others.map((option, index) => (
                            <React.Fragment key={option.product.id}>
                                {index > 0 ? <View style={styles.divider} /> : null}
                                <Row
                                    option={option}
                                    locale={locale}
                                    opened={chosen === option.product.id}
                                    onOpen={open ? () => open(option.product.id) : undefined}
                                />
                            </React.Fragment>
                        ))}
                    </View>
                </View>
            ) : null}

            {unavailable.length > 0 ? (
                <View style={styles.section}>
                    <Text style={[text('caption'), styles.sectionLabel, alignText(flip)]}>{words.unavailable}</Text>
                    <View>
                        {unavailable.map((option, index) => (
                            <React.Fragment key={option.product.id}>
                                {index > 0 ? <View style={styles.divider} /> : null}
                                <Row option={option} locale={locale} opened={false} blocked />
                            </React.Fragment>
                        ))}
                    </View>
                </View>
            ) : null}

            <Text style={[text('caption'), styles.disclaimer, alignText(flip)]}>{words.disclaimer}</Text>
        </Card>
    );
}

interface ItemProps {
    option: LoanOption;
    locale: LoanLocale;
    opened: boolean;
    /** Absent once the list is answered or old: the item is for reading. */
    onOpen?: () => void;
}

/** The loan the advisor points to: the installment it would cost, and the terms. */
function Featured({ option, locale, opened, onOpen }: ItemProps) {
    const words = LOAN_LIST_WORDS[locale];
    const { product } = option;
    const name = (locale === 'ar' ? product.nameAr : product.name) || product.name;
    const benefit = locale === 'ar' ? product.benefitAr : product.benefit;
    const { Icon } = productVisual(product);
    const plan = featuredPlan(option);
    const fit = fitOf(option);
    const inYears = plan ? plan.months % 12 === 0 : false;
    const flip = useLayoutRTL();

    return (
        <Pressable
            disabled={!onOpen}
            onPress={onOpen}
            accessibilityRole={onOpen ? 'button' : undefined}
            style={({ pressed }) => [styles.featured, { borderColor: color.borderBrand }, pressed && onOpen && styles.featuredPressed]}
        >
            <View style={[styles.featuredHeader, row(flip)]}>
                <IconBox box={size.iconBox.lg} background={color.brand[600]}>
                    <Icon size={size.icon.lg} color={color.text.inverse} strokeWidth={iconStroke} />
                </IconBox>
                <View style={[styles.featuredTitles, alignStart(flip)]}>
                    <Text style={[text('cardTitle'), alignText(flip)]} numberOfLines={1}>
                        {name}
                    </Text>
                    {benefit ? (
                        <Text style={[text('caption'), alignText(flip)]} numberOfLines={2}>
                            {benefit}
                        </Text>
                    ) : null}
                </View>
                {opened ? (
                    <Check size={size.icon.sm} color={color.success.fg} strokeWidth={iconStroke} />
                ) : (
                    <StatusPill label={words.featured} tone="brandTint" />
                )}
            </View>

            {plan ? (
                <View style={[styles.estimate, row(flip)]}>
                    <View style={[styles.estimateColumn, alignStart(flip)]}>
                        <Text style={text('caption')}>{words.estimated}</Text>
                        <Text numberOfLines={1}>
                            <Text style={[text('amount'), styles.tabular]}>{plain(Math.round(plan.monthly))}</Text>
                            <Text style={text('caption')}>{` ${CURRENCY_WORD[locale]} ${words.perMonth}`}</Text>
                        </Text>
                    </View>
                    <View style={[styles.estimateColumn, alignStart(flip)]}>
                        <Text style={text('caption')}>{words.amount}</Text>
                        <Text style={[text('rowValue'), styles.tabular, alignText(flip)]} numberOfLines={2}>
                            {money(plan.amount, locale)} · {tenureLabel(plan.months, locale, inYears)}
                        </Text>
                    </View>
                </View>
            ) : null}

            <View style={[styles.featuredFooter, alignStart(flip)]}>
                <FitWord fit={fit} label={fit === 'unknown' ? words.onRequest : words.fitLong[fit]} />
                <Text style={[text('caption'), alignText(flip)]} numberOfLines={1}>
                    {[option.rate[locale], option.tenure[locale]].filter(Boolean).join(' · ')}
                </Text>
            </View>
        </Pressable>
    );
}

/** A loan to compare: name and terms on one side, how far the month carries it on the other. */
function Row({ option, locale, opened, onOpen, blocked = false }: ItemProps & { blocked?: boolean }) {
    const words = LOAN_LIST_WORDS[locale];
    const { product } = option;
    const name = (locale === 'ar' ? product.nameAr : product.name) || product.name;
    const { Icon } = productVisual(product);
    const fit = fitOf(option);
    const meta = blocked
        ? option.blockers.map(b => b[locale]).join(' · ')
        : [option.rate[locale], option.tenure[locale]].filter(Boolean).join(' · ');
    const flip = useLayoutRTL();

    return (
        <Pressable
            disabled={!onOpen}
            onPress={onOpen}
            accessibilityRole={onOpen ? 'button' : undefined}
            style={({ pressed }) => [styles.row, row(flip), pressed && onOpen && styles.rowPressed, blocked && styles.rowBlocked]}
        >
            <IconBox box={size.iconBox.md} tone="brandTint">
                <Icon size={size.icon.md} color={iconOn('brandTint')} strokeWidth={iconStroke} />
            </IconBox>
            <View style={[styles.rowText, alignStart(flip)]}>
                <Text style={[text('rowValue'), alignText(flip)]} numberOfLines={1}>
                    {name}
                </Text>
                <Text style={[text('caption'), alignText(flip)]} numberOfLines={2}>
                    {meta}
                </Text>
            </View>
            {!blocked ? (
                <View style={[styles.rowEnd, alignEnd(flip)]}>
                    {opened ? (
                        <Check size={size.icon.sm} color={color.success.fg} strokeWidth={iconStroke} />
                    ) : (
                        <>
                            <Text style={[text('rowValue'), styles.tabular]} numberOfLines={1}>
                                {option.reach
                                    ? `${words.upTo} ${plain(option.reach.amount)}`
                                    : option.loanCard
                                        ? words.fit.risky
                                        : words.onRequest}
                            </Text>
                            <FitWord fit={fit} label={fit === 'risky' && !option.reach ? '' : words.fit[fit]} />
                        </>
                    )}
                </View>
            ) : null}
        </Pressable>
    );
}

/** One semantic dot + word: the fit, in the StatusPill grammar without the pill. */
function FitWord({ fit, label }: { fit: FitKey; label: string }) {
    const flip = useLayoutRTL();
    if (!label) return null;
    const set = toneSet(FIT_TONE[fit]);
    return (
        <View style={[styles.fitWord, row(flip)]}>
            <View style={[styles.fitDot, { backgroundColor: set.fg }]} />
            <Text style={text('badge', { color: set.fg })} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 8,
    },
    title: { flexShrink: 1 },
    subtitle: { marginTop: 2, marginBottom: layout.sectionGap },
    section: { marginTop: layout.sectionGap },
    sectionLabel: { marginBottom: 4 },
    featured: {
        backgroundColor: color.surface,
        borderWidth: border.decision,
        borderColor: color.borderBrand,
        borderRadius: radius.inner,
        padding: loan.featuredPadding,
        gap: layout.rowGap,
    },
    featuredPressed: { backgroundColor: color.surface2 },
    featuredHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: layout.rowGap },
    featuredTitles: { flex: 1, gap: 2 },
    estimate: {
        flexDirection: 'row',
        gap: layout.rowGap,
        backgroundColor: color.surface2,
        borderRadius: radius.inner,
        padding: layout.rowGap,
    },
    estimateColumn: { flex: 1, gap: 2 },
    featuredFooter: { gap: 4 },
    row: {
        minHeight: loan.row,
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.rowGap,
        paddingVertical: 8,
    },
    rowPressed: { backgroundColor: color.surface2, borderRadius: radius.inner },
    rowBlocked: { opacity: 0.6 },
    // The name column shrinks; the figures column never does, so a narrow
    // screen truncates the name, not the amount.
    rowText: { flex: 1, minWidth: 0, gap: 2 },
    rowEnd: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
    divider: { height: border.hairline, backgroundColor: color.surface3 },
    fitWord: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    fitDot: { width: 6, height: 6, borderRadius: 3 },
    tabular: { fontVariant: ['tabular-nums'] },
    disclaimer: { marginTop: layout.sectionGap },
});

export default LoanOffersBlock;
