/** Layout mirroring and text reading direction are separate decisions. */
export function directionState(languageRTL: boolean, layoutRTL: boolean) {
    return { languageRTL, layoutRTL, flip: languageRTL !== layoutRTL };
}

/** RN iOS swaps left/right text alignment when the containing layout is RTL. */
export function readingTextStyle(flip: boolean, languageRTL: boolean) {
    return {
        textAlign: flip ? 'right' as const : 'left' as const,
        writingDirection: languageRTL ? 'rtl' as const : 'ltr' as const,
    };
}
