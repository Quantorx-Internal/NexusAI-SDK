import { SpendingBreakdown } from '../types';
import { ENV } from '../config/constants';

import { mockAccounts } from '../data/accounts';
import { mockBeneficiaries } from '../data/beneficiaries';
import { mockCards } from '../data/cards';
import { mockBills } from '../data/bills';
import { mockSpendingBreakdown, generateRandomSpendingBreakdown } from '../data/spending';
import { mockSubscriptions } from '../data/subscriptions';
import { getMockProductRecommendation } from '../data/products';
import { TransactionService } from './TransactionService';

const N8N_WEBHOOK_URL = ENV.N8N_WEBHOOK_URL;
// Generate mock response for common queries (matching web app behavior)
function getMockResponse(message: string, sessionId: string, locale: string): any | null {
    const lowerMessage = message.toLowerCase();
    const isAr = locale === 'ar';

    // ===== PRODUCT APPLICATION QUERIES =====
    // Handle "I want to apply for {product}" messages
    if (lowerMessage.includes('apply for') || lowerMessage.includes('i want to apply') ||
        lowerMessage.includes('أريد التقديم') || lowerMessage.includes('تقديم على')) {

        // Salary-Linked Savings
        if (lowerMessage.includes('salary') || lowerMessage.includes('salary-linked') ||
            lowerMessage.includes('مرتبط بالراتب') || lowerMessage.includes('ادخار مرتبط')) {
            return {
                message: isAr
                    ? 'اختيار رائع! بما أن راتبك يُحوّل إلى بنك AJB فأنت مؤهل. ما النسبة المئوية من راتبك التي تود ادخارها تلقائياً كل شهر؟ (الموصى به: 10-20%)'
                    : "Great choice! Since your salary is transferred to AJB Bank, you're eligible. What percentage of your salary would you like to save automatically each month? (Recommended: 10-20%)",
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }

        // Automatic Savings Plan
        if (lowerMessage.includes('automatic saving') || lowerMessage.includes('auto saving') ||
            lowerMessage.includes('ادخار تلقائي') || lowerMessage.includes('خطة ادخار تلقائية')) {
            return {
                message: isAr
                    ? 'اختيار ممتاز! عادة الادخار المستمر هي المفتاح. كم تود تحويله إلى مدخراتك تلقائياً كل شهر؟'
                    : 'Excellent choice! A consistent savings habit is key. How much would you like to transfer to your savings automatically each month?',
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }

        // Goal-Based Savings
        if (lowerMessage.includes('goal') || lowerMessage.includes('goal-based') ||
            lowerMessage.includes('هدف') || lowerMessage.includes('ادخار قائم على الأهداف')) {
            return {
                message: isAr
                    ? 'الادخار القائم على الأهداف مصمم لمساعدتك في الوصول لأهداف محددة مثل إجازة أو سيارة جديدة. تحدد المبلغ المستهدف والجدول الزمني، ونساعدك على تتبع تقدمك. الحد الأدنى للبدء هو 100 ريال. هل تود تحديد هدف؟'
                    : 'Goal-Based Savings is designed to help you reach specific targets, like a vacation or a new car. You set the goal amount and timeline, and we help you track your progress. The minimum amount to start is 100 SAR. Would you like to set up a goal?',
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }

        // Premium Cashback Card
        if (lowerMessage.includes('cashback') || lowerMessage.includes('premium card') ||
            lowerMessage.includes('استرداد نقدي') || lowerMessage.includes('بطاقة مميزة')) {
            return {
                message: isAr
                    ? 'بطاقة الاسترداد النقدي المميزة تمنحك 2% استرداد على جميع مشترياتك. سأحتاج للتحقق من أهليتك. هل تود المتابعة في طلب البطاقة؟'
                    : "The Premium Cashback Card gives you 2% back on all purchases. I'll need to verify your eligibility. Would you like to proceed with the card application?",
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }

        // Travel Rewards Card
        if (lowerMessage.includes('travel') || lowerMessage.includes('miles') ||
            lowerMessage.includes('سفر') || lowerMessage.includes('أميال')) {
            return {
                message: isAr
                    ? 'بطاقة مكافآت السفر تكسبك 1.5 ميل لكل ريال تنفقه. يمكنك استبدال الأميال برحلات مجانية. بدون رسوم سنوية للسنة الأولى! هل تود التقديم؟'
                    : 'The Travel Rewards Card earns you 1.5 miles per SAR spent. You can redeem miles for free flights. No annual fee for the first year! Would you like to apply?',
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }

        // Personal Loan
        if (lowerMessage.includes('personal loan') || lowerMessage.includes('loan') ||
            lowerMessage.includes('قرض') || lowerMessage.includes('تمويل شخصي')) {
            return {
                message: isAr
                    ? 'نقدم قروضاً شخصية تصل إلى 500,000 ريال بمعدلات تنافسية. سأحتاج للتحقق من أهليتك. ما المبلغ الذي تحتاجه؟'
                    : "We offer personal loans up to 500,000 SAR with competitive rates. I'll need to verify your eligibility. How much do you need?",
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }

        // Bill Payment Autopay
        if (lowerMessage.includes('autopay') || lowerMessage.includes('auto pay') || lowerMessage.includes('bill payment') ||
            lowerMessage.includes('دفع تلقائي') || lowerMessage.includes('دفع الفواتير')) {
            return {
                message: isAr
                    ? 'خدمة الدفع التلقائي للفواتير ستدفع فواتيرك تلقائياً في تاريخ الاستحقاق. ستتلقى تذكيرات قبل كل دفعة. ما الفواتير التي تود إعداد الدفع التلقائي لها؟'
                    : "Bill Payment Autopay will automatically pay your bills on the due date. You'll receive reminders before each payment. Which bills would you like to set up autopay for?",
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    showBills: true,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
                bills: mockBills,
            };
        }

        // Round-Up Savings
        if (lowerMessage.includes('round') || lowerMessage.includes('round-up') ||
            lowerMessage.includes('تقريب') || lowerMessage.includes('ادخار التقريب')) {
            return {
                message: isAr
                    ? 'ادخار التقريب يقرّب كل عملية شراء للريال الأعلى ويضع الفرق في مدخراتك. طريقة سهلة للادخار دون التفكير! هل تود تفعيله الآن؟'
                    : "Round-Up Savings rounds up every purchase to the nearest SAR and puts the difference in your savings. An effortless way to save! Would you like to enable it now?",
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }

        // Virtual Card
        if (lowerMessage.includes('virtual') || lowerMessage.includes('virtual card') ||
            lowerMessage.includes('افتراضية') || lowerMessage.includes('بطاقة افتراضية')) {
            return {
                message: isAr
                    ? 'يمكنني إنشاء بطاقة افتراضية لك فوراً للتسوق الآمن عبر الإنترنت. يمكنك تحديد حد إنفاق لها. ما الحد الذي تريده للبطاقة؟'
                    : 'I can create a virtual card for you instantly for secure online shopping. You can set a spending limit for it. What limit would you like for the card?',
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }

        // Subscription Manager
        if (lowerMessage.includes('subscription') || lowerMessage.includes('manager') ||
            lowerMessage.includes('اشتراك') || lowerMessage.includes('مدير الاشتراكات')) {
            return {
                message: isAr
                    ? 'مدير الاشتراكات سيساعدك على تتبع وإدارة جميع اشتراكاتك المتكررة. يمكنك رؤية الإجمالي الشهري وإلغاء أي اشتراك بنقرة واحدة. هل تود رؤية اشتراكاتك الحالية؟'
                    : "The Subscription Manager will help you track and manage all your recurring subscriptions. You can see your monthly total and cancel any subscription with one tap. Would you like to see your current subscriptions?",
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    showSubscriptions: true,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
                subscriptions: mockSubscriptions,
            };
        }

        // Home Financing
        if (lowerMessage.includes('home') || lowerMessage.includes('house') || lowerMessage.includes('mortgage') ||
            lowerMessage.includes('منزل') || lowerMessage.includes('عقار') || lowerMessage.includes('تمويل عقاري')) {
            return {
                message: isAr
                    ? 'نقدم تمويلاً عقارياً يصل إلى 90% من قيمة العقار لمدة تصل إلى 25 سنة. سأحتاج لبعض المعلومات لحساب أهليتك. ما قيمة العقار الذي تفكر فيه؟'
                    : "We offer home financing up to 90% of the property value for up to 25 years. I'll need some information to calculate your eligibility. What's the value of the property you're considering?",
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }

        // Car Financing
        if (lowerMessage.includes('car') || lowerMessage.includes('vehicle') || lowerMessage.includes('auto') ||
            lowerMessage.includes('سيارة') || lowerMessage.includes('تمويل السيارات')) {
            return {
                message: isAr
                    ? 'نقدم تمويل سيارات بمعدلات تنافسية وموافقة سريعة. سأحتاج لبعض المعلومات. ما نوع السيارة التي تفكر فيها وما السعر التقريبي؟'
                    : "We offer car financing with competitive rates and quick approval. I'll need some information. What type of car are you considering and what's the approximate price?",
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }

        // International Transfer Plus
        if (lowerMessage.includes('international') || lowerMessage.includes('transfer plus') ||
            lowerMessage.includes('دولي') || lowerMessage.includes('التحويل الدولي')) {
            return {
                message: isAr
                    ? 'خدمة التحويل الدولي بلس تمنحك خصم 50% على رسوم التحويل ومعالجة ذات أولوية. هل تود ترقية حسابك لهذه الخدمة؟'
                    : 'International Transfer Plus gives you 50% off transfer fees and priority processing. Would you like to upgrade your account to this service?',
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }

        // Dining Rewards
        if (lowerMessage.includes('dining') || lowerMessage.includes('restaurant') ||
            lowerMessage.includes('مطاعم') || lowerMessage.includes('مكافآت المطاعم')) {
            return {
                message: isAr
                    ? 'برنامج مكافآت المطاعم يمنحك 5% استرداد في أكثر من 2000 مطعم شريك. بناءً على إنفاقك على المطاعم، ستوفر حوالي 150 ريال شهرياً! هل تود الانضمام؟'
                    : "The Dining Rewards program gives you 5% back at over 2000 partner restaurants. Based on your dining spending, you'll save around 150 SAR per month! Would you like to join?",
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }

        // Zakat Calculator
        if (lowerMessage.includes('zakat') || lowerMessage.includes('زكاة') ||
            lowerMessage.includes('حاسبة الزكاة')) {
            return {
                message: isAr
                    ? 'حاسبة الزكاة تحسب زكاتك السنوية تلقائياً بناءً على أرصدتك ومدخراتك. يمكنك أيضاً التبرع مباشرة للجمعيات الخيرية المعتمدة. هل تود حساب زكاتك الآن؟'
                    : 'The Zakat Calculator automatically calculates your annual Zakat based on your balances and savings. You can also donate directly to approved charities. Would you like to calculate your Zakat now?',
                sessionId,
                ui: {
                    showAccounts: true,
                    showBeneficiaries: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
                accounts: mockAccounts,
            };
        }

        // Default fallback for apply
        return {
            message: isAr
                ? 'شكراً لاهتمامك! سأساعدك في التقديم. يرجى تزويدي بمزيد من التفاصيل حول المنتج الذي تريد التقديم عليه.'
                : "Thanks for your interest! I'll help you apply. Please provide more details about which product you'd like to apply for.",
            sessionId,
            ui: {
                showAccounts: false,
                showBeneficiaries: false,
                transferPreview: null,
                transferSuccess: null,
                exchangeRate: null,
                requestOtp: false,
            },
        };
    }

    // ===== PRODUCT DETAILS QUERIES =====
    // Handle "Tell me more about {product}" messages
    if (lowerMessage.includes('tell me more') || lowerMessage.includes('more about') ||
        lowerMessage.includes('details about') || lowerMessage.includes('what is') ||
        lowerMessage.includes('أخبرني المزيد') || lowerMessage.includes('تفاصيل')) {

        // Salary-Linked Savings details
        if (lowerMessage.includes('salary') || lowerMessage.includes('salary-linked') ||
            lowerMessage.includes('مرتبط بالراتب')) {
            return {
                message: isAr
                    ? `**ادخار مرتبط بالراتب**\n\nهذا المنتج يخصم نسبة تختارها من راتبك تلقائياً بمجرد استلامه، قبل أن تنفق.\n\n**المميزات:**\n• معدل ادخار يصل إلى 4%\n• بدون رسوم\n• سحب مرن في أي وقت\n• تتبع التقدم عبر التطبيق\n\n**المتطلبات:**\n• تحويل الراتب إلى حساب AJB bank\n• الحد الأدنى للادخار: 5% من الراتب\n\nهل تود التقديم الآن؟`
                    : `**Salary-Linked Savings**\n\nThis product automatically deducts a percentage you choose from your salary as soon as you receive it, before you spend.\n\n**Features:**\n• Savings rate up to 4%\n• No fees\n• Flexible withdrawal anytime\n• Track progress in the app\n\n**Requirements:**\n• Salary must be transferred to AJB Bank account\n• Minimum savings: 5% of salary\n\nWould you like to apply now?`,
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }

        // Goal-Based Savings details
        if (lowerMessage.includes('goal') || lowerMessage.includes('هدف')) {
            return {
                message: isAr
                    ? `**ادخار قائم على الأهداف**\n\nحدد هدفاً مالياً وسنساعدك على تحقيقه بإيداعات منتظمة.\n\n**المميزات:**\n• تحديد هدف ومبلغ مستهدف\n• تتبع التقدم بنسبة مئوية\n• تذكيرات تحفيزية\n• مكافآت عند تحقيق الهدف\n\n**أمثلة على الأهداف:**\n• إجازة (20,000 ريال)\n• سيارة (50,000 ريال)\n• زفاف (100,000 ريال)\n\nالحد الأدنى للبدء: 100 ريال\n\nهل تود تحديد هدف الآن؟`
                    : `**Goal-Based Savings**\n\nSet a financial goal and we'll help you achieve it with regular deposits.\n\n**Features:**\n• Set a goal and target amount\n• Track progress with percentage\n• Motivational reminders\n• Rewards when you reach your goal\n\n**Example Goals:**\n• Vacation (20,000 SAR)\n• Car (50,000 SAR)\n• Wedding (100,000 SAR)\n\nMinimum to start: 100 SAR\n\nWould you like to set a goal now?`,
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }

        // Default fallback for details
        return {
            message: isAr
                ? 'سأكون سعيداً بتقديم المزيد من المعلومات. أي منتج تود معرفة المزيد عنه؟'
                : "I'd be happy to provide more information. Which product would you like to know more about?",
            sessionId,
            ui: {
                showAccounts: false,
                showBeneficiaries: false,
                transferPreview: null,
                transferSuccess: null,
                exchangeRate: null,
                requestOtp: false,
            },
        };
    }

    // ===== AMOUNT RESPONSES (for savings plan setup) =====
    // Handle amount responses like "100 SAR", "100", "500", etc.
    // This should show accounts to select for the savings debit
    const amountMatch = lowerMessage.match(/^(\d+)\s*(sar|ريال)?$/i) ||
        lowerMessage.match(/(\d+)\s*(sar|ريال)/i);
    if (amountMatch && !lowerMessage.includes('transfer') && !lowerMessage.includes('send') &&
        !lowerMessage.includes('تحويل') && !lowerMessage.includes('ارسل')) {
        const amount = amountMatch[1];
        return {
            message: isAr
                ? `رائع. يرجى اختيار الحساب الذي تريد تحويل ${amount} ريال منه شهرياً.`
                : `Great. Please select the account you want to transfer the ${amount} SAR from monthly.`,
            sessionId,
            ui: {
                showAccounts: true,
                showBeneficiaries: false,
                showCards: false,
                showBills: false,
                showSpendingBreakdown: false,
                showSubscriptions: false,
                transferPreview: null,
                transferSuccess: null,
                exchangeRate: null,
                requestOtp: false,
            },
            accounts: mockAccounts,
        };
    }

    // ===== PERCENTAGE RESPONSES (for salary-linked savings) =====
    // Handle percentage responses like "10%", "20%", "15 percent", etc.
    const percentMatch = lowerMessage.match(/(\d+)\s*(%|percent|بالمائة|٪)/i);
    if (percentMatch) {
        const percent = percentMatch[1];
        return {
            message: isAr
                ? `ممتاز! سيتم ادخار ${percent}% من راتبك تلقائياً كل شهر. يرجى اختيار الحساب الذي تريد الادخار منه.`
                : `Excellent! ${percent}% of your salary will be saved automatically each month. Please select the account you want to save from.`,
            sessionId,
            ui: {
                showAccounts: true,
                showBeneficiaries: false,
                showCards: false,
                showBills: false,
                showSpendingBreakdown: false,
                showSubscriptions: false,
                transferPreview: null,
                transferSuccess: null,
                exchangeRate: null,
                requestOtp: false,
            },
            accounts: mockAccounts,
        };
    }

    // ===== CONFIRMATION RESPONSES (yes, confirm, ok, etc.) =====
    // Handle confirmations for product applications
    const confirmWords = ['yes', 'confirm', 'ok', 'sure', 'proceed', 'نعم', 'موافق', 'تأكيد', 'حسنا'];
    if (confirmWords.some(word => lowerMessage === word || lowerMessage.includes(word))) {
        // Check if it's a short confirmation (not a full sentence about something else)
        if (lowerMessage.length < 30) {
            return {
                message: isAr
                    ? 'تم تفعيل الخدمة بنجاح! ستبدأ في العمل من الشهر القادم. يمكنك تتبع التقدم من قسم "المدخرات" في التطبيق.'
                    : "The service has been activated successfully! It will start working from next month. You can track your progress in the 'Savings' section of the app.",
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    showCards: false,
                    showBills: false,
                    showSpendingBreakdown: false,
                    showSubscriptions: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }
    }

    // ===== ACCOUNT SELECTION (when user selects a specific account) =====
    // This MUST come before general account queries to avoid matching "Main Account" as an account balance request
    const accountSelectionPatterns = [
        'main account', 'secondary account', 'savings account',
        'الحساب الرئيسي', 'الحساب الثانوي', 'حساب التوفير',
        'select account', 'choose account', 'اختر حساب', 'اختيار حساب'
    ];

    const isAccountSelection = accountSelectionPatterns.some(pattern => lowerMessage.includes(pattern)) ||
        lowerMessage.match(/\*{3,4}\d{4}/) || // Matches ****4521 pattern
        (lowerMessage.includes('account') && lowerMessage.length < 30 &&
            !lowerMessage.includes('view') && !lowerMessage.includes('show') &&
            !lowerMessage.includes('check') && !lowerMessage.includes('balance') &&
            !lowerMessage.includes('what') && !lowerMessage.includes('my account'));

    if (isAccountSelection) {
        // Extract account name if possible
        let accountName = 'Main Account';
        let accountNameAr = 'الحساب الرئيسي';

        if (lowerMessage.includes('secondary') || lowerMessage.includes('الثانوي')) {
            accountName = 'Secondary Account';
            accountNameAr = 'الحساب الثانوي';
        } else if (lowerMessage.includes('saving') || lowerMessage.includes('توفير')) {
            accountName = 'Savings Account';
            accountNameAr = 'حساب التوفير';
        }

        return {
            message: isAr
                ? `لقد اخترت ${accountNameAr}. ماذا تود أن تفعل؟ يمكنك إجراء تحويل، دفع فواتير، أو عرض سجل المعاملات.`
                : `You've selected your ${accountName}. What would you like to do? You can make a transfer, pay bills, or view your transaction history.`,
            sessionId,
            ui: {
                showAccounts: false,
                showBeneficiaries: false,
                showCards: false,
                showBills: false,
                showSpendingBreakdown: false,
                showSubscriptions: false,
                transferPreview: null,
                transferSuccess: null,
                exchangeRate: null,
                requestOtp: false,
            },
        };
    }

    // ===== ACCOUNT QUERIES (view accounts, check balances) =====
    // Only match if it's a genuine request to VIEW accounts, not a selection
    if ((lowerMessage.includes('view account') || lowerMessage.includes('show account') ||
        lowerMessage.includes('check balance') || lowerMessage.includes('my balance') ||
        lowerMessage.includes('account balance') || lowerMessage.includes('عرض حساب') ||
        lowerMessage.includes('رصيدي') || lowerMessage.includes('أرصدة')) ||
        (lowerMessage === 'balance' || lowerMessage === 'balances' ||
            lowerMessage === 'رصيد' || lowerMessage === 'حسابات')) {
        const mainAccount = mockAccounts.find(acc => acc.isDefault) || mockAccounts[0];

        // Offline fallback offers, in the same shape the server sends.
        const productRecommendation = getMockProductRecommendation(
            { highSpending: true, highDiningSpending: true, lowSavings: true },
            3,
            'Your dining spending increased by 22% (2,850 SAR) this month. Since your salary is transferred here, a Salary-Linked Savings plan can help you save automatically before you spend.',
            'زاد إنفاقك على المطاعم بنسبة 22% (2,850 ريال) هذا الشهر. بما أن راتبك يُحوّل هنا، يمكن لخطة الادخار المرتبطة بالراتب مساعدتك على الادخار تلقائياً قبل الإنفاق.'
        );

        return {
            message: isAr
                ? `إليك أرصدة حساباتك الحالية. رصيد ${mainAccount.nameAr} هو ${mainAccount.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال سعودي.`
                : `Here are your current account balances. Your ${mainAccount.name} balance is ${mainAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR.`,
            sessionId,
            ui: {
                showAccounts: true,
                showBeneficiaries: false,
                showCards: false,
                showBills: false,
                showSpendingBreakdown: false,
                showSubscriptions: false,
                transferPreview: null,
                transferSuccess: null,
                exchangeRate: null,
                requestOtp: false,
                productRecommendation,
            },
            accounts: mockAccounts,
        };
    }

    // ===== BENEFICIARY SELECTION (when user selects a beneficiary for transfer) =====
    // Handle "I've selected {name} for a transfer" messages
    const beneficiarySelectionMatch = lowerMessage.match(/(?:i've selected|i selected|selected)\s+(.+?)\s+(?:for a transfer|for transfer)/i);
    if (beneficiarySelectionMatch) {
        const beneficiaryName = beneficiarySelectionMatch[1];
        // Find the beneficiary to determine if it's national or international
        const beneficiary = mockBeneficiaries.find(b =>
            b.name.toLowerCase() === beneficiaryName.toLowerCase() ||
            b.nameAr === beneficiaryName
        );
        const transferType = beneficiary?.type === 'international' ? 'international' : 'national';
        const transferTypeAr = transferType === 'international' ? 'دولي' : 'محلي';

        return {
            message: isAr
                ? `لقد اخترت ${beneficiaryName} لتحويل ${transferTypeAr}. كم المبلغ الذي تود إرساله؟`
                : `I've selected ${beneficiaryName} for a ${transferType} transfer. How much would you like to transfer?`,
            sessionId,
            ui: {
                showAccounts: false,
                showBeneficiaries: false,
                showCards: false,
                showBills: false,
                showSpendingBreakdown: false,
                showSubscriptions: false,
                transferPreview: null,
                transferSuccess: null,
                exchangeRate: null,
                requestOtp: false,
            },
        };
    }

    // ===== BENEFICIARY QUERIES =====
    if (lowerMessage.includes('beneficiar') || lowerMessage.includes('مستفيد') ||
        lowerMessage.includes('recipient') || lowerMessage.includes('payee')) {
        return {
            message: isAr
                ? 'إليك قائمة المستفيدين المحفوظين. إلى من تود التحويل؟'
                : 'Here are your saved beneficiaries. Who would you like to transfer to?',
            sessionId,
            ui: {
                showAccounts: false,
                showBeneficiaries: true,
                showCards: false,
                showBills: false,
                showSpendingBreakdown: false,
                showSubscriptions: false,
                transferPreview: null,
                transferSuccess: null,
                exchangeRate: null,
                requestOtp: false,
            },
            beneficiaries: mockBeneficiaries,
        };
    }

    // ===== CARD QUERIES =====
    if (lowerMessage.includes('card') || lowerMessage.includes('بطاقة') ||
        lowerMessage.includes('بطاقات') || lowerMessage.includes('credit') ||
        lowerMessage.includes('debit') || lowerMessage.includes('freeze') ||
        lowerMessage.includes('unfreeze') || lowerMessage.includes('limit')) {
        return {
            message: isAr
                ? 'إليك بطاقاتك. أي بطاقة تود إدارتها؟ يمكنني مساعدتك في تجميد البطاقة أو تغيير الحدود أو إدارة الإعدادات.'
                : 'Here are your cards. Which card would you like to manage? I can help you freeze cards, change limits, or manage settings.',
            sessionId,
            ui: {
                showAccounts: false,
                showBeneficiaries: false,
                showCards: true,
                showBills: false,
                showSpendingBreakdown: false,
                showSubscriptions: false,
                transferPreview: null,
                transferSuccess: null,
                exchangeRate: null,
                requestOtp: false,
            },
            cards: mockCards,
        };
    }

    // ===== BILL QUERIES =====
    if (lowerMessage.includes('bill') || lowerMessage.includes('فاتورة') ||
        lowerMessage.includes('فواتير') || lowerMessage.includes('pay bill') ||
        lowerMessage.includes('electricity') || lowerMessage.includes('water') ||
        lowerMessage.includes('internet') || lowerMessage.includes('phone bill') ||
        lowerMessage.includes('utility') || lowerMessage.includes('كهرباء') ||
        lowerMessage.includes('ماء') || lowerMessage.includes('انترنت')) {
        const pendingBills = mockBills.filter(b => b.status !== 'paid');
        const totalDue = pendingBills.reduce((sum, b) => sum + b.amount, 0);

        return {
            message: isAr
                ? `لديك ${pendingBills.length} فواتير معلقة بإجمالي ${totalDue.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال سعودي. أي فاتورة تود دفعها؟`
                : `You have ${pendingBills.length} pending bills totaling ${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR. Which bill would you like to pay?`,
            sessionId,
            ui: {
                showAccounts: false,
                showBeneficiaries: false,
                showCards: false,
                showBills: true,
                showSpendingBreakdown: false,
                showSubscriptions: false,
                transferPreview: null,
                transferSuccess: null,
                exchangeRate: null,
                requestOtp: false,
            },
            bills: mockBills,
        };
    }

    // ===== SPENDING QUERIES =====
    if (lowerMessage.includes('spend') || lowerMessage.includes('إنفاق') ||
        lowerMessage.includes('مصاريف') || lowerMessage.includes('expense') ||
        lowerMessage.includes('where did') || lowerMessage.includes('how much did') ||
        lowerMessage.includes('breakdown') || lowerMessage.includes('analysis') ||
        lowerMessage.includes('تحليل')) {
        // Generate randomized spending breakdown for each request (matching web behavior)
        const randomizedSpending = generateRandomSpendingBreakdown();
        const totalSpending = randomizedSpending.reduce((sum: number, cat: SpendingBreakdown) => sum + cat.amount, 0);


        // Find top spending category for intro message
        const topCategory = randomizedSpending[0];

        // Offline fallback offers, in the same shape the server sends.
        const productRecommendation = getMockProductRecommendation(
            { highSpending: true, highDiningSpending: true },
            3,
            `Your ${topCategory.categoryName} spending is ${topCategory.percentage.toFixed(1)}% of your total (${topCategory.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR) and ${topCategory.change > 0 ? 'increased' : 'decreased'} by ${Math.abs(topCategory.change)}%. A cashback card could earn you rewards on these purchases, or a savings plan could help you balance it.`,
            `إنفاقك على ${topCategory.categoryNameAr} يمثل ${topCategory.percentage.toFixed(1)}% من إجماليك (${topCategory.amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال) وقد ${topCategory.change > 0 ? 'زاد' : 'انخفض'} بنسبة ${Math.abs(topCategory.change)}%. بطاقة استرداد نقدي يمكن أن تكسبك مكافآت على هذه المشتريات، أو خطة ادخار يمكن أن تساعدك على تحقيق التوازن.`
        );

        return {
            message: isAr
                ? `إليك تحليل إنفاقك لهذا الشهر. إجمالي الإنفاق: ${totalSpending.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال سعودي. أعلى فئة هي ${topCategory.categoryNameAr} بنسبة ${topCategory.percentage.toFixed(1)}% (${topCategory.amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال)، والتي زادت بنسبة ${Math.abs(topCategory.change)}% مقارنة بالشهر الماضي.`
                : `Here is your spending breakdown for this month. Your total spending is ${totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR. Your top category is ${topCategory.categoryName} at ${topCategory.percentage.toFixed(1)}% (${topCategory.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR), which has ${topCategory.change > 0 ? 'increased' : 'decreased'} by ${Math.abs(topCategory.change)}% compared to last month.`,
            sessionId,
            ui: {
                showAccounts: false,
                showBeneficiaries: false,
                showCards: false,
                showBills: false,
                showSpendingBreakdown: true,
                showSubscriptions: false,
                transferPreview: null,
                transferSuccess: null,
                exchangeRate: null,
                requestOtp: false,
                productRecommendation,
            },
            spendingBreakdown: randomizedSpending,
        };
    }

    // ===== SUBSCRIPTION QUERIES =====
    if (lowerMessage.includes('subscription') || lowerMessage.includes('اشتراك') ||
        lowerMessage.includes('اشتراكات') || lowerMessage.includes('recurring') ||
        lowerMessage.includes('monthly') || lowerMessage.includes('netflix') ||
        lowerMessage.includes('spotify') || lowerMessage.includes('streaming')) {
        const activeSubscriptions = mockSubscriptions.filter(s => s.isActive);
        const monthlyTotal = activeSubscriptions
            .filter(s => s.frequency === 'monthly')
            .reduce((sum, s) => sum + s.amount, 0);

        return {
            message: isAr
                ? `لديك ${activeSubscriptions.length} اشتراكات نشطة. إجمالي الاشتراكات الشهرية: ${monthlyTotal.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ريال سعودي`
                : `You have ${activeSubscriptions.length} active subscriptions. Monthly subscription total: ${monthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR`,
            sessionId,
            ui: {
                showAccounts: false,
                showBeneficiaries: false,
                showCards: false,
                showBills: false,
                showSpendingBreakdown: false,
                showSubscriptions: true,
                transferPreview: null,
                transferSuccess: null,
                exchangeRate: null,
                requestOtp: false,
            },
            subscriptions: mockSubscriptions,
        };
    }

    // ===== TRANSFER QUERIES =====
    if (lowerMessage.includes('transfer') || lowerMessage.includes('send') ||
        lowerMessage.includes('تحويل') || lowerMessage.includes('ارسل') ||
        lowerMessage.includes('payment') || lowerMessage.includes('pay to') ||
        lowerMessage.includes('send money') || lowerMessage.includes('wire')) {
        return {
            message: isAr
                ? 'يمكنني مساعدتك في التحويل! اختر الحساب الذي تريد التحويل منه والمستفيد الذي تريد التحويل إليه.'
                : 'I can help you with a transfer! Select the account you want to transfer from and the beneficiary you want to transfer to.',
            sessionId,
            ui: {
                showAccounts: true,
                showBeneficiaries: true,
                showCards: false,
                showBills: false,
                showSpendingBreakdown: false,
                showSubscriptions: false,
                transferPreview: null,
                transferSuccess: null,
                exchangeRate: null,
                requestOtp: false,
            },
            accounts: mockAccounts,
            beneficiaries: mockBeneficiaries,
        };
    }

    // ===== HELP / GREETING QUERIES =====
    if (lowerMessage.includes('help') || lowerMessage.includes('مساعدة') ||
        lowerMessage.includes('what can') || lowerMessage.includes('hi') ||
        lowerMessage.includes('hello') || lowerMessage.includes('مرحبا') ||
        lowerMessage.includes('أهلا') || lowerMessage === '') {
        if (isAr) {
            return {
                message: `مرحباً! أنا مساعد بنك AJB الذكي. يمكنني مساعدتك في:

• عرض أرصدة الحسابات
• إجراء التحويلات (محلية ودولية)
• إدارة المستفيدين
• إدارة البطاقات (تجميد، حدود، إعدادات)
• دفع الفواتير
• تحليل الإنفاق
• إدارة الاشتراكات
• التحقق من أسعار الصرف

كيف يمكنني مساعدتك اليوم؟`,
                sessionId,
                ui: {
                    showAccounts: false,
                    showBeneficiaries: false,
                    showCards: false,
                    showBills: false,
                    showSpendingBreakdown: false,
                    showSubscriptions: false,
                    transferPreview: null,
                    transferSuccess: null,
                    exchangeRate: null,
                    requestOtp: false,
                },
            };
        }
        return {
            message: `Hello! I'm your AJB Bank AI Assistant. I can help you with:

• View account balances
• Make transfers (national & international)
• Manage beneficiaries
• Manage cards (freeze, limits, settings)
• Pay bills
• Analyze spending
• Manage subscriptions
• Check exchange rates

How can I assist you today?`,
            sessionId,
            ui: {
                showAccounts: false,
                showBeneficiaries: false,
                showCards: false,
                showBills: false,
                showSpendingBreakdown: false,
                showSubscriptions: false,
                transferPreview: null,
                transferSuccess: null,
                exchangeRate: null,
                requestOtp: false,
            },
        };
    }

    // ===== SUPPORT / TICKET QUERIES =====
    if (lowerMessage.includes('support') || lowerMessage.includes('help me') ||
        lowerMessage.includes('problem') || lowerMessage.includes('issue') ||
        lowerMessage.includes('complaint') || lowerMessage.includes('ticket') ||
        lowerMessage.includes('دعم') || lowerMessage.includes('مشكلة') ||
        lowerMessage.includes('شكوى')) {
        return {
            message: isAr
                ? 'أنا آسف لسماع أنك تواجه مشكلة. يمكنني إنشاء تذكرة دعم لك. هل يمكنك وصف المشكلة بالتفصيل؟'
                : "I'm sorry to hear you're having an issue. I can create a support ticket for you. Could you describe the problem in detail?",
            sessionId,
            ui: {
                showAccounts: false,
                showBeneficiaries: false,
                showCards: false,
                showBills: false,
                showSpendingBreakdown: false,
                showSubscriptions: false,
                transferPreview: null,
                transferSuccess: null,
                exchangeRate: null,
                requestOtp: false,
            },
        };
    }

    // No match - return null to let N8N handle it
    return null;
}

export class ChatService {
    static async sendMessage(content: string, sessionId: string, locale: string): Promise<any> {
        try {
            // Call N8N webhook FIRST - this matches the web app behavior exactly
            // The web app always calls POST /api/chat which forwards to N8N
            console.log('ChatService: Calling N8N webhook...');
            // Build language instruction for the AI - embed it in the message so AI definitely sees it
            const languageInstruction = locale === 'ar'
                ? '[SYSTEM INSTRUCTION: You MUST respond ONLY in Arabic (العربية). Do not respond in any other language regardless of what language the user writes in.]'
                : '[SYSTEM INSTRUCTION: You MUST respond ONLY in English. Do not respond in any other language regardless of what language the user writes in.]';

            // Prepend the language instruction to the user's message
            const chatInputWithLanguage = `${languageInstruction}\n\nUser message: ${content}`;

            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatInput: chatInputWithLanguage,
                    sessionId,
                    locale,
                    responseLanguage: locale === 'ar' ? 'Arabic' : 'English',
                    client: 'react-native',
                    apiUrl: ENV.API_CALLBACK_URL
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('ChatService: N8N API Error:', response.status, errorText);
                throw new Error(`N8N API Error: ${response.status}`);
            }

            const data = await response.json();
            console.log('ChatService: N8N response received:', Object.keys(data));

            // If no structured response, just return the data with mock data attached
            if (!data.structured) {
                console.log('ChatService: No structured data, using direct response');
                return await attachMockData(data);
            }

            let parsed: any;
            let jsonString = data.structured;

            // Parse the structured JSON from N8N (same as web app does)
            if (typeof jsonString === 'object') {
                parsed = jsonString;
            } else {
                // Clean markdown code blocks if present
                const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (codeBlockMatch) {
                    jsonString = codeBlockMatch[1];
                } else {
                    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        jsonString = jsonMatch[0];
                    }
                }

                try {
                    parsed = JSON.parse(jsonString.trim());
                } catch (jsonError) {
                    console.error('ChatService: Failed to parse N8N JSON response');
                    throw new Error('Invalid JSON from N8N');
                }
            }

            // Attach mock data based on UI flags (same as web app)
            return await attachMockData(parsed);

        } catch (error) {
            console.error('ChatService: Error calling N8N:', error);

            // On N8N error, fall back to mock response (for offline/error resilience)
            console.log('ChatService: Falling back to mock response...');
            const fallbackMock = getMockResponse(content, sessionId, locale);
            if (fallbackMock) {
                return fallbackMock;
            }

            // If no mock available either, throw the error
            throw error;
        }
    }

    static async fetchInitialData() {
        return {
            accounts: mockAccounts,
            beneficiaries: mockBeneficiaries,
            cards: mockCards,
            bills: mockBills,
            spendingBreakdown: mockSpendingBreakdown,
            subscriptions: mockSubscriptions,
        };
    }
}

// Attach mock data based on UI flags from N8N response
async function attachMockData(parsed: any): Promise<any> {
    const result = { ...parsed };

    if (parsed.ui?.showAccounts) {
        result.accounts = mockAccounts;
    }
    if (parsed.ui?.showBeneficiaries) {
        result.beneficiaries = mockBeneficiaries;
    }
    if (parsed.ui?.showCards) {
        result.cards = mockCards;
    }
    if (parsed.ui?.showBills) {
        result.bills = mockBills;
    }
    if (parsed.ui?.showSpendingBreakdown) {
        // Only use mock data as fallback if N8N response doesn't include spending data
        if (!result.spendingBreakdown || result.spendingBreakdown.length === 0) {
            result.spendingBreakdown = generateRandomSpendingBreakdown();
        }
    }
    if (parsed.ui?.showSubscriptions) {
        result.subscriptions = mockSubscriptions;
    }
    if (parsed.ui?.spendingInsights) {
        result.spendingInsights = parsed.ui.spendingInsights;
    }
    // transactionList is a query, not data — resolve it against the accounts API.
    if (parsed.ui?.transactionList && !result.transactions) {
        const resolved = await TransactionService.fetchTransactions(parsed.ui.transactionList);
        if (resolved) {
            result.transactions = resolved.transactions;
            result.transactionSummary = {
                count: resolved.count,
                totalIn: resolved.totalIn,
                totalOut: resolved.totalOut,
                currency: resolved.currency,
            };
        } else {
            // The assistant promised a list it could not fetch. Rendering
            // nothing leaves the reply referring to a card that isn't there,
            // which is indistinguishable from the feature being missing.
            result.transactionsUnavailable = true;
        }
    }
    // NOTE: there is deliberately no mock-recommendation injection here.
    // The server sends real, personalised offers as ui.productRecommendation —
    // it never sends `showRecommendations`. The old branches keyed off that flag
    // and off showSpendingBreakdown, so every offer the user saw was mock data
    // silently standing in for the real thing.
    return result;
}
