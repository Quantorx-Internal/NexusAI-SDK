import * as FileSystem from 'expo-file-system/legacy';
import NativeFormData from 'react-native/Libraries/Network/FormData';
import { ENV } from '../config/constants';
import {
    SpeechSpeakerSex,
    SpeechTextService,
    TtsEngine,
} from './SpeechTextService';
import { AgentVoice, AgentVoiceId, getAgentVoice } from '../config/agentVoices';

export interface TextToSpeechOptions {
    engine?: TtsEngine;
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
    /** Jobs start in parallel. Await them by index to keep playback ordered. */
    jobs: Array<Promise<SpeechAudioChunk | null>>;
}

interface RunpodOutput {
    audio_b64?: string | null;
    sample_rate?: number;
    format?: string;
    duration_sec?: number;
    warnings?: string[];
}

const RUNPOD_BASE_URL = 'https://api.runpod.ai/v2';
const RUNPOD_TIMEOUT_MS = 180_000;
const RUNPOD_POLL_INTERVAL_MS = 1_200;

function createFormData(): any {
    return new NativeFormData();
}

function cancellationError(): Error {
    const error = new Error('Speech synthesis was cancelled.');
    error.name = 'AbortError';
    return error;
}

function isCancellation(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(cancellationError());
            return;
        }

        const timeout = setTimeout(() => {
            signal?.removeEventListener('abort', abort);
            resolve();
        }, ms);
        const abort = () => {
            clearTimeout(timeout);
            reject(cancellationError());
        };
        signal?.addEventListener('abort', abort, { once: true });
    });
}

async function responseError(response: Response): Promise<Error> {
    const body = await response.text().catch(() => '');
    const suffix = body ? `: ${body.slice(0, 300)}` : '';
    return new Error(`Runpod request failed (${response.status})${suffix}`);
}

export class VoiceService {
    private static warnedAboutLoudness = false;

    static async textToSpeech(
        text: string,
        locale: string = 'en',
        options: TextToSpeechOptions = {}
    ): Promise<string> {
        const batch = await this.createSpeechBatch(text, locale, options);

        for (const job of batch.jobs) {
            const result = await job;
            if (result) return result.uri;
        }

        throw new Error('No speech audio could be generated.');
    }

    static async createSpeechBatch(
        text: string,
        locale: string = 'en',
        options: TextToSpeechOptions = {}
    ): Promise<SpeechSynthesisBatch> {
        if (locale !== 'ar') {
            return this.createLegacyEnglishSpeechBatch(text, options.signal);
        }

        const engine: TtsEngine = 'omnivoice';
        const agentVoice = getAgentVoice(options.agentVoiceId ?? ENV.TTS_VOICE_ID);
        const speakerSex = options.speakerSex ?? agentVoice.sex;
        const prepared = await SpeechTextService.prepare(
            text,
            { engine, locale, speakerSex },
            options.signal
        );

        if (options.signal?.aborted) throw cancellationError();
        if (prepared.chunks.length === 0) throw new Error('No speakable text remains after redaction.');

        const jobs = prepared.chunks.map((chunk, index) => (
            this.synthesizeChunk(chunk, index, locale, engine, speakerSex, agentVoice, options.signal)
                .catch(error => {
                    if (!isCancellation(error)) {
                        console.warn(`TTS chunk ${index} failed and will be skipped.`, error);
                    }
                    return null;
                })
        ));

        return {
            engine,
            text: prepared.text,
            chunks: prepared.chunks,
            jobs,
        };
    }

    private static createLegacyEnglishSpeechBatch(
        text: string,
        signal?: AbortSignal
    ): SpeechSynthesisBatch {
        const trimmed = text.trim();
        if (!trimmed) throw new Error('No speakable text was provided.');

        return {
            engine: 'omnivoice',
            text: trimmed,
            chunks: [trimmed],
            jobs: [
                this.generateLegacyEnglishSpeech(trimmed, signal)
                    .then(uri => ({
                        index: 0,
                        text: trimmed,
                        uri,
                        warnings: [],
                    }))
                    .catch(error => {
                        if (!isCancellation(error)) {
                            console.warn('English TTS failed and will be skipped.', error);
                        }
                        return null;
                    }),
            ],
        };
    }

