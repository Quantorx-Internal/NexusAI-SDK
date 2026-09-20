export interface Account {
    id: string;
    name: string;
    nameAr: string;
    type: 'current' | 'savings';
    accountNumber: string;
    iban: string;
    balance: number;
    currency: 'SAR';
    isDefault: boolean;
}

export interface Beneficiary {
    id: string;
    name: string;
    nameAr: string;
    nickname?: string;
    bankCode: string;
    bankName: string;
    bankNameAr: string;
    bankLogo?: string;
    iban: string;
    accountType: 'personal' | 'business';
    type: 'national' | 'international';
    country?: string;
    countryAr?: string;
    swiftCode?: string;
    createdAt: string;
}

export interface Transfer {
    id: string;
    fromAccountId: string;
    beneficiaryId: string;
    amount: number;
    currency: string;
    convertedAmount?: number;
    exchangeRate?: number;
    purpose: TransferPurpose;
    reference?: string;
    type: 'national' | 'international';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    completedAt?: string;
}

export type TransferPurpose =
    | 'family_support'
    | 'salary'
    | 'investment'
    | 'education'
    | 'medical'
    | 'business'
    | 'other';

export interface ChatMessageUI {
    showAccounts: boolean;
    showBeneficiaries: boolean;
    transferPreview?: TransferPreview | null;
    transferSuccess?: TransferSuccess | null;
    exchangeRate?: ExchangeRate | null;
    requestOtp: boolean;
    showCards?: boolean;
    cardPreview?: CardPreview | null;
    cardActionSuccess?: CardActionSuccess | null;
    showSpendingBreakdown?: boolean;
    spendingInsights?: SpendingInsight[] | null;
    showSubscriptions?: boolean;
    showBills?: boolean;
    billPaymentPreview?: BillPaymentPreview | null;
    billPaymentSuccess?: BillPaymentSuccess | null;
    ticketCreated?: TicketCreated | null;
    /**
     * A QUERY, not data. The assistant describes which transactions to show and
     * the client resolves it against the accounts API — the same contract the
     * web app uses.
     */
    transactionList?: TransactionListQuery | null;
    /** Personalised offers, in the server's own shape (see ProductRecommendationPayload). */
    productRecommendation?: ProductRecommendationPayload | null;
    /** Ask the user for a figure before a transfer can be previewed. */
    requestAmount?: RequestAmount | null;
    /** Server-driven buttons. Currently only sent alongside cards that already
     *  carry their own Confirm/Cancel, so nothing renders them yet. */
    actions?: UiAction[] | null;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    ui?: ChatMessageUI;
    accounts?: Account[];
    beneficiaries?: Beneficiary[];
    // Legacy support
    transferPreview?: TransferPreview;
    // Additional data fields
    cards?: Card[];
    bills?: Bill[];
    spendingBreakdown?: SpendingBreakdown[];
    subscriptions?: Subscription[];
    spendingInsights?: SpendingInsight[];
    // Resolved transaction rows for ui.transactionList
    transactions?: Transaction[];
    transactionSummary?: { count: number; totalIn: number; totalOut: number; currency: string };
}

// Recommendation type for personalized offers
export interface Recommendation {
    id: string;
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    ctaQuestion: string;
    ctaQuestionAr: string;
    features: string[];
    featuresAr: string[];
    badges: Array<{ text: string; textAr: string; variant: 'special' | 'category' }>;
    icon: 'savings' | 'piggybank' | 'target' | 'trending' | 'creditcard';
    actionLabel?: string;
    actionLabelAr?: string;
}

export interface TransferPreview {
    fromAccountId: string;
    fromAccountName?: string;
    beneficiaryId: string;
    beneficiaryName?: string;
    /** Bank (and country) shown as the qualifier under the recipient name. */
    beneficiaryBank?: string;
    amount: number;
    currency: string;
    type?: 'national' | 'international';
    convertedAmount?: number;
    /**
     * Currency of `convertedAmount`. When absent the card falls back to SAR,
     * which is the settlement reading the API has always used.
     */
    convertedCurrency?: string;
    exchangeRate?: number;
    purpose?: TransferPurpose;
    fees?: number;
    totalAmount?: number;
}

