import { ENV } from '../config/constants';
import { adviseLoan, describeLoan, quoteLoan, tenureLabel, LoanAdvice } from '../lib/loans';
import type { LoanOfferUI } from '../types';

/**
 * The advisor's remark on the loan card: the loan sub-agent.
 *
 * While the user drags the amount and the tenure, the card shows the fit the
 * app worked out. When they stop on a plan, this adds a sentence or two in
 * the assistant's voice: what that plan means for their month, and what to
 * try. The figures are the app's; a model only says them the way a person
 * would, in the user's language.
 *
 * It is a side call, not a chat turn. Three ways to get one, tried in order:
 *  1. POST {API_CALLBACK_URL}/api/chat/advise — the server's advisor, which
 *     also remembers the remark for the next chat turn.
 *  2. OpenRouter directly with ADVISOR_MODEL, the same way the TTS rewrite
 *     already talks to it, when the app has a key but no backend.
 *  3. A sentence written in code from the same figures, so the card always
 *     has an advisor line even offline.
 */

export interface AdvisorPlan {
    amount: number;
    months: number;
}

export interface AdvisorQuery extends AdvisorPlan {
    sessionId: string;
    locale: 'en' | 'ar';
    productId: string;
    /** The plan the user moved away from, so the remark can speak to the change. */
    from?: AdvisorPlan | null;
    /** The offer on the card, for the local and OpenRouter paths. */
    offer: LoanOfferUI;
    /** What the user told the assistant earlier, such as what the loan is for. */
    customerSaid?: string[];
}

export interface AdvisorRemark {
    productId: string;
    amount: number;
    months: number;
    text: string;
    /** Where it came from. The server remembers its own; the others ride on the next message. */
    source: 'api' | 'openrouter' | 'local';
}

/** A remark longer than this is a lecture, whatever the model thinks. */
const MAX_LENGTH = 320;
const API_TIMEOUT_MS = 12_000;
const OPENROUTER_TIMEOUT_MS = 10_000;

const whole = (n: number) => Math.round(n).toLocaleString('en-US');

function instructions(locale: 'en' | 'ar'): string {
    const language = locale === 'ar'
        ? 'Write in Saudi Najdi dialect, addressing a male customer (Arabic inflects every verb for it). Latin digits only (0-9), never Arabic-Indic digits.'
        : 'Write in plain, warm English.';

    return `You are the customer's financial advisor inside their bank's app. They are shaping a loan on a card: dragging the amount and the repayment period and watching the monthly installment change. They just stopped on a plan. Say ONE short remark about it, the way a trusted advisor sitting next to them would.

You get the facts as JSON. The bank computed every figure: use only these, never work out your own. Round amounts the way people say them ("about 4,600 riyals").
Your remark sits right under the card's own line, which already shows the share of the salary and what is left each month. Do not recite those. Use at most one figure, and add what a person would: what this plan means for them, and what to do next.
- fit.verdict comfortable: reassure in a few words. If fit.suggestion is set, it is a shorter plan that still fits and saves fit.suggestion.saves: you may mention it.
- fit.verdict tight: it works but leaves little room each month (fit.leftAfterInstallment); point to fit.suggestion if set. A suggestion carries its own leftAfterInstallment: use that, do not subtract.
- fit.verdict risky: say plainly and kindly that it does not fit, with the one figure that matters (how short the month runs, or the share of the salary), and point to fit.suggestion. Without a suggestion, say bringing the usual spending down first would help.
- changedFrom is the plan they moved away from, with its own verdict. Speak to the change when it helps ("Stretching it to 5 years brings it within your budget").
- To point to another plan, use fit.suggestion. Name a plan by its terms ("140,000 over 5 years"), never by the screen ("the button", "below"). Point back to changedFrom instead only when its verdict is better than this plan's and it is closer to what they asked for.
- Never ask a question: the user answers by moving the sliders or tapping the card, not by replying to you.
- customerSaid is what they told the assistant earlier, such as what the loan is for. Use it only if it makes the remark more personal.

Style: one or two short sentences, under 35 words. Warm and concrete. Never lecture, shame or pressure, and never refuse: the choice is theirs. No greeting, no emojis, no lists, no markdown, no quotation marks. No em dashes or en dashes: use a comma or a full stop. Do not introduce yourself.
${language}
Reply with the remark only.`;
}

