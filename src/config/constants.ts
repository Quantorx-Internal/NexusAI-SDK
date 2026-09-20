import Constants from 'expo-constants';

type RuntimeEnvironment = Partial<Record<
    | 'NEXT_PUBLIC_API_URL'
    | 'NGROK_URL'
    | 'N8N_WEBHOOK_URL'
    | 'STT_PROVIDER'
    | 'STT_SELF_HOSTED_URL'
    | 'TTS_PROVIDER'
    | 'RESEMBLE_API_TOKEN'
    | 'RESEMBLE_VOICE_UUID_AR'
    | 'RESEMBLE_VOICE_UUID_EN'
    | 'RUNPOD_API_KEY'
    | 'OMNIVOICE_ENDPOINT_ID'
    | 'VOXCPM_ENDPOINT_ID'
    | 'TTS_VOICE_ID'
    | 'OPENROUTER_API_KEY'
    | 'TTS_REWRITE_MODEL'
    | 'TTS_REWRITE'
    | 'TTS_REDACT'
    | 'TTS_NORMALISE_LOUDNESS'
    | 'MOCK_OTP'
    | 'MOCK_DELAY_MS',
    string
>>;

const runtimeEnvironment = (
    Constants.expoConfig?.extra?.runtimeEnvironment ?? {}
) as RuntimeEnvironment;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined || value === '') return fallback;
    return value === '1' || value.toLowerCase() === 'true';
}

const ttsVoiceId = runtimeEnvironment.TTS_VOICE_ID
    || process.env.EXPO_PUBLIC_TTS_VOICE_ID
    || 'omnivoice';

export const ENV = {
    // API configuration
    API_URL: runtimeEnvironment.NEXT_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL,
    NGROK_URL: runtimeEnvironment.NGROK_URL || process.env.EXPO_PUBLIC_NGROK_URL,
    N8N_WEBHOOK_URL: runtimeEnvironment.N8N_WEBHOOK_URL || process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL,
    API_CALLBACK_URL: runtimeEnvironment.NEXT_PUBLIC_API_URL
        || process.env.EXPO_PUBLIC_API_CALLBACK_URL
        || process.env.EXPO_PUBLIC_API_URL,

    // Speech to text
    OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    STT_PROVIDER: (
        runtimeEnvironment.STT_PROVIDER
        || process.env.EXPO_PUBLIC_STT_PROVIDER
        || 'openai'
    ) as 'openai' | 'self-hosted',
    STT_SELF_HOSTED_URL: runtimeEnvironment.STT_SELF_HOSTED_URL
        || process.env.EXPO_PUBLIC_STT_SELF_HOSTED_URL,

    // Legacy English speech synthesis
    TTS_PROVIDER: (
        runtimeEnvironment.TTS_PROVIDER
        || process.env.EXPO_PUBLIC_TTS_PROVIDER
        || 'openai'
    ) as 'openai' | 'resemble',
    RESEMBLE_API_TOKEN: runtimeEnvironment.RESEMBLE_API_TOKEN
        || process.env.EXPO_PUBLIC_RESEMBLE_API_TOKEN,
    RESEMBLE_VOICE_UUID_AR: runtimeEnvironment.RESEMBLE_VOICE_UUID_AR
        || process.env.EXPO_PUBLIC_RESEMBLE_VOICE_UUID_AR,
    RESEMBLE_VOICE_UUID_EN: runtimeEnvironment.RESEMBLE_VOICE_UUID_EN
        || process.env.EXPO_PUBLIC_RESEMBLE_VOICE_UUID_EN,

    // Runpod speech synthesis
    RUNPOD_API_KEY: runtimeEnvironment.RUNPOD_API_KEY || process.env.EXPO_PUBLIC_RUNPOD_API_KEY,
    OMNIVOICE_ENDPOINT_ID: runtimeEnvironment.OMNIVOICE_ENDPOINT_ID
        || process.env.EXPO_PUBLIC_OMNIVOICE_ENDPOINT_ID,
    VOXCPM_ENDPOINT_ID: runtimeEnvironment.VOXCPM_ENDPOINT_ID
        || process.env.EXPO_PUBLIC_VOXCPM_ENDPOINT_ID,
    TTS_VOICE_ID: ttsVoiceId,
    TTS_ENGINE: (
        ttsVoiceId.toLowerCase().includes('vox') ? 'voxcpm2' : 'omnivoice'
    ) as 'omnivoice' | 'voxcpm2',

    // Spoken-language rewrite pipeline
    OPENROUTER_API_KEY: runtimeEnvironment.OPENROUTER_API_KEY
        || process.env.EXPO_PUBLIC_OPENROUTER_API_KEY,
    TTS_REWRITE_MODEL: runtimeEnvironment.TTS_REWRITE_MODEL
        || process.env.EXPO_PUBLIC_TTS_REWRITE_MODEL
        || 'openai/gpt-5.6-luna',
    TTS_REWRITE: parseBoolean(
        runtimeEnvironment.TTS_REWRITE || process.env.EXPO_PUBLIC_TTS_REWRITE,
        true
    ),
    TTS_REDACT: parseBoolean(
        runtimeEnvironment.TTS_REDACT || process.env.EXPO_PUBLIC_TTS_REDACT,
        true
    ),
    TTS_NORMALISE_LOUDNESS: parseBoolean(
        runtimeEnvironment.TTS_NORMALISE_LOUDNESS || process.env.EXPO_PUBLIC_TTS_NORMALISE_LOUDNESS,
        true
    ),

    MOCK_OTP: runtimeEnvironment.MOCK_OTP || process.env.EXPO_PUBLIC_MOCK_OTP,
    MOCK_DELAY_MS: Number(runtimeEnvironment.MOCK_DELAY_MS || process.env.EXPO_PUBLIC_MOCK_DELAY_MS || 0),
};
