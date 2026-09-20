import { ENV } from '../config/constants';

export type TtsEngine = 'omnivoice' | 'voxcpm2';
export type SpeechSpeakerSex = 'female' | 'male';

export interface PrepareSpeechOptions {
    engine: TtsEngine;
    locale: string;
    speakerSex?: SpeechSpeakerSex;
}

export interface PreparedSpeech {
    text: string;
    chunks: string[];
}

const rewriteCache = new Map<string, string>();
const MAX_REWRITE_CACHE_ENTRIES = 100;
const DIGIT = String.raw`[0-9\u0660-\u0669\u06F0-\u06F9]`;

function isEnabled(value: boolean | undefined, fallback: boolean): boolean {
    return value ?? fallback;
}

function containsDigits(text: string): boolean {
    return /[0-9\u0660-\u0669\u06F0-\u06F9]/u.test(text);
}

function rememberRewrite(key: string, value: string): void {
    if (rewriteCache.size >= MAX_REWRITE_CACHE_ENTRIES) {
        const oldestKey = rewriteCache.keys().next().value;
        if (oldestKey) rewriteCache.delete(oldestKey);
    }
    rewriteCache.set(key, value);
}

function buildRewritePrompt(speakerSex: SpeechSpeakerSex): string {
    const speaker = speakerSex === 'male' ? 'Saudi man' : 'Saudi woman';

    return `You prepare banking-assistant replies for text-to-speech. The speaker is a ${speaker}; the customer is male unless the source clearly says otherwise.

Follow every rule:
1. Keep the source language. Never translate.
2. In Arabic, use natural spoken Najdi Arabic, not formal broadcast Arabic.
3. Spell every number as words. Say account numbers, IBANs, codes, and card tails one digit at a time.
4. Use spoken Najdi number grammar (for example 2,000 is ألفين, not ألفا).
5. Never alter or invent an amount, name, date, code, fact, condition, warning, or bad news.
6. Keep every clause while removing only exact duplicated facts.
7. Sound warm and conversational, never like a recording or a stock script.
8. Do not add a greeting first, but naturally return one when the customer greeted.
9. Do not add a generic closing or an offer to help that was not present.
10. Say each fact once; different amounts and different facts must all remain.
11. Keep any Arabic diacritic already present.
12. Add a diacritic only when the bare word would be read as a different word; mark genuinely doubled letters with shadda, including after prefixes such as ال، و، ب، ل.
13. Never add case endings or tanween.
14. Where TTS spelling is misleading, respell without changing the identity or meaning; for example write ساره rather than سارة so the final sound is h, not t.
15. Use useful sentence punctuation for natural pauses.
16. Return plain text only: no markdown, labels, commentary, XML, or bracketed sound tags.`;
}

function getMessageContent(payload: any): string | null {
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content.trim();
    if (Array.isArray(content)) {
        const joined = content
            .map((part: any) => typeof part === 'string' ? part : part?.text)
            .filter(Boolean)
            .join(' ')
            .trim();
        return joined || null;
    }
    return null;
}

function splitIntoSentences(text: string): Array<{ text: string; start: number; end: number }> {
    const sentences: Array<{ text: string; start: number; end: number }> = [];
    const pattern = /[^.!?؟\n]+(?:[.!?؟]+|\n+|$)/gu;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        const sentence = match[0].trim();
        if (!sentence) continue;
        sentences.push({
            text: sentence,
            start: match.index,
            end: match.index + match[0].length,
        });
    }

    return sentences.length > 0
        ? sentences
        : [{ text: text.trim(), start: 0, end: text.length }];
}

