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
    ExchangeRateBlock
} from './blocks';
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
    Transaction
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
    isRTL?: boolean;
    isLayoutRTL?: boolean;
}

const markdownStyles = StyleSheet.create({
    body: {
        color: '#333',
        fontSize: 15,
        lineHeight: 22,
    },
    bodyRTL: {
        textAlign: 'right',
        writingDirection: 'rtl',
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
    isRTL = false,
    isLayoutRTL = false,
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

    const mkStyles = {
        ...markdownStyles,
        body: {
            ...markdownStyles.body,
            ...(isRTL ? {
                textAlign: 'right' as const,
                writingDirection: 'rtl' as const,
            } : {}),
        },
        heading1: isRTL ? {
            textAlign: 'right' as const,
            writingDirection: 'rtl' as const,
        } : {},
        heading2: isRTL ? {
            textAlign: 'right' as const,
            writingDirection: 'rtl' as const,
        } : {},
        paragraph: {
            ...markdownStyles.paragraph,
            ...(isRTL ? {
                flexDirection: 'row' as const,
                justifyContent: 'flex-start' as const,
            } : {})
        },
        // Explicitly style text nodes if possible
        text: isRTL ? {
            textAlign: 'right' as const,
            writingDirection: 'rtl' as const,
        } : {},
        textgroup: isRTL ? {
            textAlign: 'right' as const,
            writingDirection: 'rtl' as const,
            alignItems: 'flex-end' as const,
        } : {},
        // Fix for lists in RTL
        bullet_list: isRTL ? {
            alignItems: 'flex-end' as const,
        } : {},
        list_item: isRTL ? {
            flexDirection: 'row-reverse' as const,
            justifyContent: 'flex-end' as const,
        } : {},
        // Adjust spacing for bullets
        bullet_list_icon: isRTL ? {
            marginLeft: 8,
            marginRight: 0,
            fontSize: 20,
        } : {
            marginLeft: 0,
            marginRight: 8,
            fontSize: 20,
        },
        bullet_list_content: isRTL ? {
            alignItems: 'flex-end' as const,
            textAlign: 'right' as const,
        } : {},
    };

    return (
        <View style={styles.container}>
            {/* Text Content */}
            {content ? (
                <View style={[styles.bubble, isLayoutRTL && styles.bubbleRTL]}>
                    <Markdown style={mkStyles}>
                        {content}
                    </Markdown>
                </View>
            ) : null}

            {/* Blocks */}
            {(hasTransferPreview || hasTransferSuccess || hasAccounts || hasBeneficiaries || hasCards || hasCardPreview || hasCardActionSuccess || hasSpendingBreakdown || hasSpendingInsights || hasSubscriptions || hasBills || hasBillPaymentPreview || hasBillPaymentSuccess || hasTicketCreated || hasRecommendations || hasTransactions || hasExchangeRate) && (
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
                            total={spendingBreakdown.reduce((sum, item) => sum + item.amount, 0)}
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
        </View>
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