/** Quotes, dashes, line breaks and runs of spaces out; a sane length. */
export function cleanRemark(raw: string, locale: 'en' | 'ar'): string {
    const comma = locale === 'ar' ? '،' : ',';
    const flat = raw
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^["'“”«]+|["'“”»]+$/g, '')
        // An em/en dash reads as a hyphen in Cairo. A comma says the same thing.
        .replace(/\s*[—–]\s*/g, `${comma} `)
        .trim();
    return flat.length > MAX_LENGTH ? `${flat.slice(0, MAX_LENGTH).replace(/\s+\S*$/, '')}…` : flat;
}

/** The API root without a trailing /api, the way TransactionService resolves it. */
function apiRoot(): string | null {
    const base = ENV.API_CALLBACK_URL;
    if (!base) return null;
    return base.replace(/\/+$/, '').replace(/\/api$/i, '');
}

function withTimeout(ms: number, parent?: AbortSignal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    const abortFromParent = () => controller.abort();
    parent?.addEventListener('abort', abortFromParent, { once: true });
    return {
        signal: controller.signal,
        done: () => {
            clearTimeout(timer);
            parent?.removeEventListener('abort', abortFromParent);
        },
    };
}

export class LoanAdvisorService {
    /**
     * The advisor's remark on a plan, or null when there is nothing to weigh
     * it against (no budget). Never throws: a remark is a nicety, and the card
     * works without it.
     */
    static async remark(query: AdvisorQuery, signal?: AbortSignal): Promise<AdvisorRemark | null> {
        if (!query.offer.budget) return null;

        const fromApi = await LoanAdvisorService.fromApi(query, signal);
        if (fromApi) return fromApi;
        if (signal?.aborted) return null;

        const fromModel = await LoanAdvisorService.fromOpenRouter(query, signal);
        if (fromModel) return fromModel;
        if (signal?.aborted) return null;

        const local = LoanAdvisorService.localRemark(query.offer, query.amount, query.months, query.locale);
        return local
            ? { productId: query.productId, amount: query.amount, months: query.months, text: local, source: 'local' }
            : null;
    }

    /** The server's advisor at /api/chat/advise. Null when there is no backend, or it had nothing to say. */
    static async fromApi(query: AdvisorQuery, signal?: AbortSignal): Promise<AdvisorRemark | null> {
        const root = apiRoot();
        if (!root) return null;
        const { signal: timed, done } = withTimeout(API_TIMEOUT_MS, signal);
        try {
            const response = await fetch(`${root}/api/chat/advise`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: query.sessionId,
                    locale: query.locale,
                    productId: query.productId,
                    amount: query.amount,
                    months: query.months,
                    from: query.from ?? null,
                }),
                signal: timed,
            });
            if (!response.ok) return null;
            const data = await response.json();
            const text = typeof data?.remark === 'string' ? cleanRemark(data.remark, query.locale) : '';
            return text
                ? { productId: query.productId, amount: query.amount, months: query.months, text, source: 'api' }
                : null;
        } catch (error) {
            if (!signal?.aborted) console.warn('LoanAdvisorService: /api/chat/advise failed', error);
            return null;
        } finally {
            done();
        }
    }

    /** OpenRouter directly, with the app's own figures as the facts. */
    static async fromOpenRouter(query: AdvisorQuery, signal?: AbortSignal): Promise<AdvisorRemark | null> {
        if (!ENV.OPENROUTER_API_KEY) return null;
        const { offer, from, locale } = query;
        if (!offer.budget) return null;

        const facts = {
            ...describeLoan({ ...offer, amount: query.amount, months: query.months }),
            ...(from && {
                changedFrom: {
                    ...from,
                    monthlyInstallment: quoteLoan(offer.terms, from.amount, from.months).monthly,
                    verdict: adviseLoan(offer.terms, from.amount, from.months, offer.budget).fit,
                },
            }),
            ...(query.customerSaid && query.customerSaid.length > 0 && { customerSaid: query.customerSaid }),
        };

        const { signal: timed, done } = withTimeout(OPENROUTER_TIMEOUT_MS, signal);
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${ENV.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: ENV.ADVISOR_MODEL,
                    temperature: 0.4,
                    // Room for a model that thinks a little before it writes, even when told not to.
                    max_tokens: 600,
                    reasoning: { enabled: false },
                    messages: [
                        { role: 'system', content: instructions(locale) },
                        { role: 'user', content: JSON.stringify(facts) },
                    ],
                }),
                signal: timed,
            });
            if (!response.ok) throw new Error(`OpenRouter advisor failed (${response.status})`);
            const data = await response.json();
            const choice = data?.choices?.[0];
            // A remark cut off mid-sentence is worse than none.
            if (choice?.finish_reason === 'length') return null;
            const content = choice?.message?.content;
            const raw = typeof content === 'string'
                ? content
                : Array.isArray(content)
                    ? content.map((part: any) => (typeof part?.text === 'string' ? part.text : '')).join(' ')
                    : '';
            const text = cleanRemark(raw, locale);
            return text
                ? { productId: query.productId, amount: query.amount, months: query.months, text, source: 'openrouter' }
                : null;
        } catch (error) {
            if (!signal?.aborted) console.warn('LoanAdvisorService: OpenRouter advisor failed', error);
            return null;
        } finally {
            done();
        }
    }

    /**
     * A remark written in code from the same figures, for the offline card
     * and as the line that shows while a model is still thinking.
     */
    static localRemark(offer: LoanOfferUI, amount: number, months: number, locale: 'en' | 'ar'): string | null {
        if (!offer.budget) return null;
        const advice = adviseLoan(offer.terms, amount, months, offer.budget);
        return locale === 'ar' ? arabicRemark(offer, amount, advice) : englishRemark(offer, amount, advice);
    }

    /**
     * The line the next chat turn carries when the remark did not come from
     * the server, so "ok, do that" means the plan the card talked about.
     */
    static cardNote(remark: AdvisorRemark): string {
        return `[UI loan card] The user moved the loan card for ${remark.productId} to amount=${remark.amount} SAR, months=${remark.months}, and the card's advisor told them: ${JSON.stringify(remark.text)}. If they refer to it ("ok", "do that"), this is what they mean; to act on a plan, call quote_loan with it.`;
    }
}

