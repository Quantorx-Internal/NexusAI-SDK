import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, Account } from '../types';
import { ChatService } from '../services/ChatService';
import { VoiceService } from '../services/VoiceService';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { Locale } from '../contexts/LocaleContext';
import { AppResetManager, CleanupPriority } from '../services/AppResetManager';

interface UseChatViewModelOptions {
    locale?: Locale;
}

// Instance counter for unique IDs
let instanceCounter = 0;

/**
 * End-of-speech detection.
 *
 * Only possible on iOS/Android — expo-av reports `metering` on those platforms
 * only — so the explicit control in listening mode is never optional.
 *
 * The windows are deliberately forgiving. People hesitate inside the values that
 * matter most here ("send five hundred… to… Ahmed"), and clipping the amount or
 * the payee is far worse than waiting an extra beat.
 */
/** Above this dBFS counts as speech rather than room tone. */
const SPEECH_DB = -40;
/** Sustained silence before the take is closed automatically. */
const SILENCE_MS = 1800;
/** Floor so a stray quiet moment at the start can never end the take. */
const MIN_RECORDING_MS = 1000;

export function useChatViewModel(options: UseChatViewModelOptions = {}) {
    const { locale = 'en' } = options;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [sessionId, setSessionId] = useState(() => `session-${Date.now()}`);
    const prevLocaleRef = useRef(locale);
    const instanceIdRef = useRef(`chat-${++instanceCounter}`);
    const isDisposedRef = useRef(false);

    // Recording state
    const recordingRef = useRef<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    /** Input level 0-1, from the recorder's metering callback. */
    const [level, setLevel] = useState(0);
    /** 0-1 progress towards auto-stop, so the UI can show it coming. */
    const [silenceProgress, setSilenceProgress] = useState(0);
    const silenceSinceRef = useRef<number | null>(null);
    const recordingStartedAtRef = useRef<number | null>(null);
    // Lets the metering callback reach the latest stopRecording, which is
    // defined further down.
    const stopRecordingRef = useRef<(() => void) | null>(null);
    const isStartingRef = useRef(false);

    /**
     * Dispose all recording resources
     */
    const disposeRecording = useCallback(async () => {
        console.log(`[useChatViewModel:${instanceIdRef.current}] Disposing recording resources...`);

        if (recordingRef.current) {
            try {
                await recordingRef.current.stopAndUnloadAsync().catch(() => { });
            } catch (error) {
                console.warn('Error disposing recording:', error);
            } finally {
                recordingRef.current = null;
            }
        }

        setIsRecording(false);
        setLevel(0);
        setSilenceProgress(0);
        silenceSinceRef.current = null;
        recordingStartedAtRef.current = null;
        isStartingRef.current = false;

        console.log(`[useChatViewModel:${instanceIdRef.current}] Recording resources disposed`);
    }, []);

    /**
     * Full cleanup for this view model
     */
    const cleanup = useCallback(async () => {
        console.log(`[useChatViewModel:${instanceIdRef.current}] Full cleanup...`);

        isDisposedRef.current = true;
        await disposeRecording();

        // Reset all state
        setMessages([]);
        setIsLoading(false);
        setIsTranscribing(false);

        console.log(`[useChatViewModel:${instanceIdRef.current}] Cleanup complete`);
    }, [disposeRecording]);

    // Register cleanup with AppResetManager
    useEffect(() => {
        const cleanupId = `chat-recording-${instanceIdRef.current}`;

        const unregister = AppResetManager.registerCleanup(
            cleanupId,
            cleanup,
            CleanupPriority.RECORDING
        );

        // Reset disposed state on mount
        isDisposedRef.current = false;

        return () => {
            unregister();
            cleanup();
        };
    }, [cleanup]);

    // Reset chat when locale changes
    useEffect(() => {
        if (prevLocaleRef.current !== locale) {
            console.log(`[useChatViewModel:${instanceIdRef.current}] Locale changed, resetting chat`);
            prevLocaleRef.current = locale;

            // Stop any ongoing recording first
            disposeRecording();

            // Reset messages to empty (WelcomeView will show)
            setMessages([]);
            setSessionId(`session-${Date.now()}`);

            // Reset disposed flag for new locale
            isDisposedRef.current = false;
        }
    }, [locale, disposeRecording]);

    // Reset chat (new session)
    const resetChat = useCallback(() => {
        console.log(`[useChatViewModel:${instanceIdRef.current}] Resetting chat (new session)`);
        disposeRecording();
        setMessages([]);
        setSessionId(`session-${Date.now()}`);
        isDisposedRef.current = false;
    }, [disposeRecording]);

    const sendMessage = useCallback(async (content: string) => {
        // Don't send if disposed
        if (isDisposedRef.current) {
            console.log(`[useChatViewModel:${instanceIdRef.current}] Cannot send - instance disposed`);
            return;
        }

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

            // Check if disposed while waiting for response
            if (isDisposedRef.current) {
                console.log(`[useChatViewModel:${instanceIdRef.current}] Response received but instance disposed`);
                return;
            }

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
                transactions: response.transactions,
                transactionSummary: response.transactionSummary,
                transactionsUnavailable: response.transactionsUnavailable,
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error('Chat error:', error);

            if (!isDisposedRef.current) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: locale === 'ar'
                        ? "عذراً، أواجه مشكلة في الاتصال حالياً. يرجى المحاولة مرة أخرى لاحقاً."
                        : "Sorry, I'm having trouble connecting right now. Please try again later.",
                    timestamp: new Date().toISOString(),
                }]);
            }
        } finally {
            if (!isDisposedRef.current) {
                setIsLoading(false);
            }
        }
    }, [sessionId, locale]);

    // Action handlers
    const handleAction = useCallback((action: string) => {
        sendMessage(action);
    }, [sendMessage]);

    const handleAccountSelect = useCallback((account: Account) => {
        sendMessage(account.name);
    }, [sendMessage]);

    const startRecording = useCallback(async () => {
        if (isDisposedRef.current) {
            console.log(`[useChatViewModel:${instanceIdRef.current}] Cannot start recording - instance disposed`);
            return;
        }

        if (isStartingRef.current || recordingRef.current) return;
        isStartingRef.current = true;

        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                isStartingRef.current = false;
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // Metering drives the listening waveform. `metering` is dBFS
            // (roughly -160 silent to 0 clipping); -60 up is the useful band.
            const { recording } = await Audio.Recording.createAsync(
                { ...Audio.RecordingOptionsPresets.HIGH_QUALITY, isMeteringEnabled: true },
                status => {
                    // `metering` (like `isRecording`) is iOS/Android only, so on
                    // web this never fires with a level. The waveform animates on
                    // its own and treats this as amplitude when it does arrive.
                    const db = (status as any).metering;
                    if (typeof db !== 'number') return;
                    setLevel(Math.max(0, Math.min(1, (db + 60) / 60)));

                    if (Platform.OS === 'web') return;

                    const now = Date.now();
                    if (db > SPEECH_DB) {
                        silenceSinceRef.current = null;
                        setSilenceProgress(0);
                        return;
                    }

                    if (silenceSinceRef.current === null) silenceSinceRef.current = now;
                    const startedAt = recordingStartedAtRef.current ?? now;
                    if (now - startedAt < MIN_RECORDING_MS) return;

                    const quietFor = now - silenceSinceRef.current;
                    setSilenceProgress(Math.min(1, quietFor / SILENCE_MS));
                    if (quietFor >= SILENCE_MS) {
                        silenceSinceRef.current = null;
                        stopRecordingRef.current?.();
                    }
                },
                100
            );

            // Check if disposed while setting up
            if (isDisposedRef.current) {
                await recording.stopAndUnloadAsync().catch(() => { });
                return;
            }

            recordingRef.current = recording;
            recordingStartedAtRef.current = Date.now();
            silenceSinceRef.current = null;
            setSilenceProgress(0);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording:', err);
        } finally {
            isStartingRef.current = false;
        }
    }, []);

    /**
     * Cancel discards the recording without transcribing — the X in listening
     * mode must not send anything.
     */
    const cancelRecording = useCallback(async () => {
        const recording = recordingRef.current;
        recordingRef.current = null;
        setIsRecording(false);
        setLevel(0);
        setSilenceProgress(0);
        silenceSinceRef.current = null;
        recordingStartedAtRef.current = null;
        if (!recording) return;
        try {
            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        } catch (error) {
            console.warn('Error cancelling recording:', error);
        }
    }, []);

    const stopRecording = useCallback(async () => {
        if (!recordingRef.current) return;

        try {
            const recording = recordingRef.current;
            recordingRef.current = null;
            setIsRecording(false);
            setLevel(0);
            setSilenceProgress(0);
            silenceSinceRef.current = null;
            recordingStartedAtRef.current = null;

            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

            const uri = recording.getURI();

            if (uri && !isDisposedRef.current) {
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

                    if (text && !isDisposedRef.current) {
                        await sendMessage(text);
                    }
                } catch (error) {
                    console.error('Voice processing error:', error);
                    // A failed transcription used to end in silence — the overlay
                    // closed and nothing happened, which reads as the mic being
                    // broken. Say so, and point at the way out.
                    if (!isDisposedRef.current) {
                        setMessages(prev => [...prev, {
                            id: `voice-error-${Date.now()}`,
                            role: 'assistant',
                            content: locale === 'ar'
                                ? 'لم أتمكن من سماع ذلك. حاول مرة أخرى أو اكتب رسالتك.'
                                : "I couldn't hear that. Try again, or type your message instead.",
                            timestamp: new Date().toISOString(),
                        }]);
                    }
                } finally {
                    if (!isDisposedRef.current) {
                        setIsTranscribing(false);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to stop recording:', error);
            recordingRef.current = null;
            setIsRecording(false);
        }
    }, [sendMessage, locale]);

    // The metering callback fires before stopRecording exists in scope.
    useEffect(() => {
        stopRecordingRef.current = stopRecording;
    }, [stopRecording]);

    return {
        messages,
        isLoading,
        isTranscribing,
        sendMessage,
        resetChat,
        isRecording,
        level,
        silenceProgress,
        startRecording,
        stopRecording,
        cancelRecording,
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
                const name = locale === 'ar' ? rec?.product?.nameAr : rec?.product?.name;
                sendMessage(`I want to apply for ${name || rec?.product?.name}`);
            },
            onRecommendationDetails: (rec: any) => {
                const name = locale === 'ar' ? rec?.product?.nameAr : rec?.product?.name;
                sendMessage(`Tell me more about ${name || rec?.product?.name}`);
            },
            onTransactionSelect: (tx: any) =>
                sendMessage(`Tell me more about the ${tx.merchantName} transaction`),
        }
    };
}
