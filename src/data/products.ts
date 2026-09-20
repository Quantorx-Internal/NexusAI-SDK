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
        features: ['Save before you spend', 'Salary must be transferred to AJB Bank account'],
        featuresAr: ['ادخر قبل أن تنفق', 'يجب تحويل الراتب إلى حساب AJB bank'],
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