function tenure(offer: LoanOfferUI, months: number, locale: 'en' | 'ar'): string {
    const inYears = offer.terms.monthsStep % 12 === 0 || months % 12 === 0;
    return tenureLabel(months, locale, inYears);
}

function arabicRemark(offer: LoanOfferUI, amount: number, advice: LoanAdvice): string {
    const s = advice.suggestion;
    const sameAmount = s ? s.amount === amount : false;
    const plan = s
        ? sameAmount
            ? `لو طوّلت المدة لـ ${tenure(offer, s.months, 'ar')} يصير القسط ${whole(s.monthly)} ر.س ويبقى لك ${whole(s.left)} ر.س.`
            : `جرّب ${whole(s.amount)} ر.س على ${tenure(offer, s.months, 'ar')}: القسط ${whole(s.monthly)} ر.س ويبقى لك ${whole(s.left)} ر.س.`
        : '';
    switch (advice.fit) {
        case 'comfortable':
            return s
                ? `القسط مريح لميزانيتك. ولو قصّرت المدة لـ ${tenure(offer, s.months, 'ar')} تسدده أسرع وتوفر ${whole(s.saves)} ر.س.`
                : `القسط مريح لميزانيتك، ويبقى لك ${whole(advice.left)} ر.س بالشهر بعد مصاريفك.`;
        case 'tight':
            return `القسط يمشي، بس يبقى لك ${whole(advice.left)} ر.س بس بالشهر بعد مصاريفك. ${plan}`.trim();
        default:
            return s
                ? `القسط أكبر من اللي يبقى لك بعد مصاريفك. قلّل المبلغ أو طوّل المدة لين يصير ضمن ميزانيتك. ${plan}`
                : 'مصاريفك وفواتيرك تاخذ راتبك كله. تقليلها أول بيفتح لك مجال لأي قسط.';
    }
}

function englishRemark(offer: LoanOfferUI, amount: number, advice: LoanAdvice): string {
    const s = advice.suggestion;
    const sameAmount = s ? s.amount === amount : false;
    const plan = s
        ? sameAmount
            ? `Over ${tenure(offer, s.months, 'en')} the installment drops to ${whole(s.monthly)} SAR and leaves you ${whole(s.left)} SAR.`
            : `Try ${whole(s.amount)} SAR over ${tenure(offer, s.months, 'en')}: ${whole(s.monthly)} SAR a month, leaving you ${whole(s.left)} SAR.`
        : '';
    switch (advice.fit) {
        case 'comfortable':
            return s
                ? `This fits your budget. Over ${tenure(offer, s.months, 'en')} you would pay it off sooner and save ${whole(s.saves)} SAR.`
                : `This fits your budget, leaving you ${whole(advice.left)} SAR a month after your usual costs.`;
        case 'tight':
            return `It works, but leaves you only ${whole(advice.left)} SAR a month after your usual costs. ${plan}`.trim();
        default:
            return s
                ? `The installment is more than what is left after your usual costs. Lower the amount or stretch the term until it fits. ${plan}`
                : 'Your spending and bills take your whole salary. Bringing them down first makes room for an installment.';
    }
}

export default LoanAdvisorService;
