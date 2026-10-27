import type { SpeechReference } from '../types';
import * as FileSystem from 'expo-file-system/legacy';
import { ENV } from '../config/constants';
import type { SpeechSpeakerSex, TtsEngine } from './SpeechTextService';
import { fetch as streamFetch } from 'expo/fetch';
import { readSpeechStream } from './speechStream';
import { AgentVoiceId } from '../config/agentVoices';

export interface TextToSpeechOptions {
    /** Server-owned chat reply. When present, client text and locale are not sent. */
    speech?: SpeechReference;
    /** @deprecated The server voice preset controls synthesis settings. */
    engine?: TtsEngine;
    /** @deprecated The server derives speaker gender from the selected voice. */
    speakerSex?: SpeechSpeakerSex;
    agentVoiceId?: AgentVoiceId;
    signal?: AbortSignal;
}

export interface SpeechAudioChunk {
    index: number;
    text: string;
    uri: string;
    durationSec?: number;
    warnings: string[];
}

export interface SpeechSynthesisBatch {
    engine: TtsEngine;
    text: string;
    chunks: string[];
    /** Server-generated audio in playback order. */
    jobs: AsyncIterable<SpeechAudioChunk>;
}

export class VoiceService {
    static async textToSpeech(text: string, locale = 'en', options: TextToSpeechOptions = {}): Promise<string> {
        const batch = await this.createSpeechBatch(text, locale, options);
        for await (const chunk of batch.jobs) return chunk.uri;
        throw new Error('No speech audio could be generated');
    }

    static async createSpeechBatch(text: string, locale = 'en', options: TextToSpeechOptions = {}): Promise<SpeechSynthesisBatch> {
        if (!options.speech && !text.trim()) throw new Error('No speakable text was provided');
        const root = ENV.API_CALLBACK_URL?.replace(/\/+$/, '').replace(/\/api$/i, '');
        if (!root) throw new Error('Configure API_CALLBACK_URL for speech');
        // The server owns the voice reference, speed, rewrite and loudness settings,
        // exactly as it does for web playback. Never synthesize a generic substitute.
        const endpoint = options.speech ? '/api/tts/reply?stream=1' : '/api/tts/stream';
        const response = await streamFetch(`${root}${endpoint}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...(options.speech ? { speech: options.speech } : { text, language: locale }), voiceId: options.agentVoiceId ?? ENV.TTS_VOICE_ID }),
            signal: options.signal,
        });
        if (!response.ok) throw new Error(`Speech API failed (${response.status}): ${(await response.text()).slice(0, 200)}`);
        if (!response.body) throw new Error('Speech API returned no stream');
        const jobs = async function* (): AsyncGenerator<SpeechAudioChunk> {
            for await (const audio of readSpeechStream(response.body!, options.signal)) {
                const format = audio.mime === 'audio/mpeg' ? 'mp3' : audio.mime === 'audio/wav' ? 'wav' : null;
                if (!format) throw new Error(`Unsupported speech audio: ${audio.mime}`);
                const directory = FileSystem.cacheDirectory;
                if (!directory) throw new Error('No writable audio cache directory');
                const uri = `${directory}tts_${Date.now()}_${audio.index}_${Math.random().toString(36).slice(2)}.${format}`;
                await FileSystem.writeAsStringAsync(uri, audio.data, { encoding: FileSystem.EncodingType.Base64 });
                yield { index: audio.index, uri, text: '', durationSec: audio.durationSec, warnings: [] };
            }
        };
        return { engine: 'omnivoice', text, chunks: [], jobs: jobs() };
    }

    static async speechToText(audioUri: string, language: 'en' | 'ar' | 'auto' = 'auto'): Promise<string> {
        try {
            if (
                ENV.STT_PROVIDER === 'self-hosted'
                || (!ENV.OPENAI_API_KEY && ENV.STT_SELF_HOSTED_URL)
            ) {
                return await this.transcribeWithSelfHosted(audioUri, language);
            }
            return await this.transcribeWithOpenAI(audioUri, language);
        } catch (error) {
            console.error('VoiceService STT Error:', error);
            throw error;
        }
    }

    private static async transcribeWithOpenAI(audioUri: string, language: 'en' | 'ar' | 'auto'): Promise<string> {
        if (!ENV.OPENAI_API_KEY) throw new Error('Missing OpenAI API key for speech recognition.');

        return this.uploadTranscription(
            'https://api.openai.com/v1/audio/transcriptions',
            audioUri,
            language,
            {
                Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
                Accept: 'application/json',
            },
            {
                model: 'gpt-4o-transcribe',
                response_format: 'json',
            },
            'OpenAI'
        );
    }

    private static async transcribeWithSelfHosted(audioUri: string, language: 'en' | 'ar' | 'auto'): Promise<string> {
        if (!ENV.STT_SELF_HOSTED_URL) throw new Error('Missing self-hosted STT URL.');

        return this.uploadTranscription(
            `${ENV.STT_SELF_HOSTED_URL}/v1/audio/transcriptions`,
            audioUri,
            language,
            { Accept: 'application/json' },
            { model: 'deepdml/faster-whisper-large-v3-turbo-ct2' },
            'Self-hosted STT'
        );
    }

    /**
     * Uses the native file uploader instead of fetch/FormData. Expo's fetch
     * implementation accepts Blob/File parts only and rejects React Native URI
     * descriptors, while the uploader streams a `file://` recording directly.
     */
    private static async uploadTranscription(
        url: string,
        audioUri: string,
        language: 'en' | 'ar' | 'auto',
        headers: Record<string, string>,
        parameters: Record<string, string>,
        provider: string
    ): Promise<string> {
        // AVAudioRecorder.stop() can return before the container has finished
        // being flushed on a physical iOS device. This is more visible in a
        // Release/TestFlight build than in a debugger-attached run. Do not
        // hand OpenAI a zero-byte or partially-written m4a file.
        let fileInfo: { exists: boolean; size?: number } | null = null;
        let previousSize = -1;
        for (let attempt = 0; attempt < 12; attempt += 1) {
            fileInfo = await FileSystem.getInfoAsync(audioUri);
            const size = fileInfo.exists && typeof fileInfo.size === 'number' ? fileInfo.size : 0;
            if (size > 1024 && size === previousSize) break;
            previousSize = size;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        const finalSize = fileInfo?.exists && typeof fileInfo.size === 'number' ? fileInfo.size : 0;
        console.log(`[VoiceService] STT recording ready: ${audioUri} (${finalSize} bytes)`);
        if (!fileInfo?.exists || finalSize <= 1024) {
            throw new Error(`Recorded audio file is unavailable or empty (${finalSize} bytes).`);
        }

        const extension = audioUri.split('?')[0].split('.').pop()?.toLowerCase() || 'm4a';
        const mimeType = extension === 'm4a' ? 'audio/mp4' : `audio/${extension}`;

        const response = await FileSystem.uploadAsync(url, audioUri, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'file',
            mimeType,
            headers,
            // Let the transcription model recognize mixed speech unless explicitly restricted.
            parameters: { ...parameters, ...(language !== 'auto' && { language }) },
        });
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`${provider} failed (${response.status}): ${response.body.slice(0, 300)}`);
        }

        const result = JSON.parse(response.body);
        if (typeof result?.text !== 'string') {
            throw new Error(`${provider} returned no transcription text.`);
        }
        return result.text;
    }
}
