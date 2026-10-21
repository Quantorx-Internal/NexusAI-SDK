import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Check, Sparkles } from 'lucide-react-native';
import { Card, DetailRow, StatusPill, IconBox, Button, AffordabilityBar, Adjuster, InlineAlert } from '../../ui';
import type { AdjusterTick } from '../../ui';
import { color, layout, loan, radius, size, text, iconStroke } from '../../../theme/tokens';
import { adviseLoan, quoteLoan, rateLabel, tenureLabel } from '../../../lib/loans';
import { ChatResolution, LoanOfferUI, LoanTerms } from '../../../types';
import { CURRENCY_WORD, LOAN_WORDS, LoanLocale, compact, money, splitPlain, stamp } from './loanWords';
import { useLayoutRTL, row, alignText, alignStart, alignEnd } from '../../../contexts/LayoutDirectionContext';

/**
 * Family B · LoanPlan — a decision the user is about to submit (design §5b, §5c).
 *
 * Signal: the 1.5 brand-300 border and the "before you apply" pill, like
 * every Family B preview, because the CTA submits an application. The
 * installment is the hero; the affordability bar under it says what the
 * installment does to the month; the adjusters let the user shape the plan
 * and watch the figures follow, with no round trip, from the same arithmetic
 * the server quotes to the agent. The advisor's note sits below the
 * adjusters so the sliders never move under the user's thumb.
 *
 * Submitted, the CTA becomes a success strip with the timestamp, the pill
 * flips, and the card stays readable as a record. The TicketCreated receipt
 * follows as its own Family C card.
 */

export interface LoanPlanChoice {
    productId: string;
    amount: number;
    months: number;
}

export interface AdvisorAsk extends LoanPlanChoice {
    /** The plan the user moved away from, so the remark can speak to the change. */
    from: { amount: number; months: number } | null;
}

/** Ask the advisor for a remark on a plan. Null when there is none to give. */
export type AskAdvisor = (ask: AdvisorAsk, signal: AbortSignal) => Promise<string | null>;

interface LoanPlanBlockProps {
    offer: LoanOfferUI;
    locale?: LoanLocale;
    /** The newest reply: the adjusters and the CTA are live. Older cards are read-only. */
    live?: boolean;
    /** How the user answered this card: pending, done or failed, with the terms. */
    resolution?: ChatResolution;
    onApply?: (choice: LoanPlanChoice) => void;
    /** The advisor, for a remark when the user settles on a new plan. */
    askAdvisor?: AskAdvisor;
    /** The remark to show before the advisor has spoken, written from the figures. */
    localRemark?: (amount: number, months: number) => string | null;
}

/** How long the sliders must rest before the advisor speaks. A drag in progress is not a choice. */
const ADVISE_AFTER_MS = 800;

/** Up to six tenures worth marking under the slider: every quarter, half year, year or five. */
function tenureMarks(terms: LoanTerms): number[] {
    for (const step of [3, 6, 12, 24, 60, 120]) {
        if (step % terms.monthsStep) continue;
        const marks: number[] = [];
        for (let m = Math.ceil(terms.minMonths / step) * step; m <= terms.maxMonths; m += step) marks.push(m);
        if (marks.length >= 2 && marks.length <= 6) return marks;
    }
    return [terms.minMonths, terms.maxMonths];
}

