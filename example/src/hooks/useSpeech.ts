import { useCallback, useRef, useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import { VoiceService } from '../../../src/services/VoiceService';
import type { AgentVoiceId } from '../../../src/config/agentVoices';

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
}

// Detect if text is primarily Arabic
function isArabicText(text: string): boolean {
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/g;
    const arabicChars = text.match(arabicPattern) || [];
    const latinPattern = /[a-zA-Z]/g;
    const latinChars = text.match(latinPattern) || [];
    return arabicChars.length > latinChars.length;
}

export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
    const { language: defaultLanguage = 'en', agentVoiceId } = options;
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const isStoppingRef = useRef(false);

    // Use ref to always have access to current language (fixes stale closure issue)
    const languageRef = useRef(defaultLanguage);
    const agentVoiceIdRef = useRef(agentVoiceId);

    useEffect(() => {
        languageRef.current = defaultLanguage;
    }, [defaultLanguage]);

    useEffect(() => {
        agentVoiceIdRef.current = agentVoiceId;
    }, [agentVoiceId]);

    // Clean markdown and special characters from text
    const cleanText = (text: string): string => {
        return text
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/#{1,6}\s/g, '')
            .replace(/`{1,3}/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/•/g, '')
            .replace(/&/g, 'and')
            .replace(/</g, '')
            .replace(/>/g, '')
            .trim();
    };

    const stop = useCallback(() => {
        isStoppingRef.current = true;
        if (soundRef.current) {
            soundRef.current.stopAsync().catch(() => { });
            soundRef.current.unloadAsync().catch(() => { });
            soundRef.current = null;
        }
        setIsSpeaking(false);
        setIsLoading(false);
        setCurrentMessageId(null);
    }, []);

    const speak = useCallback(async (text: string, messageId: string, speakOptions: SpeakOptions = {}) => {
        if (!text.trim()) return;

        stop();
        isStoppingRef.current = false;

        setIsLoading(true);
        setCurrentMessageId(messageId);

        try {
            const cleanedText = cleanText(text);
            const detectedLanguage = isArabicText(cleanedText) ? 'ar' : 'en';

            const audioUri = await VoiceService.textToSpeech(cleanedText, detectedLanguage, {
                agentVoiceId: speakOptions.agentVoiceId ?? agentVoiceIdRef.current,
            });

            if (isStoppingRef.current) return;

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
            });

            const { sound } = await Audio.Sound.createAsync(
                { uri: audioUri },
                { shouldPlay: true }
            );
            soundRef.current = sound;

            setIsLoading(false);
            setIsSpeaking(true);

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsSpeaking(false);
                    setCurrentMessageId(null);
                    sound.unloadAsync().catch(() => { });
                    soundRef.current = null;
                }
            });
        } catch (error) {
            console.error('Speech error:', error);
            setIsLoading(false);
            setIsSpeaking(false);
            setCurrentMessageId(null);
        }
    }, [stop]);

    const toggle = useCallback((text: string, messageId: string) => {
        if (isSpeaking || isLoading) {
            stop();
        } else {
            speak(text, messageId);
        }
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
