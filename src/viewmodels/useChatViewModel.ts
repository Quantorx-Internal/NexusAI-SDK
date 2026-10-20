import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, Account, ChatResolution, LoanOfferUI } from '../types';
import { ChatService, SendMessageOptions } from '../services/ChatService';
import { VoiceService } from '../services/VoiceService';
import { AdvisorRemark, LoanAdvisorService } from '../services/LoanAdvisorService';
import { tenureLabel } from '../lib/loans';
import type { LoanPlanChoice, AdvisorAsk } from '../components/Chat/blocks';
import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState,
} from 'expo-audio';
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
 * Only possible on iOS/Android — expo-audio reports `metering` on those platforms
 * only — so the explicit control in listening mode is never optional.
 *
 * The windows are deliberately forgiving. People hesitate inside the values that
 * matter most here ("send five hundred… to… Ahmed"), and clipping the amount or
 * the payee is far worse than waiting an extra beat.
 */
/**
 * Above this dBFS counts as speech rather than room tone. −40 dBFS admitted
 * ordinary phone/room noise as speech on iOS and continually reset auto-send.
 */
const SPEECH_DB = -25;
/** Sustained silence before the take is closed automatically. */
const SILENCE_MS = 2000;
/** Floor so a stray quiet moment at the start can never end the take. */
const MIN_RECORDING_MS = 1000;
/** Recreate the native AVAudioRecorder for every take. */
const RECORDING_OPTIONS = {
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
};

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
    const [isRecording, setIsRecording] = useState(false);
    /** Input level 0-1, from the recorder's metering callback. */
    const [level, setLevel] = useState(0);
    /** 0-1 progress towards auto-stop, so the UI can show it coming. */
    const [silenceProgress, setSilenceProgress] = useState(0);
    const silenceSinceRef = useRef<number | null>(null);
    const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const recordingStartedAtRef = useRef<number | null>(null);
    // Lets silence detection reach stopRecording, which is defined further
    // down without creating a hook-order dependency.
    const stopRecordingRef = useRef<(() => void) | null>(null);
    const isStartingRef = useRef(false);
    const isStoppingRef = useRef(false);
    const recordingActiveRef = useRef(false);
    const disposePromiseRef = useRef<Promise<void> | null>(null);

    const clearSilenceTimeout = useCallback(() => {
        if (silenceTimeoutRef.current !== null) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }
    }, []);

    // Metering status updates can be delayed on iOS, particularly immediately
    // after the recorder starts. The timer guarantees that a silent take still
    // closes after the advertised interval; each detected speech frame resets it.
    const armSilenceTimeout = useCallback(() => {
        clearSilenceTimeout();
        silenceTimeoutRef.current = setTimeout(() => {
            silenceTimeoutRef.current = null;
            if (!recordingActiveRef.current) return;
            silenceSinceRef.current = null;
            stopRecordingRef.current?.();
        }, SILENCE_MS);
    }, [clearSilenceTimeout]);

    const recorder = useAudioRecorder(RECORDING_OPTIONS);
    // Expo's recorder status event signals lifecycle changes, not meter
    // samples. This hook polls native recorder state (including metering) at a
    // fixed interval, which is the supported path for silence detection.
    const recorderState = useAudioRecorderState(recorder, 250);

    useEffect(() => {
        const db = recorderState.metering;
        if (!recordingActiveRef.current || typeof db !== 'number') return;

        setLevel(Math.max(0, Math.min(1, (db + 60) / 60)));
        if (Platform.OS === 'web') return;

        const now = Date.now();
        if (db > SPEECH_DB) {
            silenceSinceRef.current = null;
            armSilenceTimeout();
            setSilenceProgress(0);
            return;
        }

        if (silenceSinceRef.current === null) {
            silenceSinceRef.current = now;
            armSilenceTimeout();
        }
        const startedAt = recordingStartedAtRef.current ?? now;
        if (now - startedAt < MIN_RECORDING_MS) return;

        const quietFor = now - silenceSinceRef.current;
        setSilenceProgress(Math.min(1, quietFor / SILENCE_MS));
        if (quietFor >= SILENCE_MS) {
            silenceSinceRef.current = null;
            clearSilenceTimeout();
            stopRecordingRef.current?.();
        }
    }, [armSilenceTimeout, clearSilenceTimeout, recorderState.metering]);

    /**
     * Dispose all recording resources
     */
    const disposeRecording = useCallback(() => {
        if (disposePromiseRef.current) return disposePromiseRef.current;

        const promise = (async () => {
            console.log(`[useChatViewModel:${instanceIdRef.current}] Disposing recording resources...`);

            // Track activity in JavaScript. Reading recorder.isRecording after
            // expo-audio has released the shared object throws synchronously.
            const wasRecording = recordingActiveRef.current;
            recordingActiveRef.current = false;
            clearSilenceTimeout();
            if (wasRecording) {
                try {
                    await recorder.stop();
                    await setAudioModeAsync({ allowsRecording: false });
                } catch (error) {
                    console.warn('Error disposing recording:', error);
                }
            }

            setIsRecording(false);
            setLevel(0);
            setSilenceProgress(0);
            silenceSinceRef.current = null;
            recordingStartedAtRef.current = null;
            isStartingRef.current = false;
            isStoppingRef.current = false;

            console.log(`[useChatViewModel:${instanceIdRef.current}] Recording resources disposed`);
        })();

        disposePromiseRef.current = promise;
        void promise.finally(() => {
            if (disposePromiseRef.current === promise) disposePromiseRef.current = null;
        });
        return promise;
    }, [clearSilenceTimeout, recorder]);

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
            // useAudioRecorder owns and releases the native recorder on
            // unmount. Do not call it after that shared object is gone.
            isDisposedRef.current = true;
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

    /**
     * The loan card's last remark that did not come from the server. The
     * next turn carries it as a note, so "ok, do that" means the plan the
     * card talked about. The server remembers its own remarks.
     */
    const pendingRemarkRef = useRef<AdvisorRemark | null>(null);

    const sendMessage = useCallback(async (
        content: string,
        options: SendMessageOptions & { display?: string } = {}
    ): Promise<any | null> => {
        // Don't send if disposed
        if (isDisposedRef.current) {
            console.log(`[useChatViewModel:${instanceIdRef.current}] Cannot send - instance disposed`);
            return null;
        }

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content,
            timestamp: new Date().toISOString(),
            ...(options.display ? { display: { kind: 'action' as const, label: options.display } } : null),
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        // The card's advisor spoke since the last turn: tell the agent once.
        const remark = pendingRemarkRef.current;
        pendingRemarkRef.current = null;
        const note = [options.note, remark ? LoanAdvisorService.cardNote(remark) : null].filter(Boolean).join('\n\n') || null;

        try {
            const response = await ChatService.sendMessage(content, sessionId, locale, { event: options.event, note });

            // Check if disposed while waiting for response
            if (isDisposedRef.current) {
                console.log(`[useChatViewModel:${instanceIdRef.current}] Response received but instance disposed`);
                return null;
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
            return response;
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
            return null;
        } finally {
            if (!isDisposedRef.current) {
                setIsLoading(false);
            }
        }
    }, [sessionId, locale]);

    /** Patch how the user answered the card in one assistant message. */
    const resolveMessage = useCallback((messageId: string, resolution: ChatResolution | null) => {
        setMessages(prev => prev.map(m => {
            if (m.id !== messageId) return m;
            if (!resolution) {
                const { resolution: _dropped, ...rest } = m;
                return rest;
            }
            return { ...m, resolution };
        }));
    }, []);

    /** The user tapped a loan in the list: ask the agent for its card. */
    const handleLoanOpen = useCallback((productId: string, name: string, messageId: string) => {
        resolveMessage(messageId, { prompt: 'loanOptions', status: 'done', productId, at: new Date().toISOString() });
        const label = name || productId;
        void sendMessage(label, {
            event: { type: 'action', card: 'loanOptions', action: 'open', id: productId },
            display: locale === 'ar' ? `أبي أشوف ${label}` : `Show me the ${label}`,
        });
    }, [locale, resolveMessage, sendMessage]);

    /**
     * Apply on the loan card. The card dims and its CTA spins until the reply
     * lands: a ticket marks it applied, a dead request marks it failed, and
     * anything else (the agent advising first) hands the card back live.
     */
    const handleLoanApply = useCallback(async (choice: LoanPlanChoice, name: string, messageId: string) => {
        const isAr = locale === 'ar';
        const amount = choice.amount.toLocaleString('en-US');
        const tenure = tenureLabel(choice.months, isAr ? 'ar' : 'en');
        const label = isAr
            ? `طلب التقديم: ${amount} ر.س على ${tenure}`
            : `Apply: ${amount} SAR over ${tenure}`;
        const loan = { amount: choice.amount, months: choice.months };
        resolveMessage(messageId, { prompt: 'loan', status: 'pending', productId: choice.productId, loan, at: new Date().toISOString() });

        const response = await sendMessage(`${isAr ? 'أبي أقدم على' : 'I want to apply for the'} ${name || choice.productId}`, {
            event: { type: 'loan', productId: choice.productId, amount: choice.amount, months: choice.months },
            display: label,
        });
        if (isDisposedRef.current) return;
        if (response === null) {
            // The request died. The reason is on the card, and the CTA is the way to retry.
            resolveMessage(messageId, { prompt: 'loan', status: 'failed', productId: choice.productId, loan, at: new Date().toISOString() });
        } else if (response?.ui?.ticketCreated) {
            resolveMessage(messageId, { prompt: 'loan', status: 'done', productId: choice.productId, loan, at: new Date().toISOString() });
        } else {
            // Not filed: the agent is advising first, or answered with a new card. The user decides again.
            resolveMessage(messageId, null);
        }
    }, [locale, resolveMessage, sendMessage]);

    /** The card's advisor: a remark on the plan the user settled on. */
    const handleLoanAdvise = useCallback(async (
        ask: AdvisorAsk & { offer: LoanOfferUI },
        signal: AbortSignal
    ): Promise<string | null> => {
        const said = messages
            .filter(m => m.role === 'user')
            .map(m => m.content.split('\n\n[UI')[0].trim())
            .filter(Boolean)
            .slice(-3);
        const remark = await LoanAdvisorService.remark({
            sessionId,
            locale,
            productId: ask.productId,
            amount: ask.amount,
            months: ask.months,
            from: ask.from,
            offer: ask.offer,
            customerSaid: said,
        }, signal);
        if (!remark || signal.aborted) return null;
        // The server keeps its own remarks for the next turn; the others ride on the next message.
        if (remark.source !== 'api') pendingRemarkRef.current = remark;
        return remark.text;
    }, [messages, sessionId, locale]);

    // Action handlers
    const handleAction = useCallback((action: string) => {
        sendMessage(action);
    }, [sendMessage]);

    const isAr = locale === 'ar';
    const nameOf = (item: { name?: string; nameAr?: string } | undefined, fallback = '') =>
        (isAr ? item?.nameAr : item?.name) || item?.name || fallback;

    /** A tap in a list card: the words the user would say, plus the ID the agent needs. */
    const select = useCallback((kind: 'account' | 'beneficiary' | 'card' | 'bill', id: string, name: string, text: string) => {
        void sendMessage(text, {
            event: { type: 'selection', selections: [{ kind, id, name }] },
            display: name,
        });
    }, [sendMessage]);

    /** A button on a preview card: confirm, edit or cancel. */
    const act = useCallback((card: 'transferPreview' | 'cardPreview' | 'billPaymentPreview', action: 'confirm' | 'edit' | 'cancel', text: string, display: string) => {
        void sendMessage(text, { event: { type: 'action', card, action }, display });
    }, [sendMessage]);

    const handleAccountSelect = useCallback((account: Account) => {
        select('account', account.id, nameOf(account, account.name), account.name);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [select, isAr]);

    const startRecording = useCallback(async () => {
        if (isDisposedRef.current) {
            console.log(`[useChatViewModel:${instanceIdRef.current}] Cannot start recording - instance disposed`);
            return;
        }

        if (
            isStartingRef.current
            || isStoppingRef.current
            || recordingActiveRef.current
            || isRecording
        ) return;
        isStartingRef.current = true;

        try {
            const permission = await requestRecordingPermissionsAsync();
            if (!permission.granted || isDisposedRef.current) return;

            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            if (isDisposedRef.current) {
                await setAudioModeAsync({ allowsRecording: false });
                return;
            }

            // Passing options forces expo-audio to create a fresh
            // AVAudioRecorder instead of reusing a stopped/error-state one.
            // Audio-session changes from TTS can still be settling on iOS, so
            // retry once after deactivating and restoring recording mode.
            try {
                await recorder.prepareToRecordAsync(RECORDING_OPTIONS);
            } catch (firstError) {
                console.warn('Recorder preparation failed; retrying with a fresh audio session.', firstError);
                await setAudioModeAsync({ allowsRecording: false }).catch(() => { });
                await new Promise(resolve => setTimeout(resolve, 150));
                await setAudioModeAsync({
                    allowsRecording: true,
                    playsInSilentMode: true,
                });
                await recorder.prepareToRecordAsync(RECORDING_OPTIONS);
            }
            recorder.record();
            recordingActiveRef.current = true;

            // Check if disposed while setting up
            if (isDisposedRef.current) {
                recordingActiveRef.current = false;
                await recorder.stop().catch(() => { });
                return;
            }

            recordingStartedAtRef.current = Date.now();
            silenceSinceRef.current = recordingStartedAtRef.current;
            armSilenceTimeout();
            setSilenceProgress(0);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording:', err);
            recordingActiveRef.current = false;
            clearSilenceTimeout();
            setIsRecording(false);
            setLevel(0);
            setSilenceProgress(0);
            await setAudioModeAsync({ allowsRecording: false }).catch(() => { });
        } finally {
            isStartingRef.current = false;
        }
    }, [armSilenceTimeout, clearSilenceTimeout, isRecording, recorder]);

    /**
     * Cancel discards the recording without transcribing — the X in listening
     * mode must not send anything.
     */
    const cancelRecording = useCallback(async () => {
        if (isStoppingRef.current) return;
        const wasRecording = recordingActiveRef.current;
        recordingActiveRef.current = false;
        clearSilenceTimeout();
        setIsRecording(false);
        setLevel(0);
        setSilenceProgress(0);
        silenceSinceRef.current = null;
        recordingStartedAtRef.current = null;
        if (!wasRecording) return;
        isStoppingRef.current = true;
        try {
            await recorder.stop();
            await setAudioModeAsync({ allowsRecording: false });
        } catch (error) {
            console.warn('Error cancelling recording:', error);
        } finally {
            isStoppingRef.current = false;
        }
    }, [clearSilenceTimeout, isRecording, recorder]);

    const stopRecording = useCallback(async () => {
        if (!recordingActiveRef.current || isStoppingRef.current) return;
        isStoppingRef.current = true;

        try {
            recordingActiveRef.current = false;
            clearSilenceTimeout();
            setIsRecording(false);
            setLevel(0);
            setSilenceProgress(0);
            setIsTranscribing(true);
            silenceSinceRef.current = null;
            recordingStartedAtRef.current = null;

            await recorder.stop();
            await setAudioModeAsync({ allowsRecording: false });

            const uri = recorder.uri;

            if (uri && !isDisposedRef.current) {
                // Small delay to ensure file is fully written
                await new Promise(resolve => setTimeout(resolve, 100));

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
            setIsRecording(false);
            setIsTranscribing(false);
        } finally {
            isStoppingRef.current = false;
            if (!isDisposedRef.current) setIsTranscribing(false);
        }
    }, [clearSilenceTimeout, locale, recorder, sendMessage]);

    // Silence detection is defined before stopRecording exists in scope.
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
            onBeneficiarySelect: (b: any) => select('beneficiary', b.id, nameOf(b, b.name), `${b.name}`),
            onTransferConfirm: () => act('transferPreview', 'confirm', 'Confirm the transfer', isAr ? 'تأكيد التحويل' : 'Confirm the transfer'),
            onTransferEdit: () => act('transferPreview', 'edit', 'I want to edit the transfer details', isAr ? 'أبي أعدّل التحويل' : 'Edit the transfer'),
            onTransferCancel: () => act('transferPreview', 'cancel', 'Cancel the transfer', isAr ? 'إلغاء التحويل' : 'Cancel the transfer'),
            // Card handlers
            onCardSelect: (card: any) => select('card', card.id, nameOf(card, card.name), `Manage my ${card.name}`),
            onCardActionConfirm: () => act('cardPreview', 'confirm', 'Confirm the card action', isAr ? 'تأكيد' : 'Confirm'),
            onCardActionCancel: () => act('cardPreview', 'cancel', 'Cancel the card action', isAr ? 'إلغاء' : 'Cancel'),
            // Bill handlers
            onBillSelect: (bill: any) => select('bill', bill.id, (isAr ? bill.providerNameAr : bill.providerName) || bill.providerName, `Pay my ${bill.providerName} bill`),
            onBillPaymentConfirm: () => act('billPaymentPreview', 'confirm', 'Confirm the bill payment', isAr ? 'تأكيد الدفع' : 'Confirm payment'),
            onBillPaymentCancel: () => act('billPaymentPreview', 'cancel', 'Cancel the bill payment', isAr ? 'إلغاء الدفع' : 'Cancel payment'),
            // Recommendation handlers
            onRecommendationApply: (rec: any) => {
                const name = nameOf(rec?.product);
                void sendMessage(`I want to apply for ${name}`, {
                    event: { type: 'action', card: 'product', action: 'apply', id: rec?.product?.id },
                    display: isAr ? `أبي أقدم على ${name}` : `Apply for ${name}`,
                });
            },
            onRecommendationDetails: (rec: any) => {
                const name = nameOf(rec?.product);
                void sendMessage(`Tell me more about ${name}`, {
                    event: { type: 'action', card: 'product', action: 'learnMore', id: rec?.product?.id },
                    display: isAr ? `وش تفاصيل ${name}؟` : `Tell me more about ${name}`,
                });
            },
            onTransactionSelect: (tx: any) =>
                sendMessage(`Tell me more about the ${tx.merchantName} transaction`),
            // Loan handlers
            onLoanOpen: handleLoanOpen,
            onLoanApply: handleLoanApply,
            onLoanAdvise: handleLoanAdvise,
        }
    };
}
