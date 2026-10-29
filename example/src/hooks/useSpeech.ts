import type { SpeechReference } from '../../../src/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    AudioPlayer,
    createAudioPlayer,
    setAudioModeAsync,
} from 'expo-audio';
import { VoiceService } from '../../../src/services/VoiceService';
import type { AgentVoiceId } from '../../../src/config/agentVoices';

interface UseSpeechOptions {
    language?: string;
    agentVoiceId?: AgentVoiceId;
}

interface SpeakOptions {
    speech?: SpeechReference;
    agentVoiceId?: AgentVoiceId;
}

interface UseSpeechReturn {
    speak: (text: string, messageId: string, options?: SpeakOptions) => Promise<void>;
    stop: () => void;
    toggle: (text: string, messageId: string) => void;
    isSpeaking: boolean;
    isLoading: boolean;
    currentMessageId: string | null;
}

export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
    const { language: defaultLanguage = 'en', agentVoiceId } = options;
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
    const soundRef = useRef<AudioPlayer | null>(null);
    const playbackDoneRef = useRef<(() => void) | null>(null);
    const controllerRef = useRef<AbortController | null>(null);
    const runIdRef = useRef(0);
    const languageRef = useRef(defaultLanguage);
    const agentVoiceIdRef = useRef(agentVoiceId);

    const stop = useCallback(() => {
        runIdRef.current += 1;
        controllerRef.current?.abort();
        controllerRef.current = null;
        const finishPlayback = playbackDoneRef.current;
        playbackDoneRef.current = null;

        const player = soundRef.current;
        soundRef.current = null;
        if (player) {
            try {
                player.volume = 0;
                player.pause();
            } catch {
                // The player may already have finished and removed itself.
            }
        }
        finishPlayback?.();
        if (player && !finishPlayback) {
            try {
                player.remove();
            } catch {
                // The player may already have completed and removed itself.
            }
        }

        setIsSpeaking(false);
        setIsLoading(false);
        setCurrentMessageId(null);
    }, []);

    useEffect(() => {
        const previousLanguage = languageRef.current;
        languageRef.current = defaultLanguage;
        if (previousLanguage !== defaultLanguage) stop();
    }, [defaultLanguage, stop]);

    useEffect(() => {
        agentVoiceIdRef.current = agentVoiceId;
    }, [agentVoiceId]);

    useEffect(() => stop, [stop]);

    const playAudioChunk = useCallback(async (uri: string, runId: number): Promise<boolean> => {
        let player: AudioPlayer | null = null;

        try {
            player = createAudioPlayer({ uri });
            if (runId !== runIdRef.current) {
                player.remove();
                return false;
            }
            soundRef.current = player;

            return await new Promise<boolean>((resolve) => {
                let settled = false;
                let subscription: { remove: () => void } | null = null;
                const finish = (played: boolean) => {
                    if (settled) return;
                    settled = true;
                    subscription?.remove();
                    playbackDoneRef.current = null;
                    if (soundRef.current === player) soundRef.current = null;
                    try {
                        player?.remove();
                    } catch {
                        // The player may already have been removed by stop().
                    }
                    resolve(played);
                };
                subscription = player!.addListener('playbackStatusUpdate', status => {
                    if (status.didJustFinish) finish(true);
                    if (status.error) {
                        console.warn('Skipping a TTS chunk that failed to decode:', status.error);
                        finish(false);
                    }
                });
                playbackDoneRef.current = () => finish(false);
                try {
                    player!.play();
                } catch (error) {
                    console.warn('Skipping a TTS chunk that failed to play:', error);
                    finish(false);
                }
            });
        } catch (error) {
            console.warn('Skipping a TTS chunk that failed to load:', error);
            try {
                player?.remove();
            } catch {
                // Ignore cleanup failures for an unusable player.
            }
            return false;
        }
    }, []);

    const speak = useCallback(async (text: string, messageId: string, speakOptions: SpeakOptions = {}) => {
        if (!speakOptions.speech && !text.trim()) return;

        stop();
        const runId = runIdRef.current;
        const controller = new AbortController();
        controllerRef.current = controller;
        setIsLoading(true);
        setCurrentMessageId(messageId);

        try {
            const languageHint = languageRef.current;
            const batch = await VoiceService.createSpeechBatch(text, languageHint, {
                speech: speakOptions.speech,
                agentVoiceId: speakOptions.agentVoiceId ?? agentVoiceIdRef.current,
                signal: controller.signal,
            });

            let playedAny = false;
            for await (const chunk of batch.jobs) {
                if (controller.signal.aborted || runId !== runIdRef.current) return;
                if (!chunk) continue;

                if (!playedAny) {
                    await setAudioModeAsync({
                        allowsRecording: false,
                        playsInSilentMode: true,
                        shouldPlayInBackground: false,
                    });
                    setIsLoading(false);
                    setIsSpeaking(true);
                }

                const played = await playAudioChunk(chunk.uri, runId);
                playedAny = playedAny || played;
            }

            if (runId === runIdRef.current) {
                setIsLoading(false);
                setIsSpeaking(false);
                setCurrentMessageId(null);
                controllerRef.current = null;
            }
        } catch (error) {
            if (!controller.signal.aborted) console.error('Speech error:', error);
            if (runId === runIdRef.current) {
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
    };
}
