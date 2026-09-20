import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Text, TouchableOpacity, I18nManager, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Volume2, VolumeX, Globe, Sparkles, Plus, Bot, Check, ChevronDown } from 'lucide-react-native';
import { ChatMessage } from '../components/Chat/ChatMessage';
import { ChatInput } from '../components/Chat/ChatInput';
import { TypingIndicator } from '../components/Chat/TypingIndicator';
import { WelcomeView, WelcomeSummary } from '../components/Chat/WelcomeView';
import { useChatViewModel } from '../viewmodels/useChatViewModel';
import { useSpeech } from '../hooks/useSpeech';
import { useLocale } from '../contexts/LocaleContext';
import { mockAccounts } from '../data/accounts';
import { mockBills } from '../data/bills';
import { mockCards } from '../data/cards';
import { mockSpendingBreakdown } from '../data/spending';
import { AGENT_VOICES, AgentVoice, AgentVoiceId, getAgentVoice } from '../../../src/config/agentVoices';

const AGENT_VOICE_STORAGE_KEY = '@ai_assistant_agent_voice';

export function ChatScreen() {
    const { locale, setLocale, isRTL, t } = useLocale();
    const { messages, isLoading, isTranscribing, sendMessage, handlers, isRecording, startRecording, stopRecording, resetChat } = useChatViewModel({ locale });
    const flatListRef = useRef<FlatList>(null);
    const [selectedVoiceId, setSelectedVoiceId] = React.useState<AgentVoiceId>('alaa-omni');
    const selectedVoice = useMemo(() => getAgentVoice(selectedVoiceId), [selectedVoiceId]);
    const { speak, stop, toggle, isSpeaking, isLoading: isLoadingSpeech, currentMessageId } = useSpeech({ language: locale, agentVoiceId: selectedVoiceId });
    const [autoSpeak, setAutoSpeak] = React.useState(true);
    const [isVoicePickerOpen, setIsVoicePickerOpen] = React.useState(false);
    const lastMessageIdRef = useRef<string | null>(null);
    const prevLocaleRef = useRef(locale);
    const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasSpokenWelcomeRef = useRef(false);

    useEffect(() => {
        AsyncStorage.getItem(AGENT_VOICE_STORAGE_KEY)
            .then((savedVoiceId) => {
                const savedVoice = getAgentVoice(savedVoiceId || undefined);
                setSelectedVoiceId(savedVoice.id);
            })
            .catch((error) => console.warn('Failed to load selected agent voice:', error));
    }, []);

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

    const getWelcomeSpeechText = useCallback(() => {
        const clientName = locale === 'ar' ? 'محمد' : 'Mohammed';
        const greeting = locale === 'ar' ? `هلا ${clientName}` : `Hello, ${clientName}!`;
        const subGreeting = locale === 'ar' ? 'كيف اقدر افيدك اليوم ؟' : 'How can I help you today?';
        return `${greeting} ${subGreeting}`;
    }, [locale]);

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

        cancelPendingSpeech();
        stop();

        speechTimeoutRef.current = setTimeout(() => {
            speechTimeoutRef.current = null;
            speak(getWelcomeSpeechText(), 'welcome-speech');
        }, 800);
    }, [messages, autoSpeak, speak, stop, cancelPendingSpeech, getWelcomeSpeechText]);

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

    const handleVoiceSelect = (voice: AgentVoice) => {
        setSelectedVoiceId(voice.id);
        AsyncStorage.setItem(AGENT_VOICE_STORAGE_KEY, voice.id)
            .catch((error) => console.warn('Failed to save selected agent voice:', error));
        setIsVoicePickerOpen(false);
        hasSpokenWelcomeRef.current = true;
        cancelPendingSpeech();
        stop();
        speak(getWelcomeSpeechText(), `voice-preview-${voice.id}`, {
            agentVoiceId: voice.id,
        });
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

                    {locale === 'ar' && (
                        <TouchableOpacity
                            style={[styles.voiceButton, isLayoutRTL && styles.headerButtonRTL]}
                            onPress={() => setIsVoicePickerOpen(true)}
                            activeOpacity={0.72}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text style={styles.voiceButtonText}>{selectedVoice.nameAr}</Text>
                            <ChevronDown size={16} color="#4F008D" />
                        </TouchableOpacity>
                    )}

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

            <Modal
                visible={locale === 'ar' && isVoicePickerOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsVoicePickerOpen(false)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setIsVoicePickerOpen(false)}>
                    <Pressable style={styles.voiceSheet}>
                        <Text style={[styles.voiceSheetTitle, isRTL && styles.textRTL]}>
                            {locale === 'ar' ? 'اختر صوت المساعد' : 'Select agent voice'}
                        </Text>
                        {AGENT_VOICES.map((voice) => {
                            const isSelected = voice.id === selectedVoiceId;
                            return (
                                <TouchableOpacity
                                    key={voice.id}
                                    style={[styles.voiceOption, isSelected && styles.voiceOptionSelected, isLayoutRTL && styles.voiceOptionRTL]}
                                    onPress={() => handleVoiceSelect(voice)}
                                >
                                    <View style={[styles.voiceOptionAvatar, isSelected && styles.voiceOptionAvatarSelected]}>
                                        <Bot size={18} color={isSelected ? '#fff' : '#4F008D'} />
                                    </View>
                                    <View style={styles.voiceOptionTextWrap}>
                                        <Text style={[styles.voiceOptionName, isRTL && styles.textRTL]}>
                                            {locale === 'ar' ? voice.nameAr : voice.name}
                                        </Text>
                                        <Text style={[styles.voiceOptionMeta, isRTL && styles.textRTL]}>
                                            {voice.sex === 'female'
                                                ? (locale === 'ar' ? 'صوت نسائي' : 'Female voice')
                                                : (locale === 'ar' ? 'صوت رجالي' : 'Male voice')}
                                        </Text>
                                    </View>
                                    {isSelected && <Check size={18} color="#4F008D" />}
                                </TouchableOpacity>
                            );
                        })}
                    </Pressable>
                </Pressable>
            </Modal>

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
                        ListFooterComponent={<TypingIndicator isVisible={isLoading} />}
                    />
                )}

                <ChatInput
                    onSend={handleSend}
                    isLoading={isLoading}
                    isTranscribing={isTranscribing}
                    isRecording={isRecording}
                    onStartRecording={startRecording}
                    onStopRecording={stopRecording}
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
    voiceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 58,
        minHeight: 34,
        maxWidth: 110,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 20,
        gap: 4,
        backgroundColor: 'rgba(79, 0, 141, 0.08)',
    },
    voiceButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4F008D',
    },
    languageText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#4F008D',
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: 'flex-start',
        paddingTop: 86,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(17, 24, 39, 0.18)',
    },
    voiceSheet: {
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
    },
    voiceSheetTitle: {
        paddingHorizontal: 4,
        paddingBottom: 8,
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    voiceOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    voiceOptionRTL: {
        flexDirection: 'row-reverse',
    },
    voiceOptionSelected: {
        backgroundColor: 'rgba(79, 0, 141, 0.08)',
    },
    voiceOptionAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(79, 0, 141, 0.1)',
    },
    voiceOptionAvatarSelected: {
        backgroundColor: '#4F008D',
    },
    voiceOptionTextWrap: {
        flex: 1,
    },
    voiceOptionName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
    },
    voiceOptionMeta: {
        marginTop: 2,
        fontSize: 12,
        color: '#6B7280',
    },
    keyboardView: {
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 20,
    },
});
