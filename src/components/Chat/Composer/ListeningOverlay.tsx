import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUp, X, Pencil } from 'lucide-react-native';
import * as tokens from '../../../theme/tokens';
import { Waveform } from './Waveform';

/**
 * Listening mode (design §9).
 *
 * The bar is replaced, not decorated: a brand-tinted gradient rises from the
 * bottom edge over the last ~45% of the screen, the thread dims underneath, and
 * the live transcript sits above a waveform driven by input level.
 *
 * Three controls only — cancel, mic, edit-as-text — because at this size the
 * mic has to be unmissable and anything else competes with it.
 */

interface ListeningOverlayProps {
    visible: boolean;
    /** Text recognised so far. */
    transcript?: string;
    /** The tail the recogniser is still unsure of, rendered tertiary. */
    partial?: string;
    /** Input level, 0–1, from the recorder's metering callback. */
    level?: number;
    /** 0–1 progress towards auto-stop, shown so the send never surprises. */
    silenceProgress?: number;
    locale?: 'en' | 'ar';
    onCancel: () => void;
    onStop: () => void;
    onEditAsText: () => void;
}

export function ListeningOverlay({
    visible,
    transcript,
    partial,
    level = 0,
    silenceProgress = 0,
    locale = 'en',
    onCancel,
    onStop,
    onEditAsText,
}: ListeningOverlayProps) {
    const isAr = locale === 'ar';
    const ring = useRef(new Animated.Value(tokens.composer.listening.ring)).current;
    const fade = useRef(new Animated.Value(0)).current;

    // The ring breathes 6→10pt so the mode reads as live even in silence.
    useEffect(() => {
        if (!visible) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(ring, { toValue: 10, duration: 900, useNativeDriver: false }),
                Animated.timing(ring, { toValue: 6, duration: 900, useNativeDriver: false }),
            ])
        );
        loop.start();
        return () => {
            loop.stop();
            ring.setValue(tokens.composer.listening.ring);
        };
    }, [visible, ring]);

    // Round-trip under 300ms, so it feels like the bar expanded rather than a
    // new surface appearing.
    useEffect(() => {
        Animated.timing(fade, {
            toValue: visible ? 1 : 0,
            duration: visible ? 220 : 160,
            useNativeDriver: true,
        }).start();
    }, [visible, fade]);

    if (!visible) return null;

    const height = Dimensions.get('window').height * tokens.composer.listening.scrimRatio;
    const t = {
        listening: isAr ? 'أستمع…' : 'Listening…',
        cancel: isAr ? 'إلغاء' : 'Cancel',
        edit: isAr ? 'تحرير كنص' : 'Edit as text',
        // The controls are icons only, so one line says what the main one does.
        hint: isAr ? 'اضغط للإرسال' : 'Tap to send',
        send: isAr ? 'إرسال' : 'Send',
    };

    return (
        <Animated.View style={[styles.root, { height, opacity: fade }]} pointerEvents="box-none">
            {/* Scrim: one gradient View, never intercepts touches. */}
            <LinearGradient
                colors={['rgba(245,238,250,0)', 'rgba(235,220,245,0.92)', 'rgba(214,184,235,0.98)']}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />

            <View style={styles.content}>
                <Text style={styles.transcript}>
                    {transcript || t.listening}
                    {partial ? <Text style={styles.partial}>{` ${partial}`}</Text> : null}
                </Text>

                <View style={styles.waveform}>
                    <Waveform level={level} active={visible} />
                </View>

                <View style={styles.hintBlock}>
                    <Text style={styles.hint}>{t.hint}</Text>
                    {/* Auto-stop is coming: show it arriving rather than letting
                        the take end without warning. */}
                    {silenceProgress > 0 ? (
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${Math.min(100, silenceProgress * 100)}%` },
                                ]}
                            />
                        </View>
                    ) : null}
                </View>

                <View style={styles.controls}>
                    <Pressable
                        onPress={onCancel}
                        accessibilityLabel={t.cancel}
                        style={({ pressed }) => [styles.side, pressed && styles.sidePressed]}
                    >
                        <X size={20} color={tokens.color.brand[700]} strokeWidth={tokens.iconStroke} />
                    </Pressable>

                    <Pressable onPress={onStop} accessibilityLabel={t.send}>
                        <Animated.View style={[styles.micRing, { padding: ring }]}>
                            <View style={styles.mic}>
                                <ArrowUp
                                    size={28}
                                    color={tokens.color.text.inverse}
                                    strokeWidth={tokens.iconStroke}
                                />
                            </View>
                        </Animated.View>
                    </Pressable>

                    <Pressable
                        onPress={onEditAsText}
                        accessibilityLabel={t.edit}
                        style={({ pressed }) => [styles.side, pressed && styles.sidePressed]}
                    >
                        <Pencil size={18} color={tokens.color.brand[700]} strokeWidth={tokens.iconStroke} />
                    </Pressable>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    root: { position: 'absolute', left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
    content: { paddingHorizontal: 24, paddingBottom: 28, gap: 20 },
    transcript: {
        fontSize: tokens.composer.listening.transcriptSize,
        lineHeight: tokens.composer.listening.transcriptLine,
        fontWeight: '600',
        fontFamily: tokens.font.family,
        color: tokens.color.text.primary,
        textAlign: 'center',
    },
    partial: { color: tokens.color.text.tertiary, fontWeight: '600' },
    waveform: { alignItems: 'center' },
    hintBlock: { alignItems: 'center', gap: 8, marginTop: -8 },
    hint: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
        fontFamily: tokens.font.family,
        color: tokens.color.brand[700],
        opacity: 0.75,
    },
    progressTrack: {
        width: 96,
        height: 2,
        borderRadius: 1,
        backgroundColor: 'rgba(255,255,255,0.55)',
        overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: tokens.color.brand[600] },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
    },
    side: {
        width: tokens.composer.listening.sideButton,
        height: tokens.composer.listening.sideButton,
        borderRadius: tokens.composer.listening.sideButton / 2,
        borderWidth: 1,
        borderColor: tokens.color.brand[300],
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.6)',
    },
    sidePressed: { backgroundColor: tokens.color.surface },
    micRing: {
        borderRadius: tokens.radius.pill,
        backgroundColor: tokens.color.brand[200],
    },
    mic: {
        width: tokens.composer.listening.mic,
        height: tokens.composer.listening.mic,
        borderRadius: tokens.composer.listening.mic / 2,
        backgroundColor: tokens.color.brand[600],
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default ListeningOverlay;
