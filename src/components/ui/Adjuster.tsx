import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    PanResponder,
    LayoutChangeEvent,
    GestureResponderEvent,
} from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { color, loan, radius, size, text, iconStroke } from '../../theme/tokens';
import { nudge, snap } from '../../lib/loans';
import { useLayoutRTL, useVisualRTL, row } from '../../contexts/LayoutDirectionContext';

/**
 * Adjuster — label + stepper pair + slider (design §5c).
 *
 * The stepper is 36pt, r10, border-strong, with a 44pt hit area through
 * hitSlop rather than a larger box. The slider is a 4pt track with the brand
 * fill from the start edge and a 24pt thumb with a 2pt brand ring, no shadow.
 * Ticks sit under the track: just min and max for a continuous range, every
 * mark for a discrete one. Tapping a tick jumps there.
 *
 * Fill and thumb are laid out with flex and the logical `start` edge, so the
 * engine mirrors them in RTL for free; only the touch-to-value arithmetic
 * uses the selected language.
 */

export interface AdjusterTick {
    value: number;
    label: string;
}

interface AdjusterProps {
    label: string;
    value: number;
    /** The value as the stepper shows it, e.g. "500,000 ر.س" or "20 سنة". */
    display: string;
    min: number;
    max: number;
    step: number;
    ticks: AdjusterTick[];
    disabled?: boolean;
    lessLabel?: string;
    moreLabel?: string;
    onChange: (value: number) => void;
}

const HIT = (size.buttonPrimary - loan.stepper) / 2;

export function Adjuster({
    label,
    value,
    display,
    min,
    max,
    step,
    ticks,
    disabled = false,
    lessLabel = 'Less',
    moreLabel = 'More',
    onChange,
}: AdjusterProps) {
    const clamped = Math.min(Math.max(value, min), max);
    const ratio = max > min ? (clamped - min) / (max - min) : 0;
    const flip = useLayoutRTL();

    return (
        <View style={styles.block}>
            <View style={[styles.row, row(flip)]}>
                <Text style={text('rowLabel')} numberOfLines={1}>
                    {label}
                </Text>
                {/* The stepper keeps minus on the left and plus on the right in both directions, like a number line. */}
                <View style={styles.stepper}>
                    <StepButton
                        direction={-1}
                        accessibilityLabel={`${lessLabel}: ${label}`}
                        disabled={disabled || clamped <= min}
                        onPress={() => onChange(nudge(clamped, -1, min, max, step))}
                    />
                    <Text style={[text('rowValue', { fontWeight: '700' }), styles.value]} numberOfLines={1}>
                        {display}
                    </Text>
                    <StepButton
                        direction={1}
                        accessibilityLabel={`${moreLabel}: ${label}`}
                        disabled={disabled || clamped >= max}
                        onPress={() => onChange(nudge(clamped, 1, min, max, step))}
                    />
                </View>
            </View>

            <Slider
                ratio={ratio}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                accessibilityLabel={label}
                accessibilityValue={display}
                onChange={onChange}
            />

            <Ticks ticks={ticks} min={min} max={max} value={clamped} disabled={disabled} onChange={onChange} />
        </View>
    );
}

function StepButton({
    direction,
    disabled,
    accessibilityLabel,
    onPress,
}: {
    direction: 1 | -1;
    disabled: boolean;
    accessibilityLabel: string;
    onPress: () => void;
}) {
    const Icon = direction > 0 ? Plus : Minus;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            disabled={disabled}
            onPress={onPress}
            hitSlop={{ top: HIT, bottom: HIT, left: HIT, right: HIT }}
            style={({ pressed }) => [styles.stepButton, pressed && !disabled && styles.stepButtonPressed, disabled && styles.stepButtonDisabled]}
        >
            <Icon size={size.icon.sm} color={disabled ? color.text.tertiary : color.text.primary} strokeWidth={iconStroke} />
        </Pressable>
    );
}

interface SliderProps {
    ratio: number;
    min: number;
    max: number;
    step: number;
    disabled: boolean;
    accessibilityLabel: string;
    accessibilityValue: string;
    onChange: (value: number) => void;
}

