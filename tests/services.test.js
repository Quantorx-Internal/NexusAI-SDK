import { expect, test, mock, afterEach } from 'bun:test';
const settings = { API_CALLBACK_URL: 'https://bank.test/api/', CHAT_AGENT: 'api', TTS_VOICE_ID: 'alaa-omni' };
mock.module('../src/config/constants', () => ({ ENV: settings }));
const writes = [];
mock.module('expo-file-system/legacy', () => ({
    cacheDirectory: 'file:///cache/', EncodingType: { Base64: 'base64' },
    writeAsStringAsync: async (...args) => { writes.push(args); },
}));
let speechRequest;
mock.module('expo/fetch', () => ({ fetch: async (url, init) => {
    speechRequest = { url, ...init };
    return new Response([
        { type: 'audio', index: 0, data: 'YQ==', mime: 'audio/wav' },
        { type: 'meta', chunks: 1, voice: 'fahad-omni' }, { type: 'done' },
    ].map(x => JSON.stringify(x)).join('\n'));
}}));
const { VoiceService } = await import('../src/services/VoiceService');
const { ChatService } = await import('../src/services/ChatService');
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; settings.CHAT_AGENT = 'api'; });

test('mobile sends original text and exact voice ID to the web speech endpoint without local speed or pitch overrides', async () => {
    const abort = new AbortController();
    const text = 'المتاح للادخار 828 ريال';
    const batch = await VoiceService.createSpeechBatch(text, 'ar', { agentVoiceId: 'fahad-omni', signal: abort.signal });
    const chunks = [];
    for await (const chunk of batch.jobs) chunks.push(chunk);
    expect(speechRequest.url).toBe('https://bank.test/api/tts/stream');
    expect(JSON.parse(speechRequest.body)).toEqual({ text, language: 'ar', voiceId: 'fahad-omni' });
    expect(speechRequest.signal).toBe(abort.signal);
    expect(chunks[0].uri).toEndWith('.wav');
    expect(writes.at(-1)[1]).toBe('YQ==');
});
test('live chat failure never switches providers or fabricates a demo answer', async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; throw new Error('Network unavailable'); };
    await expect(ChatService.sendMessage('show my spending', 'session', 'en')).rejects.toThrow('Network unavailable');
    expect(calls).toBe(1);
});
test('server subscriptions and empty bill lists survive the complete response path', async () => {
    const subscriptions = [{ id: 'server-subscription', amount: 12 }];
    globalThis.fetch = async () => Response.json({ message: 'Your bills', ui: { showBills: true, showSubscriptions: true }, bills: [], subscriptions });
    const result = await ChatService.sendMessage('show bills', 'session', 'en');
    expect(result.bills).toEqual([]);
    expect(result.subscriptions).toEqual(subscriptions);
});
test('demo flows are available only when explicitly selected', async () => {
    settings.CHAT_AGENT = 'mock';
    globalThis.fetch = async () => { throw new Error('should not fetch'); };
    const result = await ChatService.sendMessage('show my spending', 'session', 'en');
    expect(result.ui.showSpendingBreakdown).toBe(true);
    expect(result.spendingBreakdown.length).toBeGreaterThan(0);
});
