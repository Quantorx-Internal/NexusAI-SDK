import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, I18nManager, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';

/**
 * The chat's motion: things arrive, they do not perform.
 *
 * One curve (ease-out cubic), short travel (8pt), and staggers of 40-80ms.
 * Everything here is transform and opacity on the native driver, except the
 * count-up, which has to write digits. With Reduce Motion on, every piece
 * shows its final state at once: no travel, no counting.
 */
export const motion = {
    rise: 8,
    duration: 360,
    stagger: 70,
    wordStagger: 35,
    count: 900,
    easing: Easing.out(Easing.cubic),
} as const;

/** True while the user has Reduce Motion on. */
export function useReduceMotion(): boolean {
    const [reduce, setReduce] = useState(false);
    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
        return () => sub.remove();
    }, []);
    return reduce;
}

/** Fades in and rises a few points, once, when it mounts. */
export function FadeRise({
    delay = 0,
    distance = motion.rise,
    duration = motion.duration,
    style,
    children,
}: {
    delay?: number;
    distance?: number;
    duration?: number;
    style?: StyleProp<ViewStyle>;
    children: React.ReactNode;
}) {
    const reduce = useReduceMotion();
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (reduce) {
            progress.setValue(1);
            return;
        }
        const run = Animated.timing(progress, {
            toValue: 1,
            duration,
            delay,
            easing: motion.easing,
            useNativeDriver: true,
        });
        run.start();
        return () => run.stop();
    }, [delay, duration, reduce, progress]);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: progress,
                    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
}

/**
 * A sentence whose words arrive one after another. Each word is a flex item
 * in a wrapping row, so the row follows the page direction: right to left in
 * Arabic, where the first word arrives at the right.
 */
export function WordsIn({
    text,
    delay = 0,
    style,
    rowStyle,
}: {
    text: string;
    delay?: number;
    style: StyleProp<TextStyle>;
    rowStyle?: StyleProp<ViewStyle>;
}) {
    const words = text.split(/\s+/).filter(Boolean);
    return (
        <View style={[{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 5 }, rowStyle]} accessible accessibilityRole="text" accessibilityLabel={text}>
            {words.map((word, i) => (
                <FadeRise key={`${i}-${word}`} delay={delay + i * motion.wordStagger} distance={6}>
                    <Text style={style}>{word}</Text>
                </FadeRise>
            ))}
        </View>
    );
}

/** How long a sentence of `words` words takes to arrive. */
export const wordsDuration = (words: number) => words * motion.wordStagger + motion.duration;

/**
 * A number that counts up to its value once. `format` writes each frame, so
 * the digits keep the screen's own format (separators, decimals, isolates).
 */
export function CountUp({
    value,
    format,
    delay = 0,
    duration = motion.count,
    style,
}: {
    value: number;
    format: (n: number) => string;
    delay?: number;
    duration?: number;
    style?: StyleProp<TextStyle>;
}) {
    const reduce = useReduceMotion();
    const [shown, setShown] = useState(reduce ? value : 0);

    useEffect(() => {
        if (reduce) {
            setShown(value);
            return;
        }
        let frame = 0;
        let start = 0;
        const timer = setTimeout(() => {
            const tick = (now: number) => {
                if (!start) start = now;
                const t = Math.min(1, (now - start) / duration);
                setShown(value * motion.easing(t));
                if (t < 1) frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
        }, delay);
        return () => {
            clearTimeout(timer);
            cancelAnimationFrame(frame);
        };
    }, [value, delay, duration, reduce]);

    return <Text style={style}>{format(shown)}</Text>;
}

/**
 * A reply that writes itself: words arrive one after another, and each one
 * fades up from nothing on its own, so the newest few words are a soft tail
 * behind fully inked text (the ChatGPT stream). The whole reply is laid out
 * from the start and only its ink changes, so lines never reflow and the
 * bubble never grows under the reader.
 *
 * A long reply speeds up to finish in about `budget`; nobody waits five
 * seconds to read what is already here.
 */
export const replyStream = {
    /** After the bubble has started to rise in. */
    start: 140,
    /** Per word, at most. */
    step: 45,
    /** Per word, at least, however long the reply. */
    minStep: 14,
    /** Each word's own fade. */
    fade: 450,
    budget: 3200,
} as const;

/** Words as the stream counts them: runs of non-space. */
export const countWords = (content: string) => content.split(/\s+/).filter(Boolean).length;

/** The time between two words of a reply of `words` words. */
export const streamStep = (words: number) =>
    Math.max(replyStream.minStep, Math.min(replyStream.step, replyStream.budget / Math.max(1, words)));

/** How long a reply of `content` takes to stream in, last fade included. */
export const replyStreamDuration = (content: string) => {
    const words = countWords(content);
    return replyStream.start + words * streamStep(words) + replyStream.fade;
};

/** How far word `index` has faded in, 0 to 1, `elapsed` ms into the stream. */
export const streamedAlpha = (index: number, elapsed: number, step: number) => {
    const t = (elapsed - replyStream.start - index * step) / replyStream.fade;
    return t <= 0 ? 0 : t >= 1 ? 1 : motion.easing(t);
};

/**
 * Milliseconds since the stream started, about 30 times a second, until
 * `until`. Infinity when the stream is off, over, or Reduce Motion is on:
 * every word at full ink.
 */
export function useStreamClock(active: boolean, until: number): number {
    const reduce = useReduceMotion();
    const [elapsed, setElapsed] = useState(active ? 0 : Infinity);

    useEffect(() => {
        if (!active || reduce) {
            setElapsed(Infinity);
            return;
        }
        let frame = 0;
        let start = 0;
        let shown = -Infinity;
        const tick = (now: number) => {
            if (!start) start = now;
            const t = now - start;
            if (t >= until) {
                setElapsed(Infinity);
                return;
            }
            // Thirty steps a second is smooth for a fade and half the renders.
            if (t - shown >= 30) {
                shown = t;
                setElapsed(t);
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [active, until, reduce]);

    return elapsed;
}

/**
 * Grows along the reading line from its start edge (left in English, right
 * in Arabic), once. For bars and meters: the amount fills in as it arrives.
 */
export function GrowIn({
    delay = 0,
    duration = 700,
    style,
    children,
}: {
    delay?: number;
    duration?: number;
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
}) {
    const reduce = useReduceMotion();
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (reduce) {
            progress.setValue(1);
            return;
        }
        const run = Animated.timing(progress, {
            toValue: 1,
            duration,
            delay,
            easing: motion.easing,
            useNativeDriver: true,
        });
        run.start();
        return () => run.stop();
    }, [delay, duration, reduce, progress]);

    return (
        <Animated.View
            style={[
                style,
                { transformOrigin: I18nManager.isRTL ? 'right' : 'left', transform: [{ scaleX: progress }] },
            ]}
        >
            {children}
        </Animated.View>
    );
}
