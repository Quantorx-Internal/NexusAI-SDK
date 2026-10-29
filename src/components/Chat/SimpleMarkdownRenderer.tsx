import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown, { renderRules } from 'react-native-markdown-display';
import {
    TransferPreviewBlock,
    AccountListBlock,
    BeneficiaryListBlock,
    CardListBlock,
    CardPreviewBlock,
    CardActionSuccessBlock,
    SpendingBreakdownBlock,
    SpendingInsightsBlock,
    SubscriptionListBlock,
    BillListBlock,
    BillPaymentPreviewBlock,
    BillPaymentSuccessBlock,
    TicketCreatedBlock,
    TransferSuccessBlock,
    RecommendationsBlock,
    TransactionListBlock,
    ExchangeRateBlock,
    LoanOffersBlock,
    LoanPlanBlock,
} from './blocks';
import type { LoanPlanChoice, AskAdvisor } from './blocks';
import { face, font, rtlBase } from '../../theme/tokens';
import { textDirectionFor } from '../../contexts/LayoutDirectionContext';
import { FadeRise, countWords, replyStream, replyStreamDuration, streamStep, streamedAlpha, useStreamClock } from '../../lib/motion';
import {
    Account,
    Beneficiary,
    TransferPreview,
    Card,
    Bill,
    SpendingBreakdown,
    SpendingInsight,
    Subscription,
    BillPaymentPreview,
    BillPaymentSuccess,
    TicketCreated,
    CardPreview,
    CardActionSuccess,
    TransferSuccess,
    ProductRecommendation,
    ProductRecommendationPayload,
    ExchangeRate,
    Transaction,
    LoanOfferUI,
    LoanOptionsUI,
    ChatResolution,
} from '../../types';

interface SimpleMarkdownRendererProps {
    content: string;
    transferPreview?: TransferPreview;
    transferSuccess?: TransferSuccess;
    accounts?: Account[];
    beneficiaries?: Beneficiary[];
    cards?: Card[];
    cardPreview?: CardPreview;
    cardActionSuccess?: CardActionSuccess;
    spendingBreakdown?: SpendingBreakdown[];
    spendingSummary?: { totalSpending: number; label: string; labelAr: string };
    spendingInsights?: SpendingInsight[];
    subscriptions?: Subscription[];
    bills?: Bill[];
    billPaymentPreview?: BillPaymentPreview;
    billPaymentSuccess?: BillPaymentSuccess;
    ticketCreated?: TicketCreated;
    productRecommendation?: ProductRecommendationPayload;
    exchangeRate?: ExchangeRate;
    transactions?: Transaction[];
    transactionsTitle?: string;
    transactionsUnavailable?: boolean;
    loanOffer?: LoanOfferUI;
    loanOptions?: LoanOptionsUI;
    /** How the user answered this message's loan card. */
    loanResolution?: ChatResolution;
    /** The newest reply: loan cards take input. Older ones are for reading. */
    isLatest?: boolean;
    /** A request is in flight: loan cards do not take taps. */
    disabled?: boolean;
    locale?: 'en' | 'ar';
    onAction?: (action: string) => void;
    onAccountSelect?: (account: Account) => void;
    onBeneficiarySelect?: (beneficiary: Beneficiary) => void;
    onCardSelect?: (card: Card) => void;
    onBillSelect?: (bill: Bill) => void;
    onTransferConfirm?: () => void;
    onTransferEdit?: () => void;
    onTransferCancel?: () => void;
    onCardActionConfirm?: () => void;
    onCardActionCancel?: () => void;
    onBillPaymentConfirm?: () => void;
    onBillPaymentCancel?: () => void;
    onRecommendationApply?: (recommendation: ProductRecommendation) => void;
    onRecommendationDetails?: (recommendation: ProductRecommendation) => void;
    onTransactionSelect?: (transaction: Transaction) => void;
    onLoanOpen?: (productId: string) => void;
    onLoanApply?: (choice: LoanPlanChoice) => void;
    askLoanAdvisor?: AskAdvisor;
    localLoanRemark?: (amount: number, months: number) => string | null;
    isRTL?: boolean;
    isLayoutRTL?: boolean;
    /** A reply that has just arrived: its words stream in, then its cards. */
    stream?: boolean;
}

