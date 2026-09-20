import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Text, TouchableOpacity, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Volume2, VolumeX, Globe, Sparkles, Plus, Bot } from 'lucide-react-native';
import { ChatMessage } from '../components/Chat/ChatMessage';
import { Composer } from '../components/Chat/Composer';
import { ComposerPrompt } from '../components/Chat/ComposerPrompt';
import { TypingIndicator } from '../components/Chat/TypingIndicator';
import { WelcomeView, WelcomeSummary } from '../components/Chat/WelcomeView';
import { useChatViewModel } from '../viewmodels/useChatViewModel';
import { useSpeech } from '../hooks/useSpeech';
import { useLocale } from '../contexts/LocaleContext';
import { computeSuggestions } from '../lib/suggestions';
import { mockAccounts } from '../data/accounts';
import { mockBeneficiaries } from '../data/beneficiaries';
import { mockSubscriptions } from '../data/subscriptions';
import { mockBills } from '../data/bills';
import { mockCards } from '../data/cards';
import { mockSpendingBreakdown } from '../data/spending';

export function ChatScreen() {
    const { locale, setLocale, isRTL, t } = useLocale();
    const { messages, isLoading, isTranscribing, sendMessage, handlers, isRecording, level, silenceProgress, startRecording, stopRecording, cancelRecording, resetChat } = useChatViewModel({ locale });
    const flatListRef = useRef<FlatList>(null);
    const { speak, stop, toggle, isSpeaking, isLoading: isLoadingSpeech, currentMessageId } = useSpeech({ language: locale });
    const [autoSpeak, setAutoSpeak] = React.useState(true);
    const lastMessageIdRef = useRef<string | null>(null);
    const prevLocaleRef = useRef(locale);
    const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasSpokenWelcomeRef = useRef(false);

    // Compute welcome summary from mock data
    const welcomeSummary = useMemo<WelcomeSummary>(() => {
        const totalBalance = mockAccounts.reduce((sum, acc) => sum + acc.balance, 0);
        const monthlySpending = mockSpendingBreakdown.reduce((sum, item) => sum + item.amount, 0);
        const pendingBills = mockBills.filter(b => b.status === 'pending' || b.status === 'overdue');
        const pendingBillsAmount = pendingBills.reduce((sum, b) => sum + b.amount, 0);
        const activeCards = mockCards.filter(c => c.status === 'active').length;

        return {
            totalBalance,
            monthlySpending,
            pendingBills: { count: pendingBills.length, amount: pendingBillsAmount },
            activeCards,
        };
    }, []);

    // Helper to cancel any pending speech timeout
    const cancelPendingSpeech = useCallback(() => {
        if (speechTimeoutRef.current) {
            clearTimeout(speechTimeoutRef.current);
            speechTimeoutRef.current = null;
        }
    }, []);

    // Helper to stop all speech (current + pending)
    const stopAllSpeech = useCallback(() => {
        cancelPendingSpeech();
        stop();
    }, [cancelPendingSpeech, stop]);

    useEffect(() => {
        // Scroll to bottom on new messages or when typing indicator appears
        if (messages.length > 0 || isLoading) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 200);
        }
    }, [messages, isLoading]);

    // Stop speech when locale changes
    useEffect(() => {
        if (prevLocaleRef.current !== locale) {
            prevLocaleRef.current = locale;
            stopAllSpeech(); // Stop all speech (current + pending)
            lastMessageIdRef.current = null; // Reset so welcome message can be spoken
            hasSpokenWelcomeRef.current = false; // Reset for welcome speech
        }
    }, [locale, stopAllSpeech]);

    // Auto-speak welcome message
    useEffect(() => {
        if (!autoSpeak || messages.length > 0 || hasSpokenWelcomeRef.current) return;

        hasSpokenWelcomeRef.current = true;

        const clientName = locale === 'ar' ? 'محمد' : 'Mohammed';
        const greeting = locale === 'ar' ? `هلا ${clientName}` : `Hello, ${clientName}!`;
        const subGreeting = locale === 'ar' ? 'كيف اقدر افيدك اليوم ؟' : 'How can I help you today?';
        const fullGreeting = `${greeting} ${subGreeting}`;

        cancelPendingSpeech();
        stop();

        speechTimeoutRef.current = setTimeout(() => {
            speechTimeoutRef.current = null;
            speak(fullGreeting, 'welcome-speech');
        }, 800);
    }, [messages, autoSpeak, speak, stop, cancelPendingSpeech, locale]);

    // Auto-speak new assistant messages
    useEffect(() => {
        if (!autoSpeak) return;
        if (messages.length === 0) return;

        const lastMessage = messages[messages.length - 1];

        // Only speak if it's a new assistant message
        if (
            lastMessage.role === 'assistant' &&
            lastMessage.id !== lastMessageIdRef.current
        ) {
            lastMessageIdRef.current = lastMessage.id;

            // Cancel any pending speech first
            cancelPendingSpeech();

            // Stop current speech before scheduling new one
            stop();

            // Small delay to ensure the message is rendered
            speechTimeoutRef.current = setTimeout(() => {
                speechTimeoutRef.current = null;
                speak(lastMessage.content, lastMessage.id);
            }, 500);
        }
    }, [messages, autoSpeak, speak, stop, cancelPendingSpeech]);

    // Stop speech when user starts recording
    useEffect(() => {
        if (isRecording) {
            stopAllSpeech();
        }
    }, [isRecording, stopAllSpeech]);

    const handleSpeechToggle = useCallback((text: string, messageId: string) => {
        // If this message is currently speaking/loading, stop it
        if (currentMessageId === messageId && (isSpeaking || isLoadingSpeech)) {
            stopAllSpeech();
        } else {
            // Stop any other speech and speak this message
            stopAllSpeech();
            speak(text, messageId);
        }
    }, [currentMessageId, isSpeaking, isLoadingSpeech, stopAllSpeech, speak]);

    const toggleAutoSpeak = () => {
        if (autoSpeak && (isSpeaking || isLoadingSpeech)) {
            stopAllSpeech();
        }
        setAutoSpeak(!autoSpeak);
    };

    const toggleLanguage = () => {
        const newLocale = locale === 'en' ? 'ar' : 'en';
        setLocale(newLocale);
    };

    const handleNewSession = () => {
        stopAllSpeech();
        hasSpokenWelcomeRef.current = false;
        resetChat();
    };

    const handleSend = (text: string) => {
        stopAllSpeech(); // Stop all speech (current + pending) when user sends a message
        sendMessage(text);
    };

    // Determine effective layout direction (XOR logic)
    const isLayoutRTL = isRTL ? !I18nManager.isRTL : I18nManager.isRTL;

    // Check if we should show welcome view
    const showWelcome = messages.length === 0 && !isLoading;

    /**
     * Chips regenerate after every assistant turn and never repeat the answer
     * just given, so the row is keyed off the message count and excludes what
     * the user has already asked.
     */
    const suggestions = useMemo(
        () =>
            computeSuggestions({
                accounts: mockAccounts,
                bills: mockBills,
                cards: mockCards,
                locale,
                exclude: messages.filter(m => m.role === 'user').map(m => m.content),
            }),
        [messages, locale]
    );

    /** Entity candidates the composer completes against while typing. */
    const entityData = useMemo(
        () => ({
            beneficiaries: mockBeneficiaries,
            accounts: mockAccounts,
            cards: mockCards,
            bills: mockBills,
        }),
        []
    );

    /**
     * Verb-first working status. Derived from what the user just asked, so the
     * wait says what is happening rather than merely that something is.
     */
    const workingStatus = useMemo(() => {
        const lastUser = [...messages].reverse().find(m => m.role === 'user');
        const q = (lastUser?.content || '').toLowerCase();
        const isAr = locale === 'ar';
        if (/transfer|send|حول|حوّل/.test(q)) return isAr ? 'أراجع تفاصيل التحويل' : 'Checking transfer details';
        if (/bill|فاتور/.test(q)) return isAr ? 'أراجع فواتيرك' : 'Checking your bills';
        if (/card|بطاق/.test(q)) return isAr ? 'أراجع بطاقاتك' : 'Checking your cards';
        if (/spend|مصاريف|إنفاق/.test(q)) return isAr ? 'أحلل إنفاقك' : 'Analysing your spending';
        if (/transaction|حرك/.test(q)) return isAr ? 'أجمع حركاتك' : 'Gathering your transactions';
        if (/balance|رصيد/.test(q)) return isAr ? 'أراجع أرصدتك' : 'Checking your balances';
        return isAr ? 'أعمل على طلبك' : 'Working on it';
    }, [messages, locale]);

    // The assistant asks for a value (an amount, an OTP) on its latest turn only —
    // an older request is stale the moment it has been answered or abandoned.
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    const pendingPrompt =
        !isLoading && lastAssistant === messages[messages.length - 1]
            ? lastAssistant?.ui
            : undefined;

    // Dynamic styles based on RTL
    const dynamicStyles = {
        header: [
            styles.header,
            isLayoutRTL && styles.headerRTL,
        ],
        headerTitle: [
            styles.headerTitle,
            isRTL && styles.headerTitleRTL, // Title font style depends on language
        ],
        listContent: [
            styles.listContent,
        ],
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            {/* Header */}
            <View style={dynamicStyles.header}>
                {/* Left section: Bot avatar + Title */}
                <View style={[styles.headerLeftSection, isLayoutRTL && styles.headerLeftSectionRTL]}>
                    <View style={styles.botAvatar}>
                        <Bot size={18} color="#4F008D" />
                    </View>
                    <View style={[styles.titleRow, isLayoutRTL && styles.titleRowRTL]}>
                        <Text style={dynamicStyles.headerTitle}>{t('chat.title')}</Text>
                        <Sparkles size={14} color="#4F008D" style={styles.titleIcon} />
                    </View>
                </View>

                {/* Right section: Controls */}
                <View style={[styles.headerRightSection, isLayoutRTL && styles.headerRightSectionRTL]}>
                    {/* New Session */}
                    <TouchableOpacity
                        style={styles.headerIconButton}
                        onPress={handleNewSession}
                    >
                        <Plus size={20} color="#111827" />
                    </TouchableOpacity>

                    {/* Auto-speak toggle */}
                    <TouchableOpacity
                        style={[styles.headerIconButton, autoSpeak && styles.autoSpeakButtonActive]}
                        onPress={toggleAutoSpeak}
                    >
                        {autoSpeak ? (
                            <Volume2 size={20} color="#4F008D" />
                        ) : (
                            <VolumeX size={20} color="#9CA3AF" />
                        )}
                    </TouchableOpacity>

                    {/* Language toggle */}
                    <TouchableOpacity
                        style={[styles.headerIconButton, isLayoutRTL && styles.headerButtonRTL]}
                        onPress={toggleLanguage}
                    >
                        <Globe size={18} color="#4F008D" />
                        <Text style={styles.languageText}>{locale === 'en' ? 'AR' : 'EN'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {showWelcome ? (
                    <WelcomeView
                        summary={welcomeSummary}
                        locale={locale}
                        isRTL={isRTL}
                        onQuickAction={handleSend}
                    />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <ChatMessage
                                message={item}
                                {...handlers}
                                onSpeechToggle={handleSpeechToggle}
                                isSpeaking={isSpeaking}
                                isLoadingSpeech={isLoadingSpeech}
                                currentSpeakingMessageId={currentMessageId}
                                locale={locale}
                                isRTL={isRTL}
                            />
                        )}
                        contentContainerStyle={dynamicStyles.listContent}
                        keyboardShouldPersistTaps="handled"
                        ListFooterComponent={
                            <TypingIndicator
                                isVisible={isLoading}
                                status={workingStatus}
                                locale={locale}
                            />
                        }
                    />
                )}

                <ComposerPrompt
                    requestAmount={pendingPrompt?.requestAmount}
                    requestOtp={pendingPrompt?.requestOtp}
                    locale={locale}
                    onSubmit={handleSend}
                    disabled={isLoading || isTranscribing}
                />

                <Composer
                    onSend={handleSend}
                    isLoading={isLoading}
                    isTranscribing={isTranscribing}
                    isRecording={isRecording}
                    level={level}
                    silenceProgress={silenceProgress}
                    onStartRecording={startRecording}
                    onStopRecording={stopRecording}
                    onCancelRecording={cancelRecording}
                    suggestions={suggestions}
                    entityData={entityData}
                    locale={locale}
                    isRTL={isRTL}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
    },
    headerRTL: {
        flexDirection: 'row-reverse',
    },
    headerLeftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerLeftSectionRTL: {
        flexDirection: 'row-reverse',
    },
    botAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(79, 0, 141, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    titleRowRTL: {
        flexDirection: 'row-reverse',
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111',
    },
    headerTitleRTL: {
        // Arabic font styling if needed
    },
    titleIcon: {
        marginTop: 1,
    },
    textRTL: {
        textAlign: 'right',
    },
    headerRightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    headerRightSectionRTL: {
        flexDirection: 'row-reverse',
    },
    headerIconButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 20,
        gap: 3,
    },
    headerButtonRTL: {
        flexDirection: 'row-reverse',
    },
    autoSpeakButtonActive: {
        backgroundColor: 'rgba(79, 0, 141, 0.1)',
    },
    languageText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#4F008D',
    },
    keyboardView: {
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 20,
    },
});
