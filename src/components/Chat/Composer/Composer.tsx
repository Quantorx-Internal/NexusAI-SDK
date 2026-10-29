import React, { useState, useMemo, useCallback } from 'react';
import {
    View, Text, TextInput, Pressable, StyleSheet, Platform,
    NativeSyntheticEvent, TextInputKeyPressEventData, I18nManager,
} from 'react-native';
import { Mic, ArrowUp } from 'lucide-react-native';
import { color, composer, radius, border, text, font, iconStroke, face, rtlBase } from '../../../theme/tokens';
import {
    Suggestion, EntityCandidate, EntityData, matchEntitySlot,
} from '../../../lib/suggestions';
import { SuggestionChips } from './SuggestionChips';
import { ListeningOverlay } from './ListeningOverlay';

/**
 * The composer (design §9) — the assistant's presence, not a text field with a
 * mic bolted on.
 *
 * Four states share one 52pt bar:
 *   idle      chips from context, filled mic
 *   typing    chip row swaps to entity candidates, mic becomes a send arrow
 *   listening the bar is replaced by the gradient overlay
 *   working   the circle becomes an outlined stop; the field stays editable so
 *             the user can interrupt by typing
 *
 * One 40pt circle carries all three glyphs, so the bar never grows a second
 * button.
 */

interface ComposerProps {
    onSend: (text: string) => void;
    /** The bank's name, for the placeholder ("Ask AJB Bank anything"). */
    bankName?: string;
    isLoading?: boolean;
    isTranscribing?: boolean;
    isRecording?: boolean;
    onStartRecording?: () => void;
    onStopRecording?: () => void;
    onCancelRecording?: () => void;
    onStop?: () => void;
    /** Input level 0–1 for the listening waveform. */
    level?: number;
    /** 0–1 progress towards auto-stop on silence. */
    silenceProgress?: number;
    transcript?: string;
    suggestions?: Suggestion[];
    entityData?: EntityData;
    locale?: 'en' | 'ar';
    isRTL?: boolean;
}

export function Composer({
    onSend,
    bankName = 'AJB Bank',
    isLoading,
    isTranscribing,
    isRecording,
    onStartRecording,
    onStopRecording,
    onCancelRecording,
    onStop,
    level,
    silenceProgress,
    transcript,
    suggestions = [],
    entityData,
    locale = 'en',
    isRTL = false,
}: ComposerProps) {
    const [value, setValue] = useState('');
    const [focused, setFocused] = useState(false);

    const isAr = locale === 'ar';
    const hasText = value.trim().length > 0;
    const isLayoutRTL = isRTL ? !I18nManager.isRTL : I18nManager.isRTL;

    // The composer stays editable while the assistant works, so the user can
    // interrupt by typing; only transcription locks the field.
    const editable = !isTranscribing;

    const slot = useMemo(
        () => (entityData ? matchEntitySlot(value, entityData, locale) : null),
        [value, entityData, locale]
    );

    const send = useCallback(
        (raw?: string) => {
            const body = (raw ?? value).trim();
            if (!body || isTranscribing) return;
            onSend(body);
            setValue('');
        },
        [value, isTranscribing, onSend]
    );

    /**
     * Return sends rather than inserting a newline. Native uses
     * `submitBehavior="submit"`; web needs this handler because
     * react-native-web ignores that prop and would otherwise blur the field.
     * Shift+Enter still breaks the line, and a Return that commits an IME
     * composition (Arabic, Chinese, Japanese) must not send mid-word.
     */
    const handleKeyPress = (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
        if (Platform.OS !== 'web') return;
        const e = event as any;
        const composing = e?.nativeEvent?.isComposing || e?.nativeEvent?.keyCode === 229;
        if (e?.key !== 'Enter' || e?.shiftKey || composing) return;
        e.preventDefault?.();
        send();
    };

    const applyCandidate = (candidate: EntityCandidate) => {
        if (!slot) return;
        setValue(`${slot.prefix}${candidate.label} `);
    };

    const slotLabels: Record<string, string> = {
        payee: isAr ? 'إلى' : 'To',
        account: isAr ? 'من' : 'From',
        card: isAr ? 'البطاقة' : 'Card',
        bill: isAr ? 'الفاتورة' : 'Bill',
    };

    const placeholder = isTranscribing
        ? isAr ? 'جاري التحويل…' : 'Transcribing…'
        : isAr ? `اسأل ${bankName} عن أي شيء` : `Ask ${bankName} anything`;

    return (
        <>
            <ListeningOverlay
                visible={Boolean(isRecording)}
                transcript={transcript}
                level={level}
                silenceProgress={silenceProgress}
                locale={locale}
                onCancel={() => onCancelRecording?.()}
                onStop={() => onStopRecording?.()}
                onEditAsText={() => onStopRecording?.()}
            />

            <View style={[styles.root, isRecording && styles.rootHidden]} pointerEvents={isRecording ? 'none' : 'auto'}>
                <SuggestionChips
                    suggestions={slot ? undefined : suggestions}
                    candidates={slot?.candidates}
                    slotLabel={slot ? slotLabels[slot.slot] : undefined}
                    onSuggestion={(s: Suggestion) => send(s.message)}
                    onCandidate={applyCandidate}
                    isRTL={isLayoutRTL}
                />

                <View
                    style={[
                        styles.bar,
                        isLayoutRTL && styles.barRTL,
                        focused && [styles.barFocused, { borderColor: color.brand[300] }],
                    ]}
                >
                    <View style={styles.field}>
                        {/* Ghost completion: a second Text under the input, with the
                            typed prefix transparent so only the remainder shows. */}
                        {slot?.ghost ? (
                            <Text style={[styles.ghost, { color: color.brand[300] }]} numberOfLines={1} pointerEvents="none">
                                <Text style={styles.ghostTyped}>{value}</Text>
                                {slot.ghost}
                            </Text>
                        ) : null}

                        <TextInput
                            style={[styles.input, isRTL && styles.inputRTL]}
                            value={value}
                            onChangeText={setValue}
                            placeholder={placeholder}
                            placeholderTextColor={color.text.tertiary}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            onSubmitEditing={() => send()}
                            onKeyPress={handleKeyPress}
                            submitBehavior="submit"
                            returnKeyType="send"
                            multiline
                            editable={editable}
                            textAlign={isRTL ? 'right' : 'left'}
                        />
                    </View>

                    <ActionButton
                        isAr={isAr}
                        mode={isLoading ? 'stop' : hasText ? 'send' : 'mic'}
                        disabled={isTranscribing}
                        onPress={() => {
                            if (isLoading) return onStop?.();
                            if (hasText) return send();
                            onStartRecording?.();
                        }}
                    />
                </View>
            </View>
        </>
    );
}

