import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Locale = 'en' | 'ar';

interface LocaleContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    isRTL: boolean;
    t: (key: string) => string;
}

const translations: Record<Locale, Record<string, string>> = {
    en: {
        // Header
        'header.greeting': 'Good morning',
        'header.aiAssistant': 'ANB AI Assistant',

        // Chat
        'chat.title': 'ANB AI Assistant',
        'chat.placeholder': 'Type a message...',
        'chat.transcribing': 'Transcribing...',
        'chat.send': 'Send',
        'chat.listen': 'Listen',
        'chat.stop': 'Stop',
        'chat.loading': 'Loading...',
        'chat.thinking': 'Thinking...',
        'chat.welcome': 'Hello! How can I help you today?',

        // Accounts
        'account.current': 'Current Account',
        'account.savings': 'Savings Account',
        'account.balance': 'Balance',
        'account.available': 'Available',
        'account.selectAccount': 'Select an account',

        // Beneficiaries
        'beneficiary.title': 'Beneficiaries',
        'beneficiary.selectBeneficiary': 'Select beneficiary',

        // Transfers
        'transfer.title': 'Transfer',
        'transfer.summary': 'Transfer Summary',
        'transfer.from': 'From',
        'transfer.to': 'To',
        'transfer.amount': 'Amount',
        'transfer.type': 'Type',
        'transfer.national': 'National',
        'transfer.international': 'International',
        'transfer.internal': 'Internal',
        'transfer.pending': 'Pending',
        'transfer.exchangeRate': 'Exchange Rate',
        'transfer.convertedAmount': 'Converted Amount',
        'transfer.fees': 'Fees',
        'transfer.purpose': 'Purpose',
        'transfer.total': 'Total',
        'transfer.confirm': 'Confirm',
        'transfer.edit': 'Edit',
        'transfer.cancel': 'Cancel',
        'transfer.success': 'Transfer Successful',
        'transfer.reference': 'Reference',
        'transfer.account': 'Account',
        'transfer.beneficiary': 'Beneficiary',

        // Common
        'common.confirm': 'Confirm',
        'common.cancel': 'Cancel',
        'common.edit': 'Edit',
        'common.save': 'Save',
        'common.close': 'Close',
        'common.back': 'Back',
        'common.next': 'Next',
        'common.done': 'Done',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.loading': 'Loading...',
        'common.noData': 'No data available',
        'common.select': 'Select',
        'common.sar': 'SAR',
    },
    ar: {
        // Header
        'header.greeting': 'صباح الخير',
        'header.aiAssistant': 'مساعد ANB الذكي',

        // Chat
        'chat.title': 'مساعد ANB الذكي',
        'chat.placeholder': 'اكتب رسالة...',
        'chat.transcribing': 'جاري التحويل...',
        'chat.send': 'إرسال',
        'chat.listen': 'استمع',
        'chat.stop': 'إيقاف',
        'chat.loading': 'جاري التحميل...',
        'chat.thinking': 'جاري التفكير...',
        'chat.welcome': 'مرحباً! كيف يمكنني مساعدتك اليوم؟',

        // Accounts
        'account.current': 'حساب جاري',
        'account.savings': 'حساب توفير',
        'account.balance': 'الرصيد',
        'account.available': 'المتاح',
        'account.selectAccount': 'اختر حساباً',

        // Beneficiaries
        'beneficiary.title': 'المستفيدون',
        'beneficiary.selectBeneficiary': 'اختر المستفيد',

        // Transfers
        'transfer.title': 'تحويل',
        'transfer.summary': 'ملخص التحويل',
        'transfer.from': 'من',
        'transfer.to': 'إلى',
        'transfer.amount': 'المبلغ',
        'transfer.type': 'النوع',
        'transfer.national': 'محلي',
        'transfer.international': 'دولي',
        'transfer.internal': 'داخلي',
        'transfer.pending': 'قيد الانتظار',
        'transfer.exchangeRate': 'سعر الصرف',
        'transfer.convertedAmount': 'المبلغ المحول',
        'transfer.fees': 'الرسوم',
        'transfer.purpose': 'الغرض',
        'transfer.total': 'الإجمالي',
        'transfer.confirm': 'تأكيد',
        'transfer.edit': 'تعديل',
        'transfer.cancel': 'إلغاء',
        'transfer.success': 'تم التحويل بنجاح',
        'transfer.reference': 'رقم المرجع',
        'transfer.account': 'حساب',
        'transfer.beneficiary': 'مستفيد',

        // Common
        'common.confirm': 'تأكيد',
        'common.cancel': 'إلغاء',
        'common.edit': 'تعديل',
        'common.save': 'حفظ',
        'common.close': 'إغلاق',
        'common.back': 'رجوع',
        'common.next': 'التالي',
        'common.done': 'تم',
        'common.error': 'خطأ',
        'common.success': 'نجاح',
        'common.loading': 'جاري التحميل...',
        'common.noData': 'لا توجد بيانات',
        'common.select': 'اختر',
        'common.sar': 'ر.س',
    },
};

const LOCALE_STORAGE_KEY = '@ai_assistant_locale';

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({
    children,
    initialLocale = 'en'
}: {
    children: ReactNode;
    initialLocale?: Locale;
}) {
    const [locale, setLocaleState] = useState<Locale>(initialLocale);
    const [isReady, setIsReady] = useState(false);

    // Load saved locale on mount
    useEffect(() => {
        const loadLocale = async () => {
            try {
                const savedLocale = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
                if (savedLocale === 'en' || savedLocale === 'ar') {
                    setLocaleState(savedLocale);

                    // Set RTL if needed (note: requires app restart to take effect)
                    const shouldBeRTL = savedLocale === 'ar';
                    if (I18nManager.isRTL !== shouldBeRTL) {
                        I18nManager.allowRTL(shouldBeRTL);
                        I18nManager.forceRTL(shouldBeRTL);
                    }
                }
            } catch (error) {
                console.error('Failed to load locale:', error);
            } finally {
                setIsReady(true);
            }
        };
        loadLocale();
    }, []);

    const setLocale = useCallback(async (newLocale: Locale) => {
        setLocaleState(newLocale);

        try {
            await AsyncStorage.setItem(LOCALE_STORAGE_KEY, newLocale);

            // Set RTL direction
            const shouldBeRTL = newLocale === 'ar';
            if (I18nManager.isRTL !== shouldBeRTL) {
                I18nManager.allowRTL(shouldBeRTL);
                I18nManager.forceRTL(shouldBeRTL);
                // Note: Full RTL requires app restart on React Native
                // We'll handle visual RTL manually in styles
            }
        } catch (error) {
            console.error('Failed to save locale:', error);
        }
    }, []);

    const t = useCallback((key: string): string => {
        return translations[locale][key] || key;
    }, [locale]);

    const value: LocaleContextType = {
        locale,
        setLocale,
        isRTL: locale === 'ar',
        t,
    };

    // Don't render until we've loaded the saved locale
    if (!isReady) {
        return null;
    }

    return (
        <LocaleContext.Provider value={value}>
            {children}
        </LocaleContext.Provider>
    );
}

export function useLocale() {
    const context = useContext(LocaleContext);
    if (context === undefined) {
        throw new Error('useLocale must be used within a LocaleProvider');
    }
    return context;
}

// Export the type for use in other components
export type { Locale };