/**
 * The receipt for a completed transfer. Previously declared three times across
 * the codebase; this is now the single definition.
 */
export interface TransferSuccess {
    transactionId?: string;
    transferId?: string;
    amount?: number;
    currency?: string;
    beneficiaryName?: string;
    /**
     * Masked source account. A receipt without the debited account is hard to
     * reconcile, so the card renders this row whenever the payload carries it.
     */
    fromAccountName?: string;
    status?: string;
    completedAt?: string;
}

/** A single quoted pair: 1 `from` buys `rate` of `to`. */
export interface ExchangeRate {
    from: string;
    to: string;
    rate: number;
    timestamp?: string;
}

export interface ExchangeRates {
    baseCurrency: 'SAR';
    rates: Record<string, number>;
    timestamp: string;
}

// Card Management Types
export interface Card {
    id: string;
    name: string;
    nameAr: string;
    type: 'credit' | 'debit';
    lastFourDigits: string;
    cardNumber: string;
    expiryDate: string;
    status: 'active' | 'frozen';
    linkedAccountId: string;
    limits: CardLimits;
    settings: CardSettings;
    cardNetwork: 'visa' | 'mastercard' | 'mada';
}

export interface CardLimits {
    dailyLimit: number;
    transactionLimit: number;
    currentDailyUsage: number;
}

export interface CardSettings {
    internationalTransactions: boolean;
    onlineTransactions: boolean;
    contactlessPayments: boolean;
}

export type CardAction =
    | 'freeze'
    | 'unfreeze'
    | 'set_daily_limit'
    | 'set_transaction_limit'
    | 'toggle_international'
    | 'toggle_online'
    | 'request_replacement'
    | 'reset_pin';

export interface CardPreview {
    cardId: string;
    cardName?: string;
    action: CardAction;
    newDailyLimit?: number;
    newTransactionLimit?: number;
    /**
     * The values being replaced, rendered struck-through above the new ones.
     * Resolved from the attached card list when the payload omits them; without
     * either, the user is confirming a change they cannot compare against.
     */
    currentDailyLimit?: number;
    currentTransactionLimit?: number;
    /** Masked card number for the object block. */
    cardLastFour?: string;
    cardNetwork?: 'visa' | 'mastercard' | 'mada';
    /** Current status, so freeze/unfreeze can show what it is changing from. */
    cardStatus?: 'active' | 'frozen';
}

export interface CardActionSuccess {
    cardId: string;
    cardName?: string;
    action: CardAction;
    message: string;
    messageAr: string;
}

// Financial Insights Types
export interface SpendingCategory {
    id: string;
    name: string;
    nameAr: string;
    icon: string;
    color: string;
}

export interface SpendingBreakdown {
    categoryId: string;
    categoryName: string;
    categoryNameAr: string;
    amount: number;
    percentage: number;
    transactionCount: number;
    change: number;
}

export interface MerchantSpending {
    merchantName: string;
    merchantNameAr: string;
    category: string;
    totalAmount: number;
    transactionCount: number;
    lastTransaction: string;
}

export interface Subscription {
    id: string;
    name: string;
    nameAr: string;
    merchantName: string;
    amount: number;
    currency: string;
    frequency: 'weekly' | 'monthly' | 'yearly';
    nextBillingDate: string;
    category: string;
    isActive: boolean;
}

export interface SpendingInsight {
    type: 'comparison' | 'unusual' | 'subscription' | 'trend';
    message: string;
    messageAr: string;
    category?: string;
    amount?: number;
    changePercent?: number;
}

// Bill Payment Types
export interface Bill {
    id: string;
    type: 'electricity' | 'water' | 'internet' | 'phone' | 'credit_card' | 'government';
    providerName: string;
    providerNameAr: string;
    providerLogo?: string;
    accountNumber: string;
    amount: number;
    dueDate: string;
    status: 'pending' | 'paid' | 'overdue';
    isPriority: boolean;
}