const markdownStyles = StyleSheet.create({
    body: {
        color: '#333',
        fontSize: 15,
        lineHeight: 22,
        fontFamily: font.family,
        ...rtlBase,
    },
    // A loaded font is one file per weight: bold text needs the bold file,
    // not fontWeight on the regular one.
    strong: {
        ...face('700'),
    },
    paragraph: {
        marginBottom: 10,
    },
    list_item: {
        marginBottom: 5,
    },
    bullet_list: {
        marginBottom: 10,
    },
});

const isObject = (val: unknown): val is object => val !== null && typeof val === 'object';

export function SimpleMarkdownRenderer({
    content,
    transferPreview,
    transferSuccess,
    accounts = [],
    beneficiaries = [],
    cards = [],
    cardPreview,
    cardActionSuccess,
    spendingBreakdown = [],
    spendingSummary,
    spendingInsights = [],
    subscriptions = [],
    bills = [],
    billPaymentPreview,
    billPaymentSuccess,
    ticketCreated,
    productRecommendation,
    exchangeRate,
    transactions = [],
    transactionsTitle,
    transactionsUnavailable,
    loanOffer,
    loanOptions,
    loanResolution,
    isLatest = false,
    disabled = false,
    locale = 'en',
    onAccountSelect,
    onBeneficiarySelect,
    onCardSelect,
    onBillSelect,
    onTransferConfirm,
    onTransferEdit,
    onTransferCancel,
    onCardActionConfirm,
    onCardActionCancel,
    onBillPaymentConfirm,
    onBillPaymentCancel,
    onRecommendationApply,
    onRecommendationDetails,
    onTransactionSelect,
    onLoanOpen,
    onLoanApply,
    askLoanAdvisor,
    localLoanRemark,
    isRTL = false,
    isLayoutRTL = false,
    stream = false,
}: SimpleMarkdownRendererProps) {

    const hasTransferPreview = isObject(transferPreview);
    const hasTransferSuccess = isObject(transferSuccess);
    const hasAccounts = accounts.length > 0;
    const hasBeneficiaries = beneficiaries.length > 0;
    const hasCards = cards.length > 0;
    const hasCardPreview = isObject(cardPreview);
    const hasCardActionSuccess = isObject(cardActionSuccess);
    const hasSpendingBreakdown = spendingBreakdown.length > 0;
    const hasSpendingInsights = spendingInsights && spendingInsights.length > 0;
    const hasSubscriptions = subscriptions.length > 0;
    const hasBills = bills.length > 0;
    const hasBillPaymentPreview = isObject(billPaymentPreview);
    const hasBillPaymentSuccess = isObject(billPaymentSuccess);
    const hasTicketCreated = isObject(ticketCreated);
    const hasRecommendations = (productRecommendation?.recommendations?.length || 0) > 0;
    const hasExchangeRate = isObject(exchangeRate) && typeof (exchangeRate as any).rate === 'number';
    const hasTransactions = transactions.length > 0 || Boolean(transactionsUnavailable);
    const hasLoanOffer = isObject(loanOffer) && isObject((loanOffer as LoanOfferUI).terms);
    const hasLoanOptions = isObject(loanOptions) && Array.isArray((loanOptions as LoanOptionsUI).available);

    // The reply's own direction: English stays left to right on the Arabic screen.
    const contentDirection = textDirectionFor(content || '');

    const mkStyles = {
        ...markdownStyles,
        body: {
            ...markdownStyles.body,
            ...contentDirection,
        },
        heading1: {
            ...face('700'),
            ...contentDirection,
        },
        heading2: {
            ...face('700'),
            ...contentDirection,
        },
        // Text alignment follows the language; layout (rows, sides, margins)
        // follows isLayoutRTL, true only when the engine does not mirror it
        // already. Keyed on the language, a right-to-left engine mirrored
        // the lists twice and put the bullets on the left.
        paragraph: {
            ...markdownStyles.paragraph,
            ...(isLayoutRTL ? {
                flexDirection: 'row' as const,
                justifyContent: 'flex-start' as const,
            } : {})
        },
        // Explicitly style text nodes if possible
        text: contentDirection,
        textgroup: {
            ...contentDirection,
            ...(isLayoutRTL ? { alignItems: 'flex-end' as const } : {}),
        },
        // Fix for lists in RTL
        bullet_list: isLayoutRTL ? {
            alignItems: 'flex-end' as const,
        } : {},
        list_item: isLayoutRTL ? {
            flexDirection: 'row-reverse' as const,
            justifyContent: 'flex-end' as const,
        } : {},
        // Adjust spacing for bullets
        bullet_list_icon: isLayoutRTL ? {
            marginLeft: 8,
            marginRight: 0,
            fontSize: 20,
        } : {
            marginLeft: 0,
            marginRight: 8,
            fontSize: 20,
        },
        bullet_list_content: {
            ...contentDirection,
            ...(isLayoutRTL ? { alignItems: 'flex-end' as const } : {}),
        },
    };

    return (
        <View style={styles.container}>
            {/* Text Content */}
            {content ? (
                <View style={[styles.bubble, isLayoutRTL && styles.bubbleRTL]}>
                    <StreamedMarkdown content={content} style={mkStyles} stream={stream} />
                </View>
            ) : null}

            {/* Blocks */}
            {(hasTransferPreview || hasTransferSuccess || hasAccounts || hasBeneficiaries || hasCards || hasCardPreview || hasCardActionSuccess || hasSpendingBreakdown || hasSpendingInsights || hasSubscriptions || hasBills || hasBillPaymentPreview || hasBillPaymentSuccess || hasTicketCreated || hasRecommendations || hasTransactions || hasExchangeRate || hasLoanOffer || hasLoanOptions) && (
                // The cards rise in after the reply text, as its evidence: on a
                // streamed reply, as its last words settle.
                <FadeRise
                    delay={stream ? Math.max(200, replyStreamDuration(content || '') - replyStream.fade) : 200}
                    distance={12}
                    style={styles.blocksContainer}
                >
                    {/* Render transfer preview if present */}
                    {hasTransferPreview && transferPreview && (
                        <TransferPreviewBlock
                            preview={transferPreview}
                            locale={locale}
                            onConfirm={onTransferConfirm}
                            onEdit={onTransferEdit}
                            onCancel={onTransferCancel}
                        />
                    )}

                    {/* Render transfer success if present */}
                    {hasTransferSuccess && (
                        <TransferSuccessBlock
                            success={transferSuccess!}
                            locale={locale}
                        />
                    )}

                    {/* Render accounts if present */}
                    {hasAccounts && (
                        <AccountListBlock
                            accounts={accounts}
                            locale={locale}
                            onSelect={onAccountSelect}
                            isRTL={isRTL}
                        />
                    )}

                    {/* Render beneficiaries if present */}
                    {hasBeneficiaries && (
                        <BeneficiaryListBlock
                            beneficiaries={beneficiaries}
                            locale={locale}
                            onSelect={onBeneficiarySelect}
                        />
                    )}

                    {/* Render cards if present */}
                    {hasCards && (
                        <CardListBlock
                            cards={cards}
                            locale={locale}
                            onSelect={onCardSelect}
                            isRTL={isRTL}
                        />
                    )}

                    {/* Render card preview if present */}
                    {hasCardPreview && cardPreview && (
                        <CardPreviewBlock
                            cardPreview={cardPreview}
                            locale={locale}
                            onConfirm={onCardActionConfirm}
                            onCancel={onCardActionCancel}
                        />
                    )}

                    {/* Render card action success if present */}
                    {hasCardActionSuccess && cardActionSuccess && (
                        <CardActionSuccessBlock
                            success={cardActionSuccess}
                            locale={locale}
                        />
                    )}

                    {/* Render spending breakdown if present */}
                    {hasSpendingBreakdown && (
                        <SpendingBreakdownBlock
                            breakdown={spendingBreakdown}
                            total={spendingSummary?.totalSpending ?? spendingBreakdown.reduce((sum, item) => sum + item.amount, 0)}
                            periodLabel={spendingSummary ? (locale === 'ar' ? spendingSummary.labelAr : spendingSummary.label) : ''}
                            locale={locale}
                        />
                    )}

                    {/* Render spending insights if present */}
                    {hasSpendingInsights && (
                        <SpendingInsightsBlock
                            insights={spendingInsights}
                            locale={locale}
                        />
                    )}

                    {/* Render subscriptions if present */}
                    {hasSubscriptions && (
                        <SubscriptionListBlock
                            subscriptions={subscriptions}
                            locale={locale}
                        />
                    )}

                    {/* Render bills if present */}
                    {hasBills && (
                        <BillListBlock
                            bills={bills}
                            locale={locale}
                            onSelect={onBillSelect}
                        />
                    )}

                    {/* Render bill payment preview if present */}
                    {hasBillPaymentPreview && billPaymentPreview && (
                        <BillPaymentPreviewBlock
                            preview={billPaymentPreview}
                            locale={locale}
                            onConfirm={onBillPaymentConfirm}
                            onCancel={onBillPaymentCancel}
                        />
                    )}

                    {/* Render bill payment success if present */}
                    {hasBillPaymentSuccess && billPaymentSuccess && (
                        <BillPaymentSuccessBlock
                            success={billPaymentSuccess}
                            locale={locale}
                        />
                    )}

                    {/* Render ticket created if present */}
                    {hasTicketCreated && ticketCreated && (
                        <TicketCreatedBlock
                            ticket={ticketCreated}
                            locale={locale}
                        />
                    )}

                    {/* The loan card: one loan to shape and apply for. */}
                    {hasLoanOffer && loanOffer && (
                        <LoanPlanBlock
                            offer={loanOffer}
                            locale={locale}
                            live={isLatest && !disabled}
                            resolution={loanResolution?.prompt === 'loan' ? loanResolution : undefined}
                            onApply={onLoanApply}
                            askAdvisor={askLoanAdvisor}
                            localRemark={localLoanRemark}
                        />
                    )}

                    {/* The loan list: what the user can apply for, and what not yet. */}
                    {hasLoanOptions && loanOptions && (
                        <LoanOffersBlock
                            options={loanOptions}
                            locale={locale}
                            live={isLatest}
                            disabled={disabled}
                            chosen={loanResolution?.prompt === 'loanOptions' ? loanResolution.productId : undefined}
                            onOpen={onLoanOpen}
                        />
                    )}

                    {/* Render exchange rate if present */}
                    {hasExchangeRate && exchangeRate && (
                        <ExchangeRateBlock rate={exchangeRate} locale={locale} />
                    )}

                    {/* Render transactions if present */}
                    {hasTransactions && (
                        <TransactionListBlock
                            transactions={transactions}
                            title={transactionsTitle}
                            locale={locale}
                            onSelect={onTransactionSelect}
                            unavailable={transactionsUnavailable}
                        />
                    )}

                    {/* Render recommendations if present */}
                    {hasRecommendations && productRecommendation && (
                        <RecommendationsBlock
                            payload={productRecommendation}
                            locale={locale}
                            onApply={onRecommendationApply}
                            onDetails={onRecommendationDetails}
                        />
                    )}
                </FadeRise>
            )}
        </View>
    );
}

