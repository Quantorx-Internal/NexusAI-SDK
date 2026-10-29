export interface AudioEvent {
    type: 'audio';
    index: number;
    mime: string;
    data: string;
    durationSec?: number;
}

/** Parse partial NDJSON lines and play each server chunk exactly once, in order. */
export async function* readSpeechStream(
    body: ReadableStream<Uint8Array>, signal?: AbortSignal
): AsyncGenerator<AudioEvent> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const pending = new Map<number, AudioEvent | Error>();
    let buffer = '', next = 0;
    let count: number | undefined;
    let done = false;
    const abort = () => { void reader.cancel().catch(() => {}); };
    signal?.addEventListener('abort', abort, { once: true });
    try {
        while (!done) {
            if (signal?.aborted) throw new Error('Speech synthesis cancelled');
            const part = await reader.read();
            if (signal?.aborted) throw new Error('Speech synthesis cancelled');
            buffer += decoder.decode(part.value, { stream: !part.done });
            if (part.done && buffer.trim()) buffer += '\n';
            let end: number;
            while ((end = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, end).trim();
                buffer = buffer.slice(end + 1);
                if (!line) continue;
                const event = JSON.parse(line);
                if (event.type === 'meta') {
                    if (!Number.isInteger(event.chunks) || event.chunks < 0) throw new Error('Invalid speech chunk count');
                    count = event.chunks;
                } else if (event.type === 'audio' || event.type === 'error') {
                    if (!Number.isInteger(event.index) || event.index < 0) throw new Error('Invalid speech chunk index');
                    if (event.type === 'audio' && (typeof event.data !== 'string' || !event.data || typeof event.mime !== 'string')) throw new Error('Invalid speech audio');
                    if (event.index >= next && !pending.has(event.index)) pending.set(event.index,
                        event.type === 'audio' ? event : new Error(event.message || 'Speech generation failed'));
                } else if (event.type === 'done') done = true;
                while (pending.has(next)) {
                    const chunk = pending.get(next)!;
                    pending.delete(next++);
                    // Surface incomplete speech instead of silently omitting financial figures.
                    if (chunk instanceof Error) throw chunk;
                    yield chunk;
                }
            }
            if (part.done && !done) throw new Error('Speech stream ended before completion');
        }
        if (count === undefined || next !== count || pending.size) throw new Error('Speech stream is missing chunks');
    } finally {
        signal?.removeEventListener('abort', abort);
        await reader.cancel().catch(() => {});
        reader.releaseLock();
    }
}
