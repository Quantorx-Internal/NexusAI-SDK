import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { I18nManager } from 'react-native';
import { reloadAppAsync } from 'expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppResetManager } from '../services/AppResetManager';

type Locale = 'en' | 'ar';

interface LocaleContextType {
    locale: Locale;
    setLocale: (locale: Locale) => Promise<void>;
    isRTL: boolean;
    t: (key: string) => string;
    isChangingLocale: boolean;
    resetKey: number;
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

const DIRECTION_RELOAD_KEY = '@ai_assistant_direction_reload';

/**
 * React Native applies forceRTL only on the next load. A session that keeps
 * running after it sits in a mixed state, an English screen on a
 * right-to-left engine or the reverse, where rows, text and horizontal lists
 * each mirror differently. So when the direction must change, reload now.
 * Returns true when a reload is under way.
 *
 * The guard stops a loop: if one reload did not take, the session carries on
 * in the mixed state, which the hand-mirrored rows still cover.
 */
async function alignEngineDirection(rtl: boolean): Promise<boolean> {
    if (I18nManager.isRTL === rtl) {
        await AsyncStorage.removeItem(DIRECTION_RELOAD_KEY);
        return false;
    }
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    if ((await AsyncStorage.getItem(DIRECTION_RELOAD_KEY)) === String(rtl)) return false;
    await AsyncStorage.setItem(DIRECTION_RELOAD_KEY, String(rtl));
    await reloadAppAsync('Language direction changed');
    return true;
}

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
    const [isChangingLocale, setIsChangingLocale] = useState(false);
    const [resetKey, setResetKey] = useState(0);
    const localeRef = useRef(locale);

    // Keep ref in sync
    useEffect(() => {
        localeRef.current = locale;
    }, [locale]);

    // Load saved locale on mount
    useEffect(() => {
        const loadLocale = async () => {
            try {
                const savedLocale = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
                if (savedLocale === 'en' || savedLocale === 'ar') {
                    setLocaleState(savedLocale);
                    localeRef.current = savedLocale;

                    if (await alignEngineDirection(savedLocale === 'ar')) return;
                }
            } catch (error) {
                console.error('Failed to load locale:', error);
            } finally {
                setIsReady(true);
            }
        };
        loadLocale();
    }, []);

    /**
     * Set locale with proper teardown of all services
     * This is the key method that ensures clean language switching
     */
    const setLocale = useCallback(async (newLocale: Locale) => {
        // Skip if same locale
        if (newLocale === localeRef.current) {
            console.log('[LocaleContext] Same locale, skipping change');
            return;
        }

        console.log(`[LocaleContext] Changing locale from ${localeRef.current} to ${newLocale}`);
        setIsChangingLocale(true);

        try {
            // STEP 1: Execute full app reset (stops all audio, clears state)
            console.log('[LocaleContext] Executing app reset...');
            await AppResetManager.executeReset();

            // STEP 2: Save the new locale
            await AsyncStorage.setItem(LOCALE_STORAGE_KEY, newLocale);

            // STEP 3: Match the engine's direction to the language. When it
            // has to change, the app reloads here and comes back in the new
            // language with every row, text and list mirrored natively.
            if (await alignEngineDirection(newLocale === 'ar')) return;

            // STEP 4: Update locale state (this triggers re-renders)
            setLocaleState(newLocale);
            localeRef.current = newLocale;

            // STEP 5: Increment reset key to force full tree recreation
            setResetKey(prev => prev + 1);

            console.log('[LocaleContext] Locale change complete');
        } catch (error) {
            console.error('[LocaleContext] Failed to change locale:', error);
        } finally {
            setIsChangingLocale(false);
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
        isChangingLocale,
        resetKey,
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