    static async speechToText(audioUri: string, language: 'en' | 'ar' = 'en'): Promise<string> {
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

    private static inferSpeakerSex(): SpeechSpeakerSex {
        const voice = ENV.TTS_VOICE_ID.toLowerCase();
        if (voice.includes('female')) return 'female';
        if (voice.includes('male')) return 'male';
        return 'female';
    }

    private static endpointId(engine: TtsEngine): string {
        const endpointId = engine === 'omnivoice'
            ? ENV.OMNIVOICE_ENDPOINT_ID
            : ENV.VOXCPM_ENDPOINT_ID;
        if (!endpointId) throw new Error(`Missing ${engine} Runpod endpoint ID.`);
        return endpointId;
    }

    private static synthesisInput(
        text: string,
        locale: string,
        engine: TtsEngine,
        speakerSex: SpeechSpeakerSex,
        agentVoice: AgentVoice,
        seed = 20261218
    ): Record<string, unknown> {
        const female = speakerSex === 'female';

        if (engine === 'omnivoice') {
            return {
                text,
                language: locale === 'ar' ? 'Najdi Arabic' : 'English',
                speed: 1.0,
                num_step: 48,
                guidance_scale: 2.0,
                class_temperature: 0.0,
                denoise: true,
                preprocess_prompt: true,
                postprocess_output: true,
                normalize_text: false,
                pad_duration: 0.1,
                fade_duration: 0.1,
                instruct: agentVoice.omnivoiceInstruct,
                audio_format: 'mp3',
            };
        }

        return {
            text,
            cfg_value: 2.0,
            inference_timesteps: 16,
            normalize: false,
            retry_badcase: true,
            seed,
            instruct: agentVoice.voxcpmInstruct,
            audio_format: 'mp3',
        };
    }

    private static async synthesizeChunk(
        text: string,
        index: number,
        locale: string,
        engine: TtsEngine,
        speakerSex: SpeechSpeakerSex,
        agentVoice: AgentVoice,
        signal?: AbortSignal
    ): Promise<SpeechAudioChunk> {
        let output = await this.runpodSynthesis(
            engine,
            this.synthesisInput(text, locale, engine, speakerSex, agentVoice),
            signal
        );

        // A fixed VoxCPM seed can be consistently bad for one sentence. Retry an
        // implausibly long generation once with a different seed.
        if (engine === 'voxcpm2' && output.duration_sec) {
            const expectedSeconds = Math.max(1, text.length / 14);
            if (output.duration_sec > (expectedSeconds * 2) + 2) {
                output = await this.runpodSynthesis(
                    engine,
                    this.synthesisInput(text, locale, engine, speakerSex, agentVoice, 20261219),
                    signal
                );
            }
        }

        if (!output.audio_b64) throw new Error('Runpod completed without audio data.');

        const format = output.format || 'mp3';
        const fs = FileSystem as any;
        const directory = fs.cacheDirectory || fs.documentDirectory;
        if (!directory) throw new Error('No writable audio cache directory is available.');

        const filePath = `${directory}tts_${Date.now()}_${index}_${Math.random().toString(36).slice(2)}.${format}`;
        await fs.writeAsStringAsync(filePath, output.audio_b64, {
            encoding: fs.EncodingType?.Base64 || 'base64',
        });

        const uri = await this.normaliseLoudness(filePath);
        const warnings = Array.isArray(output.warnings) ? output.warnings : [];
        if (warnings.length > 0) console.warn(`TTS chunk ${index} warnings:`, warnings);

        return {
            index,
            text,
            uri,
            durationSec: output.duration_sec,
            warnings,
        };
    }

    private static async generateLegacyEnglishSpeech(
        text: string,
        signal?: AbortSignal
    ): Promise<string> {
        if (ENV.TTS_PROVIDER === 'resemble' && ENV.RESEMBLE_API_TOKEN && ENV.RESEMBLE_VOICE_UUID_EN) {
            try {
                return await this.generateWithResemble(text, 'en', signal);
            } catch (error) {
                console.warn('English TTS fallback to OpenAI', error);
            }
        }

        return this.generateWithOpenAI(text, signal);
    }

    private static async generateWithResemble(
        text: string,
        locale: string,
        signal?: AbortSignal
    ): Promise<string> {
        const voiceUuid = locale === 'en' ? ENV.RESEMBLE_VOICE_UUID_EN : ENV.RESEMBLE_VOICE_UUID_AR;
        if (!ENV.RESEMBLE_API_TOKEN || !voiceUuid) {
            throw new Error('Missing Resemble API token or voice UUID.');
        }

        const response = await fetch('https://f.cluster.resemble.ai/synthesize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${ENV.RESEMBLE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                voice_uuid: voiceUuid,
                data: text,
                output_format: 'mp3',
                use_hd: true,
                ...(locale === 'ar' && { voice_settings_preset_uuid: 'ec1fef5a-ff60-4248-875b-7469c0487d24' }),
            }),
            signal,
        });

        if (!response.ok) throw await responseError(response);

        const result = await response.json();
        if (!result.audio_content) throw new Error('Resemble completed without audio data.');

        return this.writeBase64Audio(result.audio_content, 'mp3', 'tts_resemble');
    }

    private static async generateWithOpenAI(
        text: string,
        signal?: AbortSignal
    ): Promise<string> {
        if (!ENV.OPENAI_API_KEY) throw new Error('Missing OpenAI API key for English speech.');

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: 'alloy',
                response_format: 'mp3',
            }),
            signal,
        });

        if (!response.ok) throw await responseError(response);

        const blob = await response.blob();
        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onloadend = async () => {
                try {
                    const base64 = String(reader.result || '').split(',')[1];
                    if (!base64) throw new Error('OpenAI TTS returned an unreadable audio blob.');
                    resolve(await this.writeBase64Audio(base64, 'mp3', 'tts_openai'));
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    private static async writeBase64Audio(
        audioBase64: string,
        format: string,
        prefix: string
    ): Promise<string> {
        const fs = FileSystem as any;
        const directory = fs.cacheDirectory || fs.documentDirectory;
        if (!directory) throw new Error('No writable audio cache directory is available.');

        const filePath = `${directory}${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.${format}`;
        await fs.writeAsStringAsync(filePath, audioBase64, {
            encoding: fs.EncodingType?.Base64 || 'base64',
        });

        return filePath;
    }

    private static async runpodSynthesis(
        engine: TtsEngine,
        input: Record<string, unknown>,
        signal?: AbortSignal
    ): Promise<RunpodOutput> {
        if (!ENV.RUNPOD_API_KEY) throw new Error('Missing Runpod API key.');
        if (signal?.aborted) throw cancellationError();

        const endpointId = this.endpointId(engine);
        const headers = {
            Authorization: `Bearer ${ENV.RUNPOD_API_KEY}`,
            'Content-Type': 'application/json',
        };
        const startResponse = await fetch(`${RUNPOD_BASE_URL}/${endpointId}/run`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ input }),
            signal,
        });
        if (!startResponse.ok) throw await responseError(startResponse);

        const started = await startResponse.json();
        if (started?.status === 'COMPLETED' && started?.output) return started.output;
        if (!started?.id) throw new Error('Runpod did not return a job ID.');

        const deadline = Date.now() + RUNPOD_TIMEOUT_MS;
        while (Date.now() < deadline) {
            await wait(RUNPOD_POLL_INTERVAL_MS, signal);
            const statusResponse = await fetch(
                `${RUNPOD_BASE_URL}/${endpointId}/status/${encodeURIComponent(started.id)}`,
                { headers, signal }
            );
            if (!statusResponse.ok) throw await responseError(statusResponse);

            const job = await statusResponse.json();
            switch (String(job?.status || '').toUpperCase()) {
                case 'COMPLETED':
                    return job.output || {};
                case 'FAILED':
                case 'TIMED_OUT':
                case 'CANCELLED':
                    throw new Error(`Runpod ${engine} job ${job.status}: ${String(job.error || 'unknown error').slice(0, 300)}`);
                default:
                    break;
            }
        }

        throw new Error(`Runpod ${engine} job exceeded ${RUNPOD_TIMEOUT_MS / 1000} seconds.`);
    }

    private static async normaliseLoudness(filePath: string): Promise<string> {
        if (ENV.TTS_NORMALISE_LOUDNESS && !this.warnedAboutLoudness) {
            // The guide requires fail-open behavior when ffmpeg is unavailable.
            // Expo has no ffmpeg runtime in this project, so keep the original.
            this.warnedAboutLoudness = true;
            console.warn('TTS loudness normalization skipped: no on-device ffmpeg runtime is installed.');
        }
        return filePath;
    }

    private static async transcribeWithOpenAI(audioUri: string, language: 'en' | 'ar'): Promise<string> {
        if (!ENV.OPENAI_API_KEY) throw new Error('Missing OpenAI API key for speech recognition.');

        const formData = createFormData();
        formData.append('file', {
            uri: audioUri,
            type: 'audio/mp4',
            name: 'audio.mp4',
        } as any);
        formData.append('model', 'gpt-4o-transcribe');
        formData.append('response_format', 'json');
        formData.append('language', language);

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${ENV.OPENAI_API_KEY}` },
            body: formData,
        });
        if (!response.ok) throw new Error(`OpenAI STT failed (${response.status}).`);

        const result = await response.json();
        return result.text;
    }

    private static async transcribeWithSelfHosted(audioUri: string, language: 'en' | 'ar'): Promise<string> {
        if (!ENV.STT_SELF_HOSTED_URL) throw new Error('Missing self-hosted STT URL.');

        const formData = createFormData();
        const fileExtension = audioUri.split('.').pop() || 'm4a';
        const mimeType = fileExtension === 'm4a' ? 'audio/mp4' : `audio/${fileExtension}`;
        const filename = fileExtension === 'm4a' ? 'audio.mp4' : `audio.${fileExtension}`;

        formData.append('file', { uri: audioUri, type: mimeType, name: filename } as any);
        formData.append('model', 'deepdml/faster-whisper-large-v3-turbo-ct2');
        formData.append('language', language);

        const response = await fetch(`${ENV.STT_SELF_HOSTED_URL}/v1/audio/transcriptions`, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: formData,
        });
        if (!response.ok) throw new Error(`Self-hosted STT failed (${response.status}).`);

        const result = await response.json();
        return result.text;
    }
}