export function LoanPlanBlock({
    offer,
    locale = 'en',
    live = true,
    resolution,
    onApply,
    askAdvisor,
    localRemark,
}: LoanPlanBlockProps) {
    const words = LOAN_WORDS[locale];
    const { product, terms, budget } = offer;
    const [amount, setAmount] = useState(offer.amount);
    const [months, setMonths] = useState(offer.months);

    const submitted = resolution?.status === 'done';
    const pending = resolution?.status === 'pending';
    const failed = resolution?.status === 'failed';
    const editable = live && !submitted && !pending && Boolean(onApply);

    // The terms on show: the ones applied with, else the sliders, else the agent's.
    const shown = resolution?.loan ?? (live ? { amount, months } : { amount: offer.amount, months: offer.months });
    const quote = quoteLoan(terms, shown.amount, shown.months);
    const advice = budget ? adviseLoan(terms, shown.amount, shown.months, budget) : null;

    const name = (locale === 'ar' ? product.nameAr : product.name) || product.name;
    const inYears = terms.monthsStep % 12 === 0;
    const tenure = (m: number) => tenureLabel(m, locale, inYears || m % 12 === 0);

    // The advisor's remarks, by plan, so dragging back to a plan does not ask
    // again. The plan it last spoke about starts as the agent's: the chat
    // message under which the card sits already covers that one.
    const [remarks, setRemarks] = useState<Record<string, string>>({});
    /** The plan the advisor is being asked about right now, so the card can show it thinking. */
    const [asking, setAsking] = useState<string | null>(null);
    const spokenAbout = useRef({ amount: offer.amount, months: offer.months });
    const planKey = `${shown.amount}-${shown.months}`;

    useEffect(() => {
        if (!editable || !askAdvisor || !budget) return;
        const from = spokenAbout.current;
        if (from.amount === amount && from.months === months) return;
        const key = `${amount}-${months}`;
        if (remarks[key]) {
            spokenAbout.current = { amount, months };
            return;
        }

        const request = new AbortController();
        const timer = setTimeout(async () => {
            setAsking(key);
            const said = await askAdvisor({ productId: product.id, amount, months, from }, request.signal).catch(() => null);
            if (request.signal.aborted) return;
            spokenAbout.current = { amount, months };
            setAsking(current => (current === key ? null : current));
            if (said) setRemarks(all => ({ ...all, [key]: said }));
        }, ADVISE_AFTER_MS);

        // The user moved again: that plan is no longer the question.
        return () => {
            clearTimeout(timer);
            request.abort();
            setAsking(current => (current === key ? null : current));
        };
    }, [amount, months, editable, askAdvisor, budget, product.id, remarks]);

    const remark = live && budget
        ? remarks[planKey] ?? localRemark?.(shown.amount, shown.months) ?? null
        : null;
    // The advisor is weighing this very plan: show it thinking rather than the
    // app's own line, so the wait reads as something worth waiting for.
    const thinking = editable && asking === planKey && !remarks[planKey];

    const amountTicks = useMemo<AdjusterTick[]>(
        () => [
            { value: terms.minAmount, label: compact(terms.minAmount, locale) },
            { value: terms.maxAmount, label: compact(terms.maxAmount, locale) },
        ],
        [terms.minAmount, terms.maxAmount, locale]
    );
    const tenureTicks = useMemo<AdjusterTick[]>(() => {
        const marks = tenureMarks(terms);
        return marks.map((m, i) => {
            const yearly = m % 12 === 0 && (inYears || terms.maxMonths >= 24);
            const last = i === marks.length - 1;
            return { value: m, label: last ? tenure(m) : String(yearly ? m / 12 : m) };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terms, inYears, locale]);

    const hero = splitPlain(quote.monthly);
    const flip = useLayoutRTL();
    const dim = pending ? { opacity: loan.recalculatingOpacity } : null;
    const fees = quote.fee ? money(quote.fee, locale, 2) : words.noFees;

    return (
        <Card variant={submitted || !live ? 'info' : 'decision'}>
            <View style={[styles.header, row(flip)]}>
                <Text style={[text('cardTitle'), alignText(flip)]} numberOfLines={1}>
                    {name}
                </Text>
                {submitted ? (
                    <StatusPill
                        label={words.applied}
                        tone="success"
                        icon={<Check size={11} color={color.success.fg} strokeWidth={iconStroke} />}
                    />
                ) : (
                    <StatusPill label={words.beforeApply} tone="brandTint" />
                )}
            </View>

            {/* The number the user is shaping. */}
            <View style={[styles.hero, alignStart(flip), dim]}>
                <Text style={text('caption')}>{words.monthly}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit>
                    <Text style={[text('hero'), styles.tabular]}>{hero.head}</Text>
                    <Text style={[text('hero', { fontSize: loan.heroDecimals, color: color.text.secondary }), styles.tabular]}>
                        {hero.decimals}
                    </Text>
                    <Text style={text('caption')}>{` ${CURRENCY_WORD[locale]}`}</Text>
                </Text>
                <Text style={[text('caption'), styles.tabular]} numberOfLines={1}>
                    {money(shown.amount, locale)} · {tenure(shown.months)}
                </Text>
            </View>

            {budget && advice ? (
                <View style={[styles.section, dim]}>
                    <AffordabilityBar budget={budget} monthly={quote.monthly} advice={advice} labels={words} />
                </View>
            ) : null}

            {editable ? (
                <View style={[styles.section, styles.adjusters]}>
                    <Adjuster
                        label={words.amount}
                        value={amount}
                        display={money(amount, locale)}
                        min={terms.minAmount}
                        max={terms.maxAmount}
                        step={terms.amountStep}
                        ticks={amountTicks}
                        lessLabel={words.less}
                        moreLabel={words.more}
                        onChange={setAmount}
                    />
                    <Adjuster
                        label={words.tenure}
                        value={months}
                        display={tenure(months)}
                        min={terms.minMonths}
                        max={terms.maxMonths}
                        step={terms.monthsStep}
                        ticks={tenureTicks}
                        lessLabel={words.less}
                        moreLabel={words.more}
                        onChange={setMonths}
                    />
                </View>
            ) : null}

            {remark || thinking ? (
                <View style={[styles.section, styles.advisor, row(flip)]}>
                    <IconBox box={loan.advisorIcon} tone="brandTint" style={styles.advisorIcon}>
                        <Sparkles size={size.icon.xs} color={color.brand[600]} strokeWidth={iconStroke} />
                    </IconBox>
                    <View style={[styles.advisorText, alignStart(flip)]}>
                        <Text style={[text('caption', { color: color.brand[600], fontWeight: '600' }), alignText(flip)]}>{words.advisor}</Text>
                        {thinking ? (
                            <View style={[styles.thinking, row(flip)]} accessibilityRole="progressbar" accessibilityLabel={words.thinking}>
                                <ActivityIndicator size="small" color={color.brand[600]} />
                                <Text style={[text('rowLabel'), alignText(flip)]}>{words.thinking}</Text>
                            </View>
                        ) : (
                            <Text style={[text('rowLabel', { color: color.text.primary }), alignText(flip)]}>{remark}</Text>
                        )}
                    </View>
                </View>
            ) : null}

            <View style={[styles.section, styles.terms, dim]}>
                {!editable ? (
                    <>
                        <DetailRow label={words.amount} value={money(shown.amount, locale, 2)} />
                        <DetailRow label={words.tenure} value={tenure(shown.months)} />
                    </>
                ) : null}
                <DetailRow label={words.rate} value={rateLabel(terms, locale)} />
                <DetailRow label={words.cost} value={money(quote.interest, locale, 2)} />
                <DetailRow label={words.fees} value={fees} />
                <DetailRow label={words.total} value={money(quote.totalPayable, locale, 2)} total />
            </View>

            {failed ? (
                <View style={styles.section}>
                    <InlineAlert message={words.failed} />
                </View>
            ) : null}

            {submitted ? (
                <View style={[styles.section, styles.doneStrip, row(flip)]}>
                    <Check size={size.icon.xs} color={color.success.fg} strokeWidth={iconStroke} />
                    <Text style={text('caption', { color: color.success.fg, fontWeight: '600' })} numberOfLines={1}>
                        {resolution?.at ? words.appliedAt(stamp(resolution.at, locale)) : words.applied}
                    </Text>
                </View>
            ) : editable || pending ? (
                <View style={styles.section}>
                    <Button
                        label={words.apply}
                        kind="primary"
                        working={pending}
                        onPress={() => onApply?.({ productId: product.id, amount, months })}
                    />
                </View>
            ) : null}

            <Text style={[text('caption'), styles.disclaimer, alignText(flip)]}>{words.disclaimer}</Text>
        </Card>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: layout.sectionGap,
    },
    hero: { gap: 2 },
    tabular: { fontVariant: ['tabular-nums'] },
    section: { marginTop: layout.sectionGap },
    adjusters: { gap: layout.sectionGap },
    advisor: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: layout.rowGap,
        backgroundColor: color.surface2,
        borderRadius: radius.inner,
        padding: layout.rowGap,
    },
    advisorIcon: { borderRadius: 8 },
    advisorText: { flex: 1, gap: 2 },
    thinking: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 22 },
    terms: { gap: layout.rowGap },
    doneStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: color.success.bg,
        borderRadius: radius.inner,
        padding: layout.rowGap,
    },
    disclaimer: { marginTop: layout.rowGap },
});

export default LoanPlanBlock;
