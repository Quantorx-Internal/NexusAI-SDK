import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ThemeInput, applyTheme, createTheme, DEFAULT_THEME, sameTheme } from '../theme/theme';

/**
 * The saved theme and names, applied to the tokens before the first paint.
 *
 * Kept on the device under one key. A host that wants the bank to manage it
 * centrally passes `initialTheme`, which wins over the stored one.
 */

const THEME_STORAGE_KEY = '@ai_assistant_theme';
const PREFERENCES_OPENED_KEY = '@ai_assistant_preferences_opened';

interface ThemeContextType {
    theme: Theme;
    /** Bumps on every applied theme, so consumers re-render their rows. */
    version: number;
    /** Apply and store a theme. Resolves once it is saved. */
    setTheme: (input: ThemeInput) => Promise<void>;
    /** Back to the defaults. */
    resetTheme: () => Promise<void>;
    /** The user has opened Preferences at least once; the header stops hinting at it. */
    preferencesOpened: boolean;
    markPreferencesOpened: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
    children,
    initialTheme,
}: {
    children: ReactNode;
    /** A theme the host manages; it overrides whatever the device stored. */
    initialTheme?: ThemeInput;
}) {
    const [theme, setThemeState] = useState<Theme>(() => (initialTheme ? createTheme(initialTheme) : DEFAULT_THEME));
    const [version, setVersion] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [preferencesOpened, setPreferencesOpened] = useState(true);
    const themeRef = useRef(theme);

    const apply = useCallback((next: Theme) => {
        applyTheme(next);
        themeRef.current = next;
        setThemeState(next);
        setVersion(v => v + 1);
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [stored, opened] = await Promise.all([
                    AsyncStorage.getItem(THEME_STORAGE_KEY),
                    AsyncStorage.getItem(PREFERENCES_OPENED_KEY),
                ]);
                if (cancelled) return;
                if (initialTheme) {
                    apply(createTheme(initialTheme));
                } else if (stored) {
                    apply(createTheme(JSON.parse(stored) as ThemeInput));
                } else {
                    apply(DEFAULT_THEME);
                }
                setPreferencesOpened(opened === '1');
            } catch (error) {
                console.warn('[ThemeContext] Failed to load the theme:', error);
                if (!cancelled) {
                    apply(DEFAULT_THEME);
                    setPreferencesOpened(false);
                }
            } finally {
                if (!cancelled) setIsReady(true);
            }
        })();
        return () => {
            cancelled = true;
        };
        // The host's theme is read once, on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setTheme = useCallback(async (input: ThemeInput) => {
        const next = createTheme(input);
        if (!sameTheme(next, themeRef.current)) apply(next);
        try {
            await AsyncStorage.setItem(
                THEME_STORAGE_KEY,
                JSON.stringify({ color: { primary: next.color.primary }, names: next.names } satisfies ThemeInput)
            );
        } catch (error) {
            console.warn('[ThemeContext] Failed to save the theme:', error);
        }
    }, [apply]);

    const resetTheme = useCallback(async () => {
        apply(DEFAULT_THEME);
        try {
            await AsyncStorage.removeItem(THEME_STORAGE_KEY);
        } catch (error) {
            console.warn('[ThemeContext] Failed to clear the theme:', error);
        }
    }, [apply]);

    const markPreferencesOpened = useCallback(() => {
        setPreferencesOpened(true);
        AsyncStorage.setItem(PREFERENCES_OPENED_KEY, '1').catch(() => undefined);
    }, []);

    const value = useMemo<ThemeContextType>(
        () => ({ theme, version, setTheme, resetTheme, preferencesOpened, markPreferencesOpened }),
        [theme, version, setTheme, resetTheme, preferencesOpened, markPreferencesOpened]
    );

    // The tokens must carry the saved colour before anything paints.
    if (!isReady) return null;

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
