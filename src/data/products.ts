import { Recommendation, Product, ProductRecommendation, ProductRecommendationPayload } from '../types';
// Product recommendations database
export const products: Recommendation[] = [
    {
        id: 'rec-1',
        title: 'Salary-Linked Savings',
        titleAr: 'ادخار مرتبط بالراتب',
        description: 'You have a healthy balance but a low monthly savings rate (4%). This automates your savings.',
        descriptionAr: 'لديك رصيد جيد ولكن معدل ادخار شهري منخفض (4%). هذا يؤتمت مدخراتك.',
        ctaQuestion: 'Would you like to start saving?',
        ctaQuestionAr: 'هل تود البدء في الادخار؟',
        features: ['Save before you spend', 'Salary must be transferred to ANB Bank account'],
        featuresAr: ['ادخر قبل أن تنفق', 'يجب تحويل الراتب إلى حساب ANB bank'],
        badges: [
            { text: 'Special Offer', textAr: 'عرض خاص', variant: 'special' },
            { text: 'Savings', textAr: 'ادخار', variant: 'category' }
        ],
        icon: 'savings',
    },
    {
        id: 'rec-2',
        title: 'Automatic Savings Plan',
        titleAr: 'خطة ادخار تلقائية',
        description: 'Helps you set aside a fixed amount monthly to manage your increased dining spending.',
        descriptionAr: 'تساعدك على تخصيص مبلغ ثابت شهريًا لإدارة إنفاقك المتزايد على المطاعم.',
        ctaQuestion: 'Want to set this up?',
        ctaQuestionAr: 'هل تريد إعداد هذا؟',
        features: ['Automatic monthly transfers', 'Available for all account holders'],
        featuresAr: ['تحويلات شهرية تلقائية', 'متاح لجميع أصحاب الحسابات'],
        badges: [
            { text: 'Savings', textAr: 'ادخار', variant: 'category' }
        ],
        icon: 'piggybank',
    },
    {
        id: 'rec-3',
        title: 'Goal-Based Savings',
        titleAr: 'ادخار قائم على الأهداف',
        description: "Perfect if you're saving for something specific like a vacation or big purchase.",
        descriptionAr: 'مثالي إذا كنت تدخر لشيء محدد مثل إجازة أو عملية شراء كبيرة.',
        ctaQuestion: 'Do you have a savings goal?',
        ctaQuestionAr: 'هل لديك هدف ادخاري؟',
        features: ['Track progress towards your goal', 'Set your goal and we will help you achieve it'],
        featuresAr: ['تتبع التقدم نحو هدفك', 'حدد هدفك وسنساعدك على تحقيقه'],
        badges: [
            { text: 'Savings', textAr: 'ادخار', variant: 'category' }
        ],
        icon: 'target',
    },
    {
        id: 'rec-4',
        title: 'Premium Cashback Card',
        titleAr: 'بطاقة الاسترداد النقدي المميزة',
        description: "Get 2% cashback on all your purchases, perfect for your spending habits.",
        descriptionAr: 'احصل على استرداد نقدي بنسبة 2% على جميع مشترياتك، مثالية لعادات إنفاقك.',
        ctaQuestion: 'Interested in earning rewards?',
        ctaQuestionAr: 'هل أنت مهتم بكسب المكافآت؟',
        features: ['2% Cashback', 'No annual fee for first year'],
        featuresAr: ['2% استرداد نقدي', 'بدون رسوم سنوية للسنة الأولى'],
        badges: [
            { text: 'Cards', textAr: 'بطاقات', variant: 'category' }
        ],
        icon: 'creditcard',
    },
    {
        id: 'rec-5',
        title: 'Travel Rewards Card',
        titleAr: 'بطاقة مكافآت السفر',
        description: "Earn 1.5 miles for every riyal spent. Great for your international transactions.",
        descriptionAr: 'اكسب 1.5 ميل لكل ريال تنفقه. رائعة لمعاملاتك الدولية.',
        ctaQuestion: 'Do you travel often?',
        ctaQuestionAr: 'هل تسافر كثيراً؟',
        features: ['1.5 miles per SAR', 'Airport lounge access'],
        featuresAr: ['1.5 ميل لكل ريال', 'دخول صالات المطارات'],
        badges: [
            { text: 'Travel', textAr: 'سفر', variant: 'category' }
        ],
        icon: 'creditcard',
    },
];

interface RecommendationContext {
    highSpending?: boolean;
    highDiningSpending?: boolean;
    lowSavings?: boolean;
    travelFrequent?: boolean;
}

// Randomly select N products from the list
export function getRandomRecommendations(limit: number = 2): Recommendation[] {
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit);
}

