import React, { createContext, useContext, ReactNode } from 'react';
import { I18nManager, TextStyle, ViewStyle } from 'react-native';

/**
 * Whether rows must be mirrored by hand.
 *
 * React Native mirrors `row` only once I18nManager.forceRTL has taken
 * effect, which needs an app restart; the chat switches language at runtime.
 * So components flip their rows themselves whenever the language's direction
 * disagrees with the engine's (the same XOR ChatScreen has always used):
 *
 *   Arabic on an LTR engine  → flip
 *   English on an RTL engine → flip (to force LTR)
 *   otherwise                → the engine already does it
 */
const LayoutDirectionContext = createContext<boolean>(false);

export const layoutRTL = (languageRTL: boolean) =>
    languageRTL ? !I18nManager.isRTL : I18nManager.isRTL;

export function LayoutDirectionProvider({ languageRTL, children }: { languageRTL: boolean; children: ReactNode }) {
    return <LayoutDirectionContext.Provider value={layoutRTL(languageRTL)}>{children}</LayoutDirectionContext.Provider>;
}

/** True when this component must mirror its rows itself. */
export function useLayoutRTL(): boolean {
    return useContext(LayoutDirectionContext);
}

/** What the user sees: right-to-left, however it is achieved. */
export function useVisualRTL(): boolean {
    const flip = useLayoutRTL();
    return flip ? !I18nManager.isRTL : I18nManager.isRTL;
}

/** A horizontal row, mirrored when the language calls for it. */
export const row = (flip: boolean): ViewStyle => ({ flexDirection: flip ? 'row-reverse' : 'row' });

/** Text that must read from the right when mirrored by hand. */
export const alignText = (flip: boolean): TextStyle =>
    flip ? { textAlign: 'right', writingDirection: 'rtl' } : {};

/** A column whose children hug the reading-start edge. */
export const alignStart = (flip: boolean): ViewStyle => ({ alignItems: flip ? 'flex-end' : 'flex-start' });
export const alignEnd = (flip: boolean): ViewStyle => ({ alignItems: flip ? 'flex-start' : 'flex-end' });
