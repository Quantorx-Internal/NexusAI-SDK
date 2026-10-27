import { alignText } from '../../contexts/LayoutDirectionContext';
import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, I18nManager } from 'react-native';
import { BrainCircuit, User, Volume2, VolumeX } from 'lucide-react-native';
import { ChatMessage as ChatMessageType, Account, Beneficiary, Card, Bill, SpendingBreakdown, Subscription, ProductRecommendation, Transaction, LoanOfferUI } from '../../types';
import { SimpleMarkdownRenderer } from './SimpleMarkdownRenderer';
import type { LoanPlanChoice, AdvisorAsk } from './blocks';
import { Locale } from '../../contexts/LocaleContext';
import { LoanAdvisorService } from '../../services/LoanAdvisorService';
import { color } from '../../theme/tokens';

interface ChatMessageProps {
    message: ChatMessageType;
    accounts?: Account[];
    beneficiaries?: Beneficiary[];
    cards?: Card[];
    bills?: Bill[];
    spendingBreakdown?: SpendingBreakdown[];
    subscriptions?: Subscription[];
    locale?: Locale;
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
    // Recommendation handlers
    onRecommendationApply?: (recommendation: ProductRecommendation) => void;
    onRecommendationDetails?: (recommendation: ProductRecommendation) => void;
    onTransactionSelect?: (transaction: Transaction) => void;
    // Loan handlers. Each gets the message the card sits in, so the view model
    // can mark that message as answered.
    onLoanOpen?: (productId: string, name: string, messageId: string) => void;
    onLoanApply?: (choice: LoanPlanChoice, name: string, messageId: string) => void;
    onLoanAdvise?: (ask: AdvisorAsk & { offer: LoanOfferUI }, signal: AbortSignal) => Promise<string | null>;
    /** The newest assistant reply: its loan cards take input. */
    isLatest?: boolean;
    /** A request is in flight. */
    disabled?: boolean;
    // Speech props
    onSpeechToggle?: (text: string, messageId: string) => void;
    isSpeaking?: boolean;
    isLoadingSpeech?: boolean;
    currentSpeakingMessageId?: string | null;
    // RTL prop
    isRTL?: boolean;
}

