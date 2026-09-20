import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, I18nManager, Platform, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { Send, Mic } from 'lucide-react-native';
import { Locale } from '../../contexts/LocaleContext';

interface ChatInputProps {
    onSend: (text: string) => void;
    isLoading?: boolean;
    isTranscribing?: boolean;
    onStartRecording?: () => void;
    onStopRecording?: () => void;
    isRecording?: boolean;
    locale?: Locale;
    isRTL?: boolean;
}

export function ChatInput({
    onSend,
    isLoading,
    isTranscribing,
    onStartRecording,
    onStopRecording,
    isRecording,
    locale = 'en',
    isRTL = false,
}: ChatInputProps) {
    const [text, setText] = useState('');

    // Determine effective layout direction (XOR logic)
    const isLayoutRTL = isRTL ? !I18nManager.isRTL : I18nManager.isRTL;

    // Disable input when loading response or transcribing voice
    const isDisabled = isLoading || isTranscribing;

    const handleSend = () => {
        if (!text.trim() || isDisabled) return;
        onSend(text.trim());
        setText('');
    };

    /**
     * Return sends the message rather than inserting a newline.
     *
     * Native gets this from `submitBehavior="submit"` below, which fires submit
     * without blurring, so the keyboard stays up between messages.
     *
     * Web needs this handler because react-native-web ignores `submitBehavior`
     * and only honours `blurOnSubmit` — and on a multiline field that flag also
     * forces a blur. react-native-web runs `onKeyPress` first and then skips its
     * own Enter handling if the event was default-prevented, so preventing it
     * here gives us submit-without-blur there too.
     *
     * Shift+Enter still inserts a newline, and a Return that closes an IME
     * composition (how Arabic, Chinese and Japanese keyboards commit a word)
     * must not send — otherwise the message goes mid-word.
     */
    const handleKeyPress = (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
        if (Platform.OS !== 'web') return;

        const e = event as any;
        const composing = e?.nativeEvent?.isComposing || e?.nativeEvent?.keyCode === 229;
        if (e?.key !== 'Enter' || e?.shiftKey || composing) return;

        e.preventDefault?.();
        handleSend();
    };

    // Localized placeholder text
    const placeholder = isTranscribing
        ? (locale === 'ar' ? 'جاري التحويل...' : 'Transcribing...')
        : (locale === 'ar' ? 'اكتب رسالة...' : 'Type a message...');

    return (
        <View style={[styles.container, isDisabled && styles.containerDisabled]}>
            <View style={[
                styles.inputContainer,
                isDisabled && styles.inputContainerDisabled,
                isLayoutRTL && styles.inputContainerRTL,
            ]}>
                <TextInput
                    style={[
                        styles.input,
                        isDisabled && styles.inputDisabled,
                        isRTL && styles.inputRTL,
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={isDisabled ? "#C0C4CC" : "#9CA3AF"}
                    value={text}
                    onChangeText={setText}
                    onSubmitEditing={handleSend}
                    onKeyPress={handleKeyPress}
                    returnKeyType="send"
                    // Send on Return instead of adding a newline, and keep focus.
                    submitBehavior="submit"
                    multiline
                    editable={!isDisabled}
                    textAlign={isRTL ? 'right' : 'left'}
                />

                {text.length > 0 ? (
                    <TouchableOpacity
                        style={[
                            styles.button,
                            styles.sendButton,
                            isDisabled && styles.buttonDisabled
                        ]}
                        onPress={handleSend}
                        disabled={isDisabled}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                <Send size={20} color="#fff" />
                            </View>
                        )}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[
                            styles.button,
                            styles.micButton,
                            isRecording && styles.recordingButton,
                            isDisabled && !isRecording && styles.micButtonDisabled
                        ]}
                        onPressIn={isDisabled ? undefined : onStartRecording}
                        onPressOut={isDisabled ? undefined : onStopRecording}
                        disabled={isDisabled && !isRecording}
                    >
                        {isTranscribing ? (
                            <ActivityIndicator color="#6B7280" size="small" />
                        ) : (
                            <Mic size={20} color={isRecording ? "#fff" : isDisabled ? "#C0C4CC" : "#6B7280"} />
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    containerDisabled: {
        opacity: 0.7,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 12,
    },
    inputContainerRTL: {
        flexDirection: 'row-reverse',
    },
    inputContainerDisabled: {
        backgroundColor: '#E5E7EB',
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        color: '#1F2937',
        paddingVertical: 8,
    },
    inputRTL: {
        writingDirection: 'rtl',
    },
    inputDisabled: {
        color: '#9CA3AF',
    },
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    sendButton: {
        backgroundColor: '#4F008D',
    },
    micButton: {
        backgroundColor: '#E5E7EB',
    },
    micButtonDisabled: {
        backgroundColor: '#F3F4F6',
    },
    recordingButton: {
        backgroundColor: '#EF4444',
    },
});
