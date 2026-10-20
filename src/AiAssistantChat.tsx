import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ChatScreen } from './views/ChatScreen';
import { LocaleProvider, Locale, useLocale } from './contexts/LocaleContext';

export interface AiAssistantChatProps {
    /** Initial locale/language */
    locale?: Locale;
    /** Container style */
    style?: StyleProp<ViewStyle>;
}

/**
 * Inner component that handles the chat container with reset key
 * The key prop forces complete unmount/remount of the entire subtree
 * when language changes, ensuring all state is reset
 */
function ChatContainer() {
    const { locale, resetKey, isChangingLocale } = useLocale();

    // The key combines locale AND resetKey to ensure:
    // 1. Full remount when language changes
    // 2. Full remount when AppResetManager triggers a reset
    return (
        <SafeAreaProvider key={`${locale}-${resetKey}`}>
            <ChatScreen />
            {isChangingLocale && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4F008D" />
                    <Text style={styles.loadingText}>Switching language...</Text>
                </View>
            )}
        </SafeAreaProvider>
    );
}

/**
 * Main AI Assistant Chat Component
 * 
 * Simply import and render this component to add the AI chat interface.
 * Make sure to configure your API keys in src/config/constants.ts
 * 
 * The component handles RTL/LTR language switching with proper teardown
 * of all background services (Voice Assistant, TTS/STT engines).
 * 
 * Usage:
 * ```tsx
 * import { AiAssistantChat } from 'ai-assistant';
 * 
 * export default function App() {
 *   return <AiAssistantChat />;
 * }
 * ```
 */
export function AiAssistantChat({ locale = 'en', style }: AiAssistantChatProps = {}) {
    return (
        <LocaleProvider initialLocale={locale}>
            <View style={[styles.container, style]}>
                <ChatContainer />
            </View>
        </LocaleProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        gap: 16,
        zIndex: 1,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
});

export default AiAssistantChat;
