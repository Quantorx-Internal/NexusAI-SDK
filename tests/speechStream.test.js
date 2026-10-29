import { expect, test } from 'bun:test';
import { readSpeechStream } from '../src/services/speechStream';
const audio = index => ({ type: 'audio', index, data: 'YQ==', mime: 'audio/mpeg' });
function stream(events, split = 3) {
    const bytes = new TextEncoder().encode(events.map(e => JSON.stringify(e)).join('\n'));
    return new ReadableStream({ start(controller) {
        for (let i = 0; i < bytes.length; i += split) controller.enqueue(bytes.slice(i, i + split));
        controller.close();
    }});
}
async function collect(body, signal) { const out = []; for await (const item of readSpeechStream(body, signal)) out.push(item); return out; }
test('fragmented lines, late metadata and duplicate chunks preserve playback order', async () => {
    const out = await collect(stream([audio(1), audio(1), audio(0), audio(0), { type: 'meta', chunks: 2, spokenText: 'مرحبا' }, { type: 'done' }]));
    expect(out.map(a => a.index)).toEqual([0, 1]);
});
test('missing chunks and truncated connections fail instead of skipping figures', async () => {
    await expect(collect(stream([audio(1), { type: 'meta', chunks: 2 }, { type: 'done' }]))).rejects.toThrow('missing chunks');
    await expect(collect(stream([audio(0)]))).rejects.toThrow('before completion');
});
test('server synthesis failures are reported', async () => {
    await expect(collect(stream([{ type: 'error', index: 0, message: 'Synthesis failed' }, { type: 'done' }]))).rejects.toThrow('Synthesis failed');
});
test('cancellation closes the native response reader', async () => {
    const controller = new AbortController();
    let cancelled = false;
    const body = new ReadableStream({ cancel() { cancelled = true; } });
    const result = collect(body, controller.signal);
    controller.abort();
    await expect(result).rejects.toThrow('cancelled');
    expect(cancelled).toBe(true);
});
test('an interrupted consumer also releases the stream', async () => {
    let cancelled = false;
    const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(JSON.stringify(audio(0)) + '\n')); }, cancel() { cancelled = true; } });
    for await (const chunk of readSpeechStream(body)) { expect(chunk.index).toBe(0); break; }
    expect(cancelled).toBe(true);
});