// Get recommendations based on context (e.g. spending habits)
export function getContextualRecommendations(context: RecommendationContext, limit: number = 2): Recommendation[] {
    let filtered = [...products];

    // Sort logic could represent "relevance", effectively just basic prioritization here
    if (context.lowSavings) {
        // Prioritize savings products
        filtered.sort((a, b) => {
            const aIsSavings = a.id.includes('rec-1') || a.id.includes('rec-2') || a.id.includes('rec-3');
            const bIsSavings = b.id.includes('rec-1') || b.id.includes('rec-2') || b.id.includes('rec-3');
            return aIsSavings === bIsSavings ? 0 : aIsSavings ? -1 : 1;
        });
    } else if (context.highSpending) {
        // Prioritize cards
        filtered.sort((a, b) => {
            const aIsCard = a.id.includes('rec-4') || a.id.includes('rec-5');
            const bIsCard = b.id.includes('rec-4') || b.id.includes('rec-5');
            return aIsCard === bIsCard ? 0 : aIsCard ? -1 : 1;
        });
    }

    return filtered.slice(0, limit);
}

/**
 * Adapts the offline mock products into the shape the server actually sends
 * (`ui.productRecommendation`), so the offline fallback renders through the same
 * card as a live response instead of a second, divergent code path.
 */
export function getMockProductRecommendation(
    context: RecommendationContext,
    limit: number = 3,
    contextMessage?: string,
    contextMessageAr?: string
): ProductRecommendationPayload {
    const ICON_MAP: Record<string, string> = {
        savings: 'wallet',
        piggybank: 'piggy-bank',
        target: 'target',
        trending: 'trending-up',
        creditcard: 'credit-card',
    };
    const CATEGORY_MAP: Record<string, Product['category']> = {
        Savings: 'saving',
        Cards: 'credit_card',
        Travel: 'credit_card',
    };

    const recommendations: ProductRecommendation[] = getContextualRecommendations(
        context,
        limit
    ).map(rec => {
        const categoryBadge = rec.badges?.find(b => b.variant === 'category');
        return {
            product: {
                id: rec.id,
                name: rec.title,
                nameAr: rec.titleAr,
                category: CATEGORY_MAP[categoryBadge?.text || ''] || 'saving',
                type: rec.id,
                icon: ICON_MAP[rec.icon] || 'wallet',
                benefit: rec.description,
                benefitAr: rec.descriptionAr,
                eligibilityNote: rec.features?.[0],
                eligibilityNoteAr: rec.featuresAr?.[0],
                isPromoted: rec.badges?.some(b => b.variant === 'special') || false,
            },
            nextStep: rec.ctaQuestion,
            nextStepAr: rec.ctaQuestionAr,
        };
    });

    return { contextMessage, contextMessageAr, showApplyButton: true, recommendations };
}

// ---------------------------------------------------------------------------
// Loan catalogue (offline). The same six lending products the server knows,
// with the rules the eligibility check reads and the terms the loan card
// prices. Only loans with a published rate carry `loan` terms; one priced
// "at market rates" is listed but opens no card.
// ---------------------------------------------------------------------------

import type { LoanProduct } from '../types';