/**
 * The reply's markdown, streamed: each word's ink fades up after the one
 * before it (see replyStream). The words are all laid out from the first
 * frame, see-through until their turn, so lines never reflow. Once the
 * stream is over the plain rules render, the same as a reply that did not
 * stream.
 */
function StreamedMarkdown({ content, style, stream }: { content: string; style: any; stream: boolean }) {
    const words = useMemo(() => countWords(content), [content]);
    const step = streamStep(words);
    const elapsed = useStreamClock(stream, replyStreamDuration(content));
    const rules = useMemo(
        () => (elapsed === Infinity ? undefined : fadeRules(elapsed, step)),
        [elapsed, step],
    );
    return (
        <Markdown style={style} rules={rules}>
            {content}
        </Markdown>
    );
}

const BODY_INK = markdownStyles.body.color as string;

/** `ink` with alpha `a`; ink is #rgb, #rrggbb, or anything else (as body ink). */
function withAlpha(ink: string, a: number): string {
    let hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(ink) ? ink.slice(1) : BODY_INK.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a.toFixed(3)})`;
}

/** The first text node under an AST node, in reading order. */
function firstText(node: any): any {
    if (node.type === 'text') return node;
    for (const child of node.children ?? []) {
        const found = firstText(child);
        if (found) return found;
    }
    return undefined;
}

/**
 * Markdown rules that give word `i` the ink of streamedAlpha(i). Text nodes
 * render in reading order, so a running count gives each word its place;
 * `body`, the root, renders last and resets the count for the next pass.
 * A list item's bullet takes the ink of its first word.
 */
function fadeRules(elapsed: number, step: number) {
    let index = 0;
    const firstWord = new Map<string, number>();

    return {
        text: (node: any, _children: any, _parent: any, styles: any, inheritedStyles: any = {}) => {
            const ink = StyleSheet.flatten([inheritedStyles, styles.text])?.color;
            firstWord.set(node.key, index);
            const parts = String(node.content).split(/(\s+)/);
            return (
                <Text key={node.key} style={[inheritedStyles, styles.text]}>
                    {parts.map((part, k) => {
                        if (!part || /^\s+$/.test(part)) return part;
                        const a = streamedAlpha(index++, elapsed, step);
                        if (a >= 1) return part;
                        return (
                            <Text key={k} style={{ color: withAlpha(typeof ink === 'string' ? ink : BODY_INK, a) }}>
                                {part}
                            </Text>
                        );
                    })}
                </Text>
            );
        },
        list_item: (node: any, children: any, parent: any, styles: any, inheritedStyles: any = {}) => {
            const item = renderRules.list_item!(node, children, parent, styles, inheritedStyles) as React.ReactElement<any>;
            const first = firstText(node);
            const at = first ? firstWord.get(first.key) : undefined;
            if (at === undefined) return item;
            const a = streamedAlpha(at, elapsed, step);
            if (a >= 1) return item;
            const [marker, ...rest] = React.Children.toArray(item.props.children) as React.ReactElement<any>[];
            if (!marker) return item;
            const ink = StyleSheet.flatten(marker.props.style)?.color;
            return React.cloneElement(
                item,
                undefined,
                React.cloneElement(marker, {
                    style: [marker.props.style, { color: withAlpha(typeof ink === 'string' ? ink : BODY_INK, a) }],
                }),
                ...rest,
            );
        },
        body: (node: any, children: any, parent: any, styles: any) => {
            index = 0;
            firstWord.clear();
            return renderRules.body!(node, children, parent, styles);
        },
    };
}

const styles = StyleSheet.create({
    container: {
        // Bubble → first card.
        gap: 8,
    },
    bubble: {
        backgroundColor: '#F3F4F6', // gray-100/secondary
        padding: 12,
        borderRadius: 16,
        borderTopLeftRadius: 0,
        alignSelf: 'flex-start',
        maxWidth: '100%',
    },
    bubbleRTL: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 0,
        alignSelf: 'flex-end',
    },
    blocksContainer: {
        // Cards inside one message sit 8 apart; 20 separates messages.
        gap: 8,
        width: '100%',
    },
});
