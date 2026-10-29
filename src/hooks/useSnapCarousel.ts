import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    I18nManager,
    LayoutChangeEvent,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    ScrollView,
} from 'react-native';

/**
 * A horizontal card scroller that snaps to whole cards in both directions.
 *
 * `snapToInterval` counts from the content's left edge. On an iOS
 * right-to-left engine the first card sits at the right end, and the right
 * end is rarely a whole number of strides from the left, so every snap point
 * landed between cards and the first card started half off the screen. Here
 * the offsets are measured from whichever end the first card is on.
 */
export function useSnapCarousel(count: number, stride: number) {
    const ref = useRef<ScrollView>(null);
    const [page, setPage] = useState(0);
    const [contentWidth, setContentWidth] = useState(0);
    const [viewportWidth, setViewportWidth] = useState(0);

    // Android's horizontal scroller mirrors its own offsets in RTL.
    const fromRight = Platform.OS === 'ios' && I18nManager.isRTL;
    const max = Math.max(0, contentWidth - viewportWidth);

    const offsets = useMemo(
        () =>
            Array.from({ length: count }, (_, i) =>
                fromRight ? Math.max(0, max - i * stride) : Math.min(max, i * stride)
            ),
        [count, stride, fromRight, max]
    );

    // Start on the first card, which in RTL is the content's right end.
    useEffect(() => {
        if (fromRight && max > 0) ref.current?.scrollTo({ x: max, animated: false });
    }, [fromRight, max]);

    const onScroll = useCallback(
        (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const x = e.nativeEvent.contentOffset.x;
            const index = Math.round((fromRight ? max - x : x) / stride);
            setPage(Math.min(count - 1, Math.max(0, index)));
        },
        [fromRight, max, stride, count]
    );

    return {
        page,
        scrollProps: {
            ref,
            horizontal: true,
            showsHorizontalScrollIndicator: false,
            snapToOffsets: offsets,
            decelerationRate: 'fast' as const,
            onScroll,
            scrollEventThrottle: 16,
            onLayout: (e: LayoutChangeEvent) => setViewportWidth(e.nativeEvent.layout.width),
            onContentSizeChange: (width: number) => setContentWidth(width),
        },
    };
}
