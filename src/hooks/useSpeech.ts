import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { VoiceService } from '../services/VoiceService';
import { AppResetManager, CleanupPriority } from '../services/AppResetManager';
import type { AgentVoiceId } from '../config/agentVoices';

interface UseSpeechOptions {
    language?: string;
    agentVoiceId?: AgentVoiceId;
}

interface SpeakOptions {
    agentVoiceId?: AgentVoiceId;
}

interface UseSpeechReturn {
    speak: (text: string, messageId: string, options?: SpeakOptions) => Promise<void>;
    stop: () => void;
    toggle: (text: string, messageId: string) => void;
    isSpeaking: boolean;
    isLoading: boolean;
    currentMessageId: string | null;
    dispose: () => Promise<void>;
}

function isArabicText(text: string): boolean {
    const arabicChars = text.match(/[\u0600-\u06FF\u0750-\u077F]/g) || [];
    const latinChars = text.match(/[a-zA-Z]/g) || [];
    return arabicChars.length > latinChars.length;
}

let instanceCounter = 0;

export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
    const { language: defaultLanguage = 'en', agentVoiceId } = options;
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const playbackDoneRef = useRef<(() => void) | null>(null);
    const controllerRef = useRef<AbortController | null>(null);
    const runIdRef = useRef(0);
    const isDisposedRef = useRef(false);
    const languageRef = useRef(defaultLanguage);
    const agentVoiceIdRef = useRef(agentVoiceId);
    const instanceIdRef = useRef(`speech-${++instanceCounter}`);

    const stop = useCallback(() => {
        console.log(`[useSpeech:${instanceIdRef.current}] Stopping speech`);
        runIdRef.current += 1;
        controllerRef.current?.abort();
        controllerRef.current = null;
        playbackDoneRef.current?.();
        playbackDoneRef.current = null;

        const sound = soundRef.current;
        soundRef.current = null;
        if (sound) {
            sound.stopAsync().catch(() => undefined);
            sound.unloadAsync().catch(() => undefined);
        }

        setIsSpeaking(false);
        setIsLoading(false);
        setCurrentMessageId(null);
    }, []);

    const dispose = useCallback(async () => {
        isDisposedRef.current = true;
        stop();
    }, [stop]);

    useEffect(() => {
        const cleanupId = `speech-cleanup-${instanceIdRef.current}`;
        isDisposedRef.current = false;

        const unregister = AppResetManager.registerCleanup(
            cleanupId,
            dispose,
            CleanupPriority.AUDIO
        );

        return () => {
            unregister();
            void dispose();
        };
    }, [dispose]);

    useEffect(() => {
        const previousLanguage = languageRef.current;
        languageRef.current = defaultLanguage;
        if (previousLanguage !== defaultLanguage) {
            stop();
            isDisposedRef.current = false;
        }
    }, [defaultLanguage, stop]);

    useEffect(() => {
        agentVoiceIdRef.current = agentVoiceId;
    }, [agentVoiceId]);

    const playAudioChunk = useCallback(async (uri: string, runId: number): Promise<boolean> => {
        let sound: Audio.Sound | null = null;

        try {
            const created = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
            sound = created.sound;

            if (isDisposedRef.current || runId !== runIdRef.current) {
                await sound.unloadAsync().catch(() => undefined);
                return false;
            }

            soundRef.current = sound;

            return await new Promise<boolean>((resolve) => {
                let settled = false;

                const finish = (played: boolean) => {
                    if (settled) return;
                    settled = true;
                    playbackDoneRef.current = null;
                    if (soundRef.current === sound) soundRef.current = null;
                    sound?.unloadAsync().catch(() => undefined);
                    resolve(played);
                };

                playbackDoneRef.current = () => finish(false);
                sound?.setOnPlaybackStatusUpdate((status: any) => {
                    if (status.isLoaded && status.didJustFinish) finish(true);
                    if (!status.isLoaded && status.error) {
                        console.warn('Skipping a TTS chunk that failed to decode:', status.error);
                        finish(false);
                    }
                });

                sound?.playAsync().catch(error => {
                    console.warn('Skipping a TTS chunk that failed to play:', error);
                    finish(false);
                });
            });
        } catch (error) {
            console.warn('Skipping a TTS chunk that failed to load:', error);
            await sound?.unloadAsync().catch(() => undefined);
            return false;
        }
    }, []);

    const speak = useCallback(async (text: string, messageId: string, speakOptions: SpeakOptions = {}) => {
        if (isDisposedRef.current || !text.trim()) return;

        stop();
        const runId = runIdRef.current;
        const controller = new AbortController();
        controllerRef.current = controller;
        setIsLoading(true);
        setCurrentMessageId(messageId);

        try {
            const detectedLanguage = isArabicText(text) ? 'ar' : 'en';
            console.log(`[useSpeech:${instanceIdRef.current}] Preparing TTS in ${detectedLanguage}`);

            // All synthesis jobs start in parallel. Awaiting by index below keeps
            // playback ordered even when later chunks finish first.
            const batch = await VoiceService.createSpeechBatch(text, detectedLanguage, {
                agentVoiceId: speakOptions.agentVoiceId ?? agentVoiceIdRef.current,
                signal: controller.signal,
            });

            let playedAny = false;
            for (const job of batch.jobs) {
                const chunk = await job;
                if (
                    controller.signal.aborted
                    || isDisposedRef.current
                    || runId !== runIdRef.current
                ) return;
                if (!chunk) continue;

                if (!playedAny) {
                    await Audio.setAudioModeAsync({
                        allowsRecordingIOS: false,
                        playsInSilentModeIOS: true,
                        staysActiveInBackground: false,
                    });
                    setIsLoading(false);
                    setIsSpeaking(true);
                }

                const played = await playAudioChunk(chunk.uri, runId);
                playedAny = playedAny || played;
            }

            if (runId === runIdRef.current && !isDisposedRef.current) {
                setIsLoading(false);
                setIsSpeaking(false);
                setCurrentMessageId(null);
                controllerRef.current = null;
            }
        } catch (error) {
            if (!controller.signal.aborted) {
                console.error(`[useSpeech:${instanceIdRef.current}] Speech error:`, error);
            }
            if (runId === runIdRef.current && !isDisposedRef.current) {
                setIsLoading(false);
                setIsSpeaking(false);
                setCurrentMessageId(null);
                controllerRef.current = null;
            }
        }
    }, [playAudioChunk, stop]);

    const toggle = useCallback((text: string, messageId: string) => {
        if (isSpeaking || isLoading) stop();
        else void speak(text, messageId);
    }, [isSpeaking, isLoading, speak, stop]);

    return {
        speak,
        stop,
        toggle,
        isSpeaking,
        isLoading,
        currentMessageId,
        dispose,
    };
}
