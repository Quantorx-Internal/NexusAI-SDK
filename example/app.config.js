const appJson = require('./app.json');

const runtimeKeys = [
  'NEXT_PUBLIC_API_URL',
  'NGROK_URL',
  'N8N_WEBHOOK_URL',
  'STT_PROVIDER',
  'STT_SELF_HOSTED_URL',
  'TTS_PROVIDER',
  'RESEMBLE_API_TOKEN',
  'RESEMBLE_VOICE_UUID_AR',
  'RESEMBLE_VOICE_UUID_EN',
  'RUNPOD_API_KEY',
  'OMNIVOICE_ENDPOINT_ID',
  'VOXCPM_ENDPOINT_ID',
  'TTS_VOICE_ID',
  'OPENROUTER_API_KEY',
  'TTS_REWRITE_MODEL',
  'TTS_REWRITE',
  'TTS_REDACT',
  'TTS_NORMALISE_LOUDNESS',
  'MOCK_OTP',
  'MOCK_DELAY_MS',
];

const runtimeEnvironment = Object.fromEntries(
  runtimeKeys
    .filter((key) => process.env[key] !== undefined)
    .map((key) => [key, process.env[key]])
);

module.exports = {
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    runtimeEnvironment,
  },
};