function Slider({ ratio, min, max, step, disabled, accessibilityLabel, accessibilityValue, onChange }: SliderProps) {
    const [width, setWidth] = useState(0);
    const visualRTL = useVisualRTL();
    const flip = useLayoutRTL();
    const visualRef = useRef(visualRTL);
    visualRef.current = visualRTL;
    const trackRef = useRef<View>(null);
    const originRef = useRef({ x: 0, width: 0 });
    // The latest props, read from inside the responder without recreating it.
    const live = useRef({ min, max, step, disabled, onChange });
    live.current = { min, max, step, disabled, onChange };

    const onLayout = useCallback((event: LayoutChangeEvent) => {
        setWidth(event.nativeEvent.layout.width);
    }, []);

    const valueAt = useCallback((pageX: number) => {
        const { x, width: w } = originRef.current;
        if (w <= 0) return null;
        let r = (pageX - x) / w;
        if (visualRef.current) r = 1 - r;
        r = Math.min(1, Math.max(0, r));
        const { min: lo, max: hi, step: s } = live.current;
        return snap(lo + r * (hi - lo), lo, hi, s);
    }, []);

    const responder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => !live.current.disabled,
                onMoveShouldSetPanResponder: (_e, gesture) =>
                    !live.current.disabled && Math.abs(gesture.dx) > Math.abs(gesture.dy),
                // The list behind must not take the drag away mid-slide.
                onPanResponderTerminationRequest: () => false,
                onPanResponderGrant: (event: GestureResponderEvent) => {
                    const { pageX } = event.nativeEvent;
                    trackRef.current?.measureInWindow((x, _y, w) => {
                        originRef.current = { x, width: w };
                        const next = valueAt(pageX);
                        if (next !== null) live.current.onChange(next);
                    });
                },
                onPanResponderMove: (event: GestureResponderEvent) => {
                    const next = valueAt(event.nativeEvent.pageX);
                    if (next !== null) live.current.onChange(next);
                },
            }),
        [valueAt]
    );

    const thumbStart = Math.max(0, ratio * width - loan.thumb / 2);
    const fillWidth = Math.max(0, Math.min(width, ratio * width));

    return (
        <View
            ref={trackRef}
            style={[styles.slider, disabled && styles.sliderDisabled]}
            onLayout={onLayout}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={accessibilityLabel}
            accessibilityValue={{ text: accessibilityValue }}
            {...responder.panHandlers}
        >
            <View style={styles.track}>
                <View style={[styles.fill, { width: fillWidth }, flip && { alignSelf: 'flex-end' }]} />
            </View>
            {width > 0 ? (
                <View
                    style={[styles.thumb, flip ? { end: thumbStart } : { start: thumbStart }]}
                    pointerEvents="none"
                />
            ) : null}
        </View>
    );
}

function Ticks({
    ticks,
    min,
    max,
    value,
    disabled,
    onChange,
}: {
    ticks: AdjusterTick[];
    min: number;
    max: number;
    value: number;
    disabled: boolean;
    onChange: (value: number) => void;
}) {
    const [width, setWidth] = useState(0);
    // Mirrored by hand: the first tick sits at the visual start, which is the engine's end.
    const mirrored = useLayoutRTL();
    if (ticks.length === 0) return null;

    return (
        <View style={styles.ticks} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
            {ticks.map((tick, index) => {
                const first = index === 0;
                const last = index === ticks.length - 1;
                const ratio = max > min ? (tick.value - min) / (max - min) : 0;
                const position = first
                    ? (mirrored ? { end: 0 } : { start: 0 })
                    : last
                        ? (mirrored ? { start: 0 } : { end: 0 })
                        : {
                            [mirrored ? 'end' : 'start']: ratio * width - TICK_WIDTH / 2,
                            width: TICK_WIDTH,
                            alignItems: 'center' as const,
                        };
                const current = tick.value === value;
                return (
                    <Pressable
                        key={tick.value}
                        disabled={disabled}
                        onPress={() => onChange(tick.value)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={[styles.tick, position]}
                    >
                        <Text
                            style={text('caption', current ? { color: color.text.primary, fontWeight: '600' } : undefined)}
                            numberOfLines={1}
                        >
                            {tick.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const TICK_WIDTH = 40;

const styles = StyleSheet.create({
    block: { gap: 4 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    stepButton: {
        width: loan.stepper,
        height: loan.stepper,
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: color.borderStrong,
        backgroundColor: color.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepButtonPressed: { backgroundColor: color.surface2 },
    stepButtonDisabled: { borderColor: color.border },
    value: {
        minWidth: loan.stepperValueMinWidth,
        textAlign: 'center',
        fontVariant: ['tabular-nums'],
    },
    slider: {
        height: loan.slider,
        justifyContent: 'center',
    },
    sliderDisabled: { opacity: 0.5 },
    track: {
        height: loan.track,
        borderRadius: 2,
        backgroundColor: color.surface3,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        backgroundColor: color.brand[600],
        borderRadius: 2,
        // In an RTL engine a row's start is the right edge, so the fill sits where it should.
        alignSelf: 'flex-start',
    },
    thumb: {
        position: 'absolute',
        top: (loan.slider - loan.thumb) / 2,
        width: loan.thumb,
        height: loan.thumb,
        borderRadius: loan.thumb / 2,
        backgroundColor: color.surface,
        borderWidth: loan.thumbRing,
        borderColor: color.brand[600],
    },
    ticks: { height: 18, position: 'relative' },
    tick: { position: 'absolute', top: 0 },
});

export default Adjuster;
