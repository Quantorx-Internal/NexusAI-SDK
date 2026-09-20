import { ENV } from '../config/constants';
import * as FileSystem from 'expo-file-system/legacy';
import NativeFormData from 'react-native/Libraries/Network/FormData';

function createFormData(): any {
    return new NativeFormData();
}

export class VoiceService {
    static async textToSpeech(text: string, locale: string = 'en'): Promise<string> {
        try {
            if (ENV.TTS_PROVIDER === 'resemble') {
                try {
                    return await this.generateWithResemble(text, locale);
                } catch (resembleError) {
                    // Fallback to OpenAI if Resemble fails (rate limits, etc.)
                    console.warn('TTS fallback to OpenAI', resembleError);
                    return await this.generateWithOpenAI(text, locale);
                }
            } else {
                return await this.generateWithOpenAI(text, locale);
            }
        } catch (error) {
            console.error('VoiceService TTS Error:', error);
            throw error;
        }
    }

    static async speechToText(audioUri: string, language: 'en' | 'ar' = 'en'): Promise<string> {
        try {
            if (ENV.STT_PROVIDER === 'self-hosted') {
                return await this.transcribeWithSelfHosted(audioUri, language);
            } else {
                return await this.transcribeWithOpenAI(audioUri, language);
            }
        } catch (error) {
            console.error('VoiceService STT Error:', error);
            throw error;
        }
    }

    private static async generateWithResemble(text: string, locale: string): Promise<string> {
        const voiceUuid = locale === 'en' ? ENV.RESEMBLE_VOICE_UUID_EN : ENV.RESEMBLE_VOICE_UUID_AR;
        const url = 'https://f.cluster.resemble.ai/synthesize';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ENV.RESEMBLE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                voice_uuid: voiceUuid,
                data: text,
                output_format: 'mp3',
                use_hd: true,
                ...(locale === 'ar' && { voice_settings_preset_uuid: 'ec1fef5a-ff60-4248-875b-7469c0487d24' }),
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Resemble.ai TTS error: ${error}`);
        }

        const result = await response.json();
        const fs = FileSystem as any;
        const filePath = `${fs.cacheDirectory || fs.documentDirectory}tts_${Date.now()}.mp3`;

        await fs.writeAsStringAsync(filePath, result.audio_content, {
            encoding: fs.EncodingType ? fs.EncodingType.Base64 : 'base64',
        });

        return filePath;
    }

    private static async generateWithOpenAI(text: string, locale: string): Promise<string> {
        const url = 'https://api.openai.com/v1/audio/speech';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ENV.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: 'alloy',
                response_format: 'mp3',
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI TTS error: ${error}`);
        }

        const blob = await response.blob();

        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];
                const fs = FileSystem as any;
                const filePath = `${fs.cacheDirectory || fs.documentDirectory}tts_openai_${Date.now()}.mp3`;
                try {
                    await fs.writeAsStringAsync(filePath, base64data, {
                        encoding: fs.EncodingType ? fs.EncodingType.Base64 : 'base64',
                    });
                    resolve(filePath);
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    private static async transcribeWithOpenAI(audioUri: string, language: 'en' | 'ar'): Promise<string> {
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
            headers: {
                'Authorization': `Bearer ${ENV.OPENAI_API_KEY}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('OpenAI STT Error:', error);
            throw new Error(`OpenAI STT error: ${error}`);
        }

        const result = await response.json();
        return result.text;
    }

    private static async transcribeWithSelfHosted(audioUri: string, language: 'en' | 'ar'): Promise<string> {
        const formData = createFormData();
        const fileExtension = audioUri.split('.').pop() || 'm4a';
        const mimeType = fileExtension === 'm4a' ? 'audio/mp4' : `audio/${fileExtension}`;
        const filename = fileExtension === 'm4a' ? 'audio.mp4' : `audio.${fileExtension}`;

        formData.append('file', {
            uri: audioUri,
            type: mimeType,
            name: filename,
        } as any);
        formData.append('model', 'deepdml/faster-whisper-large-v3-turbo-ct2');
        formData.append('language', language);

        try {
            const response = await fetch(`${ENV.STT_SELF_HOSTED_URL}/v1/audio/transcriptions`, {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('Self-hosted STT Error:', error);
                throw new Error(`Self-hosted STT error: ${response.status} - ${error}`);
            }

            const result = await response.json();
            return result.text;
        } catch (error) {
            console.error('STT Network Error:', error);
            throw error;
        }
    }
}
