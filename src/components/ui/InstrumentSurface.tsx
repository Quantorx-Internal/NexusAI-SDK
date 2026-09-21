import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { color, instrument } from '../../theme/tokens';

/**
 * The instrument surface (design §A, round 2).
 *
 * Accounts and bank cards are the one place a gradient survives — everywhere
 * else purple is confined to buttons, pills, avatars and the selected border.
 * An account and a card are physical objects, so here the object itself is the
 * brand surface rather than another tinted panel.
 *
 * Two palettes, chosen by type rather than by taste:
 *   brand  current accounts and credit cards — brand 800 → 600 → 500
 *   ink    savings accounts and debit cards  — ink 900 → aubergine
 *
 * Each palette carries exactly one translucent deco shape at 6–7% white:
 * circles top-right on brand, a wave bottom-left on ink. One shape, not a
 * pattern — it reads as depth rather than decoration.
 */

export type InstrumentPalette = 'brand' | 'ink';

interface InstrumentSurfaceProps {
    palette: InstrumentPalette;
    width?: number;
    height: number;
    selected?: boolean;
    pressed?: boolean;
    dimmed?: boolean;
    /** Deco shapes mirror in RTL; numbers never do. */
    mirrored?: boolean;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export function InstrumentSurface({
    palette,
    width = instrument.width,
    height,
    selected,
    pressed,
    dimmed,
    mirrored,
    children,
    style,
}: InstrumentSurfaceProps) {
    return (
        <View
            style={[
                {
                    width,
                    height,
                    borderRadius: instrument.radius,
                    // The ring sits outside the card, so selection never nudges
                    // the layout of its neighbours.
                    ...(selected
                        ? {
                            borderWidth: instrument.ringWidth,
                            borderColor: color.brand[600],
                            margin: -instrument.ringWidth,
                        }
                        : null),
                },
                selected && { padding: instrument.ringOffset },
                pressed && { transform: [{ scale: instrument.pressedScale }] },
                dimmed && { opacity: instrument.frozenOpacity },
                style,
            ]}
        >
            <LinearGradient
                // LinearGradient wants a tuple of at least two stops.
                colors={instrument.palettes[palette] as unknown as readonly [string, string, ...string[]]}
                // 135°: top-left to bottom-right.
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.surface}
            >
                <Deco palette={palette} width={width} height={height} mirrored={mirrored} />
                <View style={styles.content}>{children}</View>
            </LinearGradient>
        </View>
    );
}

function Deco({
    palette,
    width,
    height,
    mirrored,
}: {
    palette: InstrumentPalette;
    width: number;
    height: number;
    mirrored?: boolean;
}) {
    const fill = color.text.inverse;
    const opacity = instrument.decoOpacity;

    return (
        <Svg
            width={width}
            height={height}
            style={[StyleSheet.absoluteFill, mirrored && styles.mirrored]}
            pointerEvents="none"
        >
            <G opacity={opacity}>
                {palette === 'brand' ? (
                    // Circles bleeding off the top-right corner.
                    <>
                        <Circle cx={width - 28} cy={-14} r={96} fill={fill} />
                        <Circle cx={width - 4} cy={22} r={58} fill={fill} />
                    </>
                ) : (
                    // A wave rising out of the bottom-left.
                    <Path
                        d={`M0 ${height - 76}
                            C ${width * 0.28} ${height - 118}, ${width * 0.42} ${height - 26}, ${width * 0.72} ${height - 58}
                            C ${width * 0.86} ${height - 74}, ${width * 0.95} ${height - 70}, ${width} ${height - 78}
                            L ${width} ${height} L 0 ${height} Z`}
                        fill={fill}
                    />
                )}
            </G>
        </Svg>
    );
}

const styles = StyleSheet.create({
    surface: {
        flex: 1,
        borderRadius: instrument.radius,
        overflow: 'hidden',
    },
    content: { flex: 1, padding: instrument.padding },
    mirrored: { transform: [{ scaleX: -1 }] },
});

export default InstrumentSurface;