export interface BillPayment {
    id: string;
    billId: string;
    fromAccountId: string;
    amount: number;
    paidAt: string;
    reference: string;
    status: 'completed' | 'pending' | 'failed';
}

export interface BillPaymentPreview {
    billId: string;
    providerName?: string;
    fromAccountId: string;
    fromAccountName?: string;
    amount: number;
    dueDate: string;
    /** Drives the provider block's icon and tint. */
    billType?: Bill['type'];
    status?: Bill['status'];
}

export interface BillPaymentSuccess {
    billId: string;
    providerName?: string;
    amount: number;
    paidAt: string;
    reference: string;
    /** Masked source account — same reconciliation reason as TransferSuccess. */
    fromAccountName?: string;
}

// Support Ticket Types
export interface SupportTicket {
    id: string;
    ticketNumber: string;
    summary: string;
    summaryAr: string;
    description: string;
    category: 'general' | 'account' | 'card' | 'transfer' | 'bill' | 'technical' | 'complaint';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    context: TicketContext;
    createdAt: string;
    updatedAt: string;
}

export interface TicketContext {
    accountIds?: string[];
    cardIds?: string[];
    transactionIds?: string[];
    userMessage: string;
    aiAnalysis: string;
}

export interface TicketCreated {
    ticketId: string;
    ticketNumber: string;
    estimatedResolutionTime: string;
}

// Transaction History Types

export interface Transaction {
    id: string;
    accountId: string;
    /** debit = money out, credit = money in. */
    type: 'debit' | 'credit';
    amount: number;
    currency: string;
    date: string;
    merchantName: string;
    merchantNameAr?: string;
    description?: string;
    descriptionAr?: string;
    category: string;
    channel: 'card' | 'atm' | 'bill' | 'salary' | 'subscription' | 'transfer' | string;
    status: 'completed' | 'pending' | 'reversed';
    cardId?: string;
}

/**
 * The filter the assistant sends in `ui.transactionList`. Every field is
 * optional/nullable; the client forwards whatever is set to the transactions
 * endpoint and leaves the rest to the server's defaults.
 */
export interface TransactionListQuery {
    accountId?: string | null;
    merchant?: string | null;
    category?: string | null;
    direction?: 'all' | 'in' | 'out' | null;
    days?: number | null;
    from?: string | null;
    to?: string | null;
    minAmount?: number | null;
    maxAmount?: number | null;
    limit?: number | null;
    title?: string | null;
    titleAr?: string | null;
}

/** What the transactions endpoint returns, plus the query it resolved. */
export interface TransactionListResult {
    transactions: Transaction[];
    /** Total matching the filter — larger than `transactions.length` when limited. */
    count: number;
    totalIn: number;
    totalOut: number;
    currency: string;
    query?: Record<string, unknown>;
}

// Server-driven affordances

export interface UiAction {
    id: string;
    label: string;
    labelAr?: string;
    action: string;
}

export interface RequestAmount {
    /** Pre-selected currency. */
    currency?: string | null;
    /** Currencies the user may switch between. */
    currencies?: string[] | null;
    min?: number | null;
    max?: number | null;
    /** "To Ali Ahmad" — what the amount is for. */
    hint?: string | null;
    hintAr?: string | null;
}

// Product Recommendations (server shape)

export interface Product {
    id: string;
    name: string;
    nameAr?: string;
    category: 'saving' | 'lending' | 'credit_card' | string;
    type: string;
    /** A lucide icon name in kebab case, e.g. "piggy-bank". */
    icon?: string;
    benefit?: string;
    benefitAr?: string;
    eligibilityNote?: string;
    eligibilityNoteAr?: string;
    isPromoted?: boolean;
    minAmount?: number | null;
    maxAmount?: number | null;
    minSalary?: number | null;
}

export interface ProductRecommendation {
    product: Product;
    /** The "why you" line — the evidence behind the offer. */
    reason?: string;
    reasonAr?: string;
    matchScore?: number;
    nextStep?: string;
    nextStepAr?: string;
}

export interface ProductRecommendationPayload {
    contextMessage?: string;
    contextMessageAr?: string;
    showApplyButton?: boolean;
    recommendations: ProductRecommendation[];
}
