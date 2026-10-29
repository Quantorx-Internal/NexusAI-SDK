import React, { createContext, useContext, ReactNode } from 'react';
import { I18nManager, TextStyle, View, ViewStyle } from 'react-native';

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

/**
 * Arabic text that starts at the right in either engine.
 *
 * On a right-to-left engine iOS swaps textAlign left and right (RN's
 * RCTAttributedTextUtils), so a hard 'right' lands on the LEFT there: short
 * last lines of Arabic replies hung on the wrong side. Natural alignment with
 * an RTL writing direction starts at the right; only a left-to-right engine
 * needs the explicit 'right'.
 */
export const rtlText = (languageRTL: boolean): TextStyle =>
    languageRTL
        ? { writingDirection: 'rtl', ...(I18nManager.isRTL ? {} : { textAlign: 'right' as const }) }
        : {};

/**
 * Left-to-right text on either engine: English content on the Arabic screen.
 * On a right-to-left engine iOS swaps textAlign, so 'right' lands on the left.
 */
export const ltrText = (): TextStyle =>
    I18nManager.isRTL ? { writingDirection: 'ltr', textAlign: 'right' } : {};

const ARABIC_LETTER = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN_LETTER = /[A-Za-z]/;

/** Whether a piece of content reads right to left: its first letter is Arabic. */
export function readsRTL(content: string): boolean {
    const arabic = content.search(ARABIC_LETTER);
    if (arabic === -1) return false;
    const latin = content.search(LATIN_LETTER);
    return latin === -1 || arabic < latin;
}

/**
 * Direction for content (a message, a reply) from the content itself, not
 * the screen. An English reply on the Arabic screen set right to left put
 * its question mark at the front ("?the 450 SAR electricity bill").
 */
export const textDirectionFor = (content: string): TextStyle =>
    readsRTL(content) ? rtlText(true) : ltrText();

/** A directional icon (an arrow along the reading line) pointing the reading way. */
export const mirrorIcon = (visualRTL: boolean): ViewStyle =>
    visualRTL ? { transform: [{ scaleX: -1 }] } : {};

/**
 * Wrap an icon to mirror it. The icon's own `style` transform is applied by
 * react-native-svg about its top-left corner, which flipped it out of view
 * (the replay arrow vanished); a View flips about its centre.
 */
export function Mirror({ when, children }: { when: boolean; children: ReactNode }) {
    return <View style={mirrorIcon(when)}>{children}</View>;
}

/** A column whose children hug the reading-start edge. */
export const alignStart = (flip: boolean): ViewStyle => ({ alignItems: flip ? 'flex-end' : 'flex-start' });
export const alignEnd = (flip: boolean): ViewStyle => ({ alignItems: flip ? 'flex-start' : 'flex-end' });
