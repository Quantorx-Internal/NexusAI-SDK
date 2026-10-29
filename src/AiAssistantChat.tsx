import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { ChatScreen } from './views/ChatScreen';
import { LocaleProvider, Locale, useLocale } from './contexts/LocaleContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LayoutDirectionProvider } from './contexts/LayoutDirectionContext';
import type { ThemeInput } from './theme/theme';
import { color, face, fontFaces } from './theme/tokens';

// The design uses two weights; Zain's other files stay out of the bundle.
const ZAIN_FONTS = {
    [fontFaces.regular]: require('@expo-google-fonts/zain/400Regular/Zain_400Regular.ttf'),
    [fontFaces.bold]: require('@expo-google-fonts/zain/700Bold/Zain_700Bold.ttf'),
};

export interface AiAssistantChatProps {
    /** Initial locale/language */
    locale?: Locale;
    /**
     * A theme the bank manages centrally: brand colour and names. When set it
     * overrides whatever the user saved on the device in Preferences.
     */
    theme?: ThemeInput;
    /** Container style */
    style?: StyleProp<ViewStyle>;
}

/**
 * Inner component that handles the chat container with reset key
 * The key prop forces complete unmount/remount of the entire subtree
 * when language changes, ensuring all state is reset
 */
function ChatContainer() {
    const { locale, resetKey, isChangingLocale, isRTL } = useLocale();

    // The key combines locale AND resetKey to ensure:
    // 1. Full remount when language changes
    // 2. Full remount when AppResetManager triggers a reset
    return (
        <SafeAreaProvider key={`${locale}-${resetKey}`}>
            <LayoutDirectionProvider languageRTL={isRTL}>
                <ChatScreen />
            </LayoutDirectionProvider>
            {isChangingLocale && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={color.brand[600]} />
                    <Text style={styles.loadingText}>Switching language…</Text>
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
export function AiAssistantChat({ locale = 'en', theme, style }: AiAssistantChatProps = {}) {
    // Hold the first frame for the font, so text never jumps from the system
    // face to Zain. If loading fails, show the chat in the system face.
    const [fontsLoaded, fontError] = useFonts(ZAIN_FONTS);
    if (!fontsLoaded && !fontError) {
        return <View style={[styles.container, style]} />;
    }

    return (
        <ThemeProvider initialTheme={theme}>
            <LocaleProvider initialLocale={locale}>
                <View style={[styles.container, style]}>
                    <ChatContainer />
                </View>
            </LocaleProvider>
        </ThemeProvider>
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
        ...face('500'),
    },
});

export default AiAssistantChat;