export function ChatMessage({
    message,
    accounts: fallbackAccounts = [],
    beneficiaries: fallbackBeneficiaries = [],
    onAction,
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
    onLoanAdvise,
    isLatest = false,
    disabled = false,
    onSpeechToggle,
    isSpeaking,
    isLoadingSpeech,
    currentSpeakingMessageId,
    locale = 'en',
    isRTL = false,
}: ChatMessageProps) {
    const isUser = message.role === 'user';
    const isThisMessageSpeaking = currentSpeakingMessageId === message.id;
    const isThisMessageLoading = isLoadingSpeech && isThisMessageSpeaking;

    // Use structured UI data from message
    const ui = message.ui;

    // Get accounts/beneficiaries based on UI flags
    const shouldShowAccounts = ui?.showAccounts && message.accounts?.length;
    const shouldShowBeneficiaries = ui?.showBeneficiaries && message.beneficiaries?.length;
    const shouldShowCards = ui?.showCards && message.cards?.length;
    const shouldShowBills = ui?.showBills && message.bills?.length;
    const shouldShowSpendingBreakdown = ui?.showSpendingBreakdown && message.spendingBreakdown?.length;
    const shouldShowSubscriptions = ui?.showSubscriptions && message.subscriptions?.length;

    const accounts = shouldShowAccounts ? message.accounts! : [];
    const beneficiaries = shouldShowBeneficiaries ? message.beneficiaries! : [];
    // Use message data first, then fall back to props
    const cards = shouldShowCards ? message.cards! : [];
    const bills = shouldShowBills ? message.bills! : [];
    const spendingBreakdown = shouldShowSpendingBreakdown ? message.spendingBreakdown! : [];
    const subscriptions = shouldShowSubscriptions ? message.subscriptions! : [];

    // Get transfer preview and success from UI or legacy field
    const transferPreview = ui?.transferPreview || message.transferPreview;
    const transferSuccess = ui?.transferSuccess;

    // Get card-related UI data.
    // The preview payload carries only the NEW limit, so the value being replaced
    // is resolved from the attached card when the SDK has it — without it the row
    // renders an em dash and the user is confirming a change they can't compare.
    const cardActionSuccess = ui?.cardActionSuccess;
    const rawCardPreview = ui?.cardPreview;
    const previewCard = rawCardPreview
        ? message.cards?.find(c => c.id === rawCardPreview.cardId)
        : undefined;
    const cardPreview = rawCardPreview
        ? {
            ...rawCardPreview,
            cardName: rawCardPreview.cardName ?? previewCard?.name,
            cardLastFour: rawCardPreview.cardLastFour ?? previewCard?.lastFourDigits,
            cardNetwork: rawCardPreview.cardNetwork ?? previewCard?.cardNetwork,
            cardStatus: rawCardPreview.cardStatus ?? previewCard?.status,
            currentDailyLimit:
                rawCardPreview.currentDailyLimit ?? previewCard?.limits?.dailyLimit,
            currentTransactionLimit:
                rawCardPreview.currentTransactionLimit ?? previewCard?.limits?.transactionLimit,
        }
        : undefined;

    // Get spending insights from message or UI (handle both array and object formats)
    const rawSpendingInsights = message.spendingInsights || ui?.spendingInsights;
    const spendingInsights = Array.isArray(rawSpendingInsights)
        ? rawSpendingInsights
        : (rawSpendingInsights as any)?.insights;

    // Get bill payment UI data. The bill's type drives the provider block's icon
    // and tint, and its status drives the overdue treatment, so both are resolved
    // from the attached bill when present.
    const billPaymentSuccess = ui?.billPaymentSuccess;
    const rawBillPreview = ui?.billPaymentPreview;
    const previewBill = rawBillPreview
        ? message.bills?.find(b => b.id === rawBillPreview.billId)
        : undefined;
    const billPaymentPreview = rawBillPreview
        ? {
            ...rawBillPreview,
            providerName: rawBillPreview.providerName ?? previewBill?.providerName,
            billType: rawBillPreview.billType ?? previewBill?.type,
            status: rawBillPreview.status ?? previewBill?.status,
        }
        : undefined;

    // Get ticket created data
    const ticketCreated = ui?.ticketCreated;

    // Transactions are resolved by ChatService from the ui.transactionList query;
    // the title travels with the query so the assistant can name the list.
    const transactions = message.transactions || [];
    const transactionsTitle = locale === 'ar'
        ? ui?.transactionList?.titleAr || ui?.transactionList?.title || undefined
        : ui?.transactionList?.title || undefined;

    // Offers and FX come straight off the ui payload in the server's own shape.
    const productRecommendation = ui?.productRecommendation || undefined;
    const exchangeRate = ui?.exchangeRate || undefined;

    // Loans come straight off the ui payload. The handlers are bound to this
    // message so the card's answer lands on the right bubble.
    const loanOffer = ui?.loanOffer || undefined;
    const loanOptions = ui?.loanOptions || undefined;
    const productName = (p: { name: string; nameAr?: string } | undefined) =>
        (locale === 'ar' ? p?.nameAr : p?.name) || p?.name || '';
    const handleLoanOpen = onLoanOpen && loanOptions
        ? (productId: string) => {
            const option = [...loanOptions.available, ...loanOptions.unavailable].find(o => o.product.id === productId);
            onLoanOpen(productId, productName(option?.product), message.id);
        }
        : undefined;
    const handleLoanApply = onLoanApply && loanOffer
        ? (choice: LoanPlanChoice) => onLoanApply(choice, productName(loanOffer.product), message.id)
        : undefined;
    const askLoanAdvisor = onLoanAdvise && loanOffer
        ? (ask: AdvisorAsk, signal: AbortSignal) => onLoanAdvise({ ...ask, offer: loanOffer }, signal)
        : undefined;
    const localLoanRemark = loanOffer
        ? (amount: number, months: number) => LoanAdvisorService.localRemark(loanOffer, amount, months, locale)
        : undefined;

    const handleSpeechPress = () => {
        if (onSpeechToggle) {
            onSpeechToggle(message.content, message.id);
        }
    };

    // Localized strings
    const t = {
        listen: locale === 'ar' ? 'استمع' : 'Listen',
        stop: locale === 'ar' ? 'إيقاف' : 'Stop',
        loading: locale === 'ar' ? 'جاري التحميل...' : 'Loading...',
    };

    // Determine effective layout direction (XOR logic)
    // If language is RTL but engine is LTR -> Use RTL Styles
    // If language is LTR but engine is RTL -> Use RTL Styles (to force LTR visual in RTL engine)
    // If language matches engine -> Use Normal Styles
    const isLayoutRTL = isRTL ? !I18nManager.isRTL : I18nManager.isRTL;

    // Dynamic styles based on RTL and user/bot
    const containerStyle = [
        styles.container,
        isUser
            ? (isLayoutRTL ? styles.userContainerRTL : styles.userContainer)
            : (isLayoutRTL ? styles.botContainerRTL : styles.botContainer)
    ];

    const userBubbleStyle = [
        [styles.userBubble, { backgroundColor: color.brand[600] }],
        isLayoutRTL ? styles.userBubbleRTL : null,
    ];

    const speechButtonStyle = [
        styles.speechButton,
        isLayoutRTL && styles.speechButtonRTL,
        (isThisMessageSpeaking || isThisMessageLoading) && [styles.speechButtonActive, { backgroundColor: color.brand[50] }],
    ];

    return (
        <View style={containerStyle}>
            <View style={[styles.avatar, isUser ? [styles.userAvatar, { backgroundColor: color.brand[600] }] : [styles.botAvatar, { backgroundColor: color.brand[50] }]]}>
                {isUser ? (
                    <User size={16} color="#fff" />
                ) : (
                    <BrainCircuit size={16} color={color.brand[600]} />
                )}
            </View>

            <View style={[styles.contentContainer, isUser && styles.userContentContainer]}>
                {isUser ? (
                    <View style={userBubbleStyle}>
                        <Text style={[styles.userText, alignText(isLayoutRTL, isRTL)]}>
                            {message.display?.label ?? message.content}
                        </Text>
                    </View>
                ) : (
                    <>
                        {!!message.dataUnavailable?.length && (
                            <Text accessibilityRole="alert" style={alignText(isLayoutRTL, isRTL)}>
                                {locale === 'ar' ? 'تعذر تحميل بيانات البطاقة. حاول مرة أخرى.' : 'Card data could not be loaded. Please try again.'}
                            </Text>
                        )}
                        <SimpleMarkdownRenderer
                            content={message.content}
                            transferPreview={transferPreview || undefined}
                            transferSuccess={transferSuccess || undefined}
                            accounts={accounts}
                            beneficiaries={beneficiaries}
                            cards={cards}
                            cardPreview={cardPreview || undefined}
                            cardActionSuccess={cardActionSuccess || undefined}
                            spendingBreakdown={spendingBreakdown}
                            spendingSummary={message.spendingSummary}
                            spendingInsights={spendingInsights || undefined}
                            subscriptions={subscriptions}
                            bills={bills}
                            billPaymentPreview={billPaymentPreview || undefined}
                            billPaymentSuccess={billPaymentSuccess || undefined}
                            ticketCreated={ticketCreated || undefined}
                            productRecommendation={productRecommendation}
                            exchangeRate={exchangeRate}
                            transactions={transactions}
                            transactionsTitle={transactionsTitle}
                            transactionsUnavailable={message.transactionsUnavailable}
                            loanOffer={loanOffer}
                            loanOptions={loanOptions}
                            loanResolution={message.resolution}
                            isLatest={isLatest}
                            disabled={disabled}
                            locale={locale}
                            onAction={onAction}
                            onAccountSelect={onAccountSelect}
                            onBeneficiarySelect={onBeneficiarySelect}
                            onCardSelect={onCardSelect}
                            onBillSelect={onBillSelect}
                            onTransferConfirm={onTransferConfirm}
                            onTransferEdit={onTransferEdit}
                            onTransferCancel={onTransferCancel}
                            onCardActionConfirm={onCardActionConfirm}
                            onCardActionCancel={onCardActionCancel}
                            onBillPaymentConfirm={onBillPaymentConfirm}
                            onBillPaymentCancel={onBillPaymentCancel}
                            onRecommendationApply={onRecommendationApply}
                            onRecommendationDetails={onRecommendationDetails}
                            onTransactionSelect={onTransactionSelect}
                            onLoanOpen={handleLoanOpen}
                            onLoanApply={handleLoanApply}
                            askLoanAdvisor={askLoanAdvisor}
                            localLoanRemark={localLoanRemark}
                            isRTL={isRTL}
                            isLayoutRTL={isLayoutRTL}
                        />

                        {/* Speech toggle button for assistant messages */}
                        {onSpeechToggle && (
                            <TouchableOpacity
                                style={speechButtonStyle}
                                onPress={handleSpeechPress}
                                disabled={isLoadingSpeech && !isThisMessageSpeaking}
                            >
                                {isThisMessageLoading ? (
                                    <>
                                        <ActivityIndicator size="small" color={color.brand[600]} />
                                        <Text style={[styles.speechButtonText, styles.speechButtonTextActive, { color: color.brand[600] }]}>
                                            {t.loading}
                                        </Text>
                                    </>
                                ) : isThisMessageSpeaking ? (
                                    <>
                                        <VolumeX size={14} color={color.brand[600]} />
                                        <Text style={[styles.speechButtonText, styles.speechButtonTextActive, { color: color.brand[600] }]}>
                                            {t.stop}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Volume2 size={14} color="#6B7280" />
                                        <Text style={styles.speechButtonText}>{t.listen}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 12,
    },
    userContainer: {
        flexDirection: 'row-reverse',
    },
    userContainerRTL: {
        flexDirection: 'row',
    },
    botContainer: {
        flexDirection: 'row',
    },
    botContainerRTL: {
        flexDirection: 'row-reverse',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userAvatar: {
        backgroundColor: '#4F008D',
    },
    botAvatar: {
        backgroundColor: '#EEF2FF',
    },
    contentContainer: {
        flex: 1,
        maxWidth: '85%',
    },
    userContentContainer: {
        flex: 0,
        flexShrink: 1,
    },
    userBubble: {
        backgroundColor: '#4F008D',
        padding: 12,
        borderRadius: 16,
        borderTopRightRadius: 2,
        alignSelf: 'flex-start',
    },
    userBubbleRTL: {
        borderTopRightRadius: 16,
        borderTopLeftRadius: 2,
    },
    userText: {
        color: '#fff',
        fontSize: 15,
    },
    textRTL: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    speechButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    speechButtonRTL: {
        flexDirection: 'row-reverse',
        alignSelf: 'flex-end',
    },
    speechButtonActive: {
        backgroundColor: 'rgba(79, 0, 141, 0.1)',
    },
    speechButtonText: {
        fontSize: 12,
        color: '#6B7280',
    },
    speechButtonTextActive: {
        color: '#4F008D',
    },
});