/** One circle, three glyphs. */
const ACTION_LABELS = {
    en: { mic: 'Speak', send: 'Send', stop: 'Stop' },
    ar: { mic: 'تحدّث', send: 'إرسال', stop: 'إيقاف' },
} as const;

function ActionButton({
    mode,
    disabled,
    onPress,
    isAr,
}: {
    mode: 'mic' | 'send' | 'stop';
    disabled?: boolean;
    onPress: () => void;
    isAr?: boolean;
}) {
    const outlined = mode === 'stop';
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={ACTION_LABELS[isAr ? 'ar' : 'en'][mode]}
            style={({ pressed }) => [
                styles.action,
                outlined ? styles.actionOutlined : [styles.actionFilled, { backgroundColor: color.brand[600] }],
                pressed && !disabled && styles.actionPressed,
                disabled && styles.actionDisabled,
            ]}
        >
            {mode === 'stop' ? (
                <View style={styles.stopGlyph} />
            ) : mode === 'send' ? (
                <ArrowUp
                    size={composer.actionGlyph}
                    color={color.text.inverse}
                    strokeWidth={iconStroke}
                />
            ) : (
                <Mic
                    size={composer.actionGlyph}
                    color={color.text.inverse}
                    strokeWidth={iconStroke}
                />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    root: {
        gap: composer.chipToComposer,
        paddingBottom: composer.aboveHome,
        paddingTop: 8,
        backgroundColor: color.bg,
    },
    rootHidden: { opacity: 0 },
    bar: {
        minHeight: composer.barHeight,
        marginHorizontal: composer.barPadStart - 4,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: composer.barPadStart,
        paddingRight: composer.barPadEnd,
        borderRadius: composer.barRadius,
        backgroundColor: color.surface2,
        borderWidth: composer.focusBorder,
        borderColor: 'transparent',
        gap: 8,
    },
    barRTL: { flexDirection: 'row-reverse' },
    barFocused: {
        backgroundColor: color.surface,
        borderColor: color.brand[300],
    },
    field: { flex: 1, justifyContent: 'center' },
    input: {
        fontSize: composer.textSize,
        // 24 for 15pt Zain (1.66 em tall); 20 clipped Arabic descenders.
        lineHeight: 24,
        ...face('400'),
        color: color.text.primary,
        maxHeight: 96,
        paddingVertical: Platform.OS === 'web' ? 8 : 12,
        // Web needs the outline suppressed; the bar itself shows focus.
        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
    },
    inputRTL: { writingDirection: 'rtl' },
    ghost: {
        ...StyleSheet.absoluteFillObject,
        fontSize: composer.textSize,
        lineHeight: 24,
        fontFamily: font.family,
        ...rtlBase,
        color: color.brand[300],
        textAlignVertical: 'center',
        paddingVertical: Platform.OS === 'web' ? 8 : 12,
    },
    ghostTyped: { color: 'transparent' },
    action: {
        width: composer.actionCircle,
        height: composer.actionCircle,
        borderRadius: composer.actionCircle / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionFilled: { backgroundColor: color.brand[600] },
    actionOutlined: {
        backgroundColor: color.surface,
        borderWidth: 1,
        borderColor: color.borderStrong,
    },
    actionPressed: { opacity: 0.85 },
    actionDisabled: { opacity: 0.5 },
    stopGlyph: {
        width: composer.working.stop,
        height: composer.working.stop,
        borderRadius: composer.working.stopRadius,
        backgroundColor: color.text.primary,
    },
});

export default Composer;