export const mockLoanProducts: LoanProduct[] = [
    {
        id: 'prod-001',
        name: 'Personal Loan',
        nameAr: 'قرض شخصي',
        category: 'lending',
        type: 'personal_loan',
        icon: 'banknote',
        benefit: 'Quick approval within 24 hours',
        benefitAr: 'موافقة سريعة خلال 24 ساعة',
        eligibilityNote: 'Must be employed for at least 3 months',
        eligibilityNoteAr: 'يجب أن تكون موظفاً لمدة 3 أشهر على الأقل',
        isPromoted: false,
        minAmount: 5000,
        maxAmount: 500000,
        minSalary: 5000,
        eligibility: {
            minSalary: 5000,
            minAge: 21,
            maxAge: 60,
            requiresEmployment: true,
            note: 'Must be employed for at least 3 months',
            noteAr: 'يجب أن تكون موظفاً لمدة 3 أشهر على الأقل',
        },
        loan: {
            minAmount: 5000,
            maxAmount: 500000,
            amountStep: 5000,
            minMonths: 12,
            maxMonths: 60,
            monthsStep: 1,
            defaultAmount: 50000,
            defaultMonths: 36,
            rate: { kind: 'apr', percent: 12.5, startingFrom: true },
            fee: { kind: 'fixed', value: 500 },
        },
    },
    {
        id: 'prod-002',
        name: 'Micro Loan',
        nameAr: 'قرض صغير',
        category: 'lending',
        type: 'micro_loan',
        icon: 'zap',
        benefit: 'Instant approval',
        benefitAr: 'موافقة فورية',
        eligibilityNote: 'Available for existing customers with active account',
        eligibilityNoteAr: 'متاح للعملاء الحاليين ذوي الحساب النشط',
        isPromoted: true,
        minAmount: 1000,
        maxAmount: 10000,
        minSalary: 3000,
        eligibility: {
            minSalary: 3000,
            minAccountAge: 3,
            note: 'Available for existing customers with active account',
            noteAr: 'متاح للعملاء الحاليين ذوي الحساب النشط',
        },
        loan: {
            minAmount: 1000,
            maxAmount: 10000,
            amountStep: 500,
            minMonths: 3,
            maxMonths: 12,
            monthsStep: 1,
            defaultAmount: 5000,
            defaultMonths: 6,
            rate: { kind: 'flat', percent: 1.5, startingFrom: false },
            fee: { kind: 'fixed', value: 0 },
        },
    },
    {
        id: 'prod-003',
        name: 'Auto Loan',
        nameAr: 'تمويل سيارة',
        category: 'lending',
        type: 'auto_loan',
        icon: 'car',
        benefit: 'Up to 100% financing',
        benefitAr: 'تمويل يصل إلى 100%',
        eligibilityNote: 'Final approval depends on vehicle valuation',
        eligibilityNoteAr: 'الموافقة النهائية تعتمد على تقييم السيارة',
        isPromoted: false,
        minAmount: 30000,
        maxAmount: 500000,
        minSalary: 6000,
        eligibility: {
            minSalary: 6000,
            minAge: 21,
            maxAge: 65,
            requiresEmployment: true,
            note: 'Final approval depends on vehicle valuation',
            noteAr: 'الموافقة النهائية تعتمد على تقييم السيارة',
        },
        loan: {
            minAmount: 30000,
            maxAmount: 500000,
            amountStep: 5000,
            minMonths: 12,
            maxMonths: 60,
            monthsStep: 1,
            defaultAmount: 100000,
            defaultMonths: 48,
            rate: { kind: 'apr', percent: 2.99, startingFrom: true },
            fee: { kind: 'fixed', value: 1000 },
        },
    },
    {
        id: 'prod-004',
        name: 'Home Financing',
        nameAr: 'تمويل عقاري',
        category: 'lending',
        type: 'mortgage',
        icon: 'home',
        benefit: 'Up to 90% financing',
        benefitAr: 'تمويل يصل إلى 90%',
        eligibilityNote: 'Property must be registered and valued',
        eligibilityNoteAr: 'يجب أن يكون العقار مسجلاً ومقيماً',
        isPromoted: false,
        minAmount: 250000,
        maxAmount: 5000000,
        minSalary: 10000,
        eligibility: {
            minSalary: 10000,
            minAge: 21,
            maxAge: 70,
            requiresEmployment: true,
            note: 'Property must be registered and valued',
            noteAr: 'يجب أن يكون العقار مسجلاً ومقيماً',
        },
        loan: {
            minAmount: 250000,
            maxAmount: 5000000,
            amountStep: 50000,
            minMonths: 60,
            maxMonths: 300,
            monthsStep: 12,
            defaultAmount: 1000000,
            defaultMonths: 240,
            rate: { kind: 'apr', percent: 4.5, startingFrom: true },
            fee: { kind: 'percent', value: 1 },
        },
    },
    {
        id: 'prod-005',
        name: 'Debt Consolidation',
        nameAr: 'توحيد الديون',
        category: 'lending',
        type: 'debt_consolidation',
        icon: 'layers',
        benefit: 'One simple monthly payment',
        benefitAr: 'دفعة شهرية واحدة بسيطة',
        eligibilityNote: 'Must have existing debts to consolidate',
        eligibilityNoteAr: 'يجب أن يكون لديك ديون حالية لتوحيدها',
        isPromoted: true,
        minAmount: 10000,
        maxAmount: 300000,
        minSalary: 5000,
        eligibility: {
            minSalary: 5000,
            minAge: 21,
            requiresEmployment: true,
            note: 'Must have existing debts to consolidate',
            noteAr: 'يجب أن يكون لديك ديون حالية لتوحيدها',
        },
        loan: {
            minAmount: 10000,
            maxAmount: 300000,
            amountStep: 5000,
            minMonths: 12,
            maxMonths: 60,
            monthsStep: 1,
            defaultAmount: 50000,
            defaultMonths: 36,
            rate: { kind: 'apr', percent: 10, startingFrom: true },
            fee: { kind: 'fixed', value: 750 },
        },
    },
    {
        id: 'prod-006',
        name: 'Refinancing',
        nameAr: 'إعادة التمويل',
        category: 'lending',
        type: 'refinancing',
        icon: 'refresh-cw',
        benefit: 'Lower monthly payments',
        benefitAr: 'دفعات شهرية أقل',
        eligibilityNote: 'Must have an existing loan with good payment history',
        eligibilityNoteAr: 'يجب أن يكون لديك قرض حالي بسجل دفع جيد',
        isPromoted: false,
        minAmount: 20000,
        maxAmount: 500000,
        minSalary: 5000,
        eligibility: {
            minSalary: 5000,
            minAccountAge: 6,
            note: 'Must have an existing loan with good payment history',
            noteAr: 'يجب أن يكون لديك قرض حالي بسجل دفع جيد',
        },
        rateText: { en: 'Based on current market rates', ar: 'حسب معدلات السوق الحالية' },
        tenureText: { en: '12–60 months', ar: '12–60 شهر' },
    },
];
