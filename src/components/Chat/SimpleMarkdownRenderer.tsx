import { DirectionalView } from '../../contexts/LayoutDirectionContext';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
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
}

const markdownStyles = StyleSheet.create({
    body: {
        color: '#333',
        fontSize: 15,
        lineHeight: 22,
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

    const readingStyle = { textAlign: 'left' as const, writingDirection: isRTL ? 'rtl' as const : 'ltr' as const };
    const mkStyles = {
        ...markdownStyles,
        body: { ...markdownStyles.body, ...readingStyle },
        heading1: readingStyle,
        heading2: readingStyle,
        text: readingStyle,
        textgroup: readingStyle,
        paragraph: { ...markdownStyles.paragraph, flexDirection: 'row' as const },
        list_item: { ...markdownStyles.list_item, flexDirection: 'row' as const, alignItems: 'flex-start' as const },
        bullet_list_icon: { marginLeft: 0, marginRight: 0, marginStart: 0, marginEnd: 8, fontSize: 20 },
        ordered_list_icon: { marginLeft: 0, marginRight: 0, marginStart: 0, marginEnd: 8 },
        bullet_list_content: { flex: 1 },
        ordered_list_content: { flex: 1 },
    };

    return (
        <DirectionalView languageRTL={isRTL} style={styles.container}>
            {/* Text Content */}
            {content ? (
                <View style={styles.bubble}>
                    <Markdown style={mkStyles}>
                        {content}
                    </Markdown>
                </View>
            ) : null}

            {/* Blocks */}
            {(hasTransferPreview || hasTransferSuccess || hasAccounts || hasBeneficiaries || hasCards || hasCardPreview || hasCardActionSuccess || hasSpendingBreakdown || hasSpendingInsights || hasSubscriptions || hasBills || hasBillPaymentPreview || hasBillPaymentSuccess || hasTicketCreated || hasRecommendations || hasTransactions || hasExchangeRate || hasLoanOffer || hasLoanOptions) && (
                <View style={styles.blocksContainer}>
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
                </View>
            )}
        </DirectionalView>
    );
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
        borderTopStartRadius: 0,
        alignSelf: 'flex-start',
        maxWidth: '100%',
    },
    blocksContainer: {
        // Cards inside one message sit 8 apart; 20 separates messages.
        gap: 8,
        width: '100%',
    },
});