export class SpeechTextService {
    /** Remove sensitive banking data before text is sent to any third party. */
    static redact(text: string): string {
        return text
            // IBANs, with or without separators.
            .replace(new RegExp(String.raw`\b[A-Z]{2}${DIGIT}{2}(?:[\s-]?[A-Z0-9\u0660-\u0669\u06F0-\u06F9]){11,30}\b`, 'giu'), '')
            // Full card numbers written as four groups of four.
            .replace(new RegExp(String.raw`\b(?:${DIGIT}{4}[\s-]?){3}${DIGIT}{4}\b`, 'gu'), '')
            // OTPs only when introduced by an OTP/code keyword.
            .replace(new RegExp(String.raw`((?:one[ -]?time(?: password| code)?|otp|verification code|security code|code|رمز(?: التحقق| الأمان)?|كود)\s*[:：-]?\s*)${DIGIT}{4,8}\b`, 'giu'), '$1')
            // Any remaining contiguous run of nine or more digits.
            .replace(new RegExp(`${DIGIT}{9,}`, 'gu'), '')
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/\s+([,،.!?؟])/g, '$1')
            .trim();
    }

    /** Strip visual markup and undeclared bracketed tags before synthesis. */
    static finalise(text: string): string {
        return text
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/```(?:\w+)?\n?([\s\S]*?)```/g, '$1')
            .replace(/`([^`]*)`/g, '$1')
            .replace(/^\s{0,3}#{1,6}\s*/gm, '')
            .replace(/^\s*>\s?/gm, '')
            .replace(/[*_~]+/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/\{[^}]*\}/g, '')
            .replace(/<[^>]*>/g, '')
            .replace(/^[\t ]*(?:•|[-+])\s+/gm, '')
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    static chunk(text: string): string[] {
        const trimmed = text.trim();
        if (trimmed.length < 150) return trimmed ? [trimmed] : [];

        const sentences = splitIntoSentences(trimmed);
        if (sentences.length < 2) return [trimmed];

        const wanted = Math.max(1, Math.min(3, Math.round(trimmed.length / 100)));
        if (wanted === 1) return [trimmed];

        const perChunk = trimmed.length / wanted;
        const buckets = Array.from({ length: wanted }, () => [] as string[]);

        for (const sentence of sentences) {
            const midpoint = sentence.start + ((sentence.end - sentence.start) / 2);
            const index = Math.min(wanted - 1, Math.floor(midpoint / perChunk));
            buckets[index].push(sentence.text);
        }

        const chunks = buckets
            .map(bucket => bucket.join(' ').trim())
            .filter(Boolean);

        if (chunks.length > 1 && chunks[chunks.length - 1].length < 60) {
            const tail = chunks.pop();
            if (tail) chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${tail}`.trim();
        }

        return chunks;
    }

    static async rewrite(
        text: string,
        options: PrepareSpeechOptions,
        signal?: AbortSignal
    ): Promise<string> {
        if (!isEnabled(ENV.TTS_REWRITE, true) || !ENV.OPENROUTER_API_KEY) return text;

        const speakerSex = options.speakerSex ?? 'female';
        const cacheKey = `${options.engine}|${options.locale}|${speakerSex}|${text}`;
        const cached = rewriteCache.get(cacheKey);
        if (cached !== undefined) return cached;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8_000);
        const abortFromParent = () => controller.abort();
        signal?.addEventListener('abort', abortFromParent, { once: true });

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${ENV.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: ENV.TTS_REWRITE_MODEL || 'openai/gpt-5.6-luna',
                    temperature: 0,
                    max_tokens: 900,
                    reasoning: { enabled: false },
                    messages: [
                        { role: 'system', content: buildRewritePrompt(speakerSex) },
                        { role: 'user', content: text },
                    ],
                }),
                signal: controller.signal,
            });

            if (!response.ok) throw new Error(`OpenRouter rewrite failed (${response.status})`);

            const rewritten = getMessageContent(await response.json());
            const invalid = !rewritten
                || containsDigits(rewritten)
                || rewritten.length > (text.length * 3) + 80;
            const result = invalid ? text : rewritten;
            rememberRewrite(cacheKey, result);
            return result;
        } catch (error) {
            if (!signal?.aborted) console.warn('TTS rewrite failed; using the original text.', error);
            return text;
        } finally {
            clearTimeout(timeout);
            signal?.removeEventListener('abort', abortFromParent);
        }
    }

    static async prepare(
        sourceText: string,
        options: PrepareSpeechOptions,
        signal?: AbortSignal
    ): Promise<PreparedSpeech> {
        const redacted = isEnabled(ENV.TTS_REDACT, true)
            ? this.redact(sourceText)
            : sourceText;
        const rewritten = await this.rewrite(redacted, options, signal);
        const text = this.finalise(rewritten);
        const chunks = options.engine === 'omnivoice' ? this.chunk(text) : (text ? [text] : []);
        return { text, chunks };
    }
}
