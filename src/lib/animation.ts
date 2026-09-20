import { Animated, Easing, EasingFunction } from 'react-native';

/**
 * A timing loop whose target is recomputed before every leg.
 *
 * `Animated.loop` replays a fixed animation, so it cannot be used where each
 * leg needs a fresh target — a waveform bar wandering to a new height, scaled by
 * an input level that changes while the loop runs. Restarting from the
 * completion callback keeps the loop and lets `next()` read current state.
 *
 * @param value  the driven value
 * @param next   called before every leg; returns the next target and duration
 * @returns      a stop function, safe to use as an effect cleanup
 */
export function startLoop(
    value: Animated.Value,
    next: () => { toValue: number; duration: number },
    options: { useNativeDriver?: boolean; easing?: EasingFunction } = {}
): () => void {
    const { useNativeDriver = false, easing = Easing.inOut(Easing.ease) } = options;
    let cancelled = false;

    const step = () => {
        if (cancelled) return;
        const { toValue, duration } = next();
        Animated.timing(value, { toValue, duration, easing, useNativeDriver }).start(
            ({ finished }) => {
                // A cancelled animation reports finished: false — don't respawn.
                if (finished && !cancelled) step();
            }
        );
    };

    step();

    return () => {
        cancelled = true;
        value.stopAnimation();
    };
}
