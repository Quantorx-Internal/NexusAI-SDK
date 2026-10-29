import { normaliseResponseData } from './responseData';
import { ChatEvent, ChatMessageUI, LoanOfferUI, LoanOptionsUI, SpendingBreakdown } from '../types';
import { ENV } from '../config/constants';
import { demoLoanOptions, findLoanProduct, loanOffer } from '../lib/loanOptions';
import { quoteLoan, tenureLabel } from '../lib/loans';

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
function getMockResponse(message: string, sessionId: string, locale: string, event?: ChatEvent | null): any | null {
    const lowerMessage = message.toLowerCase();
    const isAr = locale === 'ar';

    // ===== LOANS =====
    // The loan card and the loan list, priced by the app from the same
    // arithmetic the server uses, so the offline demo draws the real cards.
    const loanReply = getMockLoanResponse(message, sessionId, locale, event);
    if (loanReply) return loanReply;

    // ===== PRODUCT APPLICATION QUERIES =====
    // Handle "I want to apply for {product}" messages
    if (lowerMessage.includes('apply for') || lowerMessage.includes('i want to apply') ||
        lowerMessage.includes('أريد التقديم') || lowerMessage.includes('تقديم على')) {

        // Salary-Linked Savings
        if (lowerMessage.includes('salary') || lowerMessage.includes('salary-linked') ||
            lowerMessage.includes('مرتبط بالراتب') || lowerMessage.includes('ادخار مرتبط')) {
            return {
                message: isAr
                    ? 'اختيار رائع! بما أن راتبك يُحوّل إلى بنك ANB فأنت مؤهل. ما النسبة المئوية من راتبك التي تود ادخارها تلقائياً كل شهر؟ (الموصى به: 10-20%)'
                    : "Great choice! Since your salary is transferred to ANB Bank, you're eligible. What percentage of your salary would you like to save automatically each month? (Recommended: 10-20%)",
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
                    ? `**ادخار مرتبط بالراتب**\n\nهذا المنتج يخصم نسبة تختارها من راتبك تلقائياً بمجرد استلامه، قبل أن تنفق.\n\n**المميزات:**\n• معدل ادخار يصل إلى 4%\n• بدون رسوم\n• سحب مرن في أي وقت\n• تتبع التقدم عبر التطبيق\n\n**المتطلبات:**\n• تحويل الراتب إلى حساب ANB bank\n• الحد الأدنى للادخار: 5% من الراتب\n\nهل تود التقديم الآن؟`
                    : `**Salary-Linked Savings**\n\nThis product automatically deducts a percentage you choose from your salary as soon as you receive it, before you spend.\n\n**Features:**\n• Savings rate up to 4%\n• No fees\n• Flexible withdrawal anytime\n• Track progress in the app\n\n**Requirements:**\n• Salary must be transferred to ANB Bank account\n• Minimum savings: 5% of salary\n\nWould you like to apply now?`,
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

    // ===== SAVINGS QUERIES =====
    // "Which savings plans suit me?": the saving products, as the server would offer them.
    if (/\b(saving|savings|save money|deposit plan)\b/.test(lowerMessage) || /ادخار|أدخر|ادخر|توفير/.test(message)) {
        const productRecommendation = getMockProductRecommendation(
            { lowSavings: true },
            3,
            'Your salary is transferred here and your balance stays well above your monthly spending, so a plan that saves before you spend fits you.',
            'راتبك يتحوّل هنا ورصيدك أعلى من مصروفك الشهري بفرق مريح، فخطة تدّخر قبل ما تصرف تناسبك.'
        );
        return {
            message: isAr
                ? 'هذي خطط الادخار اللي تناسب طريقة صرفك. اختر اللي يعجبك وأساعدك تبدأ.'
                : 'Here are the savings plans that fit how you spend. Pick one and I will help you start.',
            sessionId,
            ui: { ...EMPTY_UI, productRecommendation },
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
                message: `مرحباً! أنا مساعد بنك ANB الذكي. يمكنني مساعدتك في:

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
            message: `Hello! I'm your ANB Bank AI Assistant. I can help you with:

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

const EMPTY_UI: ChatMessageUI = {
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
};

/** Which loan a message names, by product keywords in either language. Word-bounded: "car" must not match "card". */
function loanProductIn(text: string): string | null {
    const lower = text.toLowerCase();
    const named = findLoanProduct(text);
    if (named?.loan) return named.id;
    if (/\b(car|vehicle|auto)\b/.test(lower) || /سيار/.test(text)) return 'prod-003';
    if (/\b(home|house|mortgage|property)\b/.test(lower) || /عقار|منزل|بيت/.test(text)) return 'prod-004';
    if (/\b(micro|small|instant)\b.*\bloan\b|\bloan\b.*\b(micro|small|instant)\b/.test(lower) || /قرض صغير|سلفة/.test(text)) return 'prod-002';
    if (/\b(debt|consolidat)/.test(lower) || /توحيد|ديون/.test(text)) return 'prod-005';
    if (/\bpersonal\b/.test(lower) || /شخصي/.test(text)) return 'prod-001';
    return null;
}

/** "100,000", "100 الف", "500k", "1.5 million": the amount a message names, in SAR. */
function amountIn(text: string): number | null {
    const match = text.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
        .match(/(\d[\d,]*(?:\.\d+)?)\s*(k|ألف|الف|آلاف|thousand|مليون|million|m\b)?/i);
    if (!match) return null;
    let value = parseFloat(match[1].replace(/,/g, ''));
    if (!Number.isFinite(value) || value <= 0) return null;
    const unit = (match[2] || '').toLowerCase();
    if (/^(k|ألف|الف|آلاف|thousand)$/.test(unit)) value *= 1_000;
    else if (/^(مليون|million|m)$/.test(unit)) value *= 1_000_000;
    // A bare small number next to a loan is thousands: "100 for a car" is not 100 SAR.
    else if (value < 1000) value *= 1_000;
    return Math.round(value);
}

/** "4 years", "5 سنوات", "60 شهر": the tenure a message names, in months. */
function monthsIn(text: string): number | null {
    const latin = text.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660));
    const years = latin.match(/(\d+)\s*(years?|yrs?|سن(?:ة|وات|ين))/i);
    if (years) return parseInt(years[1], 10) * 12;
    if (/سنتين/.test(latin)) return 24;
    const months = latin.match(/(\d+)\s*(months?|شهر|أشهر|شهور)/i);
    if (months) return parseInt(months[1], 10);
    return null;
}

function getMockLoanResponse(message: string, sessionId: string, locale: string, event?: ChatEvent | null): any | null {
    const isAr = locale === 'ar';
    const lower = message.toLowerCase();
    const reply = (text: string, ui: Partial<ChatMessageUI>) => ({ message: text, sessionId, ui: { ...EMPTY_UI, ...ui } });

    const cardIntro = (offer: LoanOfferUI) => {
        const name = (isAr ? offer.product.nameAr : offer.product.name) || offer.product.name;
        const quote = quoteLoan(offer.terms, offer.amount, offer.months);
        const monthly = Math.round(quote.monthly).toLocaleString('en-US');
        return isAr
            ? `هذا ${name}. حرّك المبلغ والمدة وشوف القسط الشهري، وحالياً يطلع ${monthly} ر.س.`
            : `Here is the ${name}. Slide the amount and the term to see the monthly installment; right now it comes to ${monthly} SAR.`;
    };

    // The user tapped Apply on the loan card: file it as a ticket for the financing team.
    if (event?.type === 'loan') {
        const offer = loanOffer(event.productId, event.amount, event.months);
        if (!offer) return null;
        const quote = quoteLoan(offer.terms, offer.amount, offer.months);
        const ticketNumber = `TKT-${String(Math.floor(100000 + Math.random() * 900000))}`;
        const amount = offer.amount.toLocaleString('en-US');
        const monthly = Math.round(quote.monthly).toLocaleString('en-US');
        const tenure = tenureLabel(offer.months, isAr ? 'ar' : 'en');
        return reply(
            isAr
                ? `تمام، رفعت طلبك: ${amount} ر.س على ${tenure}، والقسط ${monthly} ر.س شهرياً. رقم التذكرة ${ticketNumber}، وفريق التمويل بيتواصل معك. النسبة النهائية والموافقة تعتمد على سياسة البنك والتحقق.`
                : `Filed: ${amount} SAR over ${tenure}, ${monthly} SAR a month. Your ticket is ${ticketNumber} and the financing team will follow up. The final rate and approval depend on bank policy and verification.`,
            {
                ticketCreated: {
                    ticketId: `tkt-${Date.now()}`,
                    ticketNumber,
                    estimatedResolutionTime: isAr ? '1–2 يوم عمل' : '1–2 business days',
                },
            }
        );
    }

    // The user tapped a loan in the list: open its card.
    if (event?.type === 'action' && event.card === 'loanOptions') {
        const picked = event.id ?? '';
        const offer = loanOffer(picked);
        if (offer) return reply(cardIntro(offer), { loanOffer: { ...offer, offline: true } });
        const product = findLoanProduct(picked);
        const name = product ? (isAr ? product.nameAr : product.name) || product.name : event.id;
        return reply(
            isAr
                ? `${name} يُسعّر حسب الطلب. فريق التمويل يراجع قرضك الحالي ويعطيك عرضاً مناسباً.`
                : `${name} is priced on request. The financing team reviews your current loan and comes back with an offer.`,
            {}
        );
    }

    const mentionsLoans = /\b(loans?|financ(e|ing)|borrow|mortgage)\b/.test(lower) || /قرض|قروض|تمويل|سلفة|استلف|أستلف/.test(message);
    if (!mentionsLoans) return null;

    const productId = loanProductIn(message);
    const asksForList =
        /\b(which|what|options|available|list|compare|can i get|eligible)\b/.test(lower)
        || /اي|أي|ايش|وش|المتاح|متاحة|اقدر|أقدر|خيارات|عندكم/.test(message);

    // A loan named, or a purpose: its card. "Which loans can I get?": the list.
    if (productId && (!asksForList || amountIn(message))) {
        const offer = loanOffer(productId, amountIn(message), monthsIn(message));
        if (offer) return reply(cardIntro(offer), { loanOffer: { ...offer, offline: true } });
    }

    const options = demoLoanOptions();
    const count = options.available.length;
    return reply(
        isAr
            ? `تقدر تقدم على ${count} ${count === 1 ? 'تمويل' : 'تمويلات'}. أنسبها لميزانيتك ${options.featured ? 'القرض الأول في القائمة' : 'موضح تحت'}.`
            : `You can apply for ${count} ${count === 1 ? 'loan' : 'loans'}. The one that suits your budget best is at the top.`,
        { loanOptions: options }
    );
}

/**
 * The machine note the agent reads after a tap, appended to the user's text.
 * It goes into the agent's memory with the message, which is the point: three
 * turns later the agent can still see what was tapped.
 */
export function eventNote(event: ChatEvent | null | undefined): string {
    if (!event) return '';
    if (event.type === 'selection') {
        const list = event.selections.map(s => `${s.kind}=${s.id} (${s.name})`).join('; ');
        return `[UI selection] ${list}. The user tapped these cards in the app. These IDs are final: use them as they are, do not show these lists again, and do not ask which one.`;
    }
    if (event.type === 'otp') {
        return '[UI otp] The user typed this code into the OTP card and the app already checked it. Call the pending action tool with this code now. Do not ask for the code again. requestOtp must be false.';
    }
    if (event.type === 'amount') {
        return `[UI amount] amount=${event.amount} currency=${event.currency}. The user entered this in the amount card. Use it as the amount. Do not ask for the amount again. requestAmount must be null.`;
    }
    if (event.type === 'action' && event.card === 'product') {
        return `[UI action] ${event.action} on product ${event.id || ''}. Answer in the message. productRecommendation must be null.`;
    }
    if (event.type === 'action' && event.card === 'quickReply') {
        return `[UI action] quick reply "${event.id || event.action}" tapped.`;
    }
    if (event.type === 'action' && event.action === 'confirm') {
        return `[UI action] confirm on ${event.card}. The user tapped Confirm on the card. Do not show that card again. Continue to the next step of the flow.`;
    }
    if (event.type === 'action' && event.action === 'cancel') {
        return `[UI action] cancel on ${event.card}. The user tapped Cancel. Stop the flow, say it is cancelled, and send no cards.`;
    }
    if (event.type === 'action' && event.action === 'edit') {
        return `[UI action] edit on ${event.card}. The user tapped Edit. Ask what to change. Send a new preview only once you have the new details.`;
    }
    if (event.type === 'loan') {
        return `[UI loan] apply on ${event.productId}: amount=${event.amount} SAR, months=${event.months}. The user set these terms on the loan card and tapped Apply. Call submit_loan_application now: it prices the plan, then files it or tells you to advise first. Do not call quote_loan and do not ask for the amount or tenure again.`;
    }
    if (event.type === 'action' && event.card === 'loanOptions') {
        return `[UI action] open on loanOptions ${event.id}. The user tapped this loan in the loan list. If it has a loan card, call quote_loan for it; else explain it in one or two lines. showLoanOptions must be false.`;
    }
    if (event.type === 'action') return `[UI action] ${event.action} on ${event.card}.`;
    return '';
}

/** The user's words, then the notes the app adds for the agent. */
export function composeAgentInput(text: string, event?: ChatEvent | null, extraNote?: string | null): string {
    const notes = [eventNote(event), extraNote || ''].filter(Boolean);
    return notes.length ? `${text}\n\n${notes.join('\n\n')}` : text;
}

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object';

/**
 * Clean the agent's ui against what the user just did, and against shapes
 * the cards cannot draw. The agent is asked not to repeat a list the user
 * answered; it does anyway, sometimes. These rules make the reply consistent
 * no matter what came back.
 */
export function normaliseUi(input: ChatMessageUI | undefined, event?: ChatEvent | null): ChatMessageUI | undefined {
    if (!isObject(input)) return input;
    const ui: ChatMessageUI = { ...input };

    // A loan card needs its terms; a list needs its rows.
    const offer = ui.loanOffer as LoanOfferUI | null | undefined;
    if (offer && !(isObject(offer) && isObject(offer.terms) && isObject(offer.product))) ui.loanOffer = null;
    const options = ui.loanOptions as LoanOptionsUI | null | undefined;
    if (options && !(isObject(options) && Array.isArray(options.available))) ui.loanOptions = null;
    else if (options && !Array.isArray(options.unavailable)) ui.loanOptions = { ...options, unavailable: [] };

    if (!event) return ui;

    if (event.type === 'selection') {
        // The user answered these lists. Showing them again asks again.
        const flag: Record<string, keyof ChatMessageUI> = {
            account: 'showAccounts',
            beneficiary: 'showBeneficiaries',
            card: 'showCards',
            bill: 'showBills',
        };
        for (const pick of event.selections) {
            const key = flag[pick.kind];
            if (key) (ui as any)[key] = false;
        }
    }

    if (event.type === 'action') {
        if (event.action === 'confirm' || event.action === 'cancel' || event.action === 'edit') {
            // The preview the user acted on is answered. A success card may follow; the preview must not.
            if (event.card === 'transferPreview') ui.transferPreview = null;
            if (event.card === 'cardPreview') ui.cardPreview = null;
            if (event.card === 'billPaymentPreview') ui.billPaymentPreview = null;
        }
        if (event.action === 'cancel') ui.requestOtp = false;
        // The user picked a loan from the list. The list again would ask again.
        if (event.card === 'loanOptions') ui.loanOptions = null;
    }

    if (event.type === 'otp') {
        // The code was sent. Asking again on the same turn is a loop, unless the server says it was wrong.
        if (ui.requestOtp !== true) ui.requestOtp = false;
    }

    if (event.type === 'amount') {
        // The keypad sent a clean number. Drawing it again is a loop.
        ui.requestAmount = null;
    }

    if (event.type === 'loan') {
        // The user applied with these terms. The same card again asks again.
        ui.loanOffer = null;
    }
    return ui;
}

export interface SendMessageOptions {
    /** What the user tapped, for the agent. */
    event?: ChatEvent | null;
    /** A note the app adds for the agent, such as what the loan card's advisor said. */
    note?: string | null;
}

/** The API root without a trailing /api, the way TransactionService resolves it. */
function apiRoot(): string | null {
    const base = ENV.API_CALLBACK_URL;
    if (!base) return null;
    return base.replace(/\/+$/, '').replace(/\/api$/i, '');
}

export class ChatService {
    /**
     * One chat turn. Who answers, in order:
     *  - CHAT_AGENT=api (default): POST {API_CALLBACK_URL}/api/chat, the in-app
     *    agent. It takes the structured event and composes its own notes, so
     *    the message goes clean, with only the advisor's note appended.
     *  - CHAT_AGENT=n8n: the old workflow at N8N_WEBHOOK_URL, which reads the
     *    notes from the text and a language instruction.
     *  Live requests never fall back to another backend or demo data.
     *  Set CHAT_AGENT=mock explicitly for the offline demo.
     */
    static async sendMessage(content: string, sessionId: string, locale: string, options: SendMessageOptions = {}): Promise<any> {
        const { event = null, note = null } = options;
        if (ENV.CHAT_AGENT === 'mock') {
            const demo = getMockResponse(content, sessionId, locale, event);
            if (demo) return demo;
            throw new Error('No demo flow matched');
        }
        const ask = ENV.CHAT_AGENT === 'n8n' ? ChatService.askN8n : ChatService.askApi;
        const answer = await ask(content, sessionId, locale, event, note);
        if (!answer) throw new Error('The selected chat backend is not configured');
        return answer;
    }

    /** The in-app agent at /api/chat. Null when no API callback is configured. */
    static async askApi(
        content: string,
        sessionId: string,
        locale: string,
        event: ChatEvent | null,
        note: string | null
    ): Promise<any | null> {
        const root = apiRoot();
        if (!root) return null;
        const url = `${root}/api/chat`;
        console.log(`ChatService: POST ${url}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // The server composes the event note itself; only the advisor's note rides along.
                message: note ? `${content}\n\n${note}` : content,
                sessionId,
                locale,
                event,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Chat API error ${response.status}: ${errorText.slice(0, 200)}`);
        }
        const data = await response.json();
        if (!data || typeof data.message !== 'string') throw new Error('Chat API returned no message');
        return attachResponseData({ ...data, ui: normaliseUi(data.ui, event) }, sessionId);
    }

    /** The old n8n workflow. Null when no webhook is configured. */
    static async askN8n(
        content: string,
        sessionId: string,
        locale: string,
        event: ChatEvent | null,
        note: string | null
    ): Promise<any | null> {
        if (!N8N_WEBHOOK_URL) return null;
        const agentInput = composeAgentInput(content, event, note);
        {
            console.log('ChatService: Calling N8N webhook...');
            const languageInstruction = `[Response language: Choose from the user's actual request. English input gets English; Arabic input gets Saudi Najdi Arabic; mixed Arabic/English gets Saudi Najdi Arabic. A clear request for a different response language takes priority. Use app locale ${locale} only for language-neutral inputs such as card taps, names, amounts or codes. Ignore the language of system notes and tool data.]`;

            // Prepend the language instruction to the user's message
            const chatInputWithLanguage = `${languageInstruction}\n\nUser message: ${agentInput}`;

            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatInput: chatInputWithLanguage,
                    sessionId,
                    locale,
                    client: 'react-native',
                    apiUrl: ENV.API_CALLBACK_URL,
                    // The structured tap, for a backend that reads events directly.
                    event,
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
                return await attachResponseData({ ...data, ui: normaliseUi(data.ui, event) }, sessionId);
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
            return await attachResponseData({ ...parsed, ui: normaliseUi(parsed.ui, event) }, sessionId);
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
async function attachResponseData(parsed: any, sessionId?: string): Promise<any> {
    const result = { ...parsed };

    Object.assign(result, normaliseResponseData(parsed));
    if (parsed.ui?.spendingInsights) {
        result.spendingInsights = parsed.ui.spendingInsights;
    }
    // transactionList is a query, not data — resolve it against the accounts API.
    if (parsed.ui?.transactionList && !result.transactions) {
        const resolved = await TransactionService.fetchTransactions(parsed.ui.transactionList, sessionId);
        if (resolved) {
            result.transactions = resolved.transactions;
            result.transactionSummary = {
                count: resolved.count,
                shown: resolved.shown,
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
