import React, { createContext, useContext, ReactNode } from 'react';
import { I18nManager, View, TextStyle, ViewStyle, StyleProp, ViewProps } from 'react-native';
import { directionState, readingTextStyle } from '../lib/layoutDirection';

const LayoutDirectionContext = createContext(directionState(I18nManager.isRTL, I18nManager.isRTL));

/** Legacy containers mirror rows when locale and native layout disagree. */
export const layoutRTL = (languageRTL: boolean) => languageRTL !== I18nManager.isRTL;

export function LayoutDirectionProvider({ languageRTL, children }: { languageRTL: boolean; children: ReactNode }) {
    return <LayoutDirectionContext.Provider value={directionState(languageRTL, I18nManager.isRTL)}>{children}</LayoutDirectionContext.Provider>;
}

/**
 * Scope Yoga's direction to this region. Rows, logical insets and scroll views
 * follow the selected language immediately, without changing the host app or
 * depending on a restart. Children must not apply a second manual row reversal.
 */
export function DirectionalView({ languageRTL, children, style, ...props }: {
    languageRTL: boolean; children: ReactNode; style?: StyleProp<ViewStyle>;
} & Omit<ViewProps, 'children'>) {
    return (
        <LayoutDirectionContext.Provider value={directionState(languageRTL, languageRTL)}>
            <View {...props} style={[style, { direction: languageRTL ? 'rtl' : 'ltr' }]}>{children}</View>
        </LayoutDirectionContext.Provider>
    );
}

export function useLayoutRTL(): boolean { return useContext(LayoutDirectionContext).flip; }
export function useVisualRTL(): boolean { return useContext(LayoutDirectionContext).languageRTL; }
export const row = (flip: boolean): ViewStyle => ({ flexDirection: flip ? 'row-reverse' : 'row' });
export const alignText = (flip: boolean, languageRTL = flip !== I18nManager.isRTL): TextStyle => readingTextStyle(flip, languageRTL);
export const alignStart = (flip: boolean): ViewStyle => ({ alignItems: flip ? 'flex-end' : 'flex-start' });
export const alignEnd = (flip: boolean): ViewStyle => ({ alignItems: flip ? 'flex-start' : 'flex-end' });
