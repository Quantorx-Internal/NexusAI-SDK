import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, Account } from '../types';
import { ChatService } from '../services/ChatService';
import { VoiceService } from '../services/VoiceService';
import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioRecorder,
} from 'expo-audio';
import { Locale } from '../contexts/LocaleContext';

interface UseChatViewModelOptions {
    locale?: Locale;
}

export function useChatViewModel(options: UseChatViewModelOptions = {}) {
    const { locale = 'en' } = options;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [sessionId, setSessionId] = useState(() => `session-${Date.now()}`);
    const prevLocaleRef = useRef(locale);

    // Reset chat when locale changes
    useEffect(() => {
        if (prevLocaleRef.current !== locale) {
            prevLocaleRef.current = locale;
            setMessages([]);
            setSessionId(`session-${Date.now()}`);
        }
    }, [locale]);

    // Reset chat (new session)
    const resetChat = useCallback(() => {
        setMessages([]);
        setSessionId(`session-${Date.now()}`);
    }, []);

    const sendMessage = useCallback(async (content: string) => {
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content,
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            const response = await ChatService.sendMessage(content, sessionId, locale);

            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.message || response.response || "I'm not sure how to respond to that.",
                timestamp: new Date().toISOString(),
                ui: response.ui,
                accounts: response.accounts,
                beneficiaries: response.beneficiaries,
                transferPreview: response.ui?.transferPreview || response.transferPreview,
                // Additional data fields
                cards: response.cards,
                bills: response.bills,
                spendingBreakdown: response.spendingBreakdown,
                subscriptions: response.subscriptions,
                spendingInsights: response.spendingInsights,
                recommendations: response.recommendations,
                recommendationsIntro: response.recommendationsIntro,
                recommendationsIntroAr: response.recommendationsIntroAr,
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: locale === 'ar'
                    ? "عذراً، أواجه مشكلة في الاتصال حالياً. يرجى المحاولة مرة أخرى لاحقاً."
                    : "Sorry, I'm having trouble connecting right now. Please try again later.",
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, locale]);

    // Action handlers
    const handleAction = useCallback((action: string) => {
        sendMessage(action);
    }, [sendMessage]);

    const handleAccountSelect = useCallback((account: Account) => {
        sendMessage(account.name);
    }, [sendMessage]);

    // Recording state
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const [isRecording, setIsRecording] = useState(false);
    const isStartingRef = useRef(false);

    const startRecording = useCallback(async () => {
        if (isStartingRef.current || isRecording) return;
        isStartingRef.current = true;

        try {
            const permission = await requestRecordingPermissionsAsync();
            if (!permission.granted) return;

            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            await recorder.prepareToRecordAsync();
            recorder.record();
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording:', err);
        } finally {
            isStartingRef.current = false;
        }
    }, [isRecording, recorder]);

    const stopRecording = useCallback(async () => {
        if (!isRecording) return;

        try {
            setIsRecording(false);

            await recorder.stop();
            await setAudioModeAsync({ allowsRecording: false });

            const uri = recorder.uri;

            if (uri) {
                // Small delay to ensure file is fully written
                await new Promise(resolve => setTimeout(resolve, 100));

                setIsTranscribing(true);
                try {
                    let text: string | null = null;
                    let retries = 2;

                    while (retries > 0 && !text) {
                        try {
                            text = await VoiceService.speechToText(uri, locale);
                        } catch (sttError: any) {
                            retries--;
                            if (retries > 0) {
                                await new Promise(resolve => setTimeout(resolve, 150));
                            } else {
                                throw sttError;
                            }
                        }
                    }

                    if (text) {
                        await sendMessage(text);
                    }
                } catch (error) {
                    console.error('Voice processing error:', error);
                } finally {
                    setIsTranscribing(false);
                }
            }
        } catch (error) {
            console.error('Failed to stop recording:', error);
            setIsRecording(false);
        }
    }, [isRecording, locale, recorder, sendMessage]);

    return {
        messages,
        isLoading,
        isTranscribing,
        sendMessage,
        resetChat,
        isRecording,
        startRecording,
        stopRecording,
        handlers: {
            onAction: handleAction,
            onAccountSelect: handleAccountSelect,
            onBeneficiarySelect: (b: any) => sendMessage(`${b.name}`),
            onTransferConfirm: () => sendMessage("Confirm the transfer"),
            onTransferEdit: () => sendMessage("I want to edit the transfer details"),
            onTransferCancel: () => sendMessage("Cancel the transfer"),
            // Card handlers
            onCardSelect: (card: any) => sendMessage(`Manage my ${card.name}`),
            onCardActionConfirm: () => sendMessage("Confirm the card action"),
            onCardActionCancel: () => sendMessage("Cancel the card action"),
            // Bill handlers
            onBillSelect: (bill: any) => sendMessage(`Pay my ${bill.providerName} bill`),
            onBillPaymentConfirm: () => sendMessage("Confirm the bill payment"),
            onBillPaymentCancel: () => sendMessage("Cancel the bill payment"),
            // Recommendation handlers
            onRecommendationApply: (rec: any) => {
                const title = locale === 'ar' ? rec.titleAr : rec.title;
                sendMessage(`I want to apply for ${title}`);
            },
            onRecommendationDetails: (rec: any) => {
                const title = locale === 'ar' ? rec.titleAr : rec.title;
                sendMessage(`Tell me more about ${title}`);
            },
        }
    };
}
